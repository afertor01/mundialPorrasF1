from typing import Annotated, Dict
from app.repositories.scoring import ScoringRepository
from fastapi import APIRouter, HTTPException, Depends
from app.db.session import get_session
from app.db.models.prediction import Predictions
from app.db.models.race_result import RaceResults
from app.db.models.multiplier_config import MultiplierConfigs
from app.utils.scoring import calculate_prediction_score
from app.core.deps import get_current_user
from sqlmodel import Session, select

ScoringRepositoryDep = Annotated[ScoringRepository, Depends(get_session)]


class ScoringService:
    def __init__(self, scoring_repository: ScoringRepositoryDep):
        self.scoring_repository = scoring_repository

    def score_gp(
        self,
        gp_id: int,
    ) -> Dict[str, str]:
        return self.scoring_repository.score_gp(gp_id)
