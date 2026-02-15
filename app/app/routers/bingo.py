from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated, Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

# Importaciones del proyecto
from app.db.session import SessionMaker
from app.core.deps import get_current_user, require_admin
from app.db.models.user import Users
from app.db.models.season import Seasons
from app.db.models.bingo import BingoTiles, BingoSelections
from app.db.models.grand_prix import GrandPrix
from app.services.bingo import BingoService
from app.schemas.requests import BingoTileCreate, BingoTileUpdate
from app.schemas.responses import BingoTileResponse, BingoStandingsItem

BingoServiceDep = Annotated[BingoService, Depends()]

class BingoRouter:
    
    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/bingo", tags=["Bingo"])

        # ENDPOINTS DE ADMINISTRACIÓN DE CASILLAS
        @api_router.post("/tile", description="Create a new bingo tile", response_model=BingoTileResponse, dependencies=[Depends(require_admin)])
        def create_bingo_tile(
            tile: BingoTileCreate, 
            bingo_service: BingoServiceDep,
        ):
            return bingo_service.create_bingo_tile(tile)

        @api_router.put("/tile", description="Update an existing bingo tile", response_model=BingoTileResponse, dependencies=[Depends(require_admin)])
        def update_bingo_tile(
            update_data: BingoTileUpdate,
            bingo_service: BingoServiceDep,
        ):
            return bingo_service.update_bingo_tile(update_data)

        @api_router.delete("/tile/{tile_id}", description="Delete an existing bingo tile", response_model=Dict[str, str], dependencies=[Depends(require_admin)])
        def delete_bingo_tile(
            tile_id: int, 
            bingo_service: BingoServiceDep,
        ):
            return bingo_service.delete_bingo_tile(tile_id)

        # ENDPOINTS USUARIO (Tablero y Selección)
        @api_router.get("/board", response_model=List[BingoTileResponse])
        def get_my_bingo_board(
            bingo_service: BingoServiceDep,
            current_user = Depends(get_current_user)
        ):
            return bingo_service.get_my_bingo_board(current_user)

        @api_router.post("/toggle/{tile_id}")
        def toggle_selection(
            tile_id: int, 
            bingo_service: BingoServiceDep,
            current_user = Depends(get_current_user)
        ):
            return bingo_service.toggle_selection(tile_id, current_user)

        # ENDPOINT CLASIFICACIÓN (Standings)
        @api_router.get("/standings", response_model=List[BingoStandingsItem])
        def get_bingo_standings(bingo_service: BingoServiceDep):
            return bingo_service.get_bingo_standings()

        return api_router