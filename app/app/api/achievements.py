from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.deps import get_current_user
from app.db.models.user import User
from app.db.models.achievement import Achievement, UserAchievement

router = APIRouter(prefix="/achievements", tags=["Achievements"])

@router.get("/")
def get_my_achievements(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        # Obtener todos los logros posibles
        all_achievements = db.query(Achievement).all()
        
        # Obtener los desbloqueados por el usuario
        unlocked = db.query(UserAchievement).filter(UserAchievement.user_id == current_user.id).all()
        unlocked_ids = [u.achievement_id for u in unlocked]
        
        result = []
        for ach in all_achievements:
            is_unlocked = ach.id in unlocked_ids
            # Buscamos la fecha si está desbloqueado
            date = next((u.unlocked_at for u in unlocked if u.achievement_id == ach.id), None)
            
            result.append({
                "id": ach.id,
                "name": ach.name,
                "description": ach.description,
                "icon": ach.icon,
                "unlocked": is_unlocked,
                "date": date
            })
        
        # Si no hay logros en BD, creamos los "Semilla" automáticamente
        if not all_achievements:
            seed_achievements(db)
            return get_my_achievements(current_user) # Recurso para cargar los nuevos
            
        return result
    finally:
        db.close()

def seed_achievements(db: Session):
    """Crea los logros por defecto si no existen"""
    defaults = [
        {"slug": "first_race", "name": "Debutante", "desc": "Participa en tu primer GP", "icon": "Flag"},
        {"slug": "first_win", "name": "Pole Position", "desc": "Queda 1º en el ranking de un GP", "icon": "Trophy"},
        {"slug": "oracle", "name": "El Oráculo", "desc": "Acierta el podio exacto en orden", "icon": "Eye"},
        {"slug": "veteran", "name": "Veterano", "desc": "Participa en 10 carreras", "icon": "Star"},
        {"slug": "mechanic", "name": "Ingeniero", "desc": "Crea tu propia escudería", "icon": "Wrench"},
    ]
    for d in defaults:
        exists = db.query(Achievement).filter(Achievement.slug == d["slug"]).first()
        if not exists:
            db.add(Achievement(slug=d["slug"], name=d["name"], description=d["desc"], icon=d["icon"]))
    db.commit()