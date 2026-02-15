from typing import Annotated, List
from fastapi import Depends
from app.db.models.grand_prix import GrandPrix
from app.schemas.requests import GrandPrixCreateRequest
from app.repositories.grand_prix import GrandPrixRepository

GrandPrixRepositoryDep = Annotated[GrandPrixRepository, Depends()]


class GrandPrixService:
    def __init__(self, gp_repository: GrandPrixRepositoryDep):
        self.gp_repository = gp_repository

    def create_grand_prix(
        self,
        gp_data: GrandPrixCreateRequest,
    ) -> GrandPrix:
        return self.gp_repository.create_grand_prix(gp_data)

    def list_grand_prix(self, season_id: int) -> List[GrandPrix]:
        return self.gp_repository.list_grand_prix(season_id)
