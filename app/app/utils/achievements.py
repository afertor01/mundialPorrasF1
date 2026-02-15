from app.db.models.achievement import Achievements, UserAchievements
from app.db.models.prediction import Predictions
from app.db.models.race_result import RaceResults
from app.db.models.user import Users
from sqlmodel import Session, select

def check_and_unlock(session: Session, user_id: int, slug: str) -> None:
    """Intenta desbloquear un logro específico si no lo tiene ya"""
    # 1. Comprobar si ya lo tiene
    query = select(Achievements).where(Achievements.slug == slug)
    ach = session.exec(query).first()
    if not ach:
        return
    
    query = select(UserAchievements).where(
        UserAchievements.user_id == user_id, 
        UserAchievements.achievement_id == ach.id
    )
    has_it = session.exec(query).first()
    
    if not has_it:
        # 2. Desbloquear!
        new_unlock = UserAchievements(user_id=user_id, achievement_id=ach.id)
        session.add(new_unlock)
        session.commit()
        print(f"🏆 Logro desbloqueado para user {user_id}: {slug}")

def evaluate_race_achievements(session: Session, gp_id: int):
    """
    Esta función se llama DESPUÉS de guardar los resultados de una carrera.
    Revisa a todos los usuarios que participaron en ese GP.
    """
    query = select(Predictions).where(Predictions.gp_id == gp_id)
    preds = session.exec(query).all()
    
    for p in preds:
        # LOGRO: PARTICIPACIÓN (Ej: Debutante)
        check_and_unlock(session, p.user_id, "first_race")

        # LOGRO: VETERANO (Ej: 10 carreras)
        query = select(Predictions).where(Predictions.user_id == p.user_id)
        total_races = len(session.exec(query).all())
        if total_races >= 10:
            check_and_unlock(session, p.user_id, "veteran")

        # LOGRO: GANADOR (Pole Position en el ranking)
        # (Aquí tendrías que calcular si fue el 1º de este GP)
        # ... lógica de ranking ...
        
        # LOGRO: ORÁCULO (Pleno exacto)
        # Comparar p.positions con results.positions
        # hit_count = ...
        # if hit_count == 10: check_and_unlock(db, p.user_id, "oracle")