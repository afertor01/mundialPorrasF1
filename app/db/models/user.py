from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from app.db.session import Base

# Importamos TYPE_CHECKING para evitar importaciones circulares, 
# aunque con Strings en relationship suele valer.
from typing import TYPE_CHECKING

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    acronym: Mapped[str] = mapped_column(String(3), nullable=True) 
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="user")

    # 👇 ESTO ES LO QUE FALTABA (Las relaciones)
    predictions: Mapped[List["Prediction"]] = relationship("Prediction", back_populates="user")
    team_memberships: Mapped[List["TeamMember"]] = relationship("TeamMember", back_populates="user")