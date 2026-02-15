# app/db/models/user_stats.py
from datetime import datetime
from sqlalchemy import (
    Column,
    JSON,
)
from sqlmodel import Field, Relationship, SQLModel


class UserStats(SQLModel, table=True):
    __tablename__ = "user_stats"

    user_id: int = Field(
        description="ID del usuario", foreign_key="users.id", primary_key=True
    )

    # --- GLOBAL CAREER STATS ---
    total_points: float = Field(description="Puntos totales del usuario", default=0.0)
    total_gps_played: int = Field(description="Número total de GP jugados", default=0)

    # Rachas
    consecutive_gps: int = Field(
        description="Racha de GP consecutivos jugados", default=0
    )
    last_gp_played_date: datetime = Field(
        description="Fecha del último GP jugado", nullable=True
    )  # Usamos fecha para robustez
    last_gp_played_id: int = Field(
        description="ID del último GP jugado", nullable=True
    )  # Mantenemos por compatibilidad

    # --- CONTADORES DE PRECISIÓN ---
    exact_positions_count: int = Field(
        description="Número de posiciones exactas acertadas", default=0
    )
    exact_podiums_count: int = Field(
        description="Número de podios exactos acertados", default=0
    )
    fastest_lap_hits: int = Field(
        description="Número de vueltas rápidas acertadas", default=0
    )
    safety_car_hits: int = Field(
        description="Número de aciertos de Safety Car", default=0
    )
    dnf_count_hits: int = Field(description="Número de aciertos de DNFs", default=0)
    dnf_driver_hits: int = Field(
        description="Número de aciertos de DNF de pilotos específicos", default=0
    )

    # --- ESTADÍSTICAS DE TEMPORADA / HISTÓRICAS ---
    # Cuántas veces ha ganado la jornada (MVP) en la temporada actual
    season_wins: int = Field(
        description="Número de veces que el usuario ha ganado la jornada (MVP) en la temporada actual",
        default=0,
    )
    # Cuántas temporadas ha jugado activamente
    seasons_participated: int = Field(
        description="Número de temporadas en las que el usuario ha participado activamente",
        default=0,
    )

    # --- COLECCIONABLES (JSON) ---
    won_circuits: list = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Circuitos ganados por el usuario",
    )
    collected_drivers: list = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Pilotos coleccionados por el usuario",
    )

    # --- PALMARÉS (JSON) ---
    # Guardaremos aquí el ranking final de cada año. Ej: {"2024": 1, "2025": 5}
    season_rankings: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Ranking final de cada año",
    )

    # --- SEASON STATS ACTUALES ---
    current_season_points: float = Field(
        description="Puntos de la temporada actual", default=0.0
    )

    user: "Users" = Relationship(back_populates="stats")


class UserGpStats(SQLModel, table=True):
    """
    Guarda el desglose de lo que un usuario consiguió en un GP específico.
    Sirve para poder 'revertir' estadísticas si se modifica el resultado del GP
    y para evitar recálculos masivos.
    """

    __tablename__ = "user_gp_stats"

    user_id: int = Field(foreign_key="users.id", primary_key=True)
    gp_id: int = Field(foreign_key="grand_prix.id", primary_key=True)

    # Métricas que se suman al UserStats global
    points: int = Field(default=0)
    exact_positions: int = Field(default=0)
    exact_podium_hit: bool = Field(default=False)  # 1, 2, 3 exactos
    fastest_lap_hit: bool = Field(default=False)
    safety_car_hit: bool = Field(default=False)
    dnf_count_hit: bool = Field(default=False)
    dnf_driver_hit: bool = Field(default=False)
