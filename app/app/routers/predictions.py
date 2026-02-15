from typing import Annotated, Dict, List
from app.schemas.requests import UpdateRaceResultRequest
from app.schemas.responses import PredictionResponse
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
from app.services.predictions import PredictionsService
from sqlmodel import Session, delete, select

PredictionsServiceDep = Annotated[PredictionsService, Depends()]

class PredictionsRouter:
    
    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/predictions", tags=["Predictions"])

        @api_router.post("/", description="Create or update a prediction for a GP", response_model=Dict[str, str])
        def update_prediction(
            prediction_data: UpdateRaceResultRequest,
            predictions_service: PredictionsServiceDep,
            current_user: Users = Depends(get_current_user)
        ) -> Dict[str, str]:
            return predictions_service.update_prediction(prediction_data, current_user)

        @api_router.get("/{gp_id}/me", description="Get my prediction for a specific GP", response_model=PredictionResponse | None)
        def get_my_prediction(
            gp_id: int,
            predictions_service: PredictionsServiceDep,
            current_user: Users = Depends(get_current_user)
        ) -> PredictionResponse | None:
            return predictions_service.get_my_prediction(gp_id, current_user)

        @api_router.get("/{gp_id}/all", description="Get all predictions for a specific GP", response_model=List[PredictionResponse])
        def get_all_predictions_for_gp(
            gp_id: int,
            predictions_service: PredictionsServiceDep
        ) -> List[PredictionResponse]:
            return predictions_service.get_all_predictions_for_gp(gp_id)

        return api_router