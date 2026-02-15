from typing import Annotated, Dict
from app.repositories.race_results import RaceResultsRepository
from app.schemas.responses import AdminRaceResultResponse, RaceResultResponse
from app.schemas.shared import DriverPosition, RaceEvent
from fastapi import APIRouter, HTTPException, Depends
from app.db.session import SessionMaker, get_session
from app.db.models.race_result import RaceResults
from app.db.models.race_position import RacePositions
from app.db.models.race_event import RaceEvents
from app.db.models.grand_prix import GrandPrix
from app.schemas.requests import UpdateRaceResultRequest
from app.core.deps import get_current_user
from app.db.models.user import Users
from app.utils.achievements import evaluate_race_achievements
from sqlmodel import Session, delete, select

RaceResultsRepositoryDep = Annotated[RaceResultsRepository, Depends()]


class RaceResultsService:
    def __init__(self, race_results_repository: RaceResultsRepositoryDep):
        self.race_results_repository = race_results_repository

    def update_race_result(
        self,
        race_result_data: UpdateRaceResultRequest
    ) -> Dict[str, str]:
        return self.race_results_repository.update_race_result(race_result_data)

    def get_race_result(
        self,
        gp_id: int
    ) -> RaceResultResponse:
        return self.race_results_repository.get_race_result(gp_id)
