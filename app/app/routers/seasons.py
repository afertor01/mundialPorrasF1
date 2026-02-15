from typing import Annotated, List
from app.schemas.responses import SeasonResponse, TeamResponse
from app.services.seasons import SeasonsService
from fastapi import APIRouter, Depends
from app.db.models.constructor import Constructors
from app.core.deps import get_current_user

SeasonsServiceDep = Annotated[SeasonsService, Depends()]


class SeasonsRouter:
    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(
            prefix="/seasons",
            tags=["Seasons"],
            dependencies=[Depends(get_current_user)],
        )

        @api_router.get(
            "/", description="Get all seasons", response_model=List[SeasonResponse]
        )
        def get_seasons(seasons_service: SeasonsServiceDep) -> List[SeasonResponse]:
            return seasons_service.get_seasons()

        @api_router.get(
            "/{season_id}/teams",
            description="Get teams for a specific season",
            response_model=List[TeamResponse],
        )
        def get_season_teams(
            season_id: int, seasons_service: SeasonsServiceDep
        ) -> List[TeamResponse]:
            return seasons_service.get_season_teams(season_id)

        @api_router.get(
            "/{season_id}/constructors",
            description="Get constructors for a specific season",
            response_model=List[Constructors],
        )
        def get_season_constructors(
            season_id: int, seasons_service: SeasonsServiceDep
        ) -> List[Constructors]:
            return seasons_service.get_season_constructors(season_id)

        return api_router
