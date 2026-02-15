from typing import List
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel, func

class Users(SQLModel, table=True):
    __tablename__ = "users"

    id: int = Field(description="ID único del usuario", primary_key=True)
    email: str = Field(description="Email del usuario", unique=True, nullable=False)
    username: str = Field(description="Nombre de usuario", unique=True, nullable=False)
    acronym: str = Field(description="Acrónimo del usuario", unique=True, nullable=True)    
    hashed_password: str = Field(description="Contraseña hasheada del usuario", nullable=False)
    role: str = Field(description="Rol del usuario", default="user")
    avatar: str = Field(description="Avatar del usuario", default="default.png", nullable=True)
    
    # --- NUEVO CAMPO ---
    created_at: datetime = Field(description="Fecha de creación del usuario", sa_column_kwargs={
        "server_default": func.now(),
    })

    # Relaciones existentes
    predictions: List["Predictions"] = Relationship(back_populates="user", cascade_delete=True)
    team_memberships: List["TeamMembers"] = Relationship(back_populates="user", cascade_delete=True)
    bingo_selections: List["BingoSelections"] = Relationship(back_populates="user", cascade_delete=True)
    achievements: List["UserAchievements"] = Relationship(back_populates="user", cascade_delete=True)