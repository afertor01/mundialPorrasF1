from fastapi import APIRouter, HTTPException
from app.schemas.user import UserCreate, UserLogin
from app.db.session import SessionLocal
from app.db.models.user import User
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(user: UserCreate):
    db = SessionLocal()

    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    new_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {"message": "Usuario creado"}

@router.post("/login")
def login(user: UserLogin):
    db = SessionLocal()
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({
        "sub": str(db_user.id),
        "role": db_user.role
    })

    return {"access_token": token, "token_type": "bearer"}
