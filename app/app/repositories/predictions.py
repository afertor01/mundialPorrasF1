from typing import Annotated, Dict, List
from app.schemas.requests import UpdateRaceResultRequest
from app.schemas.responses import PredictionResponse
from app.schemas.shared import DriverPosition, RaceEvent
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
from app.db.session import get_session
from app.db.models.prediction import Predictions
from app.db.models.prediction_position import PredictionPositions
from app.db.models.prediction_event import PredictionEvents
from app.db.models.grand_prix import GrandPrix
from app.db.models.user import Users
from app.core.deps import get_current_user
from sqlmodel import Session, delete, select

SessionDep = Annotated[Session, Depends(get_session)]

class PredictionsRepository:
    def __init__(self, session: SessionDep):
        self.session = session
    
    def update_prediction(
        self,
        prediction_data: UpdateRaceResultRequest,
        current_user: Users
    ) -> Dict[str, str]:
        gp = self.session.get(GrandPrix, prediction_data.gp_id)
        if not gp:
            raise HTTPException(status_code=404, detail="GP no encontrado")

        if datetime.now(tz=timezone.utc) >= gp.race_datetime:
            raise HTTPException(status_code=400, detail="Predicción bloqueada")

        query = select(Predictions).where(
            Predictions.user_id == current_user.id,
            Predictions.gp_id == prediction_data.gp_id
        )
        prediction = self.session.exec(query).first()

        if not prediction:
            prediction = Predictions(
                user_id=current_user.id,
                gp_id=prediction_data.gp_id
            )
            self.session.add(prediction)
            self.session.flush()  # importante para tener prediction.id

        # 🔄 Borramos datos anteriores
        query = delete(PredictionPositions).where(
            PredictionPositions.prediction_id == prediction.id
        )
        self.session.exec(query)

        query = delete(PredictionEvents).where(
            PredictionEvents.prediction_id == prediction.id
        )
        self.session.exec(query)

        # 🏁 Guardar posiciones
        for position in prediction_data.positions:
            self.session.add(PredictionPositions(
                prediction_id=prediction.id,
                position=position.position,
                driver_name=position.driver_code
            ))

        # ⚡ Guardar eventos
        for event in prediction_data.events:
            self.session.add(PredictionEvents(
                prediction_id=prediction.id,
                event_type=event.type,
                value=event.description
            ))

        self.session.commit()

        return {"message": "Predicción guardada"}

    def get_my_prediction(
        self,
        gp_id: int,
        current_user: Users
    ) -> PredictionResponse | None:
        # Usamos options(joinedload(...)) para cargar las relaciones ANTES de cerrar la sesión
        query = select(Predictions).where(
            Predictions.user_id == current_user.id,
            Predictions.gp_id == gp_id
        )
        prediction = self.session.exec(query).first()
    
        if not prediction:
            return None

        return PredictionResponse(
            username=prediction.user.username,
            points=prediction.points,
            multiplier=prediction.multiplier,
            positions=[DriverPosition(position=p.position, driver_code=p.driver_name) for p in prediction.positions],
            events=[RaceEvent(type=e.event_type, description=e.value) for e in prediction.events]
        )

    def get_all_predictions_for_gp(
        self,
        gp_id: int
    ) -> List[PredictionResponse]:        
        # Obtenemos el GP para saber si la carrera ya empezó (opcional, por si quieres ocultar antes)
        # Por ahora lo dejamos abierto como pediste.
        query = select(Predictions).where(
            Predictions.gp_id == gp_id
        )
        predictions = self.session.exec(query).all()
        
        results = []
        for prediction in predictions:
            # Construimos un diccionario limpio
            results.append(PredictionResponse(
                username=prediction.user.username,
                points=prediction.points,
                multiplier=prediction.multiplier,
                positions=[DriverPosition(position=p.position, driver_code=p.driver_name) for p in prediction.positions],
                events=[RaceEvent(type=e.event_type, description=e.value) for e in prediction.events]
            ))
            
        return results