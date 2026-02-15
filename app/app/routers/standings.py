from typing import Annotated, List
from app.schemas.responses import GPStandingResponse, SeasonStandingResponse, TeamStandingResponse
from app.services.standings import StandingsService
from fastapi import APIRouter, Depends

StandingsServiceDep = Annotated[StandingsService, Depends()]

class StandingsRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/standings", tags=["Standings"])

        @api_router.get("/season/{season_id}", description="Get individual standings for a season", response_model=List[SeasonStandingResponse])
        def get_individual_season_standings(
            season_id: int,
            standings_service: StandingsServiceDep
        ) -> List[SeasonStandingResponse]:
            return standings_service.individual_season_standings(season_id)

        @api_router.get("/gp/{gp_id}", description="Get individual standings for a Grand Prix", response_model=List[GPStandingResponse])
        def get_gp_standings(
            gp_id: int,
            standings_service: StandingsServiceDep
        ) -> List[GPStandingResponse]:
            return standings_service.gp_standings(gp_id)

        @api_router.get("/team/season/{season_id}", description="Get team standings for a season", response_model=List[TeamStandingResponse])
        def get_team_standings(
            season_id: int,
            standings_service: StandingsServiceDep
        ) -> List[TeamStandingResponse]:
            return standings_service.team_standings(season_id)

        return api_router