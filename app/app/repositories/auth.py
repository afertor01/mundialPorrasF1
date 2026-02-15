from typing import Annotated, Dict
from app.schemas.shared import TokenData
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.schemas.requests import UserCreateRequest, UserUpdateRequest, UserLoginRequest
from app.schemas.responses import UserResponse
from app.db.session import get_session
from app.db.models.user import Users
from app.core.security import hash_password, verify_password, create_access_token
from sqlalchemy import or_
from sqlmodel import Session, select

SessionDep = Annotated[Session, Depends(get_session)]

class AuthRepository:
    def __init__(self, session: SessionDep):
        self.session = session
    
    def register(self, user: UserCreateRequest) -> Users:
        # 1. Validar que no exista email o username
        query = select(Users).where(
            or_(
                Users.email == user.email, 
                Users.username == user.username, 
                Users.acronym == user.acronym.upper()
            )
        )
        existing_user = self.session.exec(query).first()

        if existing_user:
            raise HTTPException(status_code=400, detail="El email, usuario o acrónimo ya está registrado")
        
        # 2. Validar acrónimo
        if len(user.acronym) > 3:
            raise HTTPException(status_code=400, detail="El acrónimo debe tener máximo 3 letras")

        # 3. Crear usuario
        new_user = Users(
            email=user.email,
            username=user.username,
            acronym=user.acronym.upper(), # Guardar siempre en mayúsculas
            hashed_password=hash_password(user.password),
            role="user" # Por defecto
        )
        self.session.add(new_user)
        self.session.commit()
        self.session.refresh(new_user)

        return new_user

    def login(self, form_data: UserLoginRequest) -> Dict[str, str]:
        query = select(Users).where(
            or_(
                Users.email == form_data.username,
                Users.acronym == form_data.username.upper()
            )
        )
        db_user = self.session.exec(query).first()

        if not db_user or not verify_password(form_data.password, db_user.hashed_password):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # 3. Crear Token (Añadimos acrónimo para que el frontend lo use)
        token_data = TokenData(
            sub=str(db_user.id),
            id=db_user.id,
            role=db_user.role,
            username=db_user.username,
            acronym=db_user.acronym
        )
        token = create_access_token(token_data)

        return {"access_token": token, "token_type": "bearer"}

    def get_current_user_data(self, current_user: Users) -> UserResponse:
        """Devuelve los datos actualizados del usuario logueado (incluido avatar)"""
        return UserResponse(**current_user.model_dump())

    def update_profile(
        self,
        user_update: UserUpdateRequest,
        current_user: Users
    ) -> Dict[str, UserResponse | str]:
        user = self.session.get(Users, current_user.id)
        
        # 1. Validar Username
        if user_update.username and user_update.username != user.username:
            query = select(Users).where(Users.username == user_update.username)
            if self.session.exec(query).first():
                raise HTTPException(400, "Ese nombre de usuario ya está cogido")
            user.username = user_update.username

        # 2. Validar Acrónimo
        if user_update.acronym and user_update.acronym != user.acronym:
            if len(user_update.acronym) > 3:
                raise HTTPException(400, "El acrónimo debe tener máximo 3 letras")
            query = select(Users).where(Users.acronym == user_update.acronym.upper())
            if self.session.exec(query).first():
                raise HTTPException(400, "Ese acrónimo ya existe")
            user.acronym = user_update.acronym.upper()

        # 3. Password
        if user_update.new_password:
            if not user_update.current_password:
                raise HTTPException(400, "Requerida contraseña actual para cambiarla")
            if not verify_password(user_update.current_password, user.hashed_password):
                raise HTTPException(401, "Contraseña actual incorrecta")
            user.hashed_password = hash_password(user_update.new_password)

        self.session.commit()
        self.session.refresh(user)

        token_data = TokenData(
            sub=str(user.id),
            id=user.id,
            role=user.role,
            username=user.username,
            acronym=user.acronym
        )
        new_token = create_access_token(token_data)
        
        # --- CORRECCIÓN CRÍTICA: SERIALIZACIÓN MANUAL ---
        # Convertimos el usuario a un diccionario simple antes de cerrar la DB
        # para evitar errores de "DetachedInstanceError" o fallos de JSON.
        user_response = UserResponse(**user.model_dump())
        
        # Devolvemos el diccionario limpio Y el token
        return {
            "user": user_response, 
            "access_token": new_token,
            "token_type": "bearer"
        }