from sqlmodel import Field, SQLModel

class Avatars(SQLModel, table=True):
    __tablename__ = "avatars"

    id: int = Field(description="ID del avatar autogenerada", primary_key=True)
    filename: str = Field(description="Nombre del archivo del avatar", unique=True, nullable=False)
    # Podrías añadir 'category' si en el futuro quieres separarlos