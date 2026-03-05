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

# --- CONSTANTES ---
MAX_SELECTIONS = 20  # Límite duro del backend para evitar trampas

# --- ESQUEMAS PYDANTIC ---

class BingoTileCreate(BaseModel):
    description: str
    season_id: Optional[int] = None

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
    selections_count: int # <--- NUEVO
    hits: int
    missed: int           # <--- NUEVO
    total_points: int

class BingoBoardResponse(BaseModel):
    tiles: List[BingoTileResponse]
    is_open: bool
    status: str # "preseason", "closed", "admin_force_open"

# --- UTILIDAD DE PUNTUACIÓN ---
def calculate_tile_value(total_participants: int, selections_count: int) -> int:
    """
    Calcula el valor basado en la rareza (Porcentaje).
    Escala de 10 a 100 puntos independiente del número de usuarios.
    
    Fórmula: 
    - Ratio = Selecciones / Total
    - Puntos = 10 + (90 * (1 - Ratio))
    """
    if total_participants == 0: return 10
    
    # Si nadie la ha cogido aún, es una oportunidad de oro (Máximo valor)
    if selections_count == 0: return 100 

    ratio = selections_count / total_participants
    
    # Invertimos el ratio: cuanto MENOS gente (ratio bajo), MÁS puntos.
    # (1 - ratio) va de 0.0 (todos la tienen) a 1.0 (nadie la tiene).
    # Multiplicamos por 90 y sumamos 10 base.
    # Rango final: [10 ... 100]
    points = 10 + int(90 * (1 - ratio))
    
    return points
# ------------------------------------------------------------------
# ENDPOINTS ADMIN (Gestión del Bingo Base)
# ------------------------------------------------------------------

@router.post("/tile", response_model=BingoTileResponse)
def create_bingo_tile(
    tile: BingoTileCreate, 
    current_user = Depends(require_admin)
):
    db = SessionLocal()
    
    s_id = tile.season_id
    if not s_id:
        season = db.query(Season).filter(Season.is_active == True).first()
        if not season: 
            db.close()
            raise HTTPException(status_code=400, detail="No hay temporada activa ni season_id proporcionado")
        s_id = season.id

    new_tile = BingoTile(description=tile.description, season_id=s_id)
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

@router.get("/board", response_model=BingoBoardResponse)
def get_my_bingo_board(
    season_id: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """
    Devuelve el tablero completo con el estado actual de cada casilla.
    """
    db = SessionLocal()
    
    s_id = season_id
    if not s_id:
        season = db.query(Season).filter(Season.is_active == True).first()
        if not season: 
            db.close()
            return {"tiles": [], "is_open": False, "status": "closed"}
        s_id = season.id
    else:
        season = db.query(Season).get(s_id)
        if not season:
            db.close()
            return {"tiles": [], "is_open": False, "status": "closed"}

    # 0. Calcular Estado del Bingo
    first_gp = (
        db.query(GrandPrix)
        .filter(GrandPrix.season_id == s_id)
        .order_by(GrandPrix.race_datetime)
        .first()
    )
    
    is_preseason = True
    if first_gp and datetime.utcnow() > first_gp.race_datetime:
        is_preseason = False
    
    is_open = is_preseason or season.bingo_manual_open
    status = "closed"
    if is_preseason: status = "preseason"
    elif season.bingo_manual_open: status = "admin_force_open"
    tiles = db.query(BingoTile).filter(BingoTile.season_id == s_id).all()
    
    # 2. Obtener mis selecciones (Las selecciones son globales pero vinculadas a casillas de una temporada)
    my_selections = db.query(BingoSelection).join(BingoTile).filter(
        BingoSelection.user_id == current_user.id,
        BingoTile.season_id == s_id
    ).all()
    my_selected_ids = {s.bingo_tile_id for s in my_selections}

    # 3. Calcular métricas locales para la rareza de esta temporada
    # Contamos usuarios únicos que han participado en el bingo de ESTA temporada
    total_participants = db.query(BingoSelection.user_id).join(BingoTile).filter(
        BingoTile.season_id == s_id
    ).distinct().count()
    if total_participants == 0: total_participants = 1

    # Optimizamos contando las selecciones de esta temporada
    all_selections = db.query(BingoSelection).join(BingoTile).filter(
        BingoTile.season_id == s_id
    ).all()
    tile_counts = {}
    for sel in all_selections:
        tile_counts[sel.bingo_tile_id] = tile_counts.get(sel.bingo_tile_id, 0) + 1

    response = []
    for t in tiles:
        count = tile_counts.get(t.id, 0)
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
    return {
        "tiles": response,
        "is_open": is_open,
        "status": status
    }

@router.get("/board/{target_user_id}", response_model=BingoBoardResponse)
def get_user_bingo_board(
    target_user_id: int, 
    season_id: Optional[int] = None,
    current_user = Depends(get_current_user) # Necesario para autenticación, aunque no usemos sus datos
):
    """
    Devuelve el tablero visto desde la perspectiva de otro usuario (target_user_id).
    'is_selected_by_me' en la respuesta indicará si el target_user seleccionó la casilla.
    """
    db = SessionLocal()
    
    s_id = season_id
    if not s_id:
        season = db.query(Season).filter(Season.is_active == True).first()
        if not season: 
            db.close()
            return {"tiles": [], "is_open": False, "status": "closed"}
        s_id = season.id
    else:
        season = db.query(Season).get(s_id)
        if not season:
            db.close()
            return {"tiles": [], "is_open": False, "status": "closed"}

    # 0. Calcular Estado
    first_gp = (
        db.query(GrandPrix)
        .filter(GrandPrix.season_id == s_id)
        .order_by(GrandPrix.race_datetime)
        .first()
    )
    is_preseason = True
    if first_gp and datetime.utcnow() > first_gp.race_datetime:
        is_preseason = False
    
    is_open = is_preseason or season.bingo_manual_open
    status = "closed"
    if is_preseason: status = "preseason"
    elif season.bingo_manual_open: status = "admin_force_open"

    # 1. Obtener todas las casillas
    tiles = db.query(BingoTile).filter(BingoTile.season_id == s_id).all()
    
    # 2. Obtener selecciones del USUARIO OBJETIVO
    target_selections = db.query(BingoSelection).join(BingoTile).filter(
        BingoSelection.user_id == target_user_id,
        BingoTile.season_id == s_id
    ).all()
    target_selected_ids = {s.bingo_tile_id for s in target_selections}

    # 3. Métricas locales de la temporada para calcular el valor de la casilla
    total_participants = db.query(BingoSelection.user_id).join(BingoTile).filter(
        BingoTile.season_id == s_id
    ).distinct().count()
    if total_participants == 0: total_participants = 1

    all_selections = db.query(BingoSelection).join(BingoTile).filter(
        BingoTile.season_id == s_id
    ).all()
    tile_counts = {}
    for sel in all_selections:
        tile_counts[sel.bingo_tile_id] = tile_counts.get(sel.bingo_tile_id, 0) + 1

    response = []
    for t in tiles:
        count = tile_counts.get(t.id, 0)
        val = calculate_tile_value(total_participants, count)
        
        response.append({
            "id": t.id,
            "description": t.description,
            "is_completed": t.is_completed,
            "selection_count": count,
            "current_value": val,
            # Aquí la "magia": is_selected_by_me será true si el target_user la eligió
            "is_selected_by_me": t.id in target_selected_ids 
        })
    
    db.close()
    return {
        "tiles": response,
        "is_open": is_open,
        "status": status
    }

@router.post("/toggle/{tile_id}")
def toggle_selection(
    tile_id: int, 
    current_user = Depends(get_current_user)
):
    """
    Marca o desmarca una casilla.
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
    
    if first_gp and datetime.utcnow() > first_gp.race_datetime:
        # Si la temporada ha empezado, SOLO permitimos si el admin lo ha habilitado manualmente
        if not season.bingo_manual_open:
            db.close()
            raise HTTPException(status_code=403, detail="⛔ El Bingo está cerrado. La temporada ya ha comenzado.")

    # --- LÓGICA DE TOGGLE ---
    target_tile = db.query(BingoTile).get(tile_id)
    if not target_tile:
        db.close()
        raise HTTPException(404, "Casilla no encontrada.")

    existing = db.query(BingoSelection).filter(
        BingoSelection.user_id == current_user.id,
        BingoSelection.bingo_tile_id == tile_id
    ).first()

    if existing:
        # Si ya existe, borramos (siempre permitido)
        db.delete(existing)
        db.commit()
        db.close()
        return {"status": "removed", "msg": "Casilla desmarcada"}
    else:
        # Si no existe, verificamos el LÍMITE antes de añadir
        # El límite de 20 es por TEMPORADA
        current_count = db.query(BingoSelection).join(BingoTile).filter(
            BingoSelection.user_id == current_user.id,
            BingoTile.season_id == target_tile.season_id
        ).count()

        if current_count >= MAX_SELECTIONS:
            db.close()
            raise HTTPException(status_code=400, detail=f"Has alcanzado el límite de {MAX_SELECTIONS} selecciones para esta temporada.")

        new_sel = BingoSelection(user_id=current_user.id, bingo_tile_id=tile_id)
        db.add(new_sel)
        db.commit()
        db.close()
        return {"status": "added", "msg": "Casilla marcada"}

# ------------------------------------------------------------------
# ENDPOINT CLASIFICACIÓN (Standings)
# ------------------------------------------------------------------

@router.get("/standings", response_model=List[BingoStandingsItem])
def get_bingo_standings(season_id: Optional[int] = None):
    """
    Calcula la clasificación del Bingo incluyendo aciertos, fallos y puntos.
    """
    db = SessionLocal()
    
    s_id = season_id
    if not s_id:
        season = db.query(Season).filter(Season.is_active == True).first()
        if not season: 
            db.close()
            return []
        s_id = season.id

    # 1. Obtener Datos Base de la temporada
    tiles = db.query(BingoTile).filter(BingoTile.season_id == s_id).all()
    all_selections = db.query(BingoSelection).join(BingoTile).filter(
        BingoTile.season_id == s_id
    ).all()
    users = db.query(User).all()

    # 2. Calcular cuántas tiles están completadas en total
    # Esto sirve para calcular las "oportunidades perdidas"
    completed_tiles_ids = {t.id for t in tiles if t.is_completed}
    total_completed_count = len(completed_tiles_ids)

    # 3. Calcular valores de rareza (Puntos) de la temporada
    total_participants = db.query(BingoSelection.user_id).join(BingoTile).filter(
        BingoTile.season_id == s_id
    ).distinct().count()
    if total_participants == 0: total_participants = 1
    
    tile_counts = {}
    for sel in all_selections:
        tile_counts[sel.bingo_tile_id] = tile_counts.get(sel.bingo_tile_id, 0) + 1
        
    tile_values = {}
    for t in tiles:
        count = tile_counts.get(t.id, 0)
        tile_values[t.id] = calculate_tile_value(total_participants, count)

    # 4. Construir Clasificación por Usuario
    ranking = []
    
    # Mapear selecciones por usuario para acceso rápido
    # user_selections_map = { user_id: [tile_id, tile_id...] }
    user_selections_map = {}
    for sel in all_selections:
        if sel.user_id not in user_selections_map:
            user_selections_map[sel.user_id] = []
        user_selections_map[sel.user_id].append(sel.bingo_tile_id)

    for user in users:
        # Obtener IDs de casillas elegidas por este usuario
        selected_ids = user_selections_map.get(user.id, [])
        
        selections_count = len(selected_ids)
        
        # Si el usuario no ha jugado al bingo, podemos decidir si mostrarlo o no.
        # Mostrémoslo con 0 puntos para que vea la tabla vacía.
        
        hits = 0
        total_points = 0
        
        for tid in selected_ids:
            # Si la casilla elegida está completada (está en el set completed_tiles_ids)
            if tid in completed_tiles_ids:
                hits += 1
                total_points += tile_values.get(tid, 0)
        
        # Oportunidades perdidas: Total de eventos ocurridos - Los que yo acerté
        # Ej: Han pasado 10 cosas. Yo acerté 3. Me perdí 7.
        missed = total_completed_count - hits

        ranking.append({
            "username": user.username,
            "acronym": user.acronym,
            "selections_count": selections_count,
            "hits": hits,
            "missed": missed,
            "total_points": total_points
        })

    db.close()

    # Ordenar por puntos descendente
    return sorted(ranking, key=lambda x: x["total_points"], reverse=True)