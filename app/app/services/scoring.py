from typing import Annotated, Dict
from app.repositories.scoring import ScoringRepository
from fastapi import Depends
from app.db.session import get_session

ScoringRepositoryDep = Annotated[ScoringRepository, Depends(get_session)]


class ScoringService:
    def __init__(self, scoring_repository: ScoringRepositoryDep):
        self.scoring_repository = scoring_repository

    def score_gp(
        self,
        gp_id: int,
    ) -> Dict[str, str]:
        return self.scoring_repository.score_gp(gp_id)
