from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_
from typing import Set, List, Optional
from collections import defaultdict

# Modelos
from app.db.models.achievement import Achievement, UserAchievement, AchievementType
from app.db.models.prediction import Prediction
from app.db.models.prediction_position import PredictionPosition
from app.db.models.prediction_event import PredictionEvent
from app.db.models.race_result import RaceResult
from app.db.models.race_position import RacePosition
from app.db.models.race_event import RaceEvent
from app.db.models.grand_prix import GrandPrix
from app.db.models.user import User
from app.db.models.driver import Driver
from app.db.models.constructor import Constructor
from app.db.models.user_stats import UserStats, UserGpStats # <--- IMPORTANTE
from app.db.models.team_member import TeamMember

# ==============================================================================
# 0. CONFIGURACIÓN
# ==============================================================================

def get_dynamic_slugs() -> Set[str]:
    """
    Retorna la lista de logros cuya validez se comprueba dinámicamente.
    Si un logro NO está aquí, una vez concedido se considera PERMANENTE.
    """
    return {
        # Career Stats (Solo los basados en contadores acumulativos que podrían bajar)
        "career_500", "career_1000", "career_2500", 
        "career_50_gps", "career_50_exact", "career_goat",
        "career_100_exact", "career_10_full_podium",
        "career_5_fl", "career_10_fl", "career_5_sc", "career_10_sc",
        "career_5_dnf_count", "career_10_dnf_count", "career_5_dnf_driver", "career_10_dnf_driver",
        
        # Season Stats (Basados en puntos de la temporada actual)
        "season_100", "season_300", "season_500",
        
        # Eventos (Basados en el rendimiento de un GP específico)
        "event_25pts", "event_50pts", "event_diamante",
        "event_nostradamus", "event_el_profesor", "event_high_five", "event_sexto_sentido",
        "event_7_maravillas", "event_bola_8", "event_nube_9", "event_la_decima",
        "event_oracle", "event_mc", "event_el_narrador", "event_god", "event_casi_dios",
        "event_grand_chelem", "event_civil_war", "event_el_muro", "event_chaos",
        "event_francotirador_p10", "event_la_maldicion", "event_podio_invertido",
        "event_el_elegido", "event_el_sandwich", "event_lobo_solitario",
        "event_david_goliath", "event_el_optimista", "event_la_escoba", "event_maldonado"
    }

# ==============================================================================
# 1. GESTIÓN DE ESTADÍSTICAS (INCREMENTAL ROBUSTO + CACHÉ)
# ==============================================================================

def calculate_gp_metrics(prediction: Prediction, result: RaceResult) -> dict:
    """
    Compara predicción y resultado y devuelve un diccionario con los contadores.
    No guarda nada en DB, solo calcula lógica pura.
    """
    metrics = {
        "points": prediction.points or 0,
        "exact_positions": 0,
        "exact_podium_hit": False,
        "exact_top5_hit": False, # Nuevo
        "fastest_lap_hit": False,
        "safety_car_hit": False,
        "dnf_count_hit": False,
        "dnf_driver_hit": False,
        "p10_hit": False # Nuevo
    }

    if not result: return metrics

    u_pos = {p.position: p.driver_name for p in prediction.positions}
    r_pos = {p.position: p.driver_name for p in result.positions}
    u_evts = {e.event_type: e.value for e in prediction.events}
    r_evts = {e.event_type: e.value for e in result.events}

    # 1. Posiciones Exactas
    metrics["exact_positions"] = sum(1 for i in range(1, 11) if u_pos.get(i) == r_pos.get(i))

    # 2. Podio Exacto
    if (u_pos.get(1) == r_pos.get(1) and u_pos.get(2) == r_pos.get(2) and u_pos.get(3) == r_pos.get(3)):
        metrics["exact_podium_hit"] = True

    # 2b. Top 5 Exacto
    if metrics["exact_podium_hit"] and u_pos.get(4) == r_pos.get(4) and u_pos.get(5) == r_pos.get(5):
        metrics["exact_top5_hit"] = True

    # 2c. P10 hit
    if u_pos.get(10) == r_pos.get(10):
        metrics["p10_hit"] = True

    # 3. Eventos (Normalización básica de strings)
    if str(u_evts.get("FASTEST_LAP", "")).strip() == str(r_evts.get("FASTEST_LAP", "")).strip():
        metrics["fastest_lap_hit"] = True
        
    if str(u_evts.get("SAFETY_CAR", "")).lower().strip() == str(r_evts.get("SAFETY_CAR", "")).lower().strip():
        metrics["safety_car_hit"] = True
        
    if str(u_evts.get("DNFS", "")) == str(r_evts.get("DNFS", "")):
        metrics["dnf_count_hit"] = True

    # 4. DNF Driver
    u_dnf = str(u_evts.get("DNF_DRIVER", "")).strip()
    r_dnf_raw = str(r_evts.get("DNF_DRIVER", ""))
    r_dnf_list = [x.strip() for x in r_dnf_raw.split(",")]
    r_dnf_count = int(r_evts.get("DNFS", 0))

    if r_dnf_count == 0 and u_dnf in ["", "0", "None", "-", "no"]:
        metrics["dnf_driver_hit"] = True
    elif r_dnf_count > 0 and u_dnf and u_dnf in r_dnf_list:
        metrics["dnf_driver_hit"] = True

    return metrics


def update_stats_incremental(db: Session, user_id: int, gp: GrandPrix) -> UserStats:
    """
    Actualiza UserStats usando UserGpStats como caché intermedia.
    Permite re-ejecutar el mismo GP y corrige los datos (Restar anterior, Sumar nuevo).
    """
    # 1. Obtener Stats Globales
    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
    if not stats:
        stats = UserStats(user_id=user_id)
        db.add(stats)

    # 2. Protección de orden cronológico:
    # No calculamos GPs pasados si ya vamos por delante, a menos que sea un Rebuild forzado.
    # Pero si es el mismo GP que el último jugado (o posterior), permitimos la actualización.
    if stats.last_gp_played_id and gp.id < stats.last_gp_played_id:
        # Podríamos lanzar warning, pero simplemente devolvemos stats sin tocar
        return stats

    # 3. Obtener Predicción y Resultado
    pred = db.query(Prediction).filter(Prediction.user_id == user_id, Prediction.gp_id == gp.id).first()
    if not pred or not gp.race_result: 
        return stats

    # 4. Calcular Métricas ACTUALES de este GP (En memoria)
    new = calculate_gp_metrics(pred, gp.race_result)

    # 5. Buscar si ya existían métricas guardadas para este GP (La "Caché")
    gp_stats = db.query(UserGpStats).filter(UserGpStats.user_id == user_id, UserGpStats.gp_id == gp.id).first()

    if gp_stats:
        # --- MODO CORRECCIÓN: RESTAR LO VIEJO ---
        stats.total_points -= gp_stats.points
        
        # Asumimos que estamos corrigiendo la temporada actual
        if gp.season_id == gp.season_id: 
            stats.current_season_points -= gp_stats.points
        
        stats.exact_positions_count -= gp_stats.exact_positions
        if gp_stats.exact_podium_hit: stats.exact_podiums_count -= 1
        if gp_stats.fastest_lap_hit: stats.fastest_lap_hits -= 1
        if gp_stats.safety_car_hit: stats.safety_car_hits -= 1
        if gp_stats.dnf_count_hit: stats.dnf_count_hits -= 1
        if gp_stats.dnf_driver_hit: stats.dnf_driver_hits -= 1
        
    else:
        # --- MODO NUEVO: CREAR CACHÉ ---
        gp_stats = UserGpStats(user_id=user_id, gp_id=gp.id)
        stats.total_gps_played += 1
        db.add(gp_stats)

    # 6. --- APLICAR: SUMAR LO NUEVO ---
    stats.total_points += new["points"]
    stats.current_season_points += new["points"]
    
    stats.exact_positions_count += new["exact_positions"]
    if new["exact_podium_hit"]: stats.exact_podiums_count += 1
    if new["fastest_lap_hit"]: stats.fastest_lap_hits += 1
    if new["safety_car_hit"]: stats.safety_car_hits += 1
    if new["dnf_count_hit"]: stats.dnf_count_hits += 1
    if new["dnf_driver_hit"]: stats.dnf_driver_hits += 1

    # Actualizar metadatos de "último jugado"
    if not stats.last_gp_played_id or gp.id >= stats.last_gp_played_id:
        stats.last_gp_played_id = gp.id
        stats.last_gp_played_date = gp.race_datetime

    # 7. Actualizar la "Caché" con los nuevos valores para el futuro
    gp_stats.points = new["points"]
    gp_stats.exact_positions = new["exact_positions"]
    gp_stats.exact_podium_hit = new["exact_podium_hit"]
    gp_stats.fastest_lap_hit = new["fastest_lap_hit"]
    gp_stats.safety_car_hit = new["safety_car_hit"]
    gp_stats.dnf_count_hit = new["dnf_count_hit"]
    gp_stats.dnf_driver_hit = new["dnf_driver_hit"]

    # db.commit() <- REMOVIDO PARA BATCH
    return stats

# ==============================================================================
# 2. CALCULADORA DE LOGROS (CHECKERS)
# ==============================================================================

def check_event_achievements(
    db: Session, 
    user_id: int, 
    gp: GrandPrix, 
    prediction: Optional[Prediction] = None,
    context: Optional[dict] = None
) -> Set[str]:
    """Verifica logros tipo EVENT basándose ÚNICAMENTE en el GP actual."""
    unlocks = set()
    
    pred = prediction or db.query(Prediction).filter(Prediction.user_id == user_id, Prediction.gp_id == gp.id).first()
    if not pred or not gp.race_result: return unlocks
    
    m = calculate_gp_metrics(pred, gp.race_result)
    points = m["points"]
    if points > 0: unlocks.add("event_first")
    if points > 25: unlocks.add("event_25pts")
    if points > 50: unlocks.add("event_50pts")
    if points > 75: unlocks.add("event_diamante")
    if points == 0: unlocks.add("event_maldonado")

    if m["exact_podium_hit"]: unlocks.add("event_nostradamus")
    if m["exact_top5_hit"]: unlocks.add("event_el_profesor")

    hits = m["exact_positions"]
    if hits >= 5: unlocks.add("event_high_five")
    if hits >= 6: unlocks.add("event_sexto_sentido") # Nuevo
    if hits >= 7: unlocks.add("event_7_maravillas") # Nuevo
    if hits >= 8: unlocks.add("event_bola_8") # Nuevo
    if hits >= 9: unlocks.add("event_nube_9") # Nuevo
    if hits >= 10: unlocks.add("event_la_decima")
    
    if m["p10_hit"]: unlocks.add("event_francotirador_p10") # Nuevo

    # --- EVENTOS PERFECTOS ---
    events_hit_count = sum([m["safety_car_hit"], m["fastest_lap_hit"], m["dnf_count_hit"], m["dnf_driver_hit"]])
    if events_hit_count == 4: 
        unlocks.add("event_mc")
        unlocks.add("event_el_narrador") # Renegombrado/Nuevo

    # --- COMBINADOS (DIOS / CASI DIOS) ---
    # Dios: 10 posiciones + 4 eventos
    if hits == 10 and events_hit_count == 4: 
        unlocks.add("event_god")
    
    # Casi Dios: (10 pos + 3 ev) OR (9 pos + 4 ev)
    if (hits == 10 and events_hit_count == 3) or (hits == 9 and events_hit_count == 4):
        unlocks.add("event_casi_dios")

    # --- ORACLE (Top 10 presencia) ---
    u_pos = {p.position: p.driver_name for p in pred.positions}
    r_pos = {p.position: p.driver_name for p in gp.race_result.positions}
    u_evts = {e.event_type: e.value for e in pred.events}
    r_evts = {e.event_type: e.value for e in gp.race_result.events}

    real_top10 = {r_pos.get(i) for i in range(1,11) if r_pos.get(i)}
    user_top10 = {u_pos.get(i) for i in range(1,11) if u_pos.get(i)}
    if len(real_top10) == 10 and real_top10 == user_top10: unlocks.add("event_oracle")
    
    # --- GRAND CHELEM ---
    hit_p1 = u_pos.get(1) == r_pos.get(1)
    if m["safety_car_hit"] and m["fastest_lap_hit"] and hit_p1: unlocks.add("event_grand_chelem")

    # --- CAOS / OPTIMISTA ---
    real_dnf_num = int([e.value for e in gp.race_result.events if e.event_type == "DNFS"][0] or 0)
    user_dnf_num = int([e.value for e in pred.events if e.event_type == "DNFS"][0] or 0)
    
    if real_dnf_num > 4 and m["dnf_count_hit"]: unlocks.add("event_chaos")
    if user_dnf_num == 0 and m["dnf_count_hit"]: unlocks.add("event_el_optimista") # Nuevo

    # --- LA ESCOBA (VR Ok, pero Piloto NO en Podio) ---
    vr_driver = str(r_evts.get("FASTEST_LAP", ""))
    podium_drivers = [r_pos.get(1), r_pos.get(2), r_pos.get(3)]
    if m["fastest_lap_hit"] and vr_driver not in podium_drivers:
        unlocks.add("event_la_escoba") # Nuevo

    # --- LA MALDICIÓN (Tu P1 es DNF) ---
    my_p1 = u_pos.get(1)
    real_dnf_list = [x.strip() for x in str(r_evts.get("DNF_DRIVER", "")).split(",")]
    if my_p1 in real_dnf_list:
        unlocks.add("event_la_maldicion") # Nuevo

    # --- PODIO INVERTIDO ---
    # Real: 1:A, 2:B, 3:C -> User: 1:C, 2:B, 3:A
    if (u_pos.get(1) == r_pos.get(3) and 
        u_pos.get(2) == r_pos.get(2) and 
        u_pos.get(3) == r_pos.get(1)):
        unlocks.add("event_podio_invertido") # Nuevo

    # --- EL SANDWICH (P1 ok, P3 ok, P2 fail) ---
    hit_p3 = u_pos.get(3) == r_pos.get(3)
    hit_p2 = u_pos.get(2) == r_pos.get(2)
    if hit_p1 and hit_p3 and not hit_p2:
        unlocks.add("event_el_sandwich") # Nuevo
    
    # --- EL ELEGIDO (Solo P1 acertado, todo lo demás fallado) ---
    # Verifica que points no sea 0 (implica que P1 puntuó) y que exact_positions sea 1 (solo P1)
    # y además que eventos sea 0. Ojo: "points" puede venir de P1, pero también de proximidad.
    # El requisito dice "Acertar solo al Ganador (P1) y fallar absolutamente todas las demás posiciones y eventos".
    if hit_p1 and hits == 1 and events_hit_count == 0:
        # Falta asegurar que NO acertó posiciones parciales (ej: P4 en P5).
        # Verificamos que para i=2..10, u_pos[i] != r_pos[i]. Ya cubierto por hits==1.
        # ¿Y si acertó P2 en P3? Eso da puntos pero no es hit exacto.
        # El user dice "sacar puntos solo por el ganador". El sistema de puntos da puntos por acierto exacto.
        # Asumiremos la interpretación estricta: Hits=1 (P1) y Events=0.
        unlocks.add("event_el_elegido")

    # --- CIVIL WAR (1-2 Compañeros) ---
    p1, p2 = u_pos.get(1), u_pos.get(2)
    if p1 and p2 and p1 == r_pos.get(1) and p2 == r_pos.get(2):
        d1 = db.query(Driver).filter_by(code=p1).first()
        d2 = db.query(Driver).filter_by(code=p2).first()
        if d1 and d2 and d1.constructor_id == d2.constructor_id:
            unlocks.add("event_civil_war")
    
    # --- EL MURO (Compañeros consecutivos) ---
    # Buscar si existen i, i+1 tal que u_pos[i] y u_pos[i+1] sean compañeros Y acertados.
    # La descripción dice: "Acertar que dos compañeros de equipo acaban consecutivos (ej: P5 y P6)".
    # Entiendo que deben ser ACIERTOS.
    found_wall = False
    for i in range(1, 10):
        da = u_pos.get(i)
        db_drv = u_pos.get(i+1)
        # Ambos acertados
        if da == r_pos.get(i) and db_drv == r_pos.get(i+1):
            driver_a = db.query(Driver).filter_by(code=da).first()
            driver_b = db.query(Driver).filter_by(code=db_drv).first()
            if driver_a and driver_b and driver_a.constructor_id == driver_b.constructor_id:
                found_wall = True
                break
    if found_wall: unlocks.add("event_el_muro") # Nuevo

    # --- JOIN TEAM ---
    has_team = db.query(TeamMember).filter(TeamMember.user_id == user_id, TeamMember.season_id == gp.season_id).first()
    if has_team: unlocks.add("event_join_team")

    # --- LOBO SOLITARIO & DAVID vs GOLIATH (Globales) ---
    # Requieren contexto de OTROS usuarios.
    
    # 1. Obtener puntos de todos en este GP
    all_preds = db.query(Prediction.user_id, Prediction.points).filter(Prediction.gp_id == gp.id).all()
    if all_preds:
        max_points = max(p.points for p in all_preds)
        
        # Lobo Solitario: Ser MVP (max_points) Y no tener equipo
        if points == max_points and not has_team:
            unlocks.add("event_lobo_solitario")

        # David vs Goliath: Sacar el doble que el Líder del Mundial
        # ¿Quién es el líder? El que tenga más current_season_points antes de sumar este GP o incluyendo?
        # Normalmente "Líder del Mundial" es el que va primero en la general.
        # Usaremos UserStats (que ya tiene los puntos actualizados con este GP si se corrió update_stats).
        # Aunque update_stats se corre user a user.
        # Haremos una query rápida para ver quién tiene más puntos en UserStats.
        leader_stat = db.query(UserStats).order_by(desc(UserStats.current_season_points)).first()
        if leader_stat:
            # Puntos que sacó el líder en ESTE GP.
            leader_pred = db.query(Prediction).filter(Prediction.user_id == leader_stat.user_id, Prediction.gp_id == gp.id).first()
            leader_gp_points = leader_pred.points if leader_pred else 0
            
            if points >= (leader_gp_points * 2) and leader_gp_points > 0:
                 unlocks.add("event_david_goliath")

    return unlocks

def check_career_season_achievements(db: Session, user_id: int, stats: UserStats) -> Set[str]:
    """Verifica logros CAREER y SEASON contra los Stats Acumulados."""
    unlocks = set()
    
    # CAREER (Acumulativo Global)
    if stats.total_gps_played >= 1: unlocks.add("career_debut")
    if stats.total_points >= 500: unlocks.add("career_500")
    if stats.total_points >= 1000: unlocks.add("career_1000")
    if stats.total_points >= 2500: unlocks.add("career_2500")
    if stats.total_gps_played >= 50: unlocks.add("career_50_gps")
    if stats.exact_positions_count >= 50: unlocks.add("career_50_exact")
    
    # NUEVOS
    if stats.total_points >= 5000: unlocks.add("career_goat")
    if stats.exact_positions_count >= 100: unlocks.add("career_100_exact")
    if stats.exact_podiums_count >= 10: unlocks.add("career_10_full_podium")
    if stats.safety_car_hits >= 5: unlocks.add("career_5_sc")
    if stats.safety_car_hits >= 10: unlocks.add("career_10_sc")
    if stats.fastest_lap_hits >= 5: unlocks.add("career_5_fl")
    if stats.fastest_lap_hits >= 10: unlocks.add("career_10_fl")
    if stats.dnf_count_hits >= 5: unlocks.add("career_5_dnf_count")
    if stats.dnf_count_hits >= 10: unlocks.add("career_10_dnf_count")
    if stats.dnf_driver_hits >= 5: unlocks.add("career_5_dnf_driver")
    if stats.dnf_driver_hits >= 10: unlocks.add("career_10_dnf_driver")

    # SEASON (Acumulativo Temporada Actual)
    if stats.current_season_points >= 100: unlocks.add("season_100")
    if stats.current_season_points >= 300: unlocks.add("season_300")
    if stats.current_season_points >= 500: unlocks.add("season_500")
    
    return unlocks

def check_season_finale_achievements(db: Session, user_id: int, season_id: int, stats_all: List[UserStats]) -> Set[str]:
    """
    Logros que SOLO se dan al cerrar la temporada (Campeón, Mochila).
    """
    unlocks = set()
    
    rank = next((i+1 for i, s in enumerate(stats_all) if s.user_id == user_id), 999)
    if rank == 1: unlocks.add("career_champion")
    if rank == 2: unlocks.add("career_runner_up")
    if rank == 3: unlocks.add("career_bronze")

    stat_entry = next((s for s in stats_all if s.user_id == user_id), None)
    if stat_entry:
        tm = db.query(TeamMember).filter(TeamMember.user_id == user_id, TeamMember.season_id == season_id).first()
        if tm:
            mates = db.query(TeamMember.user_id).filter(TeamMember.team_id == tm.team_id, TeamMember.season_id == season_id).all()
            mate_ids = [m[0] for m in mates]
            if len(mate_ids) > 1:
                team_stats = [s for s in stats_all if s.user_id in mate_ids]
                if team_stats:
                    team_pts = [s.current_season_points for s in team_stats]
                    if stat_entry.current_season_points == max(team_pts): unlocks.add("season_squad_leader")
                    if stat_entry.current_season_points == min(team_pts): unlocks.add("season_backpack")
    
    return unlocks

# ==============================================================================
# 3. VERIFICACIÓN HISTÓRICA
# ==============================================================================

def verify_historical_validity(db: Session, user_id: int, slug: str) -> bool:
    """Verifica si el usuario CUMPLE el criterio en CUALQUIER GP pasado usando UserGpStats."""
    if slug == "event_join_team":
        return db.query(TeamMember).filter(TeamMember.user_id == user_id).first() is not None
    if slug == "event_first":
        return db.query(UserGpStats).filter(UserGpStats.user_id == user_id).first() is not None

    query = db.query(UserGpStats).filter(UserGpStats.user_id == user_id)
    if slug == "event_25pts": query = query.filter(UserGpStats.points > 25)
    elif slug == "event_50pts": query = query.filter(UserGpStats.points > 50)
    elif slug == "event_diamante": query = query.filter(UserGpStats.points > 75)
    elif slug == "event_maldonado": query = query.filter(UserGpStats.points == 0)
    elif slug == "event_nostradamus": query = query.filter(UserGpStats.exact_podium_hit == True)
    elif slug == "event_high_five": query = query.filter(UserGpStats.exact_positions >= 5)
    elif slug == "event_la_decima": query = query.filter(UserGpStats.exact_positions >= 10)
    elif slug == "event_mc" or slug == "event_el_narrador":
        query = query.filter(UserGpStats.fastest_lap_hit == True, UserGpStats.safety_car_hit == True, 
                             UserGpStats.dnf_count_hit == True, UserGpStats.dnf_driver_hit == True)
    else:
        # Para logros complejos (Civil War, Wall, etc), recurrimos a la lógica antigua solo si es necesario
        # pero por ahora, la mayoría de dynamic slugs 'EVENT' son capturables en UserGpStats o son 'SEASON/CAREER'
        return True 

    return query.first() is not None

# ==============================================================================
# 4. ORQUESTADOR PRINCIPAL
# ==============================================================================

def grant_achievements(
    db: Session, 
    user_id: int, 
    slugs: List[str], 
    season_id: int = None, 
    gp_id: int = None,
    context: Optional[dict] = None
):
    new_achs = []
    # Usar contexto para batch o query individual para normal/legacy
    if context:
        user_existing = context["user_achievements"].get(user_id, set())
        for slug in slugs:
            ach = context["achievements"].get(slug)
            if not ach or ach.id in user_existing: continue
            
            print(f"🏆 DESBLOQUEADO: {slug}")
            save_gp = gp_id if ach.type in [AchievementType.EVENT, AchievementType.CAREER] else None
            db.add(UserAchievement(user_id=user_id, achievement_id=ach.id, season_id=season_id, gp_id=save_gp))
            user_existing.add(ach.id)
    else:
        existing_rows = db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
        already_has_ids = {r.achievement_id for r in existing_rows}
        for slug in slugs:
            ach = db.query(Achievement).filter_by(slug=slug).first()
            if not ach or ach.id in already_has_ids: continue
            
            print(f"🏆 DESBLOQUEADO (individual): {slug}")
            save_gp = gp_id if ach.type in [AchievementType.EVENT, AchievementType.CAREER] else None
            db.add(UserAchievement(user_id=user_id, achievement_id=ach.id, season_id=season_id, gp_id=save_gp))
            already_has_ids.add(ach.id)
        db.commit()


def sync_achievements(db: Session, user_id: int, current_gp: GrandPrix):
    """
    Sincroniza logros usando el método INCREMENTAL.
    """
    # 1. Stats Actuales (Incremental con soporte de Corrección)
    stats = update_stats_incremental(db, user_id, current_gp)
    
    # 2. Qué debería tener HOY
    should_have = set()
    should_have.update(check_career_season_achievements(db, user_id, stats))
    should_have.update(check_event_achievements(db, user_id, current_gp))
    
    # 3. GRANT
    grant_achievements(
        db, 
        user_id, 
        list(should_have), 
        season_id=current_gp.season_id,
        gp_id=current_gp.id
    )
    
    # 4. REVOKE
    current_achs_rows = db.query(UserAchievement, Achievement.slug, Achievement.type)\
        .join(Achievement).filter(UserAchievement.user_id == user_id).all()
        
    dynamic_slugs = get_dynamic_slugs()

    for ua, slug, atype in current_achs_rows:
        if slug not in dynamic_slugs: continue
        if atype == AchievementType.SEASON:
            if ua.season_id is not None and ua.season_id != current_gp.season_id:
                continue 
        
        if slug not in should_have:
            must_delete = True
            if atype == AchievementType.EVENT:
                if verify_historical_validity(db, user_id, slug):
                    must_delete = False
            
            if must_delete:
                print(f"🚫 REVOCADO: {slug} (Season {ua.season_id})")
                db.delete(ua)
            
    db.commit()

# Entry Points
def evaluate_race_achievements(db: Session, gp_id: int):
    """Orquestador BATCH: Procesa todos los usuarios de un GP en una sola transacción."""
    gp = db.query(GrandPrix).options(
        joinedload(GrandPrix.race_result).joinedload(RaceResult.positions),
        joinedload(GrandPrix.race_result).joinedload(RaceResult.events)
    ).get(gp_id)
    if not gp: return

    preds = db.query(Prediction).options(joinedload(Prediction.positions), joinedload(Prediction.events))\
        .filter(Prediction.gp_id == gp_id).all()
    uids = [p.user_id for p in preds]
    
    # 1. Cargas masivas iniciales
    ach_defs = {a.slug: a for a in db.query(Achievement).all()}
    stats_map = {s.user_id: s for s in db.query(UserStats).filter(UserStats.user_id.in_(uids)).all()}
    for uid in uids:
        if uid not in stats_map:
            stats_map[uid] = UserStats(user_id=uid); db.add(stats_map[uid])

    user_ach_rows = db.query(UserAchievement).options(joinedload(UserAchievement.achievement))\
        .filter(UserAchievement.user_id.in_(uids)).all()
    user_ach_map = defaultdict(set)
    for row in user_ach_rows: user_ach_map[row.user_id].add(row.achievement_id)

    # 2. Contexto global
    max_gp_points = max((p.points for p in preds), default=0)
    leader_stat = db.query(UserStats).order_by(desc(UserStats.current_season_points)).first()
    leader_gp_points = 0
    if leader_stat:
        lp = next((p for p in preds if p.user_id == leader_stat.user_id), None)
        leader_gp_points = lp.points if lp else 0

    ctx = {
        "achievements": ach_defs,
        "user_achievements": user_ach_map,
        "drivers": {d.code: d for d in db.query(Driver).all()},
        "team_members": {tm.user_id: tm for tm in db.query(TeamMember).filter(TeamMember.user_id.in_(uids), TeamMember.season_id == gp.season_id).all()},
        "max_gp_points": max_gp_points,
        "leader_gp_points": leader_gp_points
    }

    # 3. Procesar Usuarios
    for pred in preds:
        uid = pred.user_id
        stats = update_stats_incremental(db, uid, gp)
        
        should_have = check_career_season_achievements(db, uid, stats)
        should_have.update(check_event_achievements(db, uid, gp, prediction=pred, context=ctx))
        
        # Grant
        grant_achievements(db, uid, list(should_have), season_id=gp.season_id, gp_id=gp.id, context=ctx)
        
        # Revoke (Simplified batch)
        # Solo verificamos revocación si el logro es dinámico
        dynamic_slugs = get_dynamic_slugs()
        user_rows = [r for r in user_ach_rows if r.user_id == uid]
        for ua in user_rows:
            ach = ach_defs.get(ua.achievement.slug) if hasattr(ua, 'achievement') else db.query(Achievement).get(ua.achievement_id)
            slug = ach.slug
            if slug not in dynamic_slugs: continue
            if slug not in should_have:
                if ach.type == AchievementType.EVENT:
                    if not verify_historical_validity(db, uid, slug):
                        db.delete(ua)
                else:
                    db.delete(ua)

    db.commit()
    print(f"✅ Proceso batch completado para GP {gp_id}")

def evaluate_season_finale_achievements(db: Session, season_id: int):
    """
    Evalúa premios finales aplicando lógica WIPE & ASSIGN.
    1. Borra todos los logros de final de temporada existentes para esa season_id.
    2. Recalcula quién los merece ahora (basado en los stats ya corregidos).
    3. Los otorga de nuevo.
    """
    print(f"🏆 Evaluando Premios Finales Temporada {season_id} (Modo Wipe & Assign)...")
    
    # --- 0. WIPE (LIMPIEZA DE PREMIOS ANTERIORES) ---
    # Definimos qué logros son exclusivos de final de temporada
    finale_slugs = [
        "career_champion", 
        "career_runner_up", 
        "career_bronze", 
        "season_squad_leader", 
        "season_backpack"
    ]
    
    # Obtenemos los IDs de estos logros
    target_achs = db.query(Achievement.id).filter(Achievement.slug.in_(finale_slugs)).all()
    target_ids = [t[0] for t in target_achs]
    
    if target_ids:
        deleted_count = db.query(UserAchievement).filter(
            UserAchievement.season_id == season_id,
            UserAchievement.achievement_id.in_(target_ids)
        ).delete(synchronize_session=False)
        
        db.commit()
        print(f"🧹 Se han revocado {deleted_count} logros antiguos de la temporada {season_id}.")

    # --- 1. ASSIGN (CÁLCULO Y ASIGNACIÓN NUEVA) ---
    # Nota: No necesitamos recalcular stats aquí, confiamos en que update_stats_incremental 
    # ya tiene los UserStats al día.
    
    all_users = db.query(User).all()
    uids = [u.id for u in all_users]
    ach_defs = {a.slug: a for a in db.query(Achievement).all()}
    
    # Pre-cargar logros actuales para el context
    user_ach_rows = db.query(UserAchievement).filter(UserAchievement.user_id.in_(uids)).all()
    user_ach_map = defaultdict(set)
    for row in user_ach_rows: user_ach_map[row.user_id].add(row.achievement_id)

    ctx = {"achievements": ach_defs, "user_achievements": user_ach_map}

    # Cargar y ordenar stats una sola vez para el check de finale
    stats_all = db.query(UserStats)\
        .filter(UserStats.last_gp_played_id.isnot(None))\
        .order_by(desc(UserStats.current_season_points))\
        .all()

    for user in all_users:
        slugs = check_season_finale_achievements(db, user.id, season_id, stats_all)
        if slugs: 
            grant_achievements(db, user.id, list(slugs), season_id=season_id, gp_id=None, context=ctx)

    db.commit()

    print(f"✅ Evaluación de temporada {season_id} completada.")
    
def rebuild_all_achievements(db: Session):
    """
    ⚠️ DANGER ZONE: Recalcula TODO desde cero (Stats + Achievements).
    1. Borra user_stats, user_gp_stats, user_achievements.
    2. Recorre GPs pasados y ejecuta sync_achievements.
    3. Al final de cada temporada, ejecuta evaluate_season_finale_achievements.
    """
    print("🔥 INICIANDO RECONSTRUCCIÓN TOTAL DE LOGROS Y ESTADÍSTICAS...")
    
    # 1. Resetear Tablas
    db.query(UserAchievement).delete()
    db.query(UserStats).delete()
    db.query(UserGpStats).delete()
    db.commit()

    # 2. Obtener todos los GPs pasados ordenados por fecha
    from datetime import datetime
    past_gps = db.query(GrandPrix)\
        .filter(GrandPrix.race_datetime <= datetime.utcnow())\
        .order_by(GrandPrix.race_datetime.asc())\
        .all()

    users = db.query(User).all()
    user_ids = [u.id for u in users]
    
    # Agrupar GPs por temporada para saber cuándo cerrar temporada
    from collections import defaultdict
    gps_by_season = defaultdict(list)
    for gp in past_gps:
        if gp.race_result: # Solo procesar si tiene resultados
            gps_by_season[gp.season_id].append(gp)

    # 3. Re-procesar uno a uno cronológicamente
    # Pero cuidado, si iteramos por seasons separadas podríamos perder orden cronológico inter-season (raro pero posible).
    # Mejor iterar la lista plana y detectar fin de season.
    
    processed_seasons = set()
    
    for gp in past_gps:
        if not gp.race_result: continue
        
        print(f"   ⟳ Procesando GP: {gp.name} (Season {gp.season_id})...")
        
        # Sincronizar (Stats + Event Achievements)
        evaluate_race_achievements(db, gp.id)
            
        # Check if this is the last GP of the season (that has happened so far)
        # O si es la última carrera programada de la temporada.
        # Si la temporada ya acabó, deberíamos cerrar.
        # Simplificación: Al final de procesar un GP, miramos si era el último de esa season en nuestra lista de 'past_gps'.
        season_gps = gps_by_season[gp.season_id]
        if season_gps[-1].id == gp.id:
            # Es el último GP jugado de esta temporada
            # ¿Pero ha terminado la temporada?
            # Asumiremos que si estamos reconstruyendo, queremos dar los premios de final de temporada
            # si ya se han jugado todos los GPs previstos O si es una temporada pasada.
            # Por simplicidad: Siempre evaluamos "Season Finale" al terminar el último GP disponible de una season.
            # Si luego hay más carreras, se recalculará.
            print(f"   🏆 Cerrando Temporada {gp.season_id}...")
            evaluate_season_finale_achievements(db, gp.season_id)

    print("✅ RECONSTRUCCIÓN COMPLETADA.")