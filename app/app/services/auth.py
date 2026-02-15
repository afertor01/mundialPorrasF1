from typing import Annotated, Dict
from fastapi import Depends
from app.schemas.requests import UserCreateRequest, UserUpdateRequest, UserLoginRequest
from app.schemas.responses import UserResponse
from app.db.models.user import Users
from app.repositories.auth import AuthRepository

AuthRepositoryDep = Annotated[AuthRepository, Depends()]


class AuthService:
    def __init__(self, auth_repository: AuthRepositoryDep):
        self.auth_repository = auth_repository

    def register(self, user: UserCreateRequest) -> Users:
        return self.auth_repository.register(user)

    def login(self, form_data: UserLoginRequest) -> Dict[str, str]:
        return self.auth_repository.login(form_data)

    def get_current_user_data(self, current_user: Users) -> UserResponse:
        """Devuelve los datos actualizados del usuario logueado (incluido avatar)"""
        return self.auth_repository.get_current_user_data(current_user)

    def update_profile(
        self, user_update: UserUpdateRequest, current_user: Users
    ) -> Dict[str, UserResponse | str]:
        return self.auth_repository.update_profile(user_update, current_user)
