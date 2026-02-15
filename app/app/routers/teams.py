from typing import Annotated, Dict
from app.db.models.user import Users
from app.schemas.requests import TeamCreateRequest
from app.schemas.responses import MyTeamResponse
from app.services.teams import TeamsService
from app.core.deps import get_current_user
from fastapi import APIRouter, Depends

TeamsServiceDep = Annotated[TeamsService, Depends()]


class TeamsRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/teams", tags=["Teams"])

        @api_router.get(
            "/my-team",
            description="Información de tu equipo actual en la temporada activa, incluyendo código de invitación.",
            response_model=MyTeamResponse | None,
        )
        def get_my_team(
            teams_service: TeamsServiceDep,
            current_user: Users = Depends(get_current_user),
        ) -> MyTeamResponse | None:
            return teams_service.get_my_team(current_user)

        @api_router.post(
            "/create",
            description="Crea un nuevo equipo y te asigna como primer miembro.",
            response_model=Dict[str, str],
        )
        def create_team(
            team_data: TeamCreateRequest,
            teams_service: TeamsServiceDep,
            current_user: Users = Depends(get_current_user),
        ) -> Dict[str, str]:
            return teams_service.create_team_player(team_data, current_user)

        @api_router.post(
            "/join",
            description="Únete a un equipo usando un código de invitación.",
            response_model=Dict[str, str],
        )
        def join_team(
            code: str,
            teams_service: TeamsServiceDep,
            current_user: Users = Depends(get_current_user),
        ) -> Dict[str, str]:
            return teams_service.join_team_player(code, current_user)

        @api_router.post(
            "/leave",
            description="Sal de tu equipo actual. Si el equipo queda vacío, se borra automáticamente.",
            response_model=Dict[str, str],
        )
        def leave_team(
            teams_service: TeamsServiceDep,
            current_user: Users = Depends(get_current_user),
        ) -> Dict[str, str]:
            return teams_service.leave_team_player(current_user)

        return api_router
