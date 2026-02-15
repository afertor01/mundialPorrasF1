from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel, func

class Achievements(SQLModel, table=True):
    __tablename__ = "achievements"

    id: int = Field(description="ID del logro autogenerada", primary_key=True)
    slug: str = Field(description="Slug único del logro ('first_win', 'debut', etc)", unique=True, index=True) # Ej: "first_win"
    name: str = Field(description="Nombre del logro")
    description: str = Field(description="Descripción del logro")
    icon: str = Field(description="Icono del logro (Trophy, Zap, etc)")

class UserAchievements(SQLModel, table=True):
    __tablename__ = "user_achievements"

    id: int = Field(description="ID del logro del usuario autogenerada", primary_key=True)
    user_id: int = Field(description="ID del usuario", foreign_key="users.id")
    achievement_id: int = Field(description="ID del logro", foreign_key="achievements.id")
    unlocked_at: datetime = Field(description="Fecha de desbloqueo del logro", sa_column_kwargs={
        "server_default": func.now(),
    })

    # Relaciones
    user: "Users" = Relationship(back_populates="achievements")
    achievement: Achievements = Relationship()