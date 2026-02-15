from typing import Annotated, List
from app.repositories.standings import StandingsRepository
from app.schemas.responses import (
    GPStandingResponse,
    SeasonStandingResponse,
    TeamStandingResponse,
)
from fastapi import Depends

StandingsRepositoryDep = Annotated[StandingsRepository, Depends()]


class StandingsService:
    def __init__(self, standings_repository: StandingsRepositoryDep):
        self.standings_repository = standings_repository

    def individual_season_standings(
        self, season_id: int
    ) -> List[SeasonStandingResponse]:
        return self.standings_repository.individual_season_standings(season_id)

    def gp_standings(self, gp_id: int) -> List[GPStandingResponse]:
        return self.standings_repository.gp_standings(gp_id)

    def team_standings(self, season_id: int) -> List[TeamStandingResponse]:
        return self.standings_repository.team_standings(season_id)
