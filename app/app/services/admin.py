from typing import Dict, List
from app.db.models.constructor import Constructors
from app.db.models.driver import Drivers
from app.db.models.grand_prix import GrandPrix
from app.db.models.season import Seasons
from app.db.models.team import Teams
from app.db.models.user import Users
from app.repositories.admin import AdminRepository
from app.schemas.requests import (
    AdminUserUpdateRequest,
    ConstructorCreateRequest,
    DriverCreateRequest,
    GrandPrixCreateRequest,
    SeasonCreateRequest,
    UserCreateRequest,
    GrandPrixUpdateRequest,
    AdminTeamCreateRequest,
    UpdateRaceResultRequest,
    UpdateRacePredictionRequest,
    TeamMemberCreateRequest,
)
from app.schemas.responses import AdminRaceResultResponse
from fastapi import Depends, UploadFile
from typing_extensions import Annotated

AdminRepositoryDep = Annotated[AdminRepository, Depends()]


class AdminService:
    def __init__(self, admin_repository: AdminRepositoryDep):
        self.admin_repository = admin_repository

    def list_users(self) -> List[Users]:
        return self.admin_repository.list_users()

    def create_user(
        self,
        user_data: UserCreateRequest,
    ) -> Users:
        return self.admin_repository.create_user(user_data)

    def delete_user(self, user_id: int) -> Dict[str, str]:
        return self.admin_repository.delete_user(user_id)

    def update_user(
        self,
        user_data: AdminUserUpdateRequest,
    ) -> Users:
        return self.admin_repository.update_user(user_data)

    # -----------------------
    # Temporadas
    # -----------------------
    def list_seasons(self) -> List[Seasons]:
        return self.admin_repository.list_seasons()

    def create_season(
        self,
        season: SeasonCreateRequest,
    ) -> Seasons:
        return self.admin_repository.create_season(season)

    def delete_season(self, season_id: int) -> Dict[str, str]:
        return self.admin_repository.delete_season(season_id)

    def toggle_season_active(self, season_id: int) -> Seasons:
        return self.admin_repository.toggle_season_active(season_id)

    # -----------------------
    # Gran Premio
    # -----------------------
    def create_grand_prix(self, gp_data: GrandPrixCreateRequest) -> GrandPrix:
        return self.admin_repository.create_grand_prix(gp_data)

    def get_admin_gps_list(self, season_id: int = None) -> List[GrandPrix]:
        return self.admin_repository.get_admin_gps_list(season_id)

    def update_gp(self, gp_data: GrandPrixUpdateRequest) -> GrandPrix:
        return self.admin_repository.update_gp(gp_data)

    def delete_gp(self, gp_id: int) -> Dict[str, str]:
        return self.admin_repository.delete_gp(gp_id)

    # -----------------------
    # Carga Masiva de GPs
    # -----------------------
    async def import_gps(
        self,
        season_id: int,
        file: UploadFile,
    ) -> Dict[str, str]:
        return await self.admin_repository.import_gps(season_id, file)

    # -----------------------
    # Resultados de GP
    # -----------------------

    def get_race_result_admin(self, gp_id: int) -> AdminRaceResultResponse | None:
        return self.admin_repository.get_race_result_admin(gp_id)

    def update_race_result(
        self, race_result_data: UpdateRaceResultRequest
    ) -> Dict[str, str]:
        return self.admin_repository.update_race_result(race_result_data)

    def update_prediction_admin(
        self, prediction_data: UpdateRacePredictionRequest
    ) -> Dict[str, str]:
        return self.admin_repository.update_prediction_admin(prediction_data)

    def sync_gp_data(self, gp_id: int) -> Dict[str, bool | List[str]]:
        return self.admin_repository.sync_gp_data(gp_id)

    def sync_gp_qualy(self, gp_id: int) -> Dict[str, bool | List[str]]:
        """
        Sincroniza los resultados de la CLASIFICACIÓN (Sábado) usando FastF1.
        """
        return self.admin_repository.sync_gp_qualy(gp_id)

    # -----------------------
    # Gestión de Escuderías (Teams)
    # -----------------------
    def list_teams(self, season_id: int) -> List[Dict[str, int | str | List[str]]]:
        return self.admin_repository.list_teams(season_id)

    def create_team(self, team_data: AdminTeamCreateRequest) -> Teams:
        return self.admin_repository.create_team(team_data)

    def add_team_member(
        self, team_member_data: TeamMemberCreateRequest
    ) -> Dict[str, str]:
        return self.admin_repository.add_team_member(team_member_data)

    def remove_team_member(self, team_id: int, user_id: int) -> Dict[str, str]:
        return self.admin_repository.remove_team_member(team_id, user_id)

    def delete_team(self, team_id: int) -> Dict[str, str]:
        return self.admin_repository.delete_team(team_id)

    # -----------------------
    # GESTIÓN PARRILLA F1 (Constructores y Pilotos)
    # -----------------------

    def list_constructors(
        self, season_id: int
    ) -> List[Dict[str, int | str | List[Dict[str, int | str]]]]:
        return self.admin_repository.list_constructors(season_id)

    def create_constructor(
        self, constructor_data: ConstructorCreateRequest
    ) -> Constructors:
        return self.admin_repository.create_constructor(constructor_data)

    def create_driver(self, driver_data: DriverCreateRequest) -> Drivers:
        return self.admin_repository.create_driver(driver_data)

    def delete_constructor(self, id: int) -> Dict[str, str]:
        return self.admin_repository.delete_constructor(id)

    def delete_driver(self, id: int) -> Dict[str, str]:
        return self.admin_repository.delete_driver(id)
