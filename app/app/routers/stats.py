from typing import Annotated, Any, Dict, List

from app.db.models.user import Users
from app.schemas.responses import AchievementResponse
from app.services.stats import StatsService
from app.core.deps import get_current_user
from fastapi import APIRouter, Depends, Query


StatsServiceDep = Annotated[StatsService, Depends()]

class StatsRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/stats", tags=["Stats"])

        @api_router.get("/evolution", description="Evolución de puntos o posiciones a lo largo de la temporada para pilotos o equipos específicos.", response_model=Dict[str, List[Dict[str, int | float]]])
        def evolution(
            stats_service: StatsServiceDep,
            season_id: int = Query(..., description="ID de la temporada"),
            type: str = Query(..., description="Tipo de estadística (driver/team)"),
            ids: List[int] = Query(..., description="IDs de pilotos o equipos a comparar"),
            names: List[str] = Query(..., description="Nombres de pilotos o equipos a comparar"),
            mode: str = Query("points", description="Modo de cálculo (points/position)")
        ) -> Dict[str, List[Dict[str, int | float]]]:
            return stats_service.evolution(season_id, type, ids, names, mode)
        
        @api_router.get("/ranking", description="Ranking global de pilotos o equipos para una temporada específica.", response_model=Dict[str, Dict[str, Any]])
        def ranking(
            stats_service: StatsServiceDep,
            season_id: int = Query(..., description="ID de la temporada"),
            type: str = Query(..., description="Tipo de estadística (driver/team)"),
            mode: str = Query("points", description="Modo de cálculo (points/position)"),
            limit: int = Query(10, description="Número de posiciones a mostrar")
        ) -> Dict[str, Any]:
            return stats_service.ranking(season_id, type, mode, limit)
        
        @api_router.get("/users", description="Lista ligera de usuarios para el buscador.", response_model=List[Dict[str, Any]], dependencies=[Depends(get_current_user)])
        def get_all_users_light(stats_service: StatsServiceDep) -> List[Dict[str, Any]]:
            return stats_service.get_all_users_light()
        
        @api_router.get("/me", description="Mis estadísticas detalladas comparadas con el global.", response_model=Dict[str, Any], dependencies=[Depends(get_current_user)])
        def get_my_stats(stats_service: StatsServiceDep, current_user: Users = Depends(get_current_user)) -> Dict[str, Any]:
            return stats_service.get_my_stats(current_user)
        
        @api_router.get("/user/{user_id}", description="Estadísticas detalladas de un usuario específico comparadas con el global.", response_model=Dict[str, Any], dependencies=[Depends(get_current_user)])
        def get_user_stats(stats_service: StatsServiceDep, user_id: int) -> Dict[str, Any]:
            return stats_service.get_user_stats(user_id)
        
        @api_router.get("/achievements/{user_id}", description="Logros desbloqueados por un usuario específico.", response_model=List[AchievementResponse], dependencies=[Depends(get_current_user)])
        def get_user_achievements(stats_service: StatsServiceDep, user_id: int) -> List[AchievementResponse]:
            return stats_service.get_user_achievements(user_id)

        return api_router