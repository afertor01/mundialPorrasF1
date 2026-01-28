from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# IMPORTANTE: Importar Base y Engine para que funcione la creación de tablas
from app.db.session import engine, Base 

# Importar modelos para que SQLAlchemy los "vea" antes de crear las tablas
# El nombre _all suele ser un truco para importar todo a la vez
from app.db.models import _all 

# Importar las rutas (los routers)
from app.api.auth import router as auth_router
from app.api.grand_prix import router as grand_prix_router
from app.api.predictions import router as predictions_router
from app.api.race_results import router as race_results_router
from app.api.admin import router as admin_router
from app.api import stats
from app.api.seasons import router as seasons_router

app = FastAPI(
    title="Mundial de Porras F1",
    version="1.0.0"
)

# Creamos las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Conectamos las piezas (routers)
app.include_router(auth_router)
app.include_router(grand_prix_router)
app.include_router(predictions_router)
app.include_router(race_results_router)
app.include_router(admin_router)
app.include_router(stats.router)
app.include_router(seasons_router)

# Configuramos el permiso para que React pueda hablar con Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "API Mundial F1 funcionando 🏎️"}