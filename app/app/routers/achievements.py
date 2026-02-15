
from typing import Annotated, List

from app.services.achievements import AchievementsService
from app.schemas.responses import AchievementResponse
from app.core.deps import get_current_user
from fastapi import APIRouter, Depends


AchievementsServiceDep = Annotated[AchievementsService, Depends()]

class AchievementsRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/achievements", tags=["Achievements"])

        @api_router.get("/", description="Get all achievements with user's unlocked status", response_model=List[AchievementResponse])
        def get_user_achievements(
            achievements_service: AchievementsServiceDep,
            user = Depends(get_current_user)
        ) -> List[AchievementResponse]:
            return achievements_service.get_user_achievements(user)
    
        return api_router