from datetime import datetime
from typing import Annotated, Dict, List

from app.core.deps import require_admin
from app.db.models.season import Seasons
from app.db.models.user import Users
from app.db.models.grand_prix import GrandPrix
from app.db.models.team import Teams
from app.db.models.constructor import Constructors
from app.schemas.requests import AdminUserUpdateRequest, SeasonCreateRequest, UserCreateRequest, GrandPrixCreateRequest, ConstructorCreateRequest, DriverCreateRequest, GrandPrixUpdateRequest, AdminTeamCreateRequest, UpdateRaceResultRequest, UpdateRacePredictionRequest, TeamMemberCreateRequest
from app.schemas.responses import AdminRaceResultResponse
from app.services.admin import AdminService
from fastapi import APIRouter, Depends, UploadFile


AdminServiceDep = Annotated[AdminService, Depends()]

class AdminRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])
        
        @api_router.get("/users", description="Get all users", response_model=List[Users])
        def list_users(admin_service: AdminServiceDep) -> List[Users]:
            return admin_service.list_users()
        
        @api_router.post("/users", description="Create a new user", response_model=Users)
        def create_user(
            user_data: UserCreateRequest,
            admin_service: AdminServiceDep
        ) -> Users:
            return admin_service.create_user(user_data)

        @api_router.delete("/users/{user_id}", description="Delete a user by ID", response_model=Dict[str, str])
        def delete_user(user_id: int, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.delete_user(user_id)

        @api_router.patch("/users", description="Update user details", response_model=Users)
        def update_user(
            user_data: AdminUserUpdateRequest,
            admin_service: AdminServiceDep
        ) -> Users:
            return admin_service.update_user(user_data)

        # -----------------------
        # Temporadas
        # -----------------------
        @api_router.get("/seasons", description="Get all seasons", response_model=List[Seasons])
        def list_seasons(admin_service: AdminServiceDep) -> List[Seasons]:
            return admin_service.list_seasons()

        @api_router.post("/seasons", description="Create a new season", response_model=Seasons)
        def create_season(
            season: SeasonCreateRequest,
            admin_service: AdminServiceDep
        ) -> Seasons:
            return admin_service.create_season(season)

        @api_router.delete("/seasons/{season_id}", description="Delete a season by ID", response_model=Dict[str, str])
        def delete_season(season_id: int, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.delete_season(season_id)

        @api_router.patch("/seasons/{season_id}/toggle", description="Toggle active status of a season", response_model=Seasons)
        def toggle_season_active(season_id: int, admin_service: AdminServiceDep) -> Seasons:
            return admin_service.toggle_season_active(season_id)

        # -----------------------
        # Gran Premio
        # -----------------------
        @api_router.post("/gps", description="Create a new Grand Prix", response_model=GrandPrix)
        def create_grand_prix(gp_data: GrandPrixCreateRequest, admin_service: AdminServiceDep) -> GrandPrix:
            return admin_service.create_grand_prix(gp_data)

        @api_router.get("/gps", description="List Grand Prix for admin table, optionally filtered by season", response_model=List[GrandPrix])
        def get_admin_gps_list(admin_service: AdminServiceDep, season_id: int = None) -> List[GrandPrix]:
            return admin_service.get_admin_gps_list(season_id)

        @api_router.put("/gps", description="Update Grand Prix details (name, date, season)", response_model=GrandPrix)
        def update_gp(
            gp_data: GrandPrixUpdateRequest,
            admin_service: AdminServiceDep
        ) -> GrandPrix:
           return admin_service.update_gp(gp_data)

        @api_router.delete("/gps/{gp_id}", description="Delete a Grand Prix and all associated predictions and results", response_model=Dict[str, str])
        def delete_gp(gp_id: int, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.delete_gp(gp_id)

        # -----------------------
        # Carga Masiva de GPs
        # -----------------------
        @api_router.post("/seasons/{season_id}/import-gps", description="Importar GPs desde un archivo JSON. Si el GP ya existe (por nombre), se actualiza su fecha. Si no existe, se crea.", response_model=Dict[str, str])
        async def import_gps(
            season_id: int, 
            file: UploadFile, 
            admin_service: AdminServiceDep
        ) -> Dict[str, str]:
            return admin_service.import_gps(season_id, file)

        # -----------------------
        # Resultados de GP
        # -----------------------

        @api_router.get("/results/{gp_id}", description="Obtener el resultado de un GP específico. Devuelve posiciones y eventos en un formato fácil de consumir para el frontend.", response_model=AdminRaceResultResponse | None)
        def get_race_result_admin(gp_id: int, admin_service: AdminServiceDep) -> AdminRaceResultResponse | None:
            return admin_service.get_race_result_admin(gp_id)

        @api_router.put("/results", description="Crear o actualizar el resultado de un GP", response_model=Dict[str, str])
        def update_race_result(
            race_result_data: UpdateRaceResultRequest,
            admin_service: AdminServiceDep
        ) -> Dict[str, str]:
            return admin_service.update_race_result(race_result_data)

        @api_router.put("/predictions", description="Crear o actualizar la predicción de un usuario para un GP específico", response_model=Dict[str, str])
        def update_prediction_admin(
            prediction_data: UpdateRacePredictionRequest,
            admin_service: AdminServiceDep
        ) -> Dict[str, str]:
            return admin_service.update_prediction_admin(prediction_data)

        @api_router.post("/gps/{gp_id}/sync", description="Disparar sincronización manual con FastF1 para un GP específico. Útil para actualizar resultados después de la carrera o corregir errores.", response_model=Dict[str, bool | List[str]])
        def sync_gp_data(gp_id: int, admin_service: AdminServiceDep) -> Dict[str, bool | List[str]]:
            """
            Dispara la sincronización manual con FastF1 y devuelve los logs.
            """
            return admin_service.sync_gp_data(gp_id)

        # -----------------------
        # Gestión de Escuderías (Teams)
        # -----------------------
        @api_router.get("/seasons/{season_id}/teams", description="Listar equipos de una temporada específica, incluyendo los nombres de los miembros", response_model=List[Dict[str, int | str | List[str]]])
        def list_teams(season_id: int, admin_service: AdminServiceDep) -> List[Dict[str, int | str | List[str]]]:
           return admin_service.list_teams(season_id)

        @api_router.post("/seasons/teams", description="Crear un nuevo equipo en una temporada específica. Devuelve el equipo creado con su ID y código de unión.", response_model=Teams)
        def create_team(team_data: AdminTeamCreateRequest, admin_service: AdminServiceDep) -> Teams:
            return admin_service.create_team(team_data)

        @api_router.post("/teams/members", description="Añadir un usuario a un equipo específico. Validaciones: máximo 2 miembros por equipo y un usuario no puede estar en más de un equipo por temporada.", response_model=Dict[str, str])
        def add_team_member(team_member_data: TeamMemberCreateRequest, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.add_team_member(team_member_data)

        @api_router.delete("/teams/{team_id}/members/{user_id}", description="Expulsar a un usuario específico de un equipo. Si el equipo queda sin miembros, se elimina automáticamente.", response_model=Dict[str, str])
        def remove_team_member(team_id: int, user_id: int, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.remove_team_member(team_id, user_id)

        @api_router.delete("/teams/{team_id}", description="Eliminar un equipo específico. Esto también eliminará a todos los miembros asociados al equipo.", response_model=Dict[str, str])
        def delete_team(team_id: int, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.delete_team(team_id)

        # -----------------------
        # GESTIÓN PARRILLA F1 (Constructores y Pilotos)
        # -----------------------

        @api_router.get("/seasons/{season_id}/constructors", description="Listar constructores de una temporada específica", response_model=List[Dict[str, int | str | List[Dict[str, int | str]]]])
        def list_constructors(season_id: int, admin_service: AdminServiceDep) -> List[Dict[str, int | str | List[Dict[str, int | str]]]]:
            return admin_service.list_constructors(season_id)

        @api_router.post("/seasons/constructors", description="Crear un nuevo constructor en una temporada específica. Devuelve el constructor creado con su ID.", response_model=Constructors)
        def create_constructor(
            constructor_data: ConstructorCreateRequest,
            admin_service: AdminServiceDep
        ) -> Constructors:
            return admin_service.create_constructor(constructor_data)

        @api_router.post("/constructors/drivers", description="Crear un nuevo piloto asociado a un constructor específico. Devuelve el piloto creado con su ID.", response_model=Dict[str, int | str])
        def create_driver(
            driver_data: DriverCreateRequest,
            admin_service: AdminServiceDep
        ) -> Dict[str, int | str]:
            return admin_service.create_driver(driver_data)

        @api_router.delete("/constructors/{id}", description="Eliminar un constructor específico. Esto también eliminará a todos los pilotos asociados al constructor.", response_model=Dict[str, str])
        def delete_constructor(id: int, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.delete_constructor(id)

        @api_router.delete("/drivers/{id}",  description="Eliminar un piloto específico. Esto también eliminará al piloto de cualquier resultado o predicción en la que esté involucrado.", response_model=Dict[str, str])
        def delete_driver(id: int, admin_service: AdminServiceDep) -> Dict[str, str]:
            return admin_service.delete_driver(id)

        return api_router