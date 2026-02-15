from typing import Annotated, Any, Dict, List
from app.repositories.stats import StatsRepository
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy import or_, func, desc
from app.db.session import SessionMaker, get_session
from app.core.deps import get_current_user
from app.db.models.prediction import Predictions
from app.db.models.grand_prix import GrandPrix
from app.db.models.user import Users
from app.db.models.team import Teams
from app.db.models.race_result import RaceResults
from app.db.models.race_position import RacePositions
from app.db.models.race_event import RaceEvents
from app.db.models.prediction_position import PredictionPositions
from app.db.models.prediction_event import PredictionEvents
from app.db.models.achievement import Achievements, UserAchievements

import statistics
from datetime import datetime, timezone

from sqlmodel import Session, select

StatsRepositoryDep = Annotated[StatsRepository, Depends()]

class StatsService:
    def __init__(self, stats_repository: StatsRepositoryDep):
        self.stats_repository = stats_repository

    def evolution(
        self,
        season_id: int,
        type: str,
        ids: list[int],
        names: list[str],
        mode: str
    ) -> Dict[str, List[Dict[str, int | float]]]:
        return self.stats_repository.evolution(season_id, type, ids, names, mode)

    def ranking(
        self,
        season_id: int,
        type: str,
        mode: str,
        limit: int
    ) -> Dict[str, Any]:
        return self.stats_repository.ranking(season_id, type, mode, limit)

    def get_all_users_light(self):
       return self.stats_repository.get_all_users_light()

    def get_my_stats(self, current_user: Users):
        return self.stats_repository.get_user_stats(current_user.id)

    def get_user_stats(self, user_id: int):
        return self.stats_repository.get_user_stats(user_id)

    def get_user_achievements(self, user_id: int):
        return self.stats_repository.get_user_achievements(user_id)