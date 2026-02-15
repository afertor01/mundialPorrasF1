from typing import Annotated, Dict
from app.schemas.responses import AdminRaceResultResponse, RaceResultResponse
from app.schemas.shared import DriverPosition, RaceEvent
from fastapi import APIRouter, HTTPException, Depends
from app.db.session import SessionMaker, get_session
from app.db.models.race_result import RaceResults
from app.db.models.race_position import RacePositions
from app.db.models.race_event import RaceEvents
from app.db.models.grand_prix import GrandPrix
from app.schemas.requests import UpdateRaceResultRequest
from app.core.deps import get_current_user
from app.db.models.user import Users
from app.utils.achievements import evaluate_race_achievements
from sqlmodel import Session, delete, select

SessionDep = Annotated[Session, Depends(get_session)]


class RaceResultsRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def update_race_result(
        self,
        race_result_data: UpdateRaceResultRequest
    ) -> Dict[str, str]:
        gp = self.session.get(GrandPrix, race_result_data.gp_id)
        if not gp:
            raise HTTPException(status_code=404, detail="GP no encontrado")
        
        query = select(RaceResults).where(RaceResults.gp_id == race_result_data.gp_id)
        result = self.session.exec(query).first()

        if not result:
            result = RaceResults(gp_id=race_result_data.gp_id)
            self.session.add(result)
            self.session.flush()

        query = delete(RacePositions).where(RacePositions.race_result_id == result.id)
        self.session.exec(query)

        query = delete(RaceEvents).where(RaceEvents.race_result_id == result.id)
        self.session.exec(query)

        for position in race_result_data.positions:
            self.session.add(RacePositions(
                race_result_id=result.id,
                position=position.position,
                driver_name=position.driver_code
            ))

        for event in race_result_data.events:
            self.session.add(RaceEvents(
                race_result_id=result.id,
                event_type=event.type,
                value=event.description
            ))

        self.session.commit()

        # 🔥 VALIDAR LOGROS AUTOMÁTICAMENTE
        evaluate_race_achievements(self.session, gp.id)

        return {"message": "Resultado guardado y logros calculados"}

    def get_race_result(
        self,
        gp_id: int
    ) -> RaceResultResponse:
        query = select(RaceResults).where(RaceResults.gp_id == gp_id)
        result = self.session.exec(query).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Resultados no disponibles aún")

        # Forzamos la carga de relaciones para que FastAPI las serialice
        # (A veces SQLAlchemy es perezoso y devuelve vacio si no se accede explícitamente)
        data = RaceResultResponse(
            id=result.id,
            gp_id=result.gp_id,
            positions=[DriverPosition(position=p.position, driver_code=p.driver_name) for p in result.positions],
            events=[RaceEvent(type=e.event_type, description=e.value) for e in result.events]
        )
        
        return data
