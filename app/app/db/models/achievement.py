from datetime import datetime
from enum import StrEnum
from sqlmodel import Field, Relationship, SQLModel, func


# --- ENUMS PARA CATEGORIZACIÓN ---
class AchievementRarity(StrEnum):
    COMMON = "COMMON"
    RARE = "RARE"
    EPIC = "EPIC"
    LEGENDARY = "LEGENDARY"
    HIDDEN = "HIDDEN"


class AchievementType(StrEnum):
    EVENT = "EVENT"  # Se calcula al instante tras una carrera
    SEASON = "SEASON"  # Se calcula consultando el agregado de la temporada actual
    CAREER = "CAREER"  # Se calcula consultando el histórico total


class Achievements(SQLModel, table=True):
    __tablename__ = "achievements"

    id: int = Field(description="ID del logro autogenerada", primary_key=True)
    slug: str = Field(
        description="Slug único del logro ('first_win', 'debut', etc)",
        unique=True,
        index=True,
    )  # Ej: "first_win"
    name: str = Field(description="Nombre del logro")
    description: str = Field(description="Descripción del logro")
    icon: str = Field(description="Icono del logro (Trophy, Zap, etc)")

    # Nuevas columnas
    rarity: AchievementRarity = Field(default=AchievementRarity.COMMON)
    type: AchievementType = Field(default=AchievementType.EVENT)


class UserAchievements(SQLModel, table=True):
    __tablename__ = "user_achievements"

    id: int = Field(
        description="ID del logro del usuario autogenerada", primary_key=True
    )
    user_id: int = Field(description="ID del usuario", foreign_key="users.id")
    achievement_id: int = Field(
        description="ID del logro", foreign_key="achievements.id"
    )
    unlocked_at: datetime = Field(
        description="Fecha de desbloqueo del logro",
        sa_column_kwargs={
            "server_default": func.now(),
        },
    )
    season_id: int = Field(foreign_key="seasons.id", nullable=True)
    gp_id: int = Field(foreign_key="grand_prix.id", nullable=True)

    # Relaciones
    achievement: Achievements = Relationship()
    user: "Users" = Relationship(back_populates="achievements")
    gp: "GrandPrix" = Relationship()
    season: "Seasons" = Relationship()
