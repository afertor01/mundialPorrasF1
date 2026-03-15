import fastf1
import pandas as pd
import os
from sqlalchemy.orm import Session
from sqlalchemy import select

# TUS MODELOS
from app.db.models.grand_prix import GrandPrix
from app.db.models.race_result import RaceResult
from app.db.models.race_position import RacePosition
from app.db.models.race_event import RaceEvent
from app.db.models.driver import Driver
from app.db.models.season import Season
from app.db.models.prediction import Prediction
from app.db.models.multiplier_config import MultiplierConfig
from app.services.scoring import calculate_prediction_score
from app.services.achievements_service import evaluate_race_achievements

# Configuración caché
CACHE_DIR = 'cache'
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)
fastf1.Cache.enable_cache(CACHE_DIR)

DB_TO_API_MAP = {
    "Gran Premio de España": "Spain",
    "Gran Premio de Mónaco": "Monaco",
    "Gran Premio de Bahrein": "Bahrain",
    "GP Bahrain": "Bahrain",
    "Gran Premio de Arabia Saudí": "Saudi Arabia",
    "Saudi Arabian Grand Prix": "Saudi Arabia",
    "Australian Grand Prix": "Australia",
    "Japanese Grand Prix": "Japan",
    "Chinese Grand Prix": "China",
    "Miami Grand Prix": "Miami",
    "Emilia Romagna Grand Prix": "Imola",
    "Monaco Grand Prix": "Monaco",
    "Canadian Grand Prix": "Canada",
    "Spanish Grand Prix": "Spain",
    "Austrian Grand Prix": "Austria",
    "British Grand Prix": "Great Britain",
    "Hungarian Grand Prix": "Hungary",
    "Belgian Grand Prix": "Belgium",
    "Dutch Grand Prix": "Netherlands",
    "Italian Grand Prix": "Italy",
    "Azerbaijan Grand Prix": "Azerbaijan",
    "Singapore Grand Prix": "Singapore",
    "United States Grand Prix": "United States",
    "Mexico City Grand Prix": "Mexico",
    "São Paulo Grand Prix": "Brazil",
    "Las Vegas Grand Prix": "Las Vegas",
    "Qatar Grand Prix": "Qatar",
    "Abu Dhabi Grand Prix": "Abu Dhabi"
}

# --- FUNCIÓN 1: Sincronizar QUALY (La que hicimos antes) ---
def sync_qualy_results(gp_id: int, db: Session):
    gp = db.query(GrandPrix).filter(GrandPrix.id == gp_id).first()
    if not gp:
        return {"success": False, "error": "GP no encontrado"}

    season = db.query(Season).filter(Season.id == gp.season_id).first()
    
    try:
        api_name = DB_TO_API_MAP.get(gp.name, gp.name)
        session = fastf1.get_session(season.year, api_name, 'Q')
        session.load()
        
        results = session.results
        qualy_order = results['Abbreviation'].tolist()
        
        gp.qualy_results = qualy_order
        db.commit()
        
        return {"success": True, "data": qualy_order}
    except Exception as e:
        print(f"Error syncing qualy: {e}")
        return {"success": False, "error": str(e)}

def sync_race_data_manual(db: Session, gp_id: int):
    logs = []
    def log(msg):
        logs.append(msg)

    log(f"🚀 Iniciando análisis avanzado para GP ID: {gp_id}")

    # 1. Obtener GP
    gp = db.get(GrandPrix, gp_id)
    if not gp:
        log("❌ Error: GP no encontrado.")
        return False, logs

    # 2. Limpieza previa (Posiciones y Eventos)
    existing_result = db.query(RaceResult).filter(RaceResult.gp_id == gp.id).first()
    if existing_result:
        log("⚠️ Resultados previos detectados. Eliminando datos antiguos...")
        db.query(RacePosition).filter(RacePosition.race_result_id == existing_result.id).delete()
        db.query(RaceEvent).filter(RaceEvent.race_result_id == existing_result.id).delete()
        db.delete(existing_result)
        db.commit()

    # 3. Preparar FastF1
    year = gp.race_datetime.year
    api_name = DB_TO_API_MAP.get(gp.name, gp.name)
    log(f"🌍 API Target: '{api_name}' ({year})")

    try:
        # 4. Cargar Sesión (IMPORTANTE: Laps=True por defecto)
        log("⏳ Descargando tiempos de vuelta y telemetría...")
        session = fastf1.get_session(year, api_name, 'R')
        
        # Cargamos datos. Telemetry=False para ir rápido, pero Laps lo necesitamos
        session.load(telemetry=False, weather=False, messages=False)
        
        results = session.results
        laps = session.laps

        if results.empty:
            log("❌ Error: Tabla de resultados vacía.")
            return False, logs

        # 5. Crear Cabecera
        new_race_result = RaceResult(gp_id=gp.id)
        db.add(new_race_result)
        db.flush() # Generar ID

        # ==========================================
        # PARTE A: POSICIONES & DNFs (LOGICA MEJORADA)
        # ==========================================
        log(f"📊 Procesando parrilla de {len(results)} pilotos...")
        
        positions_to_add = []
        
        # Listas para desglose (informativo)
        dnf_drivers = [] # Retirados en carrera (Accidente, Mecánico...)
        dns_drivers = [] # No empezaron (No cuenta como DNF de carrera)
        dsq_drivers = [] # Descalificados
        
        db_drivers = db.execute(select(Driver)).scalars().all()
        known_codes = {d.code for d in db_drivers}

        for i, row in results.iterrows():
            acronym = row['Abbreviation']
            
            # Datos crudos de FastF1
            raw_pos = str(row['ClassifiedPosition']) # '1', 'R', 'D', 'N/C'
            raw_status = str(row['Status']).lower()  # 'collision', 'finished', 'did not start'
            
            # --- LÓGICA DE POSICIÓN ---
            if raw_pos.isnumeric():
                position = int(raw_pos)
            else:
                position = 20 # Fondo de parrilla para ordenar visualmente
            
            # --- LÓGICA DE ESTADO (DNF vs DNS vs DSQ) ---
            # Caso 1: Terminó (o clasificado a +vueltas)
            if raw_status in ['finished'] or raw_status.startswith('+'):
                pass # Todo bien, no es incidencia
            
            # Caso 2: DNS - No empezó
            elif raw_status in ['did not start', 'withdrew', 'did not qualify']:
                dns_drivers.append(acronym)
                log(f"⚠️ {acronym} -> DNS (No empezó)")
                
            # Caso 3: DSQ - Descalificado
            elif 'disqualified' in raw_status:
                dsq_drivers.append(acronym)
                log(f"🚫 {acronym} -> DSQ (Descalificado)")
                
            # Caso 4: DNF Real (Accidente, Motor, etc.)
            # Si NO tiene posición numérica y NO es DNS/DSQ, asumimos DNF de carrera
            elif not raw_pos.isnumeric():
                dnf_drivers.append(acronym)
                # Mostramos la razón específica en el log (ej: "Collision")
                log(f"💥 {acronym} -> DNF ({row['Status']})")

            # Crear objeto posición
            pos_entry = RacePosition(
                race_result_id=new_race_result.id,
                driver_name=acronym, 
                position=position
            )
            positions_to_add.append(pos_entry)

        db.add_all(positions_to_add)
        log(f"✅ {len(positions_to_add)} posiciones registradas.")

        # ==========================================
        # PARTE B: EVENTOS (SC, FASTEST LAP, DNFs)
        # ==========================================
        events_to_add = []

        # 1. VUELTA RÁPIDA
        try:
            # pick_fastest devuelve la vuelta más rápida de toda la sesión
            fastest_lap = laps.pick_fastest()
            fl_driver = fastest_lap['Driver']
            
            events_to_add.append(RaceEvent(
                race_result_id=new_race_result.id,
                event_type="FASTEST_LAP",
                value=fl_driver
            ))
            log(f"🏎️ Vuelta Rápida: {fl_driver}")
        except Exception:
            log("⚠️ No se pudo determinar la vuelta rápida.")

        # 2. SAFETY CAR (SC)
        try:
            # FastF1 'TrackStatus': '1'=Green, '2'=Yellow, '4'=SC, '5'=Red, '6'=VSC, '7'=VSC End
            # Convertimos la columna a string y buscamos el código '4'
            track_status = laps['TrackStatus'].astype(str)
            has_sc = track_status.str.contains('4').any()
            
            sc_value = "Yes" if has_sc else "No"
            
            events_to_add.append(RaceEvent(
                race_result_id=new_race_result.id,
                event_type="SAFETY_CAR",
                value=sc_value
            ))
            log(f"⚠️ Safety Car: {sc_value}")
        except Exception:
             log("⚠️ No se pudo determinar el Safety Car.")

        # 3. DNFs (SOLO contamos los abandonos reales en carrera)
        events_to_add.append(RaceEvent(
            race_result_id=new_race_result.id,
            event_type="DNFS",
            value=str(len(dnf_drivers)) # Solo sumamos los crashes/mecánicos
        ))
        
        # 4. LISTA DE INCIDENCIAS (Opcional, muy útil para ver qué pasó)
        # Guardamos una cadena con detalle: "SAI(DNF), HAM(DSQ), ALB(DNS)"
        incidents_list = []
        if dnf_drivers: incidents_list.append(f"DNF: {', '.join(dnf_drivers)}")
        if dsq_drivers: incidents_list.append(f"DSQ: {', '.join(dsq_drivers)}")
        if dns_drivers: incidents_list.append(f"DNS: {', '.join(dns_drivers)}")
        
        if incidents_list:
            events_to_add.append(RaceEvent(
                race_result_id=new_race_result.id,
                event_type="INCIDENTS_INFO", 
                value=" | ".join(incidents_list)
            ))

        log(f"Resumen Incidencias: {len(dnf_drivers)} DNF, {len(dsq_drivers)} DSQ, {len(dns_drivers)} DNS")
        
        # Guardamos la LISTA DE NOMBRES (separada por comas) para mostrarla en el frontend si quieres
        if dnf_drivers:
            dnf_list_str = ", ".join(dnf_drivers)
            events_to_add.append(RaceEvent(
                race_result_id=new_race_result.id,
                event_type="DNF_DRIVER", # Nuevo tipo de evento informativo
                value=dnf_list_str
            ))
        
        log(f"💥 DNFs: {len(dnf_drivers)} ({', '.join(dnf_drivers) if dnf_drivers else 'Ninguno'})")

        # Guardar Eventos
        db.add_all(events_to_add)
        db.commit()

        # ==========================================
        # PARTE C: CÁLCULOS FINALES
        # ==========================================
        log("🏆 Recalculando puntos y logros de usuarios...")
        try:
            # 1. Puntos de Predicciones
            predictions = db.query(Prediction).filter(Prediction.gp_id == gp.id).all()
            multipliers = db.query(MultiplierConfig).filter(MultiplierConfig.season_id == gp.season_id).all()
            
            for p in predictions:
                res_score = calculate_prediction_score(p, new_race_result, multipliers)
                p.points = res_score["final_points"]
                p.points_base = res_score["base_points"]
                p.multiplier = res_score["multiplier"]
            
            db.commit()
            log(f"✅ Puntos recalculados para {len(predictions)} predicciones.")

            # 2. Logros
            evaluate_race_achievements(db, gp.id)
            log("✅ Logros actualizados.")
        except Exception as e:
            log(f"⚠️ Error en cálculos finales (puntos/logros): {e}")

        log("🎉 Sincronización COMPLETA.")
        return True, logs

    except Exception as e:
        log(f"❌ Error inesperado: {str(e)}")
        db.rollback()
        return False, logs