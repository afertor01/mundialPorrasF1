from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

# Importaciones del proyecto
from app.db.session import SessionLocal
from app.core.deps import get_current_user, require_admin
from app.db.models.user import User
from app.db.models.season import Season
from app.db.models.bingo import BingoTile, BingoSelection
from app.db.models.grand_prix import GrandPrix

router = APIRouter(prefix="/bingo", tags=["Bingo"])

# --- ESQUEMAS PYDANTIC ---

class BingoTileCreate(BaseModel):
    description: str

class BingoTileUpdate(BaseModel):
    description: Optional[str] = None
    is_completed: Optional[bool] = None

class BingoTileResponse(BaseModel):
    id: int
    description: str
    is_completed: bool
    selection_count: int = 0
    current_value: int = 0
    is_selected_by_me: bool = False

    class Config:
        from_attributes = True

class BingoStandingsItem(BaseModel):
    username: str
    acronym: str
    hits: int
    total_points: int

# --- UTILIDAD DE PUNTUACIÓN ---
def calculate_tile_value(total_participants: int, selections_count: int) -> int:
    """
    Calcula el valor basado en la rareza.
    Fórmula: (Total Participantes / Selecciones de esta casilla) * 10
    """
    if selections_count == 0: 
        return 100 # Valor base alto si nadie la tiene
    return int((total_participants / selections_count) * 10)

# ------------------------------------------------------------------
# ENDPOINTS ADMIN (Gestión del Bingo Base)
# ------------------------------------------------------------------

@router.post("/tile", response_model=BingoTileResponse)
def create_bingo_tile(
    tile: BingoTileCreate, 
    current_user = Depends(require_admin)
):
    db = SessionLocal()
    
    # 1. Buscar temporada activa
    season = db.query(Season).filter(Season.is_active == True).first()
    if not season: 
        db.close()
        raise HTTPException(status_code=400, detail="No hay temporada activa")

    # 2. Crear Casilla
    new_tile = BingoTile(description=tile.description, season_id=season.id)
    db.add(new_tile)
    db.commit()
    db.refresh(new_tile)
    db.close()
    
    return new_tile

@router.put("/tile/{tile_id}", response_model=BingoTileResponse)
def update_bingo_tile(
    tile_id: int,
    update_data: BingoTileUpdate,
    current_user = Depends(require_admin)
):
    db = SessionLocal()
    
    tile = db.query(BingoTile).get(tile_id)
    if not tile: 
        db.close()
        raise HTTPException(status_code=404, detail="Casilla no encontrada")

    if update_data.description is not None:
        tile.description = update_data.description
    if update_data.is_completed is not None:
        tile.is_completed = update_data.is_completed
    
    db.commit()
    db.refresh(tile)
    db.close()
    
    return tile

@router.delete("/tile/{tile_id}")
def delete_bingo_tile(
    tile_id: int, 
    current_user = Depends(require_admin)
):
    db = SessionLocal()
    
    tile = db.query(BingoTile).get(tile_id)
    if not tile: 
        db.close()
        raise HTTPException(status_code=404, detail="Casilla no encontrada")
        
    db.delete(tile)
    db.commit()
    db.close()
    
    return {"msg": "Casilla eliminada"}

# ------------------------------------------------------------------
# ENDPOINTS USUARIO (Tablero y Selección)
# ------------------------------------------------------------------

@router.get("/board", response_model=List[BingoTileResponse])
def get_my_bingo_board(current_user = Depends(get_current_user)):
    """
    Devuelve el tablero completo con el estado actual de cada casilla
    (si la tengo seleccionada, cuánto vale, si ya ocurrió).
    """
    db = SessionLocal()
    
    season = db.query(Season).filter(Season.is_active == True).first()
    if not season: 
        db.close()
        return []

    # 1. Obtener todas las casillas de la temporada
    tiles = db.query(BingoTile).filter(BingoTile.season_id == season.id).all()
    
    # 2. Obtener mis selecciones
    my_selections = db.query(BingoSelection).filter(
        BingoSelection.user_id == current_user.id
    ).all()
    my_selected_ids = {s.bingo_tile_id for s in my_selections}

    # 3. Calcular métricas globales para la rareza
    total_participants = db.query(BingoSelection.user_id).distinct().count()
    if total_participants == 0: total_participants = 1

    response = []
    for t in tiles:
        # Contar cuántos usuarios han elegido ESTA casilla específica
        # (Esto podría optimizarse con una query GROUP BY si hay miles de usuarios, 
        # pero para <100 usuarios esto es suficientemente rápido).
        count = db.query(BingoSelection).filter(BingoSelection.bingo_tile_id == t.id).count()
        val = calculate_tile_value(total_participants, count)
        
        response.append({
            "id": t.id,
            "description": t.description,
            "is_completed": t.is_completed,
            "selection_count": count,
            "current_value": val,
            "is_selected_by_me": t.id in my_selected_ids
        })
    
    db.close()
    return response

@router.post("/toggle/{tile_id}")
def toggle_selection(
    tile_id: int, 
    current_user = Depends(get_current_user)
):
    """
    Marca o desmarca una casilla.
    BLOQUEADO si la temporada ya ha empezado (primer GP).
    """
    db = SessionLocal()
    
    season = db.query(Season).filter(Season.is_active == True).first()
    if not season: 
        db.close()
        raise HTTPException(status_code=400, detail="No hay temporada activa")

    # --- VALIDACIÓN DE FECHA LÍMITE ---
    first_gp = (
        db.query(GrandPrix)
        .filter(GrandPrix.season_id == season.id)
        .order_by(GrandPrix.race_datetime)
        .first()
    )
    
    # Si existe un GP y ya pasó la fecha, bloqueamos.
    # Usamos datetime.utcnow() para ser consistentes con predictions.py
    if first_gp and datetime.utcnow() > first_gp.race_datetime:
        db.close()
        raise HTTPException(status_code=403, detail="⛔ El Bingo está cerrado. La temporada ya ha comenzado.")

    # --- LÓGICA DE TOGGLE ---
    existing = db.query(BingoSelection).filter(
        BingoSelection.user_id == current_user.id,
        BingoSelection.bingo_tile_id == tile_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        db.close()
        return {"status": "removed", "msg": "Casilla desmarcada"}
    else:
        new_sel = BingoSelection(user_id=current_user.id, bingo_tile_id=tile_id)
        db.add(new_sel)
        db.commit()
        db.close()
        return {"status": "added", "msg": "Casilla marcada"}

# ------------------------------------------------------------------
# ENDPOINT CLASIFICACIÓN (Standings)
# ------------------------------------------------------------------

@router.get("/standings", response_model=List[BingoStandingsItem])
def get_bingo_standings():
    """
    Calcula la clasificación del Bingo en tiempo real.
    """
    db = SessionLocal()
    
    season = db.query(Season).filter(Season.is_active == True).first()
    if not season: 
        db.close()
        return []

    # 1. Obtener datos
    tiles = db.query(BingoTile).filter(BingoTile.season_id == season.id).all()
    # Obtenemos todas las selecciones y cargamos el usuario asociado
    all_selections = db.query(BingoSelection).all()
    
    # Filtrar usuarios admin si se desea (opcional, aquí incluimos a todos los que jueguen)
    # Si quieres excluir admins, habría que hacer un join con User y filtrar.

    # 2. Calcular valores de rareza actuales
    total_participants = db.query(BingoSelection.user_id).distinct().count()
    if total_participants == 0: total_participants = 1
    
    tile_values = {}
    for t in tiles:
        count = db.query(BingoSelection).filter(BingoSelection.bingo_tile_id == t.id).count()
        tile_values[t.id] = calculate_tile_value(total_participants, count)
        
    # Mapa rápido de tiles para ver si están completados
    tiles_map = {t.id: t for t in tiles}

    # 3. Calcular puntuaciones por usuario
    user_scores = {} # {user_id: {obj: User, points: 0, hits: 0}}
    
    # Pre-cargamos usuarios para no hacer N queries
    users_map = {u.id: u for u in db.query(User).all()}

    for sel in all_selections:
        uid = sel.user_id
        if uid not in user_scores:
            if uid in users_map:
                user_scores[uid] = {"user": users_map[uid], "points": 0, "hits": 0}
            else:
                continue # Usuario borrado?
        
        tile = tiles_map.get(sel.bingo_tile_id)
        
        # SUMAR PUNTOS SI ESTÁ COMPLETADO
        if tile and tile.is_completed:
            points = tile_values[tile.id]
            user_scores[uid]["points"] += points
            user_scores[uid]["hits"] += 1
            
        # AQUÍ IRÍA LA LÓGICA DE PENALIZACIÓN SI QUISIERAS (Fallos)
        # Por ahora solo sumamos aciertos.

    db.close()

    # 4. Formatear respuesta
    ranking = []
    for uid, data in user_scores.items():
        ranking.append({
            "username": data["user"].username,
            "acronym": data["user"].acronym,
            "hits": data["hits"],
            "total_points": data["points"]
        })

    # Ordenar por puntos descendente
    return sorted(ranking, key=lambda x: x["total_points"], reverse=True)