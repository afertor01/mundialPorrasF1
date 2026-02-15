from typing import Annotated
from app.schemas.responses import AchievementResponse
from fastapi import APIRouter, Depends
from app.db.session import get_session
from app.db.models.user import Users
from app.db.models.achievement import Achievements, UserAchievements
from sqlmodel import Session, select

router = APIRouter(prefix="/achievements", tags=["Achievements"])

SessionDep = Annotated[Session, Depends(get_session)]

class AchievementsRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def get_user_achievements(self, user: Users) -> list[AchievementResponse]:
        query = select(Achievements)
        all_achievements = self.session.exec(query).all()

        if not all_achievements:
            self._seed_achievements()
            all_achievements = self.session.exec(query).all()
    
        # Obtener los desbloqueados por el usuario
        query = select(UserAchievements).where(UserAchievements.user_id == user.id)
        unlocked = self.session.exec(query).all()
        unlocked_date_mapping = {u.achievement_id: u.unlocked_at for u in unlocked}
        unlocked_ids = set(unlocked_date_mapping.keys())

        result = []
        for achievement in all_achievements:
            is_unlocked = achievement.id in unlocked_ids
            date = unlocked_date_mapping.get(achievement.id) if is_unlocked else None

            achievement_response = AchievementResponse(
                id=achievement.id,
                name=achievement.name,
                description=achievement.description,
                is_unlocked=is_unlocked,
                unlocked_at=date
            )

            result.append(achievement_response)
        
        return result

    def _seed_achievements(self):
        """Crea los logros por defecto si no existen"""
        defaults = [
            {"slug": "first_race", "name": "Debutante", "desc": "Participa en tu primer GP", "icon": "Flag"},
            {"slug": "first_win", "name": "Pole Position", "desc": "Queda 1º en el ranking de un GP", "icon": "Trophy"},
            {"slug": "oracle", "name": "El Oráculo", "desc": "Acierta el podio exacto en orden", "icon": "Eye"},
            {"slug": "veteran", "name": "Veterano", "desc": "Participa en 10 carreras", "icon": "Star"},
            {"slug": "mechanic", "name": "Ingeniero", "desc": "Crea tu propia escudería", "icon": "Wrench"},
        ]

        for d in defaults:
            query = select(Achievements).where(Achievements.slug == d["slug"])
            exists = self.session.exec(query).first()
            if not exists:
                self.session.add(Achievements(slug=d["slug"], name=d["name"], description=d["desc"], icon=d["icon"]))
        self.session.commit()
