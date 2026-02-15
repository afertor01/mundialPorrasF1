from typing import Annotated, Dict
from app.repositories.race_results import RaceResultsRepository
from app.schemas.responses import RaceResultResponse
from fastapi import Depends
from app.schemas.requests import UpdateRaceResultRequest

RaceResultsRepositoryDep = Annotated[RaceResultsRepository, Depends()]


class RaceResultsService:
    def __init__(self, race_results_repository: RaceResultsRepositoryDep):
        self.race_results_repository = race_results_repository

    def update_race_result(
        self, race_result_data: UpdateRaceResultRequest
    ) -> Dict[str, str]:
        return self.race_results_repository.update_race_result(race_result_data)

    def get_race_result(self, gp_id: int) -> RaceResultResponse:
        return self.race_results_repository.get_race_result(gp_id)
