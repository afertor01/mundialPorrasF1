from typing import Annotated, List
from fastapi import HTTPException, Depends
from app.db.session import get_session
from app.db.models.grand_prix import GrandPrix
from app.db.models.season import Seasons
from app.schemas.requests import GrandPrixCreateRequest
from sqlmodel import Session, select

SessionDep = Annotated[Session, Depends(get_session)]


class GrandPrixRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def create_grand_prix(self, gp_data: GrandPrixCreateRequest) -> GrandPrix:
        season = self.session.get(Seasons, gp_data.season_id)
        if not season:
            raise HTTPException(status_code=404, detail="Temporada no encontrada")

        gp = GrandPrix(**gp_data.model_dump())

        self.session.add(gp)
        self.session.commit()
        self.session.refresh(gp)

        return gp

    def list_grand_prix(self, season_id: int) -> List[GrandPrix]:
        query = (
            select(GrandPrix)
            .where(GrandPrix.season_id == season_id)
            .order_by(GrandPrix.race_datetime)
        )
        gps = self.session.exec(query).all()

        return gps
