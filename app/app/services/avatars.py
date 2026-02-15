from typing import Annotated, Dict, List
from fastapi import Depends, UploadFile
from app.repositories.avatars import AvatarsRepository
from app.db.models.user import Users
from app.schemas.responses import AvatarResponse, UserResponse

AvatarsRepositoryDep = Annotated[AvatarsRepository, Depends()]

class AvatarsService:
    def __init__(self, avatars_repository: AvatarsRepositoryDep):
        self.avatars_repository = avatars_repository

    # 1. VER GALERÍA (Público/Usuarios)
    def get_all_avatars(self) -> List[AvatarResponse]:
        return self.avatars_repository.get_all_avatars()

    # 2. CAMBIAR MI AVATAR (Usuario)
    def select_avatar(
        self,
        avatar_filename: str,
        current_user: Users
    ) -> UserResponse:
        return self.avatars_repository.select_avatar(avatar_filename, current_user)

    # 3. SUBIR AVATAR (Admin)
    def upload_avatar(
        self,
        file: UploadFile
    ) -> AvatarResponse:
        return self.avatars_repository.upload_avatar(file)

    # 4. BORRAR AVATAR (Admin)
    def delete_avatar(
        self,
        avatar_id: int
    ) -> Dict[str, str]:
        return self.avatars_repository.delete_avatar(avatar_id)