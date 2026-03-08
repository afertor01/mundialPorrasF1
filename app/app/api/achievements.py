# app/api/achievements.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.db.session import SessionLocal
from app.core.deps import get_current_user
from app.db.models.user import User
from app.db.models.achievement import Achievement, UserAchievement, AchievementRarity, AchievementType
from app.db.models.grand_prix import GrandPrix
from app.db.models.season import Season # Import necesario para el joinedload

router = APIRouter(prefix="/achievements", tags=["Achievements"])

# --- MAPEO COMPLETO DE LOGROS ---
ACHIEVEMENT_DEFINITIONS = [
    # --- CAREER (Acumulativos Globales) ---
    {"slug": "career_debut", "name": "Debutante", "desc": "Completar 1 GP.", "icon": "Flag", "rare": "COMMON", "type": "CAREER"},
    {"slug": "career_500", "name": "Prospecto", "desc": "500 puntos totales.", "icon": "TrendingUp", "rare": "COMMON", "type": "CAREER"},
    {"slug": "career_1000", "name": "Veterano", "desc": "1.000 puntos totales.", "icon": "Award", "rare": "RARE", "type": "CAREER"},
    {"slug": "career_2500", "name": "Leyenda", "desc": "2.500 puntos totales.", "icon": "Star", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_50_gps", "name": "Medio Siglo", "desc": "Participar en 50 GPs.", "icon": "Calendar", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_50_exact", "name": "Francotirador", "desc": "50 aciertos de posición exacta.", "icon": "Crosshair", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_champion", "name": "Campeón del Mundo", "desc": "Ganar una temporada.", "icon": "Trophy", "rare": "LEGENDARY", "type": "CAREER"},
    {"slug": "career_goat", "name": "G.O.A.T.", "desc": "Alcanzar 5.000 puntos totales.", "icon": "Crown", "rare": "LEGENDARY", "type": "CAREER"},
    {"slug": "career_runner_up", "name": "Eterno Segundo", "desc": "Subcampeón de una temporada.", "icon": "Medal", "rare": "LEGENDARY", "type": "CAREER"},
    {"slug": "career_bronze", "name": "Podio Mundial", "desc": "Tercer puesto en una temporada.", "icon": "Medal", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_100_exact", "name": "Ojo de Halcón", "desc": "100 aciertos de posición exacta.", "icon": "Target", "rare": "LEGENDARY", "type": "CAREER"},
    {"slug": "career_10_full_podium", "name": "Rey del Pleno", "desc": "10 Podios Exactos (1º, 2º y 3º).", "icon": "Trophy", "rare": "LEGENDARY", "type": "CAREER"},
    {"slug": "career_5_fl", "name": "Pie a Tabla", "desc": "Acertar 5 Vueltas Rápidas.", "icon": "Gauge", "rare": "RARE", "type": "CAREER"},
    {"slug": "career_10_fl", "name": "Recordman", "desc": "Acertar 10 Vueltas Rápidas.", "icon": "Zap", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_5_sc", "name": "Control de Carrera", "desc": "Acertar 5 veces el Safety Car.", "icon": "AlertTriangle", "rare": "RARE", "type": "CAREER"},
    {"slug": "career_10_sc", "name": "Maylander", "desc": "Acertar 10 veces el Safety Car.", "icon": "Shield", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_5_dnf_count", "name": "Caos Controlado", "desc": "Acertar 5 veces el nº de DNFs.", "icon": "Activity", "rare": "RARE", "type": "CAREER"},
    {"slug": "career_10_dnf_count", "name": "Mundial de Destructores", "desc": "Acertar 10 veces el nº de DNFs.", "icon": "Skull", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_5_dnf_driver", "name": "La Parca", "desc": "Acertar 5 veces quién abandona.", "icon": "Ghost", "rare": "EPIC", "type": "CAREER"},
    {"slug": "career_10_dnf_driver", "name": "Destino Final", "desc": "Acertar 10 veces quién abandona.", "icon": "UserX", "rare": "LEGENDARY", "type": "CAREER"},

    # --- SEASON (Metas Anuales) ---
    {"slug": "season_100", "name": "Centurión", "desc": "100 puntos en una temporada.", "icon": "Battery", "rare": "COMMON", "type": "SEASON"},
    {"slug": "season_300", "name": "300", "desc": "300 puntos en una temporada.", "icon": "BatteryCharging", "rare": "RARE", "type": "SEASON"},
    {"slug": "season_500", "name": "Elite", "desc": "500 puntos en una temporada.", "icon": "Zap", "rare": "EPIC", "type": "SEASON"},
    {"slug": "season_squad_leader", "name": "Líder de Escuadra", "desc": "Ganar a tu compañero de equipo.", "icon": "UserCheck", "rare": "RARE", "type": "SEASON"},
    {"slug": "season_backpack", "name": "El Mochila", "desc": "Perder contra tu compañero de equipo.", "icon": "ShoppingBag", "rare": "HIDDEN", "type": "SEASON"},

    # --- EVENT (Jornada a Jornada) ---
    {"slug": "event_first", "name": "Lights Out!", "desc": "Primera predicción enviada.", "icon": "Play", "rare": "COMMON", "type": "EVENT"},
    {"slug": "event_join_team", "name": "Team Player", "desc": "Unirse a una escudería.", "icon": "Users", "rare": "COMMON", "type": "EVENT"},
    {"slug": "event_founder", "name": "Jefe de Equipo", "desc": "Fundar una escudería.", "icon": "ShieldCheck", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_25pts", "name": "Buen Botín", "desc": "+25 puntos en un GP.", "icon": "DollarSign", "rare": "COMMON", "type": "EVENT"},
    {"slug": "event_50pts", "name": "Gran Cosecha", "desc": "+50 puntos en un GP.", "icon": "Package", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_diamante", "name": "Diamante", "desc": "+75 puntos en un GP.", "icon": "Diamond", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_nostradamus", "name": "Nostradamus", "desc": "Acertar el Podio exacto.", "icon": "CrystalBall", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_el_profesor", "name": "El Profesor", "desc": "Acertar el Top 5 exacto.", "icon": "GraduationCap", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_high_five", "name": "High Five", "desc": "Acertar 5 posiciones exactas.", "icon": "Hand", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_sexto_sentido", "name": "Sexto Sentido", "desc": "Acertar 6 posiciones exactas.", "icon": "Eye", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_7_maravillas", "name": "7 Maravillas", "desc": "Acertar 7 posiciones exactas.", "icon": "Globe", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_bola_8", "name": "Bola 8", "desc": "Acertar 8 posiciones exactas.", "icon": "Disc", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_nube_9", "name": "Nube 9", "desc": "Acertar 9 posiciones exactas.", "icon": "Cloud", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_la_decima", "name": "La Décima", "desc": "Acertar 10 posiciones exactas.", "icon": "Award", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_oracle", "name": "Oráculo", "desc": "Acertar los 10 pilotos en puntos (orden irrelevante).", "icon": "Eye", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_mc", "name": "Maestro de Ceremonias", "desc": "Acertar todos los eventos (SC, VR, DNF).", "icon": "Mic", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_el_narrador", "name": "El Narrador", "desc": "Acertar absolutamente todos los eventos de carrera.", "icon": "BookOpen", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_god", "name": "Dios de la F1", "desc": "Puntuación perfecta (Posiciones + Eventos).", "icon": "Sun", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_casi_dios", "name": "Casi Dios", "desc": "Fallo mínimo (9 pos + 4 ev o 10 pos + 3 ev).", "icon": "ZapOff", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_grand_chelem", "name": "Grand Chelem", "desc": "Acertar SC + VR + Ganador.", "icon": "Maximize", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_civil_war", "name": "Civil War", "desc": "Acertar un 1-2 de compañeros de equipo.", "icon": "Swords", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_el_muro", "name": "El Muro", "desc": "Acertar que dos compañeros de equipo acaban consecutivos.", "icon": "BrickWall", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_chaos", "name": "Caos", "desc": "Acertar el nº de DNFs en carrera accidentada (>4).", "icon": "AlertTriangle", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_francotirador_p10", "name": "Francotirador P10", "desc": "Acertar exactamente quién acaba en P10.", "icon": "Target", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_la_maldicion", "name": "La Maldición", "desc": "Tu apuesta a Ganador (P1) acabó en DNF.", "icon": "Skull", "rare": "COMMON", "type": "EVENT"},
    {"slug": "event_podio_invertido", "name": "Podio Invertido", "desc": "Acertar el podio pero en orden inverso (3, 2, 1).", "icon": "RefreshCcw", "rare": "EPIC", "type": "EVENT"},
    {"slug": "event_el_elegido", "name": "El Elegido", "desc": "Acertar solo al Ganador y fallar todo lo demás.", "icon": "Fingerprint", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_el_sandwich", "name": "El Sandwich", "desc": "Acertar P1 y P3 pero fallar el P2.", "icon": "Layers", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_lobo_solitario", "name": "Lobo Solitario", "desc": "Ser el jugador con más puntos sin pertenecer a una escudería.", "icon": "Moon", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_david_goliath", "name": "David vs Goliath", "desc": "Sacar el doble de puntos que el líder del mundial en un GP.", "icon": "TrendingUp", "rare": "LEGENDARY", "type": "EVENT"},
    {"slug": "event_el_optimista", "name": "El Optimista", "desc": "Apostar por 0 DNFs y acertar.", "icon": "Smile", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_la_escoba", "name": "La Escoba", "desc": "Acertar la VR de un piloto que NO ha subido al podio.", "icon": "Brush", "rare": "RARE", "type": "EVENT"},
    {"slug": "event_maldonado", "name": "Maldonado", "desc": "Sacar 0 puntos en un GP.", "icon": "Ghost", "rare": "HIDDEN", "type": "EVENT"},
]

def seed_achievements(db: Session):
    """Sincroniza la lista de definiciones con la DB"""
    from sqlalchemy import text
    print("🌱 Sincronizando tabla de logros...")

    # 1. Corregir secuencias de Postgres si es necesario
    # Esto evita el error "duplicate key value violates unique constraint"
    if db.bind.dialect.name == "postgresql":
        try:
            # Sincronizamos la secuencia al máximo ID actual + 1
            db.execute(text("SELECT setval(pg_get_serial_sequence('achievements', 'id'), coalesce((SELECT MAX(id) FROM achievements), 0) + 1, false);"))
            db.commit()
        except Exception as e:
            print(f"⚠️ No se pudo resetear la secuencia (esto es normal si no hay permisos de admin): {e}")
            db.rollback()

    # 2. Cargar logros actuales en un mapa para evitar N consultas
    existing_achs = db.query(Achievement).all()
    existing_map = {a.slug: a for a in existing_achs}

    for d in ACHIEVEMENT_DEFINITIONS:
        ach = existing_map.get(d["slug"])
        if not ach:
            # Crear nuevo
            new_ach = Achievement(
                slug=d["slug"], 
                name=d["name"], 
                description=d["desc"], 
                icon=d["icon"],
                rarity=AchievementRarity(d["rare"]),
                type=AchievementType(d["type"])
            )
            db.add(new_ach)
        else:
            # Actualizar campos por si han cambiado en el código
            ach.name = d["name"]
            ach.description = d["desc"]
            ach.icon = d["icon"]
            ach.rarity = AchievementRarity(d["rare"])
            ach.type = AchievementType(d["type"])
            
    try:
        db.commit()
        print(f"✅ Logros sincronizados (Total: {len(ACHIEVEMENT_DEFINITIONS)})")
    except Exception as e:
        db.rollback()
        print(f"❌ Error al sincronizar logros: {e}")

@router.get("/")
def get_my_achievements(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        all_achievements = db.query(Achievement).all()
        
        # Si la base de datos está vacía (o faltan logros), ejecutamos la semilla
        if len(all_achievements) < len(ACHIEVEMENT_DEFINITIONS):
            seed_achievements(db)
            all_achievements = db.query(Achievement).all()
        
        # Logros desbloqueados por el usuario
        # IMPORTANTE: Cargamos GP y Season para poder dar info de contexto
        unlocked_rows = db.query(UserAchievement).options(
            joinedload(UserAchievement.gp).joinedload(GrandPrix.season), # Ruta 1: GP -> Season (para Eventos)
            joinedload(UserAchievement.season)                           # Ruta 2: Direct Season (para Season Awards)
        ).filter(UserAchievement.user_id == current_user.id).all()
        
        # Crear un mapa para acceso rápido
        unlocked_map = {}
        for u in unlocked_rows:
            
            # Lógica para determinar el nombre de la Temporada
            season_name = None
            if u.season:
                # Caso A: Logro de Temporada vinculado directamente
                season_name = u.season.name
            elif u.gp and u.gp.season:
                # Caso B: Logro de Evento vinculado a través del GP
                season_name = u.gp.season.name
                
            unlocked_map[u.achievement_id] = {
                "unlocked_at": u.unlocked_at,
                "gp_name": u.gp.name if u.gp else None,
                "season_name": season_name
            }
        
        result = []
        for ach in all_achievements:
            is_unlocked = ach.id in unlocked_map
            unlocked_data = unlocked_map.get(ach.id)
            
            # Lógica de Ocultos: Si es HIDDEN y NO está desbloqueado, censuramos datos
            is_hidden = ach.rarity == AchievementRarity.HIDDEN and not is_unlocked
            
            # Nombre e Icono condicional
            display_name = "???" if is_hidden else ach.name
            display_desc = "Logro Secreto: Sigue jugando para descubrirlo." if is_hidden else ach.description
            display_icon = "Lock" if is_hidden else ach.icon

            # Construir objeto respuesta
            result.append({
                "id": ach.id,
                "slug": ach.slug, # Útil para lógica frontend si hace falta
                "name": display_name,
                "description": display_desc,
                "icon": display_icon,
                "rarity": ach.rarity.value,
                "type": ach.type.value,
                "unlocked": is_unlocked,
                # Datos de contexto (Solo si está desbloqueado)
                "unlocked_at": unlocked_data["unlocked_at"] if unlocked_data else None,
                "gp_name": unlocked_data["gp_name"] if unlocked_data else None,
                "season_name": unlocked_data["season_name"] if unlocked_data else None,
            })
            
        return result
    finally:
        db.close()