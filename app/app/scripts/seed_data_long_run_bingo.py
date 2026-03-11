import random
import string
import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import func

# ==============================================================================
# 1. IMPORTS Y CONFIGURACIÓN
# ==============================================================================
import pandas as pd
from sqlalchemy import create_engine as sqlalchemy_create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import SessionLocal as RemoteSessionLocal, engine as remote_engine, Base, DATABASE_URL
from app.core.security import hash_password

# ==============================================================================
# CONFIGURACIÓN DE MODO HÍBRIDO (ACELERA X100 EL CLOUD)
# ==============================================================================
# Si la DB es remota, simularemos en SQLite local y luego subiremos todo de golpe.
IS_REMOTE = not DATABASE_URL.startswith("sqlite")
LOCAL_DB_URL = "sqlite:///seed_temp.db"
local_engine = sqlalchemy_create_engine(LOCAL_DB_URL, connect_args={"check_same_thread": False})
LocalSessionLocal = sessionmaker(bind=local_engine)

# Reemplazamos las variables globales para que el script use la local por defecto
engine = local_engine if IS_REMOTE else remote_engine
SessionLocal = LocalSessionLocal if IS_REMOTE else RemoteSessionLocal

# Modelos
from app.db.models.user import User
from app.db.models.season import Season
from app.db.models.grand_prix import GrandPrix
from app.db.models.team import Team
from app.db.models.team_member import TeamMember
from app.db.models.multiplier_config import MultiplierConfig
from app.db.models.constructor import Constructor
from app.db.models.driver import Driver
from app.db.models.user_stats import UserStats
from app.db.models.achievement import Achievement, UserAchievement, AchievementRarity, AchievementType
from app.db.models.prediction import Prediction
from app.db.models.prediction_position import PredictionPosition
from app.db.models.prediction_event import PredictionEvent
from app.db.models.race_result import RaceResult
from app.db.models.race_position import RacePosition
from app.db.models.race_event import RaceEvent
from app.db.models.bingo import BingoTile, BingoSelection

# Servicios
from app.services.scoring import calculate_prediction_score
from app.services.achievements_service import evaluate_race_achievements, evaluate_season_finale_achievements

# Definiciones de logros (Mantenemos los tuyos originales)
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

# Configuración de Simulación
NUM_USERS = 50
GP_LIST = [
    "Bahrain", "Saudi", "Australia", "Japan", "China", "Miami", "Imola", "Monaco", 
    "Canada", "Spain", "Austria", "UK", "Hungary", "Belgium", "Netherlands", "Monza", 
    "Baku", "Singapore", "Austin", "Mexico", "Brazil", "Vegas", "Qatar", "Abu Dhabi"
]

# ==============================================================================
# 2. UTILS BASICAS
# ==============================================================================

def reset_db(db):
    print("🧹 Limpiando BD...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("🌱 Sembrando Logros...")
    for d in ACHIEVEMENT_DEFINITIONS:
        if not db.query(Achievement).filter_by(slug=d["slug"]).first():
            db.add(Achievement(slug=d["slug"], name=d["name"], description=d["desc"],
                               icon=d["icon"], rarity=AchievementRarity(d["rare"]), type=AchievementType(d["type"])))
    db.commit()

def create_users(db):
    print(f"👥 Creando {NUM_USERS} usuarios...")
    users = []
    used_acronyms = set()
    skills = {} # Diccionario ID -> Skill
    
    # 1. Admin
    admin = User(email="admin@admin.com", username="Admin", acronym="ADM", hashed_password=hash_password("123"), role="admin", created_at=datetime.utcnow(), is_verified=True)
    db.add(admin)
    db.flush() # ⚠️ IMPORTANTE: Genera el ID inmediatamente
    users.append(admin)
    used_acronyms.add("ADM")
    skills[admin.id] = 0.5 # Usamos el ID generado
    
    # 2. Tú
    yo = User(email="yo@test.com", username="Afertor", acronym="AFE", hashed_password=hash_password("123"), role="user", created_at=datetime.utcnow(), is_verified=True)
    db.add(yo)
    db.flush() # ⚠️ IMPORTANTE
    users.append(yo)
    used_acronyms.add("AFE")
    skills[yo.id] = 0.95
    
    # 3. Bots con habilidad variable
    names = ["Lando", "Max", "Lewis", "Carlos", "Fernando", "Checo", "Oscar", "George", "Yuki", "Nico", "Kevin", "Valtteri", "Zhou", "Lance", "Alex", "Logan", "Daniel", "Pierre", "Esteban"]
    
    for i in range(NUM_USERS - 2):
        name = f"{random.choice(names)}_{i}"
        
        while True:
            acr = ''.join(random.choices(string.ascii_uppercase, k=3))
            if acr not in used_acronyms:
                used_acronyms.add(acr)
                break
        
        u = User(email=f"user{i}@test.com", username=name, acronym=acr, hashed_password=hash_password("123"), role="user", created_at=datetime.utcnow(), is_verified=True)
        db.add(u)
        db.flush() # ⚠️ IMPORTANTE: Obtenemos ID antes de seguir
        users.append(u)
        
        # Asignar habilidad al ID
        skills[u.id] = random.triangular(0.2, 0.9, 0.5)
        
    db.commit()
    
    # skills ya es un mapa {id: float}, no hace falta transformarlo
    return users, skills

def setup_season_infrastructure(db, year, active=False):
    print(f"🏗️  Preparando Temporada {year}...")
    s = Season(year=year, name=f"F1 {year}", is_active=active)
    db.add(s)
    
    # Multiplicadores
    configs = [("FASTEST_LAP", 1.5), ("SAFETY_CAR", 1.5), ("DNFS", 1.5), 
               ("DNF_DRIVER", 1.5), ("PODIUM_PARTIAL", 1.25), ("PODIUM_TOTAL", 1.5)]
    for evt, val in configs:
        db.add(MultiplierConfig(season=s, event_type=evt, multiplier=val))
    db.commit()
    
    # Constructores y Drivers
    teams_data = [
        ("Red Bull", "#0600EF", ["VER", "PER"]),
        ("Ferrari", "#FF0000", ["LEC", "HAM"]), 
        ("McLaren", "#FF8700", ["NOR", "PIA"]),
        ("Mercedes", "#00D2BE", ["RUS", "ANT"]), 
        ("Aston Martin", "#006F62", ["ALO", "STR"]),
        ("Alpine", "#0090FF", ["GAS", "DOO"]), 
        ("Williams", "#005AFF", ["ALB", "SAI"]), 
        ("VCARB", "#6692FF", ["TSU", "LAW"]),
        ("Sauber", "#52E252", ["HUL", "BOR"]), 
        ("Haas", "#B6BABD", ["OCO", "BEA"])
    ]
    
    driver_objs = []
    
    for t_name, color, drivers in teams_data:
        c = Constructor(name=t_name, color=color, season_id=s.id)
        db.add(c); db.commit()
        for d_code in drivers:
            d = Driver(code=d_code, name=d_code, constructor_id=c.id)
            db.add(d)
            driver_objs.append(d.code)
    db.commit()
    
    return s, driver_objs

def assign_teams_to_users(db, season, users):
    """Asigna equipos aleatorios de 2 personas para la temporada."""
    playing_users = [u for u in users if u.role != "admin"]
    random.shuffle(playing_users)
    
    teams_created = 0
    for i in range(0, len(playing_users), 2):
        if i+1 >= len(playing_users): break
        u1 = playing_users[i]
        u2 = playing_users[i+1]
        
        t_name = f"Squad {season.year} {teams_created+1}"
        t = Team(name=t_name, season_id=season.id, join_code=f"S{season.year}-{teams_created}")
        db.add(t); db.commit()
        
        db.add(TeamMember(user_id=u1.id, team_id=t.id, season_id=season.id))
        db.add(TeamMember(user_id=u2.id, team_id=t.id, season_id=season.id))
        teams_created += 1
    db.commit()
    print(f"🤝 {teams_created} Equipos formados para {season.year}.")


# ==============================================================================
# LÓGICA DE BINGO
# ==============================================================================
def create_bingo_tiles(db, season):
    print(f"🎲 Generando casillas de Bingo para {season.year}...")
    
    # LISTA ORIGINAL DE LONG_RUN (TAL CUAL LA TENÍAS)
    bingo_events = [
        "Fernando Alonso consigue la 33 (o la 34)", "Max Verstappen gana con +20seg de ventaja",
        "Un Haas consigue un podio", "Ferrari hace un doblete (1-2) en Monza",
        "Lando Norris rompe el trofeo en el podio", "Lewis Hamilton se queja de los neumáticos y hace VR",
        "Yuki Tsunoda insulta por radio (Bleep)", "Lance Stroll elimina a un Aston Martin",
        "Checo Pérez cae en Q1 en 3 carreras seguidas", "Russell dice 'Forecast predicts rain' y no llueve",
        "Albon lleva el Williams a los puntos con pelo tintado", "Piastri gana su primer mundial",
        "Un piloto rookie gana una carrera", "Gasly y Ocon se chocan entre ellos (otra vez)",
        "Carrera con 0 abandonos (todos terminan)", "Bandera Roja en la vuelta 1",
        "Safety Car sale por un animal en pista", "Carrera en lluvia extrema (Full Wets)",
        "Un coche pierde una rueda en el pitstop", "Pitstop de más de 10 segundos (fallo humano)",
        "Pitstop récord mundial (< 1.80s)", "Menos de 15 coches terminan la carrera",
        "Un coche se queda tirado en la vuelta de formación", "Adelantamiento triple en una recta",
        "Christian Horner mueve el pie nerviosamente en cámara", "Toto Wolff rompe unos auriculares",
        "Multa de la FIA por joyería o ropa interior", "Un piloto es descalificado post-carrera",
        "Investigación de carrera resuelta 5 horas después", "Entrevista incómoda de Martin Brundle en parrilla",
        "Un mecánico se cae durante el pitstop", "Invasión de pista antes de tiempo",
        "Radio del ingeniero: 'We are checking...'", "Un piloto vomita dentro del casco",
        "Audi (Sauber) consigue sus primeros puntos", "Un motor revienta con humo blanco visible",
        "Leclerc consigue la Pole en Mónaco (y termina)", "Verstappen hace un trompo y aun así gana",
        "Ricciardo (o quien esté) sonríe tras abandonar", "Bottas enseña el culo en redes sociales",
        "Brad Pitt aparece en el garaje de Mercedes", "Sainz gana con Williams (Smooth Operator)",
        "Antonelli choca en su primera carrera", "Newey es enfocado tomando notas en su libreta",
        "Un piloto gana saliendo último (P20)", "Empate exacto en la clasificación (mismo tiempo)",
        "Todos los equipos puntúan en una sola carrera", "Un piloto gana el Grand Chelem (Pole, VR, Victoria, Liderar todo)",
        "Un espontáneo se sube al podio"
    ]

    tiles = []
    # Usamos un set para evitar duplicados
    for desc in set(bingo_events):
        t = BingoTile(season_id=season.id, description=desc, is_completed=False)
        db.add(t)
        tiles.append(t)
    
    db.commit()
    print(f"✅ {len(tiles)} Casillas de Bingo creadas.")
    return tiles

def simulate_bingo_selections(db, users, tiles):
    print("📝 Simulando selecciones de Bingo...")
    
    selections = []
    
    # Asegurarse de que hay suficientes tiles para elegir
    if not tiles or len(tiles) < 20:
        print("⚠️ No hay suficientes casillas de bingo para simular selecciones completas.")
    
    for user in users:
        # Cada usuario elige entre 5 y 20 casillas (Límite backend es 20)
        num_picks = random.randint(5, 20)
        
        # Asegurarse de no pedir más muestras de las que hay
        actual_picks = min(num_picks, len(tiles))
            
        my_picks = random.sample(tiles, actual_picks)
        
        for tile in my_picks:
            sel = BingoSelection(user_id=user.id, bingo_tile_id=tile.id)
            db.add(sel)
            selections.append(sel)
            
    db.commit()
    print(f"✅ {len(selections)} selecciones de bingo registradas.")

def resolve_random_bingo_events(db, tiles):
    print("🔮 Resolviendo algunos eventos de Bingo aleatoriamente...")
    
    if not tiles:
        print("⚠️ No hay casillas de bingo para resolver.")
        return
        
    # Completamos un número aleatorio de casillas (entre 5 y 10)
    num_to_complete = random.randint(5, min(10, len(tiles)))
    completed_tiles = random.sample(tiles, k=num_to_complete)
    
    for t in completed_tiles:
        t.is_completed = True
        
    db.commit()


# ==============================================================================
# 3. MOTOR DE SIMULACIÓN DE CARRERA
# ==============================================================================

def generate_prediction(real_pos, real_evts, skill):
    # 1. Posiciones
    pred_pos = list(real_pos)
    num_swaps = int((1.0 - skill) * 10)
    
    for _ in range(num_swaps):
        i1, i2 = random.sample(range(len(pred_pos)), 2)
        pred_pos[i1], pred_pos[i2] = pred_pos[i2], pred_pos[i1]
    
    # 2. Eventos
    pred_evts = {}
    if random.random() < (0.5 + skill/2): pred_evts["SAFETY_CAR"] = real_evts["SAFETY_CAR"]
    else: pred_evts["SAFETY_CAR"] = "No" if real_evts["SAFETY_CAR"] == "Yes" else "Yes"
    
    if random.random() < (0.3 + skill/2): pred_evts["DNFS"] = real_evts["DNFS"]
    else: pred_evts["DNFS"] = str(random.randint(0, 5))
    
    if random.random() < (0.4 + skill/2): pred_evts["FASTEST_LAP"] = real_evts["FASTEST_LAP"]
    else: pred_evts["FASTEST_LAP"] = random.choice(real_pos[:5])

    if random.random() < (0.2 + skill/2): 
        # Acierta uno de los que abandonaron (si hubo)
        real_dnfs = real_evts.get("DNF_DRIVER", "").split(", ")
        pred_evts["DNF_DRIVER"] = real_dnfs[0] if real_dnfs[0] else ""
    else:
        # Pone uno cualquiera
        pred_evts["DNF_DRIVER"] = random.choice(real_pos)
    
    return pred_pos, pred_evts

def simulate_gp(db, season, gp_name, race_date, users, skill_map, drivers, multipliers):
    # Crear GP
    gp = GrandPrix(name=f"GP {gp_name}", race_datetime=race_date, season_id=season.id)
    db.add(gp); db.commit()
    
    # 1. Generar Resultado Real
    top_tier = ["VER", "NOR", "LEC", "HAM", "PIA"]
    mid_tier = ["RUS", "SAI", "ALO", "GAS", "TSU"]
    low_tier = [d for d in drivers if d not in top_tier and d not in mid_tier]
    
    real_pos = []
    random.shuffle(top_tier); random.shuffle(mid_tier); random.shuffle(low_tier)
    
    if random.random() < 0.3:
        surprise = mid_tier.pop(0)
        top_tier.append(surprise)
    
    real_pos = top_tier + mid_tier + low_tier
    remaining = [d for d in drivers if d not in real_pos]
    real_pos.extend(remaining)
    
    num_dnfs = random.randint(0, 4)
    # Escogemos pilotos aleatorios del fondo de la tabla para que sean los DNF
    dnf_drivers_list = random.sample(real_pos[-8:], num_dnfs) if num_dnfs > 0 else []
    dnf_str = ", ".join(dnf_drivers_list)

    real_evts = {
        "FASTEST_LAP": random.choice(real_pos[:3]), 
        "SAFETY_CAR": "Yes" if random.random() > 0.4 else "No",
        "DNFS": str(num_dnfs),
        "DNF_DRIVER": dnf_str,
    }
    
    # Guardar Resultado
    res = RaceResult(gp_id=gp.id)
    db.add(res); db.commit()
    for i, d in enumerate(real_pos): db.add(RacePosition(race_result_id=res.id, position=i+1, driver_name=d))
    for k, v in real_evts.items(): db.add(RaceEvent(race_result_id=res.id, event_type=k, value=str(v)))
    
    # 2. Generar Predicciones
    for user in users:
        skill = skill_map[user.id]
        p_pos, p_evts = generate_prediction(real_pos, real_evts, skill)
        
        pred = Prediction(user_id=user.id, gp_id=gp.id)
        db.add(pred); db.flush()
        
        for i, d in enumerate(p_pos): db.add(PredictionPosition(prediction_id=pred.id, position=i+1, driver_name=d))
        for k, v in p_evts.items(): db.add(PredictionEvent(prediction_id=pred.id, event_type=k, value=str(v)))
        
        # Scoring Mock
        class M: pass
        m_p = M(); m_p.positions = [M() for _ in p_pos[:10]]; m_p.events = []
        for i, x in enumerate(m_p.positions): x.driver_name=p_pos[i]; x.position=i+1
        for k,v in p_evts.items(): e=M(); e.event_type=k; e.value=str(v); m_p.events.append(e)
        m_r = M(); m_r.positions = [M() for _ in real_pos]; m_r.events = []
        for i, x in enumerate(m_r.positions): x.driver_name=real_pos[i]; x.position=i+1
        for k,v in real_evts.items(): e=M(); e.event_type=k; e.value=str(v); m_r.events.append(e)

        score = calculate_prediction_score(m_p, m_r, multipliers)
        pred.points = score["final_points"]
        pred.points_base = score["base_points"]
        pred.multiplier = score["multiplier"]  # ← FIX: Guardar el multiplicador
    
    db.commit()
    
    # 3. Evaluar Logros
    evaluate_race_achievements(db, gp.id)
    print(f"  🏁 {gp.name} simulado.")

# ==============================================================================
# 4. ORQUESTADOR PRINCIPAL
# ==============================================================================

def run_simulation():
    db = SessionLocal()
    reset_db(db)
    
    # 1. Crear Usuarios
    users, skill_map = create_users(db)
    
    # ==========================
    # TEMPORADA 1: 2024 (Pasada)
    # ==========================
    s1, d1 = setup_season_infrastructure(db, 2024, active=False)
    assign_teams_to_users(db, s1, users)
    
    # --- BINGO 2024 (Creación + Selección) ---
    tiles1 = create_bingo_tiles(db, s1)
    simulate_bingo_selections(db, users, tiles1)
    
    multipliers1 = db.query(MultiplierConfig).filter(MultiplierConfig.season_id == s1.id).all()
    
    print("\n▶️  SIMULANDO TEMPORADA 2024 (Completa)...")
    start_date_24 = datetime(2024, 3, 1)
    for i, gp_name in enumerate(GP_LIST):
        race_date = start_date_24 + timedelta(weeks=i)
        simulate_gp(db, s1, gp_name, race_date, users, skill_map, d1, multipliers1)
        
    # --- RESOLVER BINGO 2024 (Fin temporada) ---
    resolve_random_bingo_events(db, tiles1)
    evaluate_season_finale_achievements(db, s1.id)
    print("🏆 Temporada 2024 cerrada.")
    
    # ==========================
    # TEMPORADA 2: 2025 (Pasada)
    # ==========================
    s2, d2 = setup_season_infrastructure(db, 2025, active=False)
    assign_teams_to_users(db, s2, users)
    
    # --- BINGO 2025 (Creación + Selección) ---
    tiles2 = create_bingo_tiles(db, s2)
    simulate_bingo_selections(db, users, tiles2)
    
    multipliers2 = db.query(MultiplierConfig).filter(MultiplierConfig.season_id == s2.id).all()
    
    print("\n▶️  SIMULANDO TEMPORADA 2025 (Completa)...")
    start_date_25 = datetime(2025, 3, 1)
    for i, gp_name in enumerate(GP_LIST):
        race_date = start_date_25 + timedelta(weeks=i)
        simulate_gp(db, s2, gp_name, race_date, users, skill_map, d2, multipliers2)
    
    # --- RESOLVER BINGO 2025 (Fin temporada) ---
    resolve_random_bingo_events(db, tiles2)
    evaluate_season_finale_achievements(db, s2.id)
    print("🏆 Temporada 2025 cerrada.")
    
    # ==========================
    # TEMPORADA 3: 2026 (Actual)
    # ==========================
    s3, d3 = setup_season_infrastructure(db, 2026, active=True)
    assign_teams_to_users(db, s3, users)
    
    # --- BINGO 2026 (Creación + Selección) ---
    tiles3 = create_bingo_tiles(db, s3)
    simulate_bingo_selections(db, users, tiles3)
    
    multipliers3 = db.query(MultiplierConfig).filter(MultiplierConfig.season_id == s3.id).all()
    
    print("\n▶️  SIMULANDO TEMPORADA 2026 (En Curso)...")
    start_date_26 = datetime(2026, 3, 1)
    gps_played = 14
    
    for i in range(gps_played):
        gp_name = GP_LIST[i]
        race_date = start_date_26 + timedelta(weeks=i)
        simulate_gp(db, s3, gp_name, race_date, users, skill_map, d3, multipliers3)
    
    # --- RESOLVER BINGO 2026 (Parcial) ---
    # Resolvemos algunos eventos aunque la temporada no haya acabado
    resolve_random_bingo_events(db, tiles3)
    
    print("📅 Agendando carreras futuras...")
    for i in range(gps_played, len(GP_LIST)):
        gp_name = GP_LIST[i]
        race_date = start_date_26 + timedelta(weeks=i)
        gp = GrandPrix(name=f"GP {gp_name}", race_datetime=race_date, season_id=s3.id)
        db.add(gp)
    db.commit()
    
    print("\n✅ SIMULACIÓN FINALIZADA LOCALMENTE.")
    db.close()

def sync_local_to_remote():
    """Exporta los datos de la DB SQLite local a la DB remota de forma masiva."""
    from sqlalchemy import text
    import os
    import json
    
    print(f"\n☁️  SUBIENDO DATOS A LA NUBE (Neon/Postgres)...")
    print("   Esta operación es masiva y mucho más rápida que una simulación directa.")
    
    # 1. Limpiar base de datos remota
    Base.metadata.drop_all(bind=remote_engine)
    Base.metadata.create_all(bind=remote_engine)
    
    # 2. Copiar tablas en orden de dependencia
    tables_to_sync = [
        "users", "seasons", "multiplier_configs", "constructors", "drivers", 
        "teams", "team_members", "grand_prix", "race_results", "race_positions", 
        "race_events", "predictions", "prediction_positions", "prediction_events",
        "bingo_tiles", "bingo_selections", "achievements", "user_achievements", 
        "user_stats", "user_gp_stats"
    ]
    
    for table_name in tables_to_sync:
        print(f"   ⬆️  Sincronizando tabla: {table_name}...", end="", flush=True)
        try:
            df = pd.read_sql_table(table_name, local_engine)
            if not df.empty:
                # CORRECCIÓN: Convertir objetos Python (dict/list) a strings JSON para que Postgres los acepte
                for col in df.columns:
                    sample_series = df[col].dropna()
                    if not sample_series.empty:
                        sample_val = sample_series.iloc[0]
                        if isinstance(sample_val, (dict, list)):
                            df[col] = df[col].apply(lambda x: json.dumps(x) if x is not None else None)

                df.to_sql(table_name, remote_engine, if_exists='append', index=False, method='multi', chunksize=1000)
                print(f" OK ({len(df)} filas)")
            else:
                print(" Vacía (Skip)")
        except ValueError as e:
            from sqlalchemy import inspect
            inspector = inspect(local_engine)
            existing_tables = inspector.get_table_names()
            print(f" ERROR: Tabla '{table_name}' no encontrada en SQLite local.")
            print(f"   Tablas disponibles en local: {existing_tables}")
            raise e
    
    # 3. Reiniciar Secuencias de Postgres
    print("   🔄 Reiniciando secuencias de Postgres...")
    with remote_engine.connect() as conn:
        for table_name in tables_to_sync:
            try:
                conn.execute(text(f"SELECT setval(pg_get_serial_sequence('\"{table_name}\"', 'id'), (SELECT MAX(id) FROM \"{table_name}\"));"))
            except Exception:
                pass
        conn.commit()
    
    print("\n🚀 DATOS CARGADOS EN NEON EXITOSAMENTE.")
    
    # Limpieza local opcional
    if os.path.exists("seed_temp.db"):
        print("   🧹 Borrando DB temporal local...")
        os.remove("seed_temp.db")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--sync-only":
        if not os.path.exists("seed_temp.db"):
            print("❌ Error: No existe 'seed_temp.db'. Tienes que ejecutar una simulación completa primero.")
            sys.exit(1)
        sync_local_to_remote()
    else:
        run_simulation()
        if IS_REMOTE:
            sync_local_to_remote()