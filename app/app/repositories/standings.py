from typing import Annotated, List
from app.schemas.responses import (
    GPStandingResponse,
    SeasonStandingResponse,
    TeamStandingResponse,
)
from fastapi import Depends
from sqlalchemy import func
from app.db.session import get_session
from app.db.models.user import Users
from app.db.models.prediction import Predictions
from app.db.models.grand_prix import GrandPrix
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from sqlmodel import Session, select

SessionDep = Annotated[Session, Depends(get_session)]


class StandingsRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def individual_season_standings(
        self, season_id: int
    ) -> List[SeasonStandingResponse]:
        query = (
            select(
                Users.id,
                Users.username,
                func.coalesce(func.sum(Predictions.points), 0).label("points"),
            )
            .join(Predictions, Predictions.user_id == Users.id)
            .join(GrandPrix, GrandPrix.id == Predictions.gp_id)
            .filter(GrandPrix.season_id == season_id)
            .group_by(Users.id)
            .order_by(func.sum(Predictions.points).desc())
        )

        results = self.session.exec(query).all()
        return [
            SeasonStandingResponse(
                user_id=row.id, username=row.username, points=row.points
            )
            for row in results
        ]

    def gp_standings(self, gp_id: int) -> List[GPStandingResponse]:
        query = (
            select(Users.id, Users.username, Predictions.points)
            .join(Predictions, Predictions.user_id == Users.id)
            .filter(Predictions.gp_id == gp_id)
            .order_by(Predictions.points.desc())
        )

        results = self.session.exec(query).all()
        return [
            GPStandingResponse(user_id=row.id, username=row.username, points=row.points)
            for row in results
        ]

    def team_standings(self, season_id: int) -> List[TeamStandingResponse]:
        query = (
            select(
                Teams.id,
                Teams.name,
                func.coalesce(func.sum(Predictions.points), 0).label("points"),
            )
            .join(TeamMembers, TeamMembers.team_id == Teams.id)
            .join(Users, Users.id == TeamMembers.user_id)
            .join(Predictions, Predictions.user_id == Users.id)
            .join(GrandPrix, GrandPrix.id == Predictions.gp_id)
            .filter(Teams.season_id == season_id)
            .group_by(Teams.id)
            .order_by(func.sum(Predictions.points).desc())
        )

        results = self.session.exec(query).all()

        return [
            TeamStandingResponse(team_id=row.id, team_name=row.name, points=row.points)
            for row in results
        ]
