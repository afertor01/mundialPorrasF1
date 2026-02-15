import random
import string
from datetime import datetime, timedelta

# ==============================================================================
# 1. IMPORTS Y CONFIGURACIÓN
# ==============================================================================
from app.db.session import get_session, create_tables, drop_tables
from app.core.security import hash_password

# Modelos
from app.db.models.user import Users
from app.db.models.season import Seasons
from app.db.models.grand_prix import GrandPrix
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from app.db.models.multiplier_config import MultiplierConfigs
from app.db.models.constructor import Constructors
from app.db.models.driver import Drivers
from app.db.models.achievement import (
    Achievements,
    AchievementRarity,
    AchievementType,
)
from app.db.models.prediction import Predictions
from app.db.models.prediction_position import PredictionPositions
from app.db.models.prediction_event import PredictionEvents
from app.db.models.race_result import RaceResults
from app.db.models.race_position import RacePositions
from app.db.models.race_event import RaceEvents

# Servicios
from app.utils.scoring import calculate_prediction_score
from app.utils.achievements import (
    evaluate_race_achievements,
    evaluate_season_finale_achievements,
)
from sqlmodel import Session, select

# Definiciones de logros
ACHIEVEMENT_DEFINITIONS = [
    # CAREER
    {
        "slug": "career_debut",
        "name": "Debutante",
        "desc": "Completar 1 GP.",
        "icon": "Flag",
        "rare": "COMMON",
        "type": "CAREER",
    },
    {
        "slug": "career_500",
        "name": "Prospecto",
        "desc": "500 puntos.",
        "icon": "TrendingUp",
        "rare": "COMMON",
        "type": "CAREER",
    },
    {
        "slug": "career_1000",
        "name": "Veterano",
        "desc": "1000 puntos.",
        "icon": "Award",
        "rare": "RARE",
        "type": "CAREER",
    },
    {
        "slug": "career_2500",
        "name": "Leyenda",
        "desc": "2500 puntos.",
        "icon": "Star",
        "rare": "EPIC",
        "type": "CAREER",
    },
    {
        "slug": "career_50_gps",
        "name": "Medio Siglo",
        "desc": "50 GPs jugados.",
        "icon": "Calendar",
        "rare": "EPIC",
        "type": "CAREER",
    },
    {
        "slug": "career_50_exact",
        "name": "Francotirador",
        "desc": "50 Aciertos Exactos.",
        "icon": "Crosshair",
        "rare": "EPIC",
        "type": "CAREER",
    },
    {
        "slug": "career_champion",
        "name": "Campeón",
        "desc": "Ganar una temporada.",
        "icon": "Trophy",
        "rare": "LEGENDARY",
        "type": "CAREER",
    },
    # SEASON
    {
        "slug": "season_100",
        "name": "Centurión",
        "desc": "100 pts/temp.",
        "icon": "Battery",
        "rare": "COMMON",
        "type": "SEASON",
    },
    {
        "slug": "season_300",
        "name": "300",
        "desc": "300 pts/temp.",
        "icon": "BatteryCharging",
        "rare": "RARE",
        "type": "SEASON",
    },
    {
        "slug": "season_500",
        "name": "Elite",
        "desc": "500 pts/temp.",
        "icon": "Zap",
        "rare": "EPIC",
        "type": "SEASON",
    },
    {
        "slug": "season_squad_leader",
        "name": "Líder",
        "desc": "Ganar a compañero.",
        "icon": "UserCheck",
        "rare": "RARE",
        "type": "SEASON",
    },
    {
        "slug": "season_backpack",
        "name": "Mochila",
        "desc": "Perder con compañero.",
        "icon": "ShoppingBag",
        "rare": "HIDDEN",
        "type": "SEASON",
    },
    # EVENT
    {
        "slug": "event_first",
        "name": "Lights Out",
        "desc": "Primer GP.",
        "icon": "Play",
        "rare": "COMMON",
        "type": "EVENT",
    },
    {
        "slug": "event_join_team",
        "name": "Team Player",
        "desc": "Unirse equipo.",
        "icon": "Users",
        "rare": "COMMON",
        "type": "EVENT",
    },
    {
        "slug": "event_25pts",
        "name": "+25",
        "desc": "+25 pts.",
        "icon": "DollarSign",
        "rare": "COMMON",
        "type": "EVENT",
    },
    {
        "slug": "event_50pts",
        "name": "+50",
        "desc": "+50 pts.",
        "icon": "Package",
        "rare": "RARE",
        "type": "EVENT",
    },
    {
        "slug": "event_nostradamus",
        "name": "Nostradamus",
        "desc": "Podio Exacto.",
        "icon": "CrystalBall",
        "rare": "EPIC",
        "type": "EVENT",
    },
    {
        "slug": "event_high_five",
        "name": "High 5",
        "desc": "5 Exactos.",
        "icon": "Hand",
        "rare": "RARE",
        "type": "EVENT",
    },
    {
        "slug": "event_la_decima",
        "name": "La Décima",
        "desc": "10 Exactos.",
        "icon": "Award",
        "rare": "LEGENDARY",
        "type": "EVENT",
    },
    {
        "slug": "event_oracle",
        "name": "Oráculo",
        "desc": "Top 10 presencia.",
        "icon": "Eye",
        "rare": "EPIC",
        "type": "EVENT",
    },
    {
        "slug": "event_mc",
        "name": "MC",
        "desc": "Eventos extra.",
        "icon": "Mic",
        "rare": "EPIC",
        "type": "EVENT",
    },
    {
        "slug": "event_god",
        "name": "DIOS",
        "desc": "Todo perfecto.",
        "icon": "Sun",
        "rare": "LEGENDARY",
        "type": "EVENT",
    },
    {
        "slug": "event_grand_chelem",
        "name": "Chelem",
        "desc": "Pole+VR+Win.",
        "icon": "Maximize",
        "rare": "EPIC",
        "type": "EVENT",
    },
    {
        "slug": "event_civil_war",
        "name": "Civil War",
        "desc": "1-2 Compañeros.",
        "icon": "Swords",
        "rare": "RARE",
        "type": "EVENT",
    },
    {
        "slug": "event_tifosi",
        "name": "Tifosi",
        "desc": "Ferrari gana Monza.",
        "icon": "Italic",
        "rare": "RARE",
        "type": "EVENT",
    },
    {
        "slug": "event_chaos",
        "name": "Caos",
        "desc": "Muchos DNFs.",
        "icon": "AlertTriangle",
        "rare": "RARE",
        "type": "EVENT",
    },
    {
        "slug": "event_maldonado",
        "name": "Maldonado",
        "desc": "0 Puntos.",
        "icon": "Skull",
        "rare": "HIDDEN",
        "type": "EVENT",
    },
]

# Configuración de Simulación
NUM_USERS = 50
GP_LIST = [
    "Bahrain",
    "Saudi",
    "Australia",
    "Japan",
    "China",
    "Miami",
    "Imola",
    "Monaco",
    "Canada",
    "Spain",
    "Austria",
    "UK",
    "Hungary",
    "Belgium",
    "Netherlands",
    "Monza",
    "Baku",
    "Singapore",
    "Austin",
    "Mexico",
    "Brazil",
    "Vegas",
    "Qatar",
    "Abu Dhabi",
]

# ==============================================================================
# 2. UTILS BASICAS
# ==============================================================================


def reset_db(session: Session):
    print("🧹 Limpiando BD...")
    drop_tables()
    create_tables()
    print("🌱 Sembrando Logros...")
    for d in ACHIEVEMENT_DEFINITIONS:
        query = select(Achievements).where(Achievements.slug == d["slug"])
        if not session.exec(query).first():
            session.add(
                Achievements(
                    slug=d["slug"],
                    name=d["name"],
                    description=d["desc"],
                    icon=d["icon"],
                    rarity=AchievementRarity(d["rare"]),
                    type=AchievementType(d["type"]),
                )
            )
    session.commit()


def create_users(session: Session):
    print(f"👥 Creando {NUM_USERS} usuarios...")
    users = []
    used_acronyms = set()
    skills = {}  # Diccionario ID -> Skill

    # 1. Admin
    admin = Users(
        email="admin@admin.com",
        username="Admin",
        acronym="ADM",
        hashed_password=hash_password("123"),
        role="admin",
        created_at=datetime.utcnow(),
    )
    session.add(admin)
    session.flush()  # ⚠️ IMPORTANTE: Genera el ID inmediatamente
    users.append(admin)
    used_acronyms.add("ADM")
    skills[admin.id] = 0.5  # Usamos el ID generado

    # 2. Tú
    yo = Users(
        email="yo@test.com",
        username="Afertor",
        acronym="AFE",
        hashed_password=hash_password("123"),
        role="user",
        created_at=datetime.utcnow(),
    )
    session.add(yo)
    session.flush()  # ⚠️ IMPORTANTE
    users.append(yo)
    used_acronyms.add("AFE")
    skills[yo.id] = 0.95

    # 3. Bots con habilidad variable
    names = [
        "Lando",
        "Max",
        "Lewis",
        "Carlos",
        "Fernando",
        "Checo",
        "Oscar",
        "George",
        "Yuki",
        "Nico",
        "Kevin",
        "Valtteri",
        "Zhou",
        "Lance",
        "Alex",
        "Logan",
        "Daniel",
        "Pierre",
        "Esteban",
    ]

    for i in range(NUM_USERS - 2):
        name = f"{random.choice(names)}_{i}"

        while True:
            acr = "".join(random.choices(string.ascii_uppercase, k=3))
            if acr not in used_acronyms:
                used_acronyms.add(acr)
                break

        u = Users(
            email=f"user{i}@test.com",
            username=name,
            acronym=acr,
            hashed_password=hash_password("123"),
            role="user",
            created_at=datetime.utcnow(),
        )
        session.add(u)
        session.flush()  # ⚠️ IMPORTANTE: Obtenemos ID antes de seguir
        users.append(u)

        # Asignar habilidad al ID
        skills[u.id] = random.triangular(0.2, 0.9, 0.5)

    session.commit()

    # skills ya es un mapa {id: float}, no hace falta transformarlo
    return users, skills


def setup_season_infrastructure(session: Session, year, active=False):
    print(f"🏗️  Preparando Temporada {year}...")
    s = Seasons(year=year, name=f"F1 {year}", is_active=active)
    session.add(s)

    # Multiplicadores
    configs = [
        ("FASTEST_LAP", 1.5),
        ("SAFETY_CAR", 1.5),
        ("DNFS", 1.5),
        ("DNF_DRIVER", 1.5),
        ("PODIUM_PARTIAL", 1.25),
        ("PODIUM_TOTAL", 1.5),
    ]
    for evt, val in configs:
        session.add(MultiplierConfigs(season=s, event_type=evt, multiplier=val))
    session.commit()

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
        ("Haas", "#B6BABD", ["OCO", "BEA"]),
    ]

    driver_objs = []

    for t_name, color, drivers in teams_data:
        c = Constructors(name=t_name, color=color, season_id=s.id)
        session.add(c)
        session.commit()
        for d_code in drivers:
            d = Drivers(code=d_code, name=d_code, constructor_id=c.id)
            session.add(d)
            driver_objs.append(d.code)
    session.commit()

    return s, driver_objs


def assign_teams_to_users(session: Session, season, users):
    """Asigna equipos aleatorios de 2 personas para la temporada."""
    playing_users = [u for u in users if u.role != "admin"]
    random.shuffle(playing_users)

    teams_created = 0
    for i in range(0, len(playing_users), 2):
        if i + 1 >= len(playing_users):
            break
        u1 = playing_users[i]
        u2 = playing_users[i + 1]

        t_name = f"Squad {season.year} {teams_created+1}"
        t = Teams(
            name=t_name,
            season_id=season.id,
            join_code=f"S{season.year}-{teams_created}",
        )
        session.add(t)
        session.commit()

        session.add(TeamMembers(user_id=u1.id, team_id=t.id, season_id=season.id))
        session.add(TeamMembers(user_id=u2.id, team_id=t.id, season_id=season.id))
        teams_created += 1
    session.commit()
    print(f"🤝 {teams_created} Equipos formados para {season.year}.")


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
    if random.random() < (0.5 + skill / 2):
        pred_evts["SAFETY_CAR"] = real_evts["SAFETY_CAR"]
    else:
        pred_evts["SAFETY_CAR"] = "No" if real_evts["SAFETY_CAR"] == "Yes" else "Yes"

    if random.random() < (0.3 + skill / 2):
        pred_evts["DNFS"] = real_evts["DNFS"]
    else:
        pred_evts["DNFS"] = str(random.randint(0, 5))

    if random.random() < (0.4 + skill / 2):
        pred_evts["FASTEST_LAP"] = real_evts["FASTEST_LAP"]
    else:
        pred_evts["FASTEST_LAP"] = random.choice(real_pos[:5])

    if random.random() < (0.2 + skill / 2):
        # Acierta uno de los que abandonaron (si hubo)
        real_dnfs = real_evts.get("DNF_DRIVER", "").split(", ")
        pred_evts["DNF_DRIVER"] = real_dnfs[0] if real_dnfs[0] else ""
    else:
        # Pone uno cualquiera
        pred_evts["DNF_DRIVER"] = random.choice(real_pos)

    return pred_pos, pred_evts


def simulate_gp(session: Session, season, gp_name, race_date, users, skill_map, drivers, multipliers):
    # Crear GP
    gp = GrandPrix(name=f"GP {gp_name}", race_datetime=race_date, season_id=season.id)
    session.add(gp)
    session.commit()

    # 1. Generar Resultado Real
    top_tier = ["VER", "NOR", "LEC", "HAM", "PIA"]
    mid_tier = ["RUS", "SAI", "ALO", "GAS", "TSU"]
    low_tier = [d for d in drivers if d not in top_tier and d not in mid_tier]

    real_pos = []
    random.shuffle(top_tier)
    random.shuffle(mid_tier)
    random.shuffle(low_tier)

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
    res = RaceResults(gp_id=gp.id)
    session.add(res)
    session.commit()
    for i, d in enumerate(real_pos):
        session.add(RacePositions(race_result_id=res.id, position=i + 1, driver_name=d))
    for k, v in real_evts.items():
        session.add(RaceEvents(race_result_id=res.id, event_type=k, value=str(v)))

    # 2. Generar Predicciones
    for user in users:
        skill = skill_map[user.id]
        p_pos, p_evts = generate_prediction(real_pos, real_evts, skill)

        pred = Predictions(user_id=user.id, gp_id=gp.id)
        session.add(pred)
        session.flush()

        for i, d in enumerate(p_pos):
            session.add(
                PredictionPositions(prediction_id=pred.id, position=i + 1, driver_name=d)
            )
        for k, v in p_evts.items():
            session.add(PredictionEvents(prediction_id=pred.id, event_type=k, value=str(v)))

        # Scoring Mock
        class M:
            pass

        m_p = M()
        m_p.positions = [M() for _ in p_pos[:10]]
        m_p.events = []
        for i, x in enumerate(m_p.positions):
            x.driver_name = p_pos[i]
            x.position = i + 1
        for k, v in p_evts.items():
            e = M()
            e.event_type = k
            e.value = str(v)
            m_p.events.append(e)
        m_r = M()
        m_r.positions = [M() for _ in real_pos]
        m_r.events = []
        for i, x in enumerate(m_r.positions):
            x.driver_name = real_pos[i]
            x.position = i + 1
        for k, v in real_evts.items():
            e = M()
            e.event_type = k
            e.value = str(v)
            m_r.events.append(e)

        score = calculate_prediction_score(m_p, m_r, multipliers)
        pred.points = score["final_points"]
        pred.points_base = score["base_points"]

    session.commit()

    # 3. Evaluar Logros
    evaluate_race_achievements(session, gp.id)
    print(f"   🏁 {gp.name} simulado.")


# ==============================================================================
# 4. ORQUESTADOR PRINCIPAL
# ==============================================================================


def run_simulation(session: Session):
    reset_db(session)

    # 1. Crear Usuarios
    users, skill_map = create_users(session)

    # ==========================
    # TEMPORADA 1: 2024 (Pasada)
    # ==========================
    s1, d1 = setup_season_infrastructure(session, 2024, active=False)
    assign_teams_to_users(session, s1, users)
    query = select(MultiplierConfigs).where(MultiplierConfigs.season_id == s1.id)
    multipliers1 = session.exec(query).all()

    print("\n▶️  SIMULANDO TEMPORADA 2024 (Completa)...")
    start_date_24 = datetime(2024, 3, 1)
    for i, gp_name in enumerate(GP_LIST):
        race_date = start_date_24 + timedelta(weeks=i)
        simulate_gp(session, s1, gp_name, race_date, users, skill_map, d1, multipliers1)

    evaluate_season_finale_achievements(session, s1.id)
    print("🏆 Temporada 2024 cerrada.")

    # ==========================
    # TEMPORADA 2: 2025 (Pasada)
    # ==========================
    s2, d2 = setup_season_infrastructure(session, 2025, active=False)
    assign_teams_to_users(session, s2, users)
    query = select(MultiplierConfigs).where(MultiplierConfigs.season_id == s2.id)
    multipliers2 = session.exec(query).all()

    print("\n▶️  SIMULANDO TEMPORADA 2025 (Completa)...")
    start_date_25 = datetime(2025, 3, 1)
    for i, gp_name in enumerate(GP_LIST):
        race_date = start_date_25 + timedelta(weeks=i)
        simulate_gp(session, s2, gp_name, race_date, users, skill_map, d2, multipliers2)

    evaluate_season_finale_achievements(session, s2.id)
    print("🏆 Temporada 2025 cerrada.")

    # ==========================
    # TEMPORADA 3: 2026 (Actual)
    # ==========================
    s3, d3 = setup_season_infrastructure(session, 2026, active=True)
    assign_teams_to_users(session, s3, users)
    query = select(MultiplierConfigs).where(MultiplierConfigs.season_id == s3.id)
    multipliers3 = session.exec(query).all()

    print("\n▶️  SIMULANDO TEMPORADA 2026 (En Curso)...")
    start_date_26 = datetime(2026, 3, 1)
    gps_played = 14

    for i in range(gps_played):
        gp_name = GP_LIST[i]
        race_date = start_date_26 + timedelta(weeks=i)
        simulate_gp(session, s3, gp_name, race_date, users, skill_map, d3, multipliers3)

    print("📅 Agendando carreras futuras...")
    for i in range(gps_played, len(GP_LIST)):
        gp_name = GP_LIST[i]
        race_date = start_date_26 + timedelta(weeks=i)
        gp = GrandPrix(name=f"GP {gp_name}", race_datetime=race_date, season_id=s3.id)
        session.add(gp)
    session.commit()

    print("\n✅ SIMULACIÓN FINALIZADA.")

if __name__ == "__main__":
    run_simulation(get_session())
