from typing import Annotated, Any, Dict, List
from app.repositories.stats import StatsRepository
from fastapi import Depends
from app.db.models.user import Users



StatsRepositoryDep = Annotated[StatsRepository, Depends()]


class StatsService:
    def __init__(self, stats_repository: StatsRepositoryDep):
        self.stats_repository = stats_repository

    def evolution(
        self, season_id: int, type: str, ids: list[int], names: list[str], mode: str
    ) -> Dict[str, List[Dict[str, int | float]]]:
        return self.stats_repository.evolution(season_id, type, ids, names, mode)

    def ranking(
        self, season_id: int, type: str, mode: str, limit: int
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
