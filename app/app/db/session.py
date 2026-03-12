from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env (solo para local)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
# Render/Heroku a veces usan 'postgres://', pero SQLAlchemy necesita 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configuración específica para SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine_kwargs = {
    "pool_pre_ping": True  # Recomendado para bases de datos en la nube (Neon/Supabase)
}

# Ampliamos los límites y tiempos de espera para las conexiones a PostgreSQL
# Esto evita el error de Timeout en QueuePool cuando el servidor se despierta
# y recibe muchas peticiones de golpe (por ejemplo en el login)
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs.update({
        "pool_size": 20,         # Tamaño base del pool (número de conexiones activas concurrentes)
        "max_overflow": 30,      # Conexiones extra por encima del pool_size en alta carga
        "pool_timeout": 60,      # Segundos que espera una petición para conseguir una conexión antes de fallar
        "pool_recycle": 1800     # Reciclamos las conexiones para evitar timeouts en el lado del servidor/nube
    })

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass
