from sqlmodel import Field, Relationship, SQLModel

class RacePositions(SQLModel, table=True):
    __tablename__ = "race_positions"

    id: int = Field(description="ID de la posición en la carrera", primary_key=True)
    race_result_id: int = Field(description="ID del resultado de carrera al que pertenece esta posición", foreign_key="race_results.id", nullable=False)
    position: int = Field(description="Posición del piloto en la carrera", nullable=False)
    driver_name: str = Field(description="Nombre del piloto", nullable=False)

    # Relaciones
    race_result: "RaceResults" = Relationship(back_populates="positions")
