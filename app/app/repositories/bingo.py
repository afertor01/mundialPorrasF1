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
from sqlmodel import Session, select

MAX_SELECTIONS = 20

SessionDep = Annotated[Session, Depends(get_session)]

class BingoRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def _calculate_tile_value(self, total_participants: int, selections_count: int) -> int:
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

    def create_bingo_tile(
        self,
        tile: BingoTileCreate
    ) -> BingoTileResponse:
        query = select(Seasons).where(Seasons.is_active == True)      
        season = self.session.exec(query).first()
        if not season: 
            raise HTTPException(status_code=400, detail="No hay temporada activa")

        new_tile = BingoTiles(description=tile.description, season_id=season.id)
        self.session.add(new_tile)
        self.session.commit()
        self.session.refresh(new_tile)
        
        return new_tile

    def update_bingo_tile(
        self,
        update_data: BingoTileUpdate
    ) -> BingoTileResponse:
        tile = self.session.get(BingoTiles, update_data.tile_id)
        
        if not tile: 
            raise HTTPException(status_code=404, detail="Casilla no encontrada")

        if update_data.description is not None:
            tile.description = update_data.description
        if update_data.is_completed is not None:
            tile.is_completed = update_data.is_completed
        
        self.session.commit()
        self.session.refresh(tile)
        
        return tile

    def delete_bingo_tile(
        self,
        tile_id: int
    ) -> Dict[str, str]:
        tile = self.session.get(BingoTiles, tile_id)
        if not tile: 
            raise HTTPException(status_code=404, detail="Casilla no encontrada")
            
        self.session.delete(tile)
        self.session.commit()
        
        return {"msg": "Casilla eliminada"}

    # ------------------------------------------------------------------
    # ENDPOINTS USUARIO (Tablero y Selección)
    # ------------------------------------------------------------------

    def get_my_bingo_board(self, current_user: Users) -> List[BingoTileResponse]:
        """
        Devuelve el tablero completo con el estado actual de cada casilla.
        """
        
        query = select(Seasons).where(Seasons.is_active == True)
        season = self.session.exec(query).first()
        if not season: 
            return []

        # 1. Obtener todas las casillas de la temporada
        query = select(BingoTiles).where(BingoTiles.season_id == season.id)
        tiles = self.session.exec(query).all()
        
        # 2. Obtener mis selecciones
        query = select(BingoSelections).where(BingoSelections.user_id == current_user.id)
        my_selections = self.session.exec(query).all()
        my_selected_ids = {s.bingo_tile_id for s in my_selections}

        # 3. Calcular métricas globales para la rareza
        # Contamos usuarios únicos que han jugado al bingo
        query = select(BingoSelections.user_id).distinct()
        total_participants = len(self.session.exec(query).all())
        if total_participants == 0:
            total_participants = 1

        # Optimizamos contando todas las selecciones de golpe
        # Esto evita hacer N queries dentro del bucle
        query = select(BingoSelections)
        all_selections = self.session.exec(query).all()
        tile_counts = {}
        for sel in all_selections:
            tile_counts[sel.bingo_tile_id] = tile_counts.get(sel.bingo_tile_id, 0) + 1

        response = []
        for t in tiles:
            count = tile_counts.get(t.id, 0)
            val = self._calculate_tile_value(total_participants, count)
            
            tile_response = BingoTileResponse(
                id=t.id,
                description=t.description,
                is_completed=t.is_completed,
                selection_count=count,
                current_value=val,
                is_selected_by_me=t.id in my_selected_ids
            )
            
            response.append(tile_response)
        
        return response

    def toggle_selection(
        self,
        tile_id: int, 
        current_user: Users
    ) -> Dict[str, str]:
        """
        Marca o desmarca una casilla.
        """
        query = select(Seasons).where(Seasons.is_active == True)
        season = self.session.exec(query).first()

        if not season: 
            raise HTTPException(status_code=400, detail="No hay temporada activa")

        # --- VALIDACIÓN DE FECHA LÍMITE ---
        query = select(GrandPrix).where(GrandPrix.season_id == season.id).order_by(GrandPrix.race_datetime)
        first_gp = self.session.exec(query).first()
        
        # if first_gp and datetime.now() > first_gp.race_datetime:
        #     raise HTTPException(status_code=403, detail="El Bingo está cerrado. La temporada ya ha comenzado.")

        # --- LÓGICA DE TOGGLE ---
        query = select(BingoSelections).where(
            BingoSelections.user_id == current_user.id,
            BingoSelections.bingo_tile_id == tile_id
        )
        existing = self.session.exec(query).first()

        if existing:
            # Si ya existe, borramos (siempre permitido)
            self.session.delete(existing)
            self.session.commit()

            return {"status": "removed", "msg": "Casilla desmarcada"}
        else:
            # Si no existe, verificamos el LÍMITE antes de añadir
            query = select(BingoSelections.bingo_tile_id).where(BingoSelections.user_id == current_user.id)
            current_count = len(self.session.exec(query).all())

            if current_count >= MAX_SELECTIONS:
                raise HTTPException(status_code=400, detail=f"Has alcanzado el límite de {MAX_SELECTIONS} selecciones.")

            new_sel = BingoSelections(user_id=current_user.id, bingo_tile_id=tile_id)
            self.session.add(new_sel)
            self.session.commit()

            return {"status": "added", "msg": "Casilla marcada"}

    # ------------------------------------------------------------------
    # ENDPOINT CLASIFICACIÓN (Standings)
    # ------------------------------------------------------------------

    def get_bingo_standings(self) -> List[BingoStandingsItem]:
        """
        Calcula la clasificación del Bingo incluyendo aciertos, fallos y puntos.
        """
        query = select(Seasons).where(Seasons.is_active == True)
        
        season = self.session.exec(query).first()
        if not season: 
            return []

        # 1. Obtener Datos Base
        query = select(BingoTiles).where(BingoTiles.season_id == season.id)
        tiles = self.session.exec(query).all()
        query = select(BingoSelections)
        all_selections = self.session.exec(query).all()
        query = select(Users)
        users = self.session.exec(query).all()

        # 2. Calcular cuántas tiles están completadas en total
        # Esto sirve para calcular las "oportunidades perdidas"
        completed_tiles_ids = {t.id for t in tiles if t.is_completed}
        total_completed_count = len(completed_tiles_ids)

        # 3. Calcular valores de rareza (Puntos)
        query = select(BingoSelections.user_id).distinct()
        total_participants = len(self.session.exec(query).all())
        if total_participants == 0: 
            total_participants = 1
        
        tile_counts = {}
        for sel in all_selections:
            tile_counts[sel.bingo_tile_id] = tile_counts.get(sel.bingo_tile_id, 0) + 1
            
        tile_values = {}
        for t in tiles:
            count = tile_counts.get(t.id, 0)
            tile_values[t.id] = self._calculate_tile_value(total_participants, count)

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
            standing_item = BingoStandingsItem(
                username=user.username,
                acronym=user.acronym,
                selections_count=selections_count,
                hits=hits,
                missed=missed,
                total_points=total_points
            )
            ranking.append(standing_item)

        # Ordenar por puntos descendente
        return sorted(ranking, key=lambda x: x.total_points, reverse=True)