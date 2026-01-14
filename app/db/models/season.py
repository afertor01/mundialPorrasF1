from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relaciones
    teams: Mapped[list["Team"]] = relationship("Team", back_populates="season")
    grand_prixes: Mapped[list["GrandPrix"]] = relationship("GrandPrix", back_populates="season")
    multiplier_configs: Mapped[list["MultiplierConfig"]] = relationship("MultiplierConfig", back_populates="season")
    team_members: Mapped[list["TeamMember"]] = relationship("TeamMember", back_populates="season")
