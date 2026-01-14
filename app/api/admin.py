from app.db.models import _all
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from app.db.session import SessionLocal
from app.db.models.season import Season
from app.db.models.user import User
from app.db.models.grand_prix import GrandPrix
from app.core.deps import require_admin
from app.schemas.season import SeasonCreate

router = APIRouter(prefix="/admin", tags=["Admin"])


# -----------------------
# Usuarios
# -----------------------
@router.get("/users")
def list_users(current_user = Depends(require_admin)):
    db = SessionLocal()
    users = db.query(User).all()
    db.close()
    return users


@router.post("/users")
def create_user(email: str, username: str, password: str, role: str = "user", current_user = Depends(require_admin)):
    from app.core.security import hash_password
    db = SessionLocal()
    if db.query(User).filter(User.email == email).first():
        db.close()
        raise HTTPException(400, "Email ya registrado")
    new_user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()
    return new_user


@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user = Depends(require_admin)):
    db = SessionLocal()
    user = db.query(User).get(user_id)
    if not user:
        db.close()
        raise HTTPException(404, "Usuario no encontrado")
    db.delete(user)
    db.commit()
    db.close()
    return {"message": "Usuario eliminado"}


# -----------------------
# Temporadas
# -----------------------
@router.get("/seasons")
def list_seasons(current_user = Depends(require_admin)):
    db = SessionLocal()
    seasons = db.query(Season).all()
    db.close()
    return seasons


@router.post("/seasons")
def create_season(
    season: SeasonCreate,
    current_user = Depends(require_admin)
):
    db = SessionLocal()

    # Comprobar si ya existe temporada con ese año (usamos season.year)
    existing = db.query(Season).filter(Season.year == season.year).first()
    if existing:
        db.close()
        raise HTTPException(400, f"Ya existe una temporada con el año {season.year}")

    # Si is_active es True, desactivar otras temporadas (usamos season.is_active)
    if season.is_active:
        db.query(Season).update({Season.is_active: False})

    # Creamos el modelo de base de datos usando los datos del esquema
    new_season = Season(
        year=season.year, 
        name=season.name, 
        is_active=season.is_active
    )
    
    db.add(new_season)
    db.commit()
    db.refresh(new_season)
    db.close()

    return new_season

@router.delete("/seasons/{season_id}")
def delete_season(season_id: int, current_user = Depends(require_admin)):
    db = SessionLocal()
    season = db.query(Season).get(season_id)
    if not season:
        db.close()
        raise HTTPException(404, "Temporada no encontrada")
    db.delete(season)
    db.commit()
    db.close()
    return {"message": "Temporada eliminada"}


@router.patch("/seasons/{season_id}/toggle")
def toggle_season_active(season_id: int, current_user = Depends(require_admin)):
    db = SessionLocal()
    season = db.query(Season).get(season_id)
    
    if not season:
        db.close()
        raise HTTPException(404, "Temporada no encontrada")

    # Si la vamos a activar, desactivamos TODAS las demás primero
    if not season.is_active:
        db.query(Season).update({Season.is_active: False})
        season.is_active = True
    else:
        # Si ya estaba activa y la queremos desactivar
        season.is_active = False
    
    db.commit()
    db.refresh(season)
    db.close()
    
    return season

# -----------------------
# Gran Premio
# -----------------------
@router.post("/grand-prix")
def create_grand_prix(season_id: int, name: str, race_datetime: datetime, current_user = Depends(require_admin)):
    db = SessionLocal()
    season = db.query(Season).get(season_id)
    if not season:
        db.close()
        raise HTTPException(404, "Temporada no encontrada")
    gp = GrandPrix(name=name, season_id=season_id, race_datetime=race_datetime)
    db.add(gp)
    db.commit()
    db.refresh(gp)
    db.close()
    return gp


@router.delete("/grand-prix/{gp_id}")
def delete_grand_prix(gp_id: int, current_user = Depends(require_admin)):
    db = SessionLocal()
    gp = db.query(GrandPrix).get(gp_id)
    if not gp:
        db.close()
        raise HTTPException(404, "GP no encontrado")
    db.delete(gp)
    db.commit()
    db.close()
    return {"message": "GP eliminado"}

# -----------------------
# Resultados de GP
# -----------------------

@router.post("/results/{gp_id}")
def upsert_race_result(
    gp_id: int,
    positions: dict[int, str],    # {1: "Verstappen", 2: "Leclerc", ...}
    events: dict[str, str],       # {"FASTEST_LAP": "Verstappen", "SAFETY_CAR": "Yes"}
    current_user = Depends(require_admin)
):
    db = SessionLocal()

    from app.db.models.grand_prix import GrandPrix
    gp = db.query(GrandPrix).get(gp_id)
    if not gp:
        db.close()
        raise HTTPException(404, "GP no encontrado")

    # Comprobar si ya hay resultado
    result = db.query(RaceResult).filter(RaceResult.gp_id == gp_id).first()
    if not result:
        result = RaceResult(gp_id=gp_id)
        db.add(result)
        db.flush()

    # Borrar posiciones y eventos anteriores
    db.query(RacePosition).filter(RacePosition.race_result_id == result.id).delete()
    db.query(RaceEvent).filter(RaceEvent.race_result_id == result.id).delete()

    # Guardar posiciones
    for pos, driver in positions.items():
        db.add(RacePosition(race_result_id=result.id, position=pos, driver_name=driver))

    # Guardar eventos
    for event_type, value in events.items():
        db.add(RaceEvent(race_result_id=result.id, event_type=event_type, value=value))

    db.commit()

    # -------------------------
    # 🔥 Calcular puntuaciones automáticamente
    # -------------------------
    predictions = db.query(Prediction).filter(Prediction.gp_id == gp_id).all()
    season_id = gp.season_id
    multipliers = db.query(MultiplierConfig).filter(MultiplierConfig.season_id == season_id).all()

    for prediction in predictions:
        result_score = calculate_prediction_score(
            prediction,
            result,
            multipliers
        )
        prediction.points = result_score["final_points"]
        prediction.points_base = result_score["base_points"]
        prediction.multiplier = result_score["multiplier"]

    db.commit()
    db.close()
    return {"message": "Resultado guardado y puntuaciones calculadas automáticamente"}

@router.post("/predictions/{user_id}/{gp_id}")
def upsert_prediction_admin(
    user_id: int,
    gp_id: int,
    positions: dict[int, str],   # {1: "Verstappen", 2: "Leclerc", ...}
    events: dict[str, str],      # {"FASTEST_LAP": "yes", "DNFS": "2"}
    current_user = Depends(require_admin)
):
    db = SessionLocal()

    # Comprobar si el usuario existe
    user = db.query(User).get(user_id)
    if not user:
        db.close()
        raise HTTPException(404, "Usuario no encontrado")

    from app.db.models.grand_prix import GrandPrix
    gp = db.query(GrandPrix).get(gp_id)
    if not gp:
        db.close()
        raise HTTPException(404, "GP no encontrado")

    # Comprobar si ya hay predicción
    prediction = db.query(Prediction).filter(
        Prediction.user_id == user_id,
        Prediction.gp_id == gp_id
    ).first()

    if not prediction:
        prediction = Prediction(user_id=user_id, gp_id=gp_id)
        db.add(prediction)
        db.flush()

    # Borrar datos anteriores
    db.query(PredictionPosition).filter(PredictionPosition.prediction_id == prediction.id).delete()
    db.query(PredictionEvent).filter(PredictionEvent.prediction_id == prediction.id).delete()

    # Guardar posiciones
    for pos, driver in positions.items():
        db.add(PredictionPosition(prediction_id=prediction.id, position=pos, driver_name=driver))

    # Guardar eventos
    for event_type, value in events.items():
        db.add(PredictionEvent(prediction_id=prediction.id, event_type=event_type, value=value))

    db.commit()
    db.close()
    return {"message": "Predicción guardada"}