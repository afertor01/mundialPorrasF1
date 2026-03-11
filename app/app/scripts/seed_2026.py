import sys
import os
from datetime import datetime

# ==============================================================================
# 1. IMPORTS Y CONFIGURACIÓN
# ==============================================================================
import pandas as pd
from sqlalchemy import create_engine as sqlalchemy_create_engine
from sqlalchemy.orm import sessionmaker

# Importar desde la app
from app.db.session import SessionLocal as RemoteSessionLocal, engine as remote_engine, Base, DATABASE_URL
from app.core.security import hash_password

# Configuramos DB local temporal si estamos usando Neon(Postgres), o usamos SQLite directamente
IS_REMOTE = not DATABASE_URL.startswith("sqlite")
LOCAL_DB_URL = "sqlite:///seed_2026_temp.db"
local_engine = sqlalchemy_create_engine(LOCAL_DB_URL, connect_args={"check_same_thread": False})
LocalSessionLocal = sessionmaker(bind=local_engine)

engine = local_engine if IS_REMOTE else remote_engine
SessionLocal = LocalSessionLocal if IS_REMOTE else RemoteSessionLocal

# Modelos
from app.db.models.user import User
from app.db.models.season import Season
from app.db.models.grand_prix import GrandPrix
from app.db.models.multiplier_config import MultiplierConfig
from app.db.models.constructor import Constructor
from app.db.models.driver import Driver
from app.db.models.achievement import Achievement, AchievementRarity, AchievementType
from app.db.models.bingo import BingoTile

# Importamos todos los modelos para que SQLAlchemy pueda resolver las relaciones (como Prediction en User)
from app.db.models.prediction import Prediction
from app.db.models.prediction_position import PredictionPosition
from app.db.models.prediction_event import PredictionEvent
from app.db.models.race_result import RaceResult
from app.db.models.race_position import RacePosition
from app.db.models.race_event import RaceEvent
from app.db.models.team import Team
from app.db.models.team_member import TeamMember
from app.db.models.user_stats import UserStats
from app.db.models.bingo import BingoSelection
from app.db.models.achievement import UserAchievement


# Achievements 
ACHIEVEMENT_DEFINITIONS = [
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

    {"slug": "season_100", "name": "Centurión", "desc": "100 puntos en una temporada.", "icon": "Battery", "rare": "COMMON", "type": "SEASON"},
    {"slug": "season_300", "name": "300", "desc": "300 puntos en una temporada.", "icon": "BatteryCharging", "rare": "RARE", "type": "SEASON"},
    {"slug": "season_500", "name": "Elite", "desc": "500 puntos en una temporada.", "icon": "Zap", "rare": "EPIC", "type": "SEASON"},
    {"slug": "season_squad_leader", "name": "Líder de Escuadra", "desc": "Ganar a tu compañero de equipo.", "icon": "UserCheck", "rare": "RARE", "type": "SEASON"},
    {"slug": "season_backpack", "name": "El Mochila", "desc": "Perder contra tu compañero de equipo.", "icon": "ShoppingBag", "rare": "HIDDEN", "type": "SEASON"},

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


def reset_db(db):
    print("🧹 Limpiando BD y preparando...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("🌱 Sembrando Logros...")
    for d in ACHIEVEMENT_DEFINITIONS:
        if not db.query(Achievement).filter_by(slug=d["slug"]).first():
            db.add(Achievement(slug=d["slug"], name=d["name"], description=d["desc"],
                               icon=d["icon"], rarity=AchievementRarity(d["rare"]), type=AchievementType(d["type"])))
    db.commit()

def create_admin(db):
    print("👥 Creando usuario administrador...")
    admin = User(
        email="admin@admin.com", 
        username="Admin", 
        acronym="ADM", 
        hashed_password=hash_password("123"), 
        role="admin", 
        created_at=datetime.utcnow(), 
        is_verified=True
    )
    db.add(admin)
    db.commit()

def setup_season_2026(db):
    print("🏗️  Preparando Temporada 2026...")
    s = Season(year=2026, name="F1 2026", is_active=True)
    db.add(s)
    db.flush()
    
    # Multiplicadores
    configs = [("FASTEST_LAP", 1.5), ("SAFETY_CAR", 1.5), ("DNFS", 1.5), 
               ("DNF_DRIVER", 1.5), ("PODIUM_PARTIAL", 1.25), ("PODIUM_TOTAL", 1.5)]
    for evt, val in configs:
        db.add(MultiplierConfig(season=s, event_type=evt, multiplier=val))
    db.commit()
    
    # Constructores y Drivers 2026
    teams_data = [
        ("Red Bull", "#0600EF", ["VER", "HAD"], ["Max Verstappen", "Isack Hadjar"]),  
        ("Ferrari", "#FF0000", ["LEC", "HAM"], ["Charles Leclerc", "Lewis Hamilton"]), 
        ("McLaren", "#FF8700", ["NOR", "PIA"], ["Lando Norris", "Oscar Piastri"]),
        ("Mercedes", "#00D2BE", ["RUS", "ANT"], ["George Russell", "Kimi Antonelli"]), 
        ("Aston Martin", "#006F62", ["ALO", "STR"], ["Fernando Alonso", "Lance Stroll"]),
        ("Alpine", "#0090FF", ["GAS", "COL"], ["Pierre Gasly", "Franco Colapinto"]), 
        ("Williams", "#005AFF", ["ALB", "SAI"], ["Alexander Albon", "Carlos Sainz"]), 
        ("VCARB", "#6692FF", ["LAW", "LIN"], ["Liam Lawson", "Arvid Lindblad"]),   
        ("Audi", "#6B0400", ["HUL", "BOR"], ["Nico Hulkenberg", "Gabriel Bortoleto"]), 
        ("Cadillac", "#404040", ["PER", "BOT"], ["Sergio Perez", "Valtteri Bottas"]), 
        ("Haas", "#B6BABD", ["OCO", "BEA"], ["Esteban Ocon", "Oliver Bearman"])
    ]
    
    for t_name, color, drivers, driver_names in teams_data:
        c = Constructor(name=t_name, color=color, season_id=s.id)
        db.add(c)
        db.flush()
        for d_code,d_name in zip(drivers,driver_names):
            d = Driver(code=d_code, name=d_name, constructor_id=c.id)
            db.add(d)
    db.commit()
    
    # Calendario Oficial F1 2026 (24 Carreras)
    calendar_2026 = [
        ("Australia", "2026-03-08T06:00:00Z"),
        ("China", "2026-03-15T08:00:00Z"),
        ("Japan", "2026-03-29T06:00:00Z"),
        ("Bahrain", "2026-04-12T15:00:00Z"),
        ("Saudi Arabia", "2026-04-19T17:00:00Z"),
        ("Miami", "2026-05-03T20:00:00Z"),
        ("Canada", "2026-05-24T18:00:00Z"),
        ("Monaco", "2026-06-07T13:00:00Z"),
        ("Spain (Montmeló)", "2026-06-14T13:00:00Z"),
        ("Austria", "2026-06-28T13:00:00Z"),
        ("UK", "2026-07-05T14:00:00Z"),
        ("Belgium", "2026-07-19T13:00:00Z"),
        ("Hungary", "2026-07-26T13:00:00Z"),
        ("Netherlands", "2026-08-23T13:00:00Z"),
        ("Italy", "2026-09-06T13:00:00Z"),
        ("Spain (Madrid)", "2026-09-13T13:00:00Z"),
        ("Azerbaijan", "2026-09-27T11:00:00Z"),
        ("Singapore", "2026-10-11T12:00:00Z"),
        ("USA", "2026-10-25T19:00:00Z"),
        ("Mexico", "2026-11-01T20:00:00Z"),
        ("Brazil", "2026-11-08T17:00:00Z"),
        ("Las Vegas", "2026-11-21T06:00:00Z"),
        ("Qatar", "2026-11-29T17:00:00Z"),
        ("Abu Dhabi", "2026-12-06T13:00:00Z"),
    ]
    
    print("📅 Creando calendario 2026...")
    for gp_name, date_str in calendar_2026:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        gp = GrandPrix(name=f"GP {gp_name}", race_datetime=dt, season_id=s.id)
        db.add(gp)
    db.commit()
    
    return s


def create_bingo_tiles(db, season):
    print("🎲 Generando 50 casillas de Bingo F1 2026...")
    bingo_events = [
        "2+ Banderas Rojas", "Participación de piloto reserva en carrera", "Primera victoria de un piloto",
        "Piloto finaliza con 10 o más posiciones ganadas", "Dobles puntos de Audi", "Choque entre compañeros de equipo",
        "Accidente en Clasificación", "Victoria en casa",
        "Bandera roja por lluvia", "Victoria perdida en la última vuelta", "Animal en la pista",
        "Dobles puntos de RB", "Dobles puntos de Cadillac",
        "Victoria con ventaja de +20s",
        "Un piloto hace 4 Pit Stops o más", "5 o más DNFs en una carrera",
        "Carrera completa bajo lluvia", "Carrea sin DNFs",
        "Cambio de pilotos en la temporada", "Verstappen fuera de Q3",
        "Piloto consigue un Grand Chelem", "Carrera termina con Safety Car",
        "DNF del líder de la carrera", "Podio español",
        "Dobles puntos de Williams", "+20s Pit Stop", "Mala posición de salida",
        "Neumático suelto en pista",
        "Piloto puntúa en todas las carreras", "3 victorias seguidas de un mismo piloto",
        "6+ Ganadores diferentes en la temporada", "Un motor sale ardiendo",
        "Dobles puntos de Haas", "Nadie pone blandos", "Salida en falso",
        "Campeonato decidido antes de las últimas 3 carreras", "Carrera perdida por puntos de superlicencia",
        "Aston Martin consigue un podio",
        "Alonso lidera una carrera durante al menos 1 vuelta", 
        "Se ponen neumáticos de lluvia extrema",
        "Safety Car sale en la vuelta 1", "El coche de seguridad sale 3 veces o más",
        "Pitstop récord mundial (< 1.80s)", "Carrera suspendida (guerra, temporal...)",
        "Abandono doble de un mismo equipo (Doble DNF)", 
        "Piloto descalificado tras acabar la carrera",
        "Un piloto hace un trompo y continúa sin daños"
    ]
    
    # Asegurarse de que sean exactamente 50 sin duplicados
    bingo_events = list(set(bingo_events))[:50]
    
    for desc in bingo_events:
        t = BingoTile(season_id=season.id, description=desc, is_completed=False)
        db.add(t)
        
    db.commit()


def sync_local_to_remote():
    """Exporta los datos de la DB SQLite local a la DB remota de forma masiva."""
    from sqlalchemy import text
    import json
    
    print("\n☁️  SUBIENDO DATOS A LA NUBE (Postgres)...")
    
    # 1. Limpiar base de datos remota
    Base.metadata.drop_all(bind=remote_engine)
    Base.metadata.create_all(bind=remote_engine)
    
    tables_to_sync = [
        "users", "seasons", "multiplier_configs", "constructors", "drivers",
        "grand_prix", "bingo_tiles", "achievements"
    ]
    
    for table_name in tables_to_sync:
        print(f"   ⬆️  Sincronizando tabla: {table_name}...", end="", flush=True)
        try:
            df = pd.read_sql_table(table_name, local_engine)
            if not df.empty:
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
            print(f" ERROR: Tabla '{table_name}' no encontrada en SQLite local.")
            pass
            
    # Reiniciar Secuencias de Postgres
    print("   🔄 Reiniciando secuencias de Postgres...")
    with remote_engine.connect() as conn:
        for table_name in tables_to_sync:
            try:
                conn.execute(text(f"SELECT setval(pg_get_serial_sequence('\"{table_name}\"', 'id'), (SELECT MAX(id) FROM \"{table_name}\"));"))
            except Exception:
                pass
        conn.commit()
    
    print("\n🚀 DATOS 2026 LISTOS EN NEON.")
    
    if os.path.exists("seed_2026_temp.db"):
        os.remove("seed_2026_temp.db")

def run():
    db = SessionLocal()
    reset_db(db)
    create_admin(db)
    s = setup_season_2026(db)
    create_bingo_tiles(db, s)
    db.close()
    
    if IS_REMOTE:
        sync_local_to_remote()

if __name__ == "__main__":
    run()
