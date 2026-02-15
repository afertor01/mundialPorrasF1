from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated, Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

# Importaciones del proyecto
from app.db.session import SessionMaker, get_session
from app.core.deps import get_current_user, require_admin
from app.db.models.user import Users
from app.db.models.season import Seasons
from app.db.models.bingo import BingoTiles, BingoSelections
from app.schemas.requests import BingoTileCreate, BingoTileUpdate
from app.schemas.responses import BingoTileResponse, BingoStandingsItem
from app.db.models.grand_prix import GrandPrix
from app.repositories.bingo import BingoRepository
from sqlmodel import Session, select

MAX_SELECTIONS = 20

BingoRepositoryDep = Annotated[BingoRepository, Depends()]

class BingoService:
    def __init__(self, bingo_repository: BingoRepositoryDep):
        self.bingo_repository = bingo_repository

    def create_bingo_tile(
        self,
        tile: BingoTileCreate
    ) -> BingoTileResponse:
        return self.bingo_repository.create_bingo_tile(tile)

    def update_bingo_tile(
        self,
        update_data: BingoTileUpdate
    ) -> BingoTileResponse:
        return self.bingo_repository.update_bingo_tile(update_data)

    def delete_bingo_tile(
        self,
        tile_id: int
    ) -> Dict[str, str]:
        return self.bingo_repository.delete_bingo_tile(tile_id)

    # ------------------------------------------------------------------
    # ENDPOINTS USUARIO (Tablero y Selección)
    # ------------------------------------------------------------------

    def get_my_bingo_board(self, current_user: Users) -> List[BingoTileResponse]:
       return self.bingo_repository.get_my_bingo_board(current_user)

    def toggle_selection(
        self,
        tile_id: int, 
        current_user: Users
    ) -> Dict[str, str]:
        return self.bingo_repository.toggle_selection(tile_id, current_user)

    # ------------------------------------------------------------------
    # ENDPOINT CLASIFICACIÓN (Standings)
    # ------------------------------------------------------------------

    def get_bingo_standings(self) -> List[BingoStandingsItem]:
        return self.bingo_repository.get_bingo_standings()