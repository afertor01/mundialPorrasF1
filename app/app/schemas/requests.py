from datetime import datetime
from typing import List
from app.schemas.shared import CamelModel, DriverPosition, RaceEvent, SeasonBase
from pydantic import EmailStr


class AdminUserUpdateRequest(CamelModel):
    user_id: int
    role: str
    password: str | None = None  # Opcional, solo si se quiere cambiar


class UserUpdateRequest(CamelModel):
    username: str | None = None
    acronym: str | None = None
    email: str | None = None
    current_password: str | None = None  # Requerido si cambias password
    new_password: str | None = None


class UserCreateRequest(CamelModel):
    email: EmailStr
    username: str
    password: str
    scope: str | None = None  # Para futuras implementaciones de OAuth2 con terceros
    acronym: str
    role: str | None = "user"  # Por defecto "user", solo admin puede cambiar esto


class UserLoginRequest(CamelModel):
    grant_type: str | None = (
        "password"  # Por ahora solo soportamos password, pero dejamos esto para futuras implementaciones de OAuth2 con terceros
    )
    username: str
    password: str
    scopes: List[str] = []  # Para futuras implementaciones de OAuth2 con terceros
    client_id: str | None = None  # Para futuras implementaciones de OAuth2 con terceros
    client_secret: str | None = None


class SeasonCreateRequest(SeasonBase):
    pass


class GrandPrixCreateRequest(CamelModel):
    season_id: int
    name: str
    race_datetime: datetime


class ConstructorCreateRequest(CamelModel):
    season_id: int
    name: str
    color: str


class DriverCreateRequest(CamelModel):
    constructor_id: int
    code: str
    name: str


class GrandPrixUpdateRequest(CamelModel):
    id: int
    season_id: int | None = None
    name: str | None = None
    race_datetime: datetime | None = None


class AdminTeamCreateRequest(CamelModel):
    name: str
    season_id: int


class UpdateRaceResultRequest(CamelModel):
    gp_id: int
    positions: List[DriverPosition]
    events: List[RaceEvent]


class UpdateRacePredictionRequest(CamelModel):
    gp_id: int
    user_id: int
    positions: List[DriverPosition]
    events: List[RaceEvent]


class TeamMemberCreateRequest(CamelModel):
    team_id: int
    user_id: int


class BingoTileCreate(CamelModel):
    description: str


class BingoTileUpdate(CamelModel):
    tile_id: int
    description: str | None = None
    is_completed: bool | None = None


class TeamCreateRequest(CamelModel):
    name: str
