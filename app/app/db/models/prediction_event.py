from sqlmodel import SQLModel, UniqueConstraint, Field, Relationship


class PredictionEvents(SQLModel, table=True):
    __tablename__ = "prediction_events"
    __table_args__ = (
        # Un usuario no puede repetir el mismo evento en la misma predicción
        UniqueConstraint("prediction_id", "event_type", name="uq_prediction_event"),
    )

    id: int = Field(description="ID de la predicción", primary_key=True)
    prediction_id: int = Field(foreign_key="predictions.id", nullable=False)
    event_type: str = Field(
        description="Tipo de evento, ('FASTEST_LAP', 'SAFETY_CAR', etc.)",
        nullable=False,
    )
    value: str = Field(
        description="Valor del evento", nullable=False
    )  # Sí/No o número/piloto según evento

    # Relaciones
    prediction: "Predictions" = Relationship(back_populates="events")
