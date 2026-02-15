import secrets
import string
from typing import Annotated, Dict
from app.db.models.user import Users
from app.repositories.teams import TeamsRepository
from app.schemas.requests import TeamCreateRequest
from app.schemas.responses import MyTeamResponse, TeamResponse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import joinedload
from app.db.session import SessionMaker, get_session
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from app.db.models.season import Seasons
from app.core.deps import get_current_user, generate_join_code
from sqlmodel import Session, select

TeamsRepositoryDep = Annotated[TeamsRepository, Depends()]


class TeamsService:
    def __init__(self, teams_repository: TeamsRepositoryDep):
        self.teams_repository = teams_repository

    def get_my_team(self, current_user: Users) -> MyTeamResponse | None:
        """
        Devuelve la información de tu equipo actual en la temporada activa.
        Incluye el código para invitar amigos.
        """
        return self.teams_repository.get_my_team(current_user)

    def create_team_player(
        self, team_data: TeamCreateRequest, current_user: Users
    ) -> Dict[str, str]:
        """
        Crea un equipo nuevo y asigna al creador como primer miembro.
        """
        return self.teams_repository.create_team_player(team_data, current_user)

    def join_team_player(self, code: str, current_user: Users) -> Dict[str, str]:
        """
        Unirse a un equipo usando el código de invitación.
        """
        return self.teams_repository.join_team_player(code, current_user)

    def leave_team_player(self, current_user: Users) -> Dict[str, str]:
        """
        Salirse del equipo actual.
        Si el equipo queda vacío (0 miembros), SE BORRA automáticamente.
        """
        return self.teams_repository.leave_team_player(current_user)
