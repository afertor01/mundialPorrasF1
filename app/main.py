import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers.bingo import BingoRouter
from app.routers.grand_prix import GrandPrixRouter
from app.routers.race_results import RaceResultsRouter
from app.routers.scoring import ScoringRouter
from app.routers.seasons import SeasonsRouter
from app.routers.standings import StandingsRouter
from app.routers.stats import StatsRouter
from app.routers.teams import TeamsRouter
from app.routers.admin import AdminRouter
from app.routers.auth import AuthRouter
from app.routers.avatars import AvatarsRouter
from app.routers.achievements import AchievementsRouter
from app.routers.predictions import PredictionsRouter

app = FastAPI(
    title="Mundial de Porras F1",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# 👇 CREAR CARPETAS SI NO EXISTEN
os.makedirs("app/static/avatars", exist_ok=True)

# 👇 MONTAR LA CARPETA ESTÁTICA
# Esto hace que http://localhost:8000/static/avatars/foto.png sea accesible
app.mount("/static", StaticFiles(directory="app/static"), name="static")

achievements = AchievementsRouter()
admin = AdminRouter()
auth = AuthRouter()
avatars = AvatarsRouter()
bingo = BingoRouter()
grand_prix = GrandPrixRouter()
predictions = PredictionsRouter()
race_results = RaceResultsRouter()
scoring = ScoringRouter()
seasons = SeasonsRouter()
standings = StandingsRouter()
stats = StatsRouter()
teams = TeamsRouter()

# Conectamos las piezas (routers)
app.include_router(auth.router)
app.include_router(grand_prix.router)
app.include_router(predictions.router)
app.include_router(race_results.router)
app.include_router(admin.router)
app.include_router(stats.router)
app.include_router(seasons.router)
app.include_router(teams.router)
app.include_router(bingo.router)
app.include_router(avatars.router)
app.include_router(achievements.router)
app.include_router(scoring.router)
app.include_router(standings.router)


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
