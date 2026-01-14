from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from app.db.session import SessionLocal
from app.db.models.prediction import Prediction
from app.db.models.prediction_position import PredictionPosition
from app.db.models.prediction_event import PredictionEvent
from app.db.models.grand_prix import GrandPrix
from app.core.deps import get_current_user

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.post("/{gp_id}")
def upsert_prediction(
    gp_id: int,
    positions: dict[int, str],   # {1: "Verstappen", 2: "Leclerc", ...}
    events: dict[str, str],      # {"FASTEST_LAP": "yes", "DNFS": "2"}
    current_user = Depends(get_current_user)
):
    db = SessionLocal()

    gp = db.query(GrandPrix).get(gp_id)
    if not gp:
        db.close()
        raise HTTPException(status_code=404, detail="GP no encontrado")

    if datetime.utcnow() >= gp.race_datetime:
        db.close()
        raise HTTPException(status_code=400, detail="Predicción bloqueada")

    prediction = (
        db.query(Prediction)
        .filter(
            Prediction.user_id == current_user.id,
            Prediction.gp_id == gp_id
        )
        .first()
    )

    if not prediction:
        prediction = Prediction(
            user_id=current_user.id,
            gp_id=gp_id
        )
        db.add(prediction)
        db.flush()  # importante para tener prediction.id

    # 🔄 Borramos datos anteriores
    db.query(PredictionPosition).filter(
        PredictionPosition.prediction_id == prediction.id
    ).delete()

    db.query(PredictionEvent).filter(
        PredictionEvent.prediction_id == prediction.id
    ).delete()

    # 🏁 Guardar posiciones
    for pos, driver in positions.items():
        db.add(PredictionPosition(
            prediction_id=prediction.id,
            position=pos,
            driver_name=driver
        ))

    # ⚡ Guardar eventos
    for event_type, value in events.items():
        db.add(PredictionEvent(
            prediction_id=prediction.id,
            event_type=event_type,
            value=value
        ))

    db.commit()
    db.close()

    return {"message": "Predicción guardada"}

@router.get("/{gp_id}/me")
def get_my_prediction(
    gp_id: int,
    current_user = Depends(get_current_user)
):
    db = SessionLocal()

    prediction = (
        db.query(Prediction)
        .filter(
            Prediction.user_id == current_user.id,
            Prediction.gp_id == gp_id
        )
        .first()
    )

    if not prediction:
        db.close()
        return None

    db.close()
    return prediction
