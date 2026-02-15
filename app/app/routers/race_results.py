from typing import Annotated, Dict
from app.schemas.responses import RaceResultResponse
from app.services.race_results import RaceResultsService
from fastapi import APIRouter, Depends
from app.schemas.requests import UpdateRaceResultRequest
from app.core.deps import get_current_user, require_admin

RaceResultsServiceDep = Annotated[RaceResultsService, Depends()]


class RaceResultsRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/results", tags=["Race Results"])

        @api_router.post(
            "/",
            description="Update race result for a GP",
            response_model=Dict[str, str],
            dependencies=[Depends(require_admin)],
        )
        def update_race_result(
            race_result_data: UpdateRaceResultRequest,
        ) -> Dict[str, str]:
            return self.race_results_service.update_race_result(race_result_data)

        @api_router.get(
            "/{gp_id}",
            description="Get race result for a GP",
            response_model=RaceResultResponse,
            dependencies=[Depends(get_current_user)],
        )
        def get_race_result(gp_id: int) -> RaceResultResponse:
            return self.race_results_service.get_race_result(gp_id)

        return api_router
