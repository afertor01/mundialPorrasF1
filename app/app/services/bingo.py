from fastapi import Depends
from typing import Annotated, Dict, List

# Importaciones del proyecto
from app.db.models.user import Users
from app.schemas.requests import BingoTileCreate, BingoTileUpdate
from app.schemas.responses import BingoTileResponse, BingoStandingsItem
from app.repositories.bingo import BingoRepository

MAX_SELECTIONS = 20

BingoRepositoryDep = Annotated[BingoRepository, Depends()]


class BingoService:
    def __init__(self, bingo_repository: BingoRepositoryDep):
        self.bingo_repository = bingo_repository

    def create_bingo_tile(self, tile: BingoTileCreate) -> BingoTileResponse:
        return self.bingo_repository.create_bingo_tile(tile)

    def update_bingo_tile(self, update_data: BingoTileUpdate) -> BingoTileResponse:
        return self.bingo_repository.update_bingo_tile(update_data)

    def delete_bingo_tile(self, tile_id: int) -> Dict[str, str]:
        return self.bingo_repository.delete_bingo_tile(tile_id)

    # ------------------------------------------------------------------
    # ENDPOINTS USUARIO (Tablero y Selección)
    # ------------------------------------------------------------------

    def get_my_bingo_board(self, current_user: Users) -> List[BingoTileResponse]:
        return self.bingo_repository.get_my_bingo_board(current_user)

    def toggle_selection(self, tile_id: int, current_user: Users) -> Dict[str, str]:
        return self.bingo_repository.toggle_selection(tile_id, current_user)

    # ------------------------------------------------------------------
    # ENDPOINT CLASIFICACIÓN (Standings)
    # ------------------------------------------------------------------

    def get_bingo_standings(self) -> List[BingoStandingsItem]:
        return self.bingo_repository.get_bingo_standings()
