from typing import List
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint, func

class Predictions(SQLModel, table=True):
    __tablename__ = "predictions"
    __table_args__ = (
        # Un usuario solo puede hacer 1 predicción por GP
        UniqueConstraint("user_id", "gp_id", name="uq_user_gp"),
    )

    id: int = Field(description="ID único de la predicción", primary_key=True)
    user_id: int = Field(description="ID del usuario que hizo la predicción", foreign_key="users.id", nullable=False)
    gp_id: int = Field(description="ID del Grand Prix al que pertenece la predicción", foreign_key="grand_prix.id", nullable=False)
    points_base: int = Field(description="Puntos base de la predicción", default=0)
    multiplier: float = Field(description="Multiplicador de puntos de la predicción", default=1.0)
    points: int = Field(description="Puntos totales de la predicción", default=0)
    created_at: datetime = Field(description="Fecha de creación de la predicción", sa_column_kwargs={
        "server_default": func.now(),
    })
    updated_at: datetime = Field(description="Fecha de actualización de la predicción", sa_column_kwargs={
        "server_default": func.now(),
        "onupdate": func.now(),
    })
    
    # Relaciones
    user: "Users" = Relationship(back_populates="predictions")
    grand_prix: "GrandPrix" = Relationship(back_populates="predictions")
    positions: List["PredictionPositions"] = Relationship(back_populates="prediction", cascade_delete=True)
    events: List["PredictionEvents"] = Relationship(back_populates="prediction", cascade_delete=True)
