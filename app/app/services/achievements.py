from typing import Annotated
from app.repositories.achievements import AchievementsRepository
from app.schemas.responses import AchievementResponse
from app.db.models.user import Users
from fastapi import Depends

AchievementsRepositoryDep = Annotated[AchievementsRepository, Depends()]


class AchievementsService:
    def __init__(self, achievements_repository: AchievementsRepositoryDep):
        self.achievements_repository = achievements_repository

    def get_user_achievements(self, user: Users) -> list[AchievementResponse]:
        return self.achievements_repository.get_user_achievements(user)
