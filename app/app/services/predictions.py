from typing import Annotated, Dict, List
from app.schemas.requests import UpdateRaceResultRequest
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
from app.db.session import SessionMaker
from app.db.models.prediction import Predictions
from app.db.models.prediction_position import PredictionPositions
from app.db.models.prediction_event import PredictionEvents
from app.db.models.grand_prix import GrandPrix
from app.db.models.user import Users
from app.core.deps import get_current_user
from app.repositories.predictions import PredictionsRepository
from app.schemas.responses import PredictionResponse
from sqlmodel import Session, delete, select

PredictionsRepositoryDep = Annotated[PredictionsRepository, Depends()]

class PredictionsService:
    def __init__(self, predictions_repository: PredictionsRepositoryDep):
        self.predictions_repository = predictions_repository
    
    def update_prediction(
        self,
        prediction_data: UpdateRaceResultRequest,
        current_user: Users
    ) -> Dict[str, str]:
        return self.predictions_repository.update_prediction(prediction_data, current_user)

    def get_my_prediction(
        self,
        gp_id: int,
        current_user: Users
    ) -> PredictionResponse | None:
        return self.predictions_repository.get_my_prediction(gp_id, current_user)

    def get_all_predictions_for_gp(
        self,
        gp_id: int
    ) -> List[PredictionResponse]:        
       return self.predictions_repository.get_all_predictions_for_gp(gp_id)