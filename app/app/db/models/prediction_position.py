from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

class PredictionPositions(SQLModel, table=True):
    __tablename__ = "prediction_positions"
    __table_args__ = (
        # Un usuario no puede repetir la misma posición
        UniqueConstraint("prediction_id", "position", name="uq_prediction_position"),
    )

    id: int = Field(description="ID de la posición", primary_key=True)
    prediction_id: int = Field(description="ID de la predicción", foreign_key="predictions.id", nullable=False)
    position: int = Field(description="Posición del piloto (1-10)", nullable=False, ge=1, le=10)
    driver_name: str = Field(description="Nombre del piloto", nullable=False)

    # Relaciones
    prediction: "Predictions" = Relationship(back_populates="positions")
