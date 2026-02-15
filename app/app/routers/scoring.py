from typing import Annotated, Dict
from app.repositories.scoring import ScoringRepository
from app.services.scoring import ScoringService
from fastapi import APIRouter, HTTPException, Depends
from app.db.session import get_session
from app.db.models.prediction import Predictions
from app.db.models.race_result import RaceResults
from app.db.models.multiplier_config import MultiplierConfigs
from app.utils.scoring import calculate_prediction_score
from app.core.deps import get_current_user, require_admin
from sqlmodel import Session, select

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
