from typing import Annotated, Dict
from app.services.scoring import ScoringService
from fastapi import APIRouter, Depends
from app.db.session import get_session
from app.core.deps import require_admin

ScoringServiceDep = Annotated[ScoringService, Depends(get_session)]


class ScoringRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/scoring", tags=["Scoring"])

        @api_router.post(
            "/{gp_id}",
            description="Calculate scores for a GP",
            response_model=Dict[str, str],
            dependencies=[Depends(require_admin)],
        )
        def score_gp(gp_id: int, scoring_service: ScoringServiceDep) -> Dict[str, str]:
            return scoring_service.score_gp(gp_id)

        return api_router
