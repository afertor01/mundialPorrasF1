from typing import Annotated, Dict
from app.services.auth import AuthService
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.requests import UserCreateRequest, UserUpdateRequest, UserLoginRequest
from app.schemas.responses import UserResponse
from app.db.models.user import Users
from app.core.deps import get_current_user

AuthServiceDep = Annotated[AuthService, Depends()]


class AuthRouter:
    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/auth", tags=["Auth"])

        @api_router.post(
            "/register", description="Register a new user", response_model=UserResponse
        )
        def register(
            auth_service: AuthServiceDep, user: UserCreateRequest
        ) -> UserResponse:
            return auth_service.register(user)

        @api_router.post(
            "/login",
            description="Login and get an access token",
            response_model=Dict[str, str],
        )
        def login(
            auth_service: AuthServiceDep,
            form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        ) -> Dict[str, str]:
            login_info = UserLoginRequest(
                username=form_data.username,
                password=form_data.password,
                grant_type=form_data.grant_type,
                scopes=form_data.scopes,
                client_id=form_data.client_id,
                client_secret=form_data.client_secret,
            )
            return auth_service.login(login_info)

        @api_router.get(
            "/me",
            description="Get current logged in user's data",
            response_model=UserResponse,
        )
        def get_current_user_data(
            auth_service: AuthServiceDep,
            current_user: Annotated[Users, Depends(get_current_user)],
        ) -> UserResponse:
            """Devuelve los datos actualizados del usuario logueado (incluido avatar)"""
            return auth_service.get_current_user_data(current_user)

        @api_router.patch(
            "/me",
            description="Update current logged in user's profile",
            response_model=Dict[str, UserResponse | str],
        )
        def update_profile(
            auth_service: AuthServiceDep,
            user_update: UserUpdateRequest,
            current_user: Annotated[Users, Depends(get_current_user)],
        ) -> Dict[str, UserResponse | str]:
            return auth_service.update_profile(user_update, current_user)

        return api_router
