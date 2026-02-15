from typing import Annotated, Dict
from app.repositories.race_results import RaceResultsRepository
from app.schemas.responses import AdminRaceResultResponse, RaceResultResponse
from app.schemas.shared import DriverPosition, RaceEvent
from app.services.race_results import RaceResultsService
from fastapi import APIRouter, HTTPException, Depends
from app.db.session import SessionMaker, get_session
from app.db.models.race_result import RaceResults
from app.db.models.race_position import RacePositions
from app.db.models.race_event import RaceEvents
from app.db.models.grand_prix import GrandPrix
from app.schemas.requests import UpdateRaceResultRequest
from app.core.deps import get_current_user, require_admin
from app.db.models.user import Users
from app.utils.achievements import evaluate_race_achievements
from sqlmodel import Session, delete, select

RaceResultsServiceDep = Annotated[RaceResultsService, Depends()]


class RaceResultsRouter:
    
    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/results", tags=["Race Results"])
    
        @api_router.post("/", description="Update race result for a GP", response_model=Dict[str, str], dependencies=[Depends(require_admin)])
        def update_race_result(
            race_result_data: UpdateRaceResultRequest
        ) -> Dict[str, str]:
            return self.race_results_service.update_race_result(race_result_data)

        @api_router.get("/{gp_id}", description="Get race result for a GP", response_model=RaceResultResponse, dependencies=[Depends(get_current_user)])
        def get_race_result(
            gp_id: int
        ) -> RaceResultResponse:
            return self.race_results_service.get_race_result(gp_id)
        
        return api_router
