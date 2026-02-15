from typing import Annotated, List
from app.schemas.responses import SeasonResponse, TeamResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import joinedload
from app.db.session import SessionMaker, get_session
from app.db.models.season import Seasons
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from app.db.models.constructor import Constructors
from app.core.deps import get_current_user
from sqlmodel import Session, select, select

SessionDep = Annotated[Session, Depends(get_session)]


class SeasonsRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def get_seasons(self) -> List[SeasonResponse]:
        query = select(Seasons).order_by(Seasons.year.desc())
        seasons = self.session.exec(query).all()

        return [SeasonResponse(**season.model_dump()) for season in seasons]

    def get_season_teams(self, season_id: int) -> List[TeamResponse]:
        """
        Equipos de JUGADORES (Team).
        Devuelve los nombres de los miembros como lista de strings.
        """

        query = select(Teams).where(Teams.season_id == season_id)
        teams = self.session.exec(query).all()
        # Cargamos Equipo -> Miembros -> Usuario (para sacar el username)

        # Formateamos la respuesta para que el frontend reciba strings
        result = []
        for team in teams:
            # Extraemos solo el username
            member_names = [m.user.username for m in team.members if m.user]
            result.append(
                TeamResponse(
                    id=team.id,
                    name=team.name,
                    members=member_names,  # ["User1", "User2"]
                )
            )

        return result

    def get_season_constructors(self, season_id: int) -> List[Constructors]:
        """Parrilla F1 REAL (Constructor + Drivers)"""
        query = select(Constructors).where(Constructors.season_id == season_id)
        constructors = self.session.exec(query).all()

        return constructors
