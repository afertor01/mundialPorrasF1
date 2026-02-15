from sqlmodel import Field, Relationship, SQLModel


class RaceEvents(SQLModel, table=True):
    __tablename__ = "race_events"

    id: int = Field(description="ID de evento de carrera", primary_key=True)
    race_result_id: int = Field(
        description="ID del resultado de carrera",
        foreign_key="race_results.id",
        nullable=False,
    )
    event_type: str = Field(
        description="Tipo de evento (ej: FASTEST_LAP, SAFETY_CAR)", nullable=False
    )
    value: str = Field(
        description="Valor del evento (ej: nombre del piloto)", nullable=False
    )

    # Relaciones
    race_result: "RaceResults" = Relationship(back_populates="events")
