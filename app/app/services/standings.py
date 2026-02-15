from typing import Annotated, List
from app.repositories.standings import StandingsRepository
from app.schemas.responses import GPStandingResponse, SeasonStandingResponse, TeamStandingResponse
from fastapi import APIRouter, Depends
from sqlalchemy import func
from app.db.session import SessionMaker, get_session
from app.db.models.user import Users
from app.db.models.prediction import Predictions
from app.db.models.grand_prix import GrandPrix
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from sqlmodel import Session, select

StandingsRepositoryDep = Annotated[StandingsRepository, Depends()]

class StandingsService:
    def __init__(self, standings_repository: StandingsRepositoryDep):
        self.standings_repository = standings_repository

    def individual_season_standings(self, season_id: int) -> List[SeasonStandingResponse]:
        return self.standings_repository.individual_season_standings(season_id)

    def gp_standings(self, gp_id: int) -> List[GPStandingResponse]:
        return self.standings_repository.gp_standings(gp_id)
    
    def team_standings(self, season_id: int) -> List[TeamStandingResponse]:
        return self.standings_repository.team_standings(season_id)
