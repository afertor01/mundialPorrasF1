from typing import Annotated, Dict
from fastapi import APIRouter, HTTPException, Depends
from app.db.session import get_session
from app.db.models.prediction import Predictions
from app.db.models.race_result import RaceResults
from app.db.models.multiplier_config import MultiplierConfigs
from app.utils.scoring import calculate_prediction_score
from app.core.deps import get_current_user
from sqlmodel import Session, select

SessionDep = Annotated[Session, Depends(get_session)]


class ScoringRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def score_gp(
        self,
        gp_id: int,
    ) -> Dict[str, str]:
        query = select(RaceResults).where(RaceResults.gp_id == gp_id)
        race_result = self.session.exec(query).first()

        if not race_result:
            raise HTTPException(status_code=404, detail="Resultado no introducido")

        query = select(Predictions).where(Predictions.gp_id == gp_id)
        predictions = self.session.exec(query).all()

        season_id = race_result.grand_prix.season_id

        query = select(MultiplierConfigs).where(
            MultiplierConfigs.season_id == season_id
        )
        multipliers = self.session.exec(query).all()

        for prediction in predictions:
            result = calculate_prediction_score(prediction, race_result, multipliers)

            prediction.points = result["final_points"]

        self.session.commit()

        return {"message": "Puntuaciones calculadas"}
