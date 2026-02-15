from typing import Annotated, List
from app.db.models.user import Users
from app.schemas.responses import GrandPrixResponse
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from app.db.session import SessionMaker, get_session
from app.db.models.grand_prix import GrandPrix
from app.db.models.season import Seasons
from app.core.deps import get_current_user
from app.schemas.requests import GrandPrixCreateRequest
from app.repositories.grand_prix import GrandPrixRepository
from sqlmodel import Session, select


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
