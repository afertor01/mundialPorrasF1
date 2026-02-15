from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import shutil
import os
from typing import Annotated, Dict, List

from app.db.session import SessionMaker
from app.db.models.user import Users
from app.db.models.avatar import Avatars
from app.schemas.responses import AvatarResponse, UserResponse
from app.services.avatars import AvatarsService
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/avatars", tags=["Avatars"])

AvatarsServiceDep = Annotated[AvatarsService, Depends()]


class AvatarsRouter:

    @property
    def router(self) -> APIRouter:
        api_router = APIRouter(prefix="/avatars", tags=["Avatars"])

        # 1. VER GALERÍA (Público/Usuarios)
        @api_router.get(
            "/", description="Get all avatars", response_model=List[AvatarResponse]
        )
        def get_all_avatars(avatars_service: AvatarsServiceDep) -> List[AvatarResponse]:
            return avatars_service.get_all_avatars()

        # 2. CAMBIAR MI AVATAR (Usuario)
        @api_router.put(
            "/me/{avatar_filename}",
            description="Change my avatar",
            response_model=UserResponse,
        )
        def select_avatar(
            avatar_filename: str,
            avatars_service: AvatarsServiceDep,
            current_user: Annotated[Users, Depends(get_current_user)],
        ) -> UserResponse:
            return avatars_service.select_avatar(avatar_filename, current_user)

        # 3. SUBIR AVATAR (Admin)
        @api_router.post(
            "/upload",
            description="Upload a new avatar",
            response_model=AvatarResponse,
            dependencies=[Depends(require_admin)],
        )
        def upload_avatar(
            avatars_service: AvatarsServiceDep, file: UploadFile = File(...)
        ) -> AvatarResponse:
            return avatars_service.upload_avatar(file)

        # 4. BORRAR AVATAR (Admin)
        @api_router.delete(
            "/{avatar_id}",
            description="Delete an avatar",
            response_model=Dict[str, str],
            dependencies=[Depends(require_admin)],
        )
        def delete_avatar(
            avatar_id: int,
            avatars_service: AvatarsServiceDep,
        ) -> Dict[str, str]:
            return avatars_service.delete_avatar(avatar_id)

        return api_router
