import random
import string  # <--- NECESARIO PARA GENERAR CÓDIGOS
from datetime import datetime, timedelta
from app.db.session import get_session, drop_tables, create_tables
from app.db.models.user import Users
from app.db.models.season import Seasons
from app.db.models.grand_prix import GrandPrix
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from app.db.models.prediction import Predictions
from app.db.models.prediction_position import PredictionPositions
from app.db.models.prediction_event import PredictionEvents
from app.db.models.race_result import RaceResults
from app.db.models.race_position import RacePositions
from app.db.models.race_event import RaceEvents
from app.db.models.multiplier_config import MultiplierConfigs
from app.db.models.constructor import Constructors
from app.db.models.driver import Drivers

from app.core.security import hash_password
from app.utils.scoring import calculate_prediction_score
from sqlmodel import Session, select

# Configuración
NUM_USERS = 20


def reset_db():
    print("🗑️ Borrando base de datos antigua...")
    drop_tables()
    create_tables()
    print("✅ Tablas creadas.")


def create_season(session: Session):
    season = Seasons(year=2026, name="F1 2026 Simulación", is_active=True)
    session.add(season)

    configs = [
        ("FASTEST_LAP", 1.5),
        ("SAFETY_CAR", 1.2),
        ("DNFS", 1.5),
        ("DNF_DRIVER", 3.0),
        ("PODIUM_PARTIAL", 1.25),
        ("PODIUM_TOTAL", 1.5),
    ]
    for evt, val in configs:
        session.add(MultiplierConfigs(season=season, event_type=evt, multiplier=val))

    session.commit()
    return season


def create_f1_grid(session: Session, season):
    print("🏎️ Creando Parrilla F1 Real (Constructores y Pilotos)...")

    grid_data = [
        (
            "Red Bull Racing",
            "#1e41ff",
            [("VER", "Max Verstappen"), ("LAW", "Liam Lawson")],
        ),
        ("Ferrari", "#ff0000", [("HAM", "Lewis Hamilton"), ("LEC", "Charles Leclerc")]),
        ("McLaren", "#ff8700", [("NOR", "Lando Norris"), ("PIA", "Oscar Piastri")]),
        ("Mercedes", "#00d2be", [("RUS", "George Russell"), ("ANT", "Kimi Antonelli")]),
        (
            "Aston Martin",
            "#006f62",
            [("ALO", "Fernando Alonso"), ("STR", "Lance Stroll")],
        ),
        ("Williams", "#005aff", [("SAI", "Carlos Sainz"), ("ALB", "Alex Albon")]),
        ("Alpine", "#ff00ff", [("GAS", "Pierre Gasly"), ("OCO", "Esteban Ocon")]),
        (
            "Visa Cash App RB",
            "#6692ff",
            [("TSU", "Yuki Tsunoda"), ("COL", "Franco Colapinto")],
        ),
        ("Haas", "#b6babd", [("HUL", "Nico Hulkenberg"), ("BEA", "Ollie Bearman")]),
        (
            "Audi / Sauber",
            "#52e252",
            [("BOT", "Valtteri Bottas"), ("ZHO", "Guanyu Zhou")],
        ),
    ]

    driver_codes = []

    for team_name, color, drivers in grid_data:
        const = Constructors(name=team_name, color=color, season_id=season.id)
        session.add(const)
        session.commit()

        for code, name in drivers:
            d = Drivers(code=code, name=name, constructor_id=const.id)
            session.add(d)
            driver_codes.append(code)

    session.commit()
    return driver_codes


def create_users_and_teams(session: Session, season):
    users = []
    # Admin y Usuario principal
    admin = Users(
        email="admin@test.com",
        username="ADMIN",
        acronym="ADM",
        hashed_password=hash_password("123"),
        role="admin",
    )
    yo = Users(
        email="yo@test.com",
        username="afertor",
        acronym="AFE",
        hashed_password=hash_password("123"),
        role="user",
    )
    users.extend([admin, yo])
    session.add_all([admin, yo])

    # Bots
    for i in range(NUM_USERS - 2):
        name = f"Jugador_{i+1}"
        acr = f"J{i+1}"[:3].upper()
        u = Users(
            email=f"bot{i}@test.com",
            username=name,
            acronym=acr,
            hashed_password=hash_password("123"),
            role="user",
        )
        users.append(u)
        session.add(u)
    session.commit()

    print("👥 Creando escuderías de jugadores...")
    random.shuffle(users)

    team_count = 0
    chars = string.ascii_uppercase + string.digits  # Caracteres para el código

    for i in range(0, len(users), 2):
        if i + 1 < len(users):
            team_count += 1

            # --- CORRECCIÓN: GENERAR CÓDIGO ÚNICO ---
            code_str = "".join(random.choices(chars, k=6))
            formatted_code = f"{code_str[:3]}-{code_str[3:]}"

            team = Teams(
                name=f"Escudería {team_count}",
                season_id=season.id,
                join_code=formatted_code,  # <--- AÑADIDO
            )
            session.add(team)
            session.commit()

            # Añadir miembros
            m1 = TeamMembers(team_id=team.id, user_id=users[i].id, season_id=season.id)
            m2 = TeamMembers(
                team_id=team.id, user_id=users[i + 1].id, season_id=season.id
            )
            session.add_all([m1, m2])

    session.commit()
    return session.exec(select(Users)).all()


def simulate_race(session: Session, season, users, gp_index, all_driver_codes):
    race_date = datetime.now() - timedelta(days=(5 - gp_index) * 7)
    gp = GrandPrix(
        name=f"GP Simulado {gp_index+1}", race_datetime=race_date, season_id=season.id
    )
    session.add(gp)
    session.commit()

    print(f"🏁 Simulando {gp.name}...")

    # Resultado REAL
    real_positions = random.sample(all_driver_codes, 10)
    real_events = {
        "FASTEST_LAP": random.choice(all_driver_codes),
        "SAFETY_CAR": random.choice(["Yes", "No"]),
        "DNFS": str(random.randint(0, 3)),
        "DNF_DRIVER": random.choice(all_driver_codes),
    }

    result = RaceResults(gp_id=gp.id)
    session.add(result)
    session.commit()

    for i, code in enumerate(real_positions):
        session.add(
            RacePositions(race_result_id=result.id, position=i + 1, driver_name=code)
        )
    for k, v in real_events.items():
        session.add(RaceEvents(race_result_id=result.id, event_type=k, value=v))
    session.commit()

    # Generar predicciones
    multipliers = (
        session.exec(select(MultiplierConfigs).where(MultiplierConfigs.season_id == season.id))
        .all()
    )

    for user in users:
        pred_pos = random.sample(all_driver_codes, 10)

        # Truco: afertor acierta más
        if user.username == "afertor" and random.random() > 0.4:
            pred_pos[0:3] = real_positions[0:3]

        prediction = Predictions(user_id=user.id, gp_id=gp.id)
        session.add(prediction)
        session.commit()

        pos_objs = []
        for i, code in enumerate(pred_pos):
            p = PredictionPositions(
                prediction_id=prediction.id, position=i + 1, driver_name=code
            )
            session.add(p)
            pos_objs.append(p)

        ev_objs = []
        pred_events = {
            "FASTEST_LAP": random.choice(all_driver_codes),
            "SAFETY_CAR": random.choice(["Yes", "No"]),
            "DNFS": str(random.randint(0, 3)),
            "DNF_DRIVER": random.choice(all_driver_codes),
        }
        for k, v in pred_events.items():
            e = PredictionEvents(prediction_id=prediction.id, event_type=k, value=v)
            session.add(e)
            ev_objs.append(e)

        # Mock objects para cálculo
        class MockObj:
            pass

        mock_pred = MockObj()
        mock_pred.positions = pos_objs
        mock_pred.events = ev_objs

        mock_res = MockObj()
        mock_res.positions = [
            RacePositions(driver_name=d, position=i + 1)
            for i, d in enumerate(real_positions)
        ]
        mock_res.events = [
            RaceEvents(event_type=k, value=v) for k, v in real_events.items()
        ]

        score_data = calculate_prediction_score(mock_pred, mock_res, multipliers)

        prediction.points_base = score_data["base_points"]
        prediction.multiplier = score_data["multiplier"]
        prediction.points = score_data["final_points"]

    session.commit()


def main(session: Session):
    try:
        reset_db()
        season = create_season(session)
        driver_codes = create_f1_grid(session, season)
        users = create_users_and_teams(session, season)

        for i in range(5):
            simulate_race(session, season, users, i, driver_codes)

        future_date = datetime.now() + timedelta(days=7)
        session.add(
            GrandPrix(
                name="GP Futuro 1", race_datetime=future_date, season_id=season.id
            )
        )
        session.add(
            GrandPrix(
                name="GP Futuro 2",
                race_datetime=future_date + timedelta(days=7),
                season_id=season.id,
            )
        )
        session.commit()

        print("✅ ¡Simulación completada con éxito!")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main(get_session())
