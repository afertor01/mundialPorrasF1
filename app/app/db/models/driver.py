from sqlmodel import Field, Relationship, SQLModel


class Drivers(SQLModel, table=True):
    __tablename__ = "drivers"

    id: int = Field(description="ID del driver", primary_key=True)
    code: str = Field(description="Código del driver", nullable=False)  # Ej: ALO
    name: str = Field(
        description="Nombre del driver", nullable=False
    )  # Ej: Fernando Alonso
    constructor_id: int = Field(
        description="ID del constructor al que pertenece este driver",
        foreign_key="constructors.id",
        nullable=False,
    )

    # Relaciones
    constructor: "Constructors" = Relationship(back_populates="drivers")
