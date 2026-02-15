from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint


class TeamMembers(SQLModel, table=True):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("user_id", "season_id", name="uq_user_season"),
    )

    id: int = Field(description="ID único del miembro del equipo", primary_key=True)
    team_id: int = Field(description="ID del equipo al que pertenece el miembro", foreign_key="teams.id", nullable=False)
    user_id: int = Field(description="ID del usuario miembro del equipo", foreign_key="users.id", nullable=False)
    season_id: int = Field(description="ID de la temporada a la que pertenece el miembro", foreign_key="seasons.id", nullable=False)

    # Relaciones
    team: "Teams" = Relationship(back_populates="members")
    user: "Users" = Relationship(back_populates="team_memberships")
    season: "Seasons" = Relationship(back_populates="team_members")

