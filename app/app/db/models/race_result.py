from typing import List
from sqlmodel import Field, Relationship, SQLModel


class RaceResults(SQLModel, table=True):
    __tablename__ = "race_results"

    id: int = Field(description="ID del resultado de carrera", primary_key=True)
    gp_id: int = Field(
        description="ID del Gran Premio al que pertenece este resultado",
        foreign_key="grand_prix.id",
        nullable=False,
    )

    # Relaciones
    grand_prix: "GrandPrix" = Relationship(back_populates="race_results")
    positions: List["RacePositions"] = Relationship(
        back_populates="race_result", cascade_delete=True
    )
    events: List["RaceEvents"] = Relationship(
        back_populates="race_result", cascade_delete=True
    )
