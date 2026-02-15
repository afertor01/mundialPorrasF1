from typing import List
from sqlmodel import Field, Relationship, SQLModel


class Seasons(SQLModel, table=True):
    __tablename__ = "seasons"

    id: int = Field(description="ID de la temporada", primary_key=True)
    year: int = Field(description="Año de la temporada", nullable=False)
    name: str = Field(description="Nombre de la temporada", nullable=False)
    is_active: bool = Field(
        description="Indica si la temporada está activa", default=False
    )

    # Relaciones existentes...
    teams: List["Teams"] = Relationship(back_populates="season", cascade_delete=True)
    grand_prixes: List["GrandPrix"] = Relationship(
        back_populates="season", cascade_delete=True
    )
    multiplier_configs: List["MultiplierConfigs"] = Relationship(
        back_populates="season", cascade_delete=True
    )
    team_members: List["TeamMembers"] = Relationship(
        back_populates="season", cascade_delete=True
    )

    # NOVA RELAÇÃO BINGO
    bingo_tiles: List["BingoTiles"] = Relationship(
        back_populates="season", cascade_delete=True
    )
