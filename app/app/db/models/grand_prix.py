from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel

class GrandPrix(SQLModel, table=True):
    __tablename__ = "grand_prix"

    id: int = Field(description="ID del gran premio", primary_key=True)
    name: str = Field(description="Nombre del gran premio", nullable=False)
    race_datetime: datetime = Field(description="Fecha y hora de la carrera", nullable=False)
    season_id: int = Field(description="ID de la temporada a la que pertenece este gran premio", foreign_key="seasons.id", nullable=False)

    # Relaciones
    season: "Seasons" = Relationship(back_populates="grand_prixes")
    predictions: list["Predictions"] = Relationship(back_populates="grand_prix", cascade_delete=True)
    race_results: "RaceResults" = Relationship(back_populates="grand_prix", cascade_delete=True)
