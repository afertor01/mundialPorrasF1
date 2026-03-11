from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.schemas.user import UserCreate, UserLogin, UserOut, UserUpdate
from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, create_verification_token
from app.core.deps import get_current_user
from app.services.email import send_verification_email_sync
from datetime import timedelta
from sqlalchemy import or_
import re

router = APIRouter(prefix="/auth", tags=["Auth"])

def is_valid_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@router.post("/register")
def register(user: UserCreate):
    db = SessionLocal()

    # 1. Validar que no exista email o username
    existing_user = db.query(User).filter(
        (User.email == user.email) | 
        (User.username == user.username) |
        (User.acronym == user.acronym.upper())
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email, usuario o acrónimo ya está registrado")
    
    # 2. Validar formato email
    if not is_valid_email(user.email):
        raise HTTPException(status_code=400, detail="El formato del email no es válido")

    # 3. Validar acrónimo
    if len(user.acronym) > 3:
        raise HTTPException(status_code=400, detail="El acrónimo debe tener máximo 3 letras")

    # 4. Crear usuario (Ya verificado por defecto)
    new_user = User(
        email=user.email,
        username=user.username,
        acronym=user.acronym.upper(),
        hashed_password=hash_password(user.password),
        role="user",
        is_verified=True,
        verification_token=None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {"message": "Usuario creado exitosamente. Ya puedes iniciar sesión."}

@router.post("/login")
def login(user: UserLogin):
    db = SessionLocal()
    db_user = db.query(User).filter(
        (User.email == user.identifier) | 
        (User.acronym == user.identifier.upper())
    ).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not db_user.is_verified:
        raise HTTPException(
            status_code=403, 
            detail={
                "message": "Tu correo sigue pendiente de validación", 
                "needs_verification": True,
                "email": db_user.email
            }
        )

# 3. Crear Token (Añadimos acrónimo para que el frontend lo use)
    token = create_access_token({
        "sub": str(db_user.id),
        "id": db_user.id,
        "role": db_user.role,
        "username": db_user.username,
        "acronym": db_user.acronym
    })
    db.close()

    return {"access_token": token, "token_type": "bearer"}

from pydantic import BaseModel

class VerifyToken(BaseModel):
    token: str

@router.post("/verify-email")
def verify_email(data: VerifyToken):
    db = SessionLocal()
    user = db.query(User).filter(User.verification_token == data.token).first()
    if not user:
        db.close()
        raise HTTPException(status_code=400, detail="Token inválido o expirado.")
    
    user.is_verified = True
    user.verification_token = None
    db.commit()
    db.close()
    return {"message": "Correo verificado exitosamente. Ya puedes iniciar sesión."}

class ResendVerification(BaseModel):
    email: str

@router.post("/resend-verification")
def resend_verification(data: ResendVerification):
    db = SessionLocal()
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        db.close()
        # No revelamos si el correo existe o no al usuario por seguridad
        return {"message": "Si tu correo estaba registrado, se ha enviado un nuevo enlace de verificación."}
    
    if user.is_verified:
        db.close()
        raise HTTPException(status_code=400, detail="El correo ya está verificado.")
    
    token = create_verification_token()
    user.verification_token = token
    db.commit()
    db.refresh(user)
    db.close()
    
    send_verification_email_sync(user.email, token, user.username)
    return {"message": "Se ha enviado un nuevo enlace de verificación a tu correo."}

@router.get("/me", response_model=UserOut)
def get_current_user_data(current_user: User = Depends(get_current_user)):
    """Devuelve los datos actualizados del usuario logueado (incluido avatar)"""
    return current_user

@router.patch("/me")
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()
    user = db.query(User).get(current_user.id)
    
    # 1. Validar Username
    if user_update.username and user_update.username != user.username:
        if db.query(User).filter(User.username == user_update.username).first():
            raise HTTPException(400, "El nombre de usuario ya está ocupado")
        user.username = user_update.username

    # 2. Validar Acrónimo
    if user_update.acronym and user_update.acronym != user.acronym:
        if len(user_update.acronym) > 3:
            raise HTTPException(400, "El acrónimo debe tener máximo 3 letras")
        if db.query(User).filter(User.acronym == user_update.acronym.upper()).first():
            raise HTTPException(400, "El acrónimo ya está ocupado")
        user.acronym = user_update.acronym.upper()

    # 3. Password
    if user_update.new_password:
        if not user_update.current_password:
            raise HTTPException(400, "Requerida contraseña actual para cambiarla")
        if not verify_password(user_update.current_password, user.hashed_password):
            raise HTTPException(401, "Contraseña actual incorrecta")
        user.hashed_password = hash_password(user_update.new_password)

    db.commit()
    db.refresh(user)
    
    # --- NOVEDAD: GENERAMOS EL TOKEN ---
    new_token = create_access_token({
        "sub": str(user.id),
        "id": user.id,
        "role": user.role,
        "username": user.username,
        "acronym": user.acronym
    })
    
    # --- CORRECCIÓN CRÍTICA: SERIALIZACIÓN MANUAL ---
    # Convertimos el usuario a un diccionario simple antes de cerrar la DB
    # para evitar errores de "DetachedInstanceError" o fallos de JSON.
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "acronym": user.acronym,
        "role": user.role,
        "avatar": user.avatar
    }
    
    db.close()
    
    # Devolvemos el diccionario limpio Y el token
    return {
        "user": user_dict, 
        "access_token": new_token,
        "token_type": "bearer"
    }