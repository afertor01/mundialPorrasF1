import secrets
import string
from typing import Annotated, Dict
from app.db.models.user import Users
from app.schemas.requests import TeamCreateRequest
from app.schemas.responses import MyTeamResponse, TeamResponse
from app.services.achievements_service import grant_achievements
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import joinedload
from app.db.session import SessionMaker, get_session
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from app.db.models.season import Seasons
from app.core.deps import get_current_user, generate_join_code
from sqlmodel import Session, select

SessionDep = Annotated[Session, Depends(get_session)]


class TeamsRepository:
    def __init__(self, session: SessionDep):
        self.session = session
    
    def get_my_team(self, current_user: Users) -> MyTeamResponse | None:
        """
        Devuelve la información de tu equipo actual en la temporada activa.
        Incluye el código para invitar amigos.
        """
        
        query = select(Seasons).where(Seasons.is_active == True)
        # 1. Buscar temporada activa
        active_season = self.session.exec(query).first()
        if not active_season:
            return None

        # 2. Buscar si el usuario tiene membresía en esta temporada
        query = select(TeamMembers).options(joinedload(TeamMembers.team).joinedload(Teams.members).joinedload(TeamMembers.user)).where(
            TeamMembers.user_id == current_user.id,
            TeamMembers.season_id == active_season.id
        )
        membership = self.session.exec(query).first()

        if not membership:
            return None

        # 3. Formatear respuesta limpia
        team = membership.team
        members_names = [m.user.username for m in team.members if m.user]

        response = MyTeamResponse(
            id=team.id,
            name=team.name,
            join_code=team.join_code, # <--- El dato clave para invitar
            members=members_names,
            is_full=len(members_names) >= 2
        )
        
        return response

    def create_team_player(self, team_data: TeamCreateRequest, current_user: Users) -> Dict[str, str]:
        """
        Crea un equipo nuevo y asigna al creador como primer miembro.
        """
        query = select(Seasons).where(Seasons.is_active == True)
        # 1. Validar temporada activa
        active_season = self.session.exec(query).first()
        if not active_season:
            raise HTTPException(404, "No hay una temporada activa para crear equipos.")

        # 2. Verificar que el usuario no tenga equipo ya
        query = select(TeamMembers).where(
            TeamMembers.user_id == current_user.id,
            TeamMembers.season_id == active_season.id
        )
        existing_member = self.session.exec(query).first()
        
        if existing_member:
            raise HTTPException(400, "Ya perteneces a una escudería en esta temporada.")

        # 3. Generar código único
        query = select(Teams.join_code).where(Teams.season_id == active_season.id)
        existing_codes = {code for (code,) in self.session.exec(query).all()}
        while code := generate_join_code() in existing_codes:
            continue

        # 4. Crear Equipo
        new_team = Teams(
            name=team_data.name,
            season_id=active_season.id,
            join_code=code
        )
        self.session.add(new_team)
        self.session.flush() # Para obtener el ID del equipo

        # 5. Añadir al usuario como miembro
        membership = TeamMembers(
            team_id=new_team.id,
            user_id=current_user.id,
            season_id=active_season.id
        )
        self.session.add(membership)
        
        self.session.commit()
        self.session.refresh(new_team)
        grant_achievements(session=self.session, user_id=current_user.id, slugs=["event_founder","event_join_team"])
        
        return {"message": "Escudería creada con éxito", "code": code}

    def join_team_player(self, code: str, current_user: Users) -> Dict[str, str]:
        """
        Unirse a un equipo usando el código de invitación.
        """
        query = select(Seasons).where(Seasons.is_active == True)

        # 1. Validar temporada
        active_season = self.session.exec(query).first()
        if not active_season:
            raise HTTPException(400, "No hay temporada activa.")

        # 2. Verificar si usuario ya tiene equipo
        query = select(TeamMembers).where(
            TeamMembers.user_id == current_user.id,
            TeamMembers.season_id == active_season.id
        )
        existing_member = self.session.exec(query).first()
        
        if existing_member:
            raise HTTPException(400, "Ya tienes equipo. Debes salirte primero.")

        # 3. Buscar el equipo por código
        query = select(Teams).where(
            Teams.join_code == code.upper(), 
            Teams.season_id == active_season.id
        )
        team = self.session.exec(query).first()
        
        if not team:
            raise HTTPException(404, "Código de escudería inválido o de otra temporada.")

        # 4. Verificar capacidad (Máximo 2)
        query = select(TeamMembers).where(TeamMembers.team_id == team.id)
        current_members_count = len(self.session.exec(query).all())
        if current_members_count >= 2:
            raise HTTPException(400, "La escudería está completa (Max 2 pilotos).")

        # 5. Crear la unión
        new_member = TeamMembers(
            team_id=team.id,
            user_id=current_user.id,
            season_id=active_season.id
        )
        self.session.add(new_member)
        
        self.session.commit()
        grant_achievements(session=self.session, user_id=current_user.id, slugs=["event_join_team"])

        # Usamos la variable team_name, no team.name (que podría dar error de 'DetachedInstance')
        return {"message": f"Te has unido a {team.name} correctamente."}

    def leave_team_player(self, current_user: Users) -> Dict[str, str]:
        """
        Salirse del equipo actual.
        Si el equipo queda vacío (0 miembros), SE BORRA automáticamente.
        """
        query = select(Seasons).where(Seasons.is_active == True)        
        active_season = self.session.exec(query).first()
        if not active_season:
            raise HTTPException(400, "No hay temporada activa.")

        # 1. Buscar mi membresía
        query = select(TeamMembers).where(
            TeamMembers.user_id == current_user.id,
            TeamMembers.season_id == active_season.id
        )
        membership = self.session.exec(query).first()

        if not membership:
            raise HTTPException(400, "No tienes equipo del que salir.")

        team_id = membership.team_id
        
        # 2. Borrar membresía
        self.session.delete(membership)
        self.session.commit() # Confirmamos la salida

        # 3. Verificar si el equipo quedó vacío
        query = select(TeamMembers).where(TeamMembers.team_id == team_id)
        remaining_members = len(self.session.exec(query).all())
        
        if remaining_members == 0:
            # Borrar el equipo fantasma
            query = select(Teams).where(Teams.id == team_id)
            team_to_delete = self.session.exec(query).first()
            if team_to_delete:
                self.session.delete(team_to_delete)
                self.session.commit()

        return {"message": "Has abandonado la escudería."}