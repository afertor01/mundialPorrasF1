from fastapi import APIRouter, HTTPException
from app.schemas.user import UserCreate, UserLogin
from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(user: UserCreate):
    db = SessionLocal()

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
        hashed_password=hash_password(user.password),
        role="user" # Por defecto
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {"message": "Usuario creado exitosamente"}

@router.post("/login")
def login(user: UserLogin):
    db = SessionLocal()
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

# 3. Crear Token (Añadimos acrónimo para que el frontend lo use)
    token = create_access_token({
        "sub": db_user.email, # Usamos email como identidad principal
        "id": db_user.id,
        "role": db_user.role,
        "username": db_user.username,
        "acronym": db_user.acronym
    })
    db.close()

    return {"access_token": token, "token_type": "bearer"}