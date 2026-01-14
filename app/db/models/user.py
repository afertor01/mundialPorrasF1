from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True)
    hashed_password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="user")

    # Relaciones
    team_memberships: Mapped[list["TeamMember"]] = relationship("TeamMember", back_populates="user")
    predictions: Mapped[list["Prediction"]] = relationship("Prediction", back_populates="user")
