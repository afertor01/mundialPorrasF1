from typing import Annotated, List
from app.schemas.requests import GrandPrixCreateRequest
from app.schemas.responses import GrandPrixResponse
from app.services.grand_prix import GrandPrixService
from fastapi import APIRouter, Depends
from app.core.deps import require_admin
from app.db.models.grand_prix import GrandPrix

GrandPrixServiceDep = Annotated[GrandPrixService, Depends()]


class GrandPrixRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/grand-prix", tags=["Grand Prix"])

        @api_router.post(
            "/",
            description="Create a new Grand Prix",
            response_model=GrandPrix,
            dependencies=[Depends(require_admin)],
        )
        def create_grand_prix(
            gp_data: GrandPrixCreateRequest, gp_service: GrandPrixServiceDep
        ) -> GrandPrix:
            return gp_service.create_grand_prix(gp_data)

        @api_router.get(
            "/season/{season_id}",
            description="List all Grand Prix for a season",
            response_model=List[GrandPrix],
        )
        def list_grand_prix(
            season_id: int, gp_service: GrandPrixServiceDep
        ) -> List[GrandPrix]:
            return gp_service.list_grand_prix(season_id)

        return api_router
