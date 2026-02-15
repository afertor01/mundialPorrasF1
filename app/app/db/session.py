from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Session

DATABASE_URL = "sqlite:///./dev.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionMaker = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


def get_session():
    with SessionMaker() as session:
        yield session

def create_tables():
    SQLModel.metadata.create_all(bind=engine)

def drop_tables():
    SQLModel.metadata.drop_all(bind=engine)