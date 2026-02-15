from typing import List

from sqlmodel import Field, Relationship, SQLModel

class BingoTiles(SQLModel, table=True):
    """
    Representa una de las 50 casillas base creadas por el Admin para una temporada.
    Ej: 'Fernando Alonso consigue la 33'
    """
    __tablename__ = "bingo_tiles"

    id: int = Field(description="ID de la casilla del bingo autogenerada", primary_key=True)
    season_id: int = Field(description="ID de la temporada a la que pertenece esta casilla", foreign_key="seasons.id")
    description: str = Field(description="Descripción de la casilla del bingo", nullable=False)
    
    # Si es True, el evento ha ocurrido. Si es False, aún no (o no ocurrió al final)
    is_completed: bool = Field(description="Indica si el evento de la casilla ha ocurrido", default=False)
    
    # Relaciones
    season: "Seasons" = Relationship(back_populates="bingo_tiles")
    
    # Relación inversa para saber cuánta gente ha elegido esta casilla (para calcular rareza)
    selections: List["BingoSelections"] = Relationship(back_populates="tile", cascade_delete=True)

class BingoSelections(SQLModel, table=True):
    """
    Tabla intermedia que guarda qué casillas ha elegido cada usuario.
    Si existe un registro aquí, es que el usuario ha marcado esa casilla.
    """
    __tablename__ = "bingo_selections"

    # Clave primaria compuesta: Un usuario no puede elegir la misma casilla dos veces
    user_id: int = Field(description="ID del usuario que ha elegido esta casilla", foreign_key="users.id", primary_key=True)
    bingo_tile_id: int = Field(description="ID de la casilla de bingo elegida", foreign_key="bingo_tiles.id", primary_key=True)

    # Relaciones
    user: "Users" = Relationship(back_populates="bingo_selections")
    tile: BingoTiles = Relationship(back_populates="selections")