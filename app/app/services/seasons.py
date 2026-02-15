from typing import Annotated, List
from app.schemas.responses import SeasonResponse, TeamResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import joinedload
from app.db.session import SessionMaker, get_session
from app.db.models.season import Seasons
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from app.db.models.constructor import Constructors
from app.repositories.seasons import SeasonsRepository
from app.core.deps import get_current_user
from sqlmodel import Session, select, select

SeasonsRepositoryDep = Annotated[SeasonsRepository, Depends()]

class SeasonsService:
    def __init__(self, seasons_repository: SeasonsRepositoryDep):
        self.seasons_repository = seasons_repository

    def get_seasons(self) -> List[SeasonResponse]:
        return self.seasons_repository.get_seasons()

    def get_season_teams(self, season_id: int) -> List[TeamResponse]:
        """ 
        Equipos de JUGADORES (Team).
        Devuelve los nombres de los miembros como lista de strings.
        """
        return self.seasons_repository.get_season_teams(season_id)

    def get_season_constructors(self, season_id: int) -> List[Constructors]:
        """ Parrilla F1 REAL (Constructor + Drivers) """
        return self.seasons_repository.get_season_constructors(season_id)

    def get_season_constructors(self, season_id: int) -> List[Constructors]:
        """ Parrilla F1 REAL (Constructor + Drivers) """
        return self.seasons_repository.get_season_constructors(season_id)