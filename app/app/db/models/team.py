from typing import List
from sqlmodel import Field, Relationship, SQLModel


class Teams(SQLModel, table=True):
    __tablename__ = "teams"

    id: int = Field(description="ID único del equipo", primary_key=True)
    name: str = Field(description="Nombre del equipo", nullable=False)
    season_id: int = Field(
        description="ID de la temporada", foreign_key="seasons.id", nullable=False
    )

    # --- NUEVO CAMPO ---
    # Código único para unirse (ej: "X9A-2B1")
    join_code: str = Field(
        description="Código único para unirse al equipo", unique=True, nullable=False
    )

    # Relaciones
    season: "Seasons" = Relationship(back_populates="teams")
    members: List["TeamMembers"] = Relationship(
        back_populates="team", cascade_delete=True
    )
