from sqlmodel import Field, Relationship, SQLModel

class Constructors(SQLModel, table=True):
    __tablename__ = "constructors"

    id: int = Field(description="ID del constructor", primary_key=True)
    name: str = Field(description="Nombre del constructor", nullable=False) # Ej: Ferrari
    color: str = Field(description="Color del constructor", default="#000000") # Ej: #FF0000
    season_id: int = Field(description="ID de la temporada a la que pertenece este constructor", foreign_key="seasons.id", nullable=False)

    # Relaciones
    season: "Seasons" = Relationship()
    drivers: list["Drivers"] = Relationship(back_populates="constructor", cascade_delete=True)