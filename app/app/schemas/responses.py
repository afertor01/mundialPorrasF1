from datetime import datetime
from typing import Dict, List
from pydantic import EmailStr
from app.schemas.shared import CamelModel, DriverPosition, RaceEvent, SeasonBase


class AchievementResponse(CamelModel):
    id: int
    slug: str
    name: str
    description: str
    icon: str
    rarity: str
    type: str
    is_unlocked: bool
    unlocked_at: datetime | None = None
    gp_name: str | None = None
    season_name: str | None = None


class UserResponse(CamelModel):
    id: int
    email: EmailStr
    username: str
    role: str
    acronym: str | None = None
    created_at: datetime | None = None
    avatar: str | None = "default.png"


class AvatarResponse(CamelModel):
    id: int
    filename: str
    url: str  # Calcularemos la URL completa para facilitar al front

    class Config:
        from_attributes = True


class SeasonResponse(SeasonBase):
    id: int

    class Config:
        from_attributes = True


class GrandPrixResponse(CamelModel):
    id: int
    name: str
    season_id: int
    race_datetime: datetime

    class Config:
        from_attributes = True


class AdminRaceResultResponse(CamelModel):
    positions: List[DriverPosition]
    events: List[RaceEvent]


class BingoTileResponse(CamelModel):
    id: int
    description: str
    is_completed: bool
    selection_count: int = 0
    current_value: int = 0
    is_selected_by_me: bool = False

    class Config:
        from_attributes = True


class BingoStandingsItem(CamelModel):
    username: str
    acronym: str
    selections_count: int
    hits: int
    missed: int
    total_points: int


class PredictionResponse(CamelModel):
    username: str
    points: int
    base_points: int
    multiplier: float
    positions: List[DriverPosition]
    events: List[RaceEvent]


class RaceResultResponse(CamelModel):
    id: int
    gp_id: int
    positions: List[DriverPosition]
    events: List[RaceEvent]


class TeamResponse(CamelModel):
    id: int
    name: str
    members: List[str]


class TeamStandingResponse(CamelModel):
    team_id: int
    team_name: str
    points: int


class GPStandingResponse(CamelModel):
    user_id: int
    username: str
    points: int


class SeasonStandingResponse(CamelModel):
    user_id: int
    username: str
    points: int


class MyTeamResponse(TeamResponse):
    join_code: str
    is_full: bool
