from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from datetime import timedelta

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    acronym: str

class UserLogin(BaseModel):
    email: str
    password: str

# Dependencia para DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 1. Validar que no exista email o username
    existing_user = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email o usuario ya está registrado")

    # 2. Validar acrónimo
    if len(user.acronym) > 3:
        raise HTTPException(status_code=400, detail="El acrónimo debe tener máximo 3 letras")

    # 3. Crear usuario
    new_user = User(
        email=user.email,
        username=user.username,
        acronym=user.acronym.upper(), # Guardar siempre en mayúsculas
        hashed_password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Usuario creado exitosamente"}

@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    # ... (El código de login se queda igual que estaba)
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales incorrectas")
    
    # IMPORTANTE: Ahora incluimos el acrónimo en el token para tenerlo fácil en el frontend
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "username": user.username, "acronym": user.acronym}
    )
    return {"access_token": access_token, "token_type": "bearer"}