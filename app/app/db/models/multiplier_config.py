from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

class MultiplierConfigs(SQLModel, table=True):
    __tablename__ = "multiplier_configs"
    __table_args__ = (
        # Un evento solo tiene un multiplicador por temporada
        UniqueConstraint("season_id", "event_type", name="uq_season_event_multiplier"),
    )

    id: int = Field(description="ID del multiplicador", primary_key=True)
    season_id: int = Field(description="ID de la temporada", foreign_key="seasons.id")
    event_type: str = Field(description="Tipo de evento ('FASTEST_LAP', etc)", max_length=100)
    multiplier: float = Field(description="Multiplicador del evento", default=1.0)

    # Relaciones
    season: "Seasons" = Relationship(back_populates="multiplier_configs")
