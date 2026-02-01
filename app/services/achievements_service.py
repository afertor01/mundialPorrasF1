# app/services/achievements_service.py
from sqlalchemy.orm import Session
from app.db.models.achievement import Achievement, UserAchievement
from app.db.models.prediction import Prediction
from app.db.models.race_result import RaceResult
from app.db.models.user import User

def check_and_unlock(db: Session, user_id: int, slug: str):
    """Intenta desbloquear un logro específico si no lo tiene ya"""
    # 1. Comprobar si ya lo tiene
    ach = db.query(Achievement).filter(Achievement.slug == slug).first()
    if not ach: return # El logro no existe en BD
    
    has_it = db.query(UserAchievement).filter(
        UserAchievement.user_id == user_id, 
        UserAchievement.achievement_id == ach.id
    ).first()
    
    if not has_it:
        # 2. Desbloquear!
        new_unlock = UserAchievement(user_id=user_id, achievement_id=ach.id)
        db.add(new_unlock)
        db.commit()
        print(f"🏆 Logro desbloqueado para user {user_id}: {slug}")

def evaluate_race_achievements(db: Session, gp_id: int):
    """
    Esta función se llama DESPUÉS de guardar los resultados de una carrera.
    Revisa a todos los usuarios que participaron en ese GP.
    """
    results = db.query(RaceResult).filter(RaceResult.gp_id == gp_id).first()
    preds = db.query(Prediction).filter(Prediction.gp_id == gp_id).all()
    
    for p in preds:
        # LOGRO: PARTICIPACIÓN (Ej: Debutante)
        check_and_unlock(db, p.user_id, "first_race")

        # LOGRO: VETERANO (Ej: 10 carreras)
        total_races = db.query(Prediction).filter(Prediction.user_id == p.user_id).count()
        if total_races >= 10:
            check_and_unlock(db, p.user_id, "veteran")

        # LOGRO: GANADOR (Pole Position en el ranking)
        # (Aquí tendrías que calcular si fue el 1º de este GP)
        # ... lógica de ranking ...
        
        # LOGRO: ORÁCULO (Pleno exacto)
        # Comparar p.positions con results.positions
        # hit_count = ...
        # if hit_count == 10: check_and_unlock(db, p.user_id, "oracle")