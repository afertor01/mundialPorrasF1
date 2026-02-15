from fastapi import Depends, HTTPException, UploadFile
import shutil
import os
from typing import Annotated, Dict, List

from app.db.session import get_session
from app.db.models.user import Users
from app.db.models.avatar import Avatars
from app.schemas.responses import AvatarResponse, UserResponse
from sqlmodel import Session, select

# CONFIGURACIÓN
UPLOAD_DIR = "app/static/avatars"
# NOTA: Cambia el puerto 8000 si usas otro
BASE_STATIC_URL = "http://127.0.0.1:8000/static/avatars"

SessionDep = Annotated[Session, Depends(get_session)]


class AvatarsRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    # 1. VER GALERÍA (Público/Usuarios)
    def get_all_avatars(self) -> List[AvatarResponse]:
        query = select(Avatars)
        avatars = self.session.exec(query).all()
        results = []
        for av in avatars:
            avatar = AvatarResponse(
                id=av.id, filename=av.filename, url=f"{BASE_STATIC_URL}/{av.filename}"
            )
            results.append(avatar)
        return results

    # 2. CAMBIAR MI AVATAR (Usuario)
    def select_avatar(self, avatar_filename: str, current_user: Users) -> UserResponse:
        # 1. Validar que el avatar existe en la galería (o es default)
        query = select(Avatars).where(Avatars.filename == avatar_filename)
        exists = self.session.exec(query).first()

        if not exists and avatar_filename != "default.png":
            raise HTTPException(
                status_code=404, detail="Ese avatar no existe en la galería"
            )

        # # 2. 🔥 SOLUCIÓN DEL ERROR 🔥
        # # El 'current_user' viene de otra sesión. Lo recuperamos con la sesión actual 'db'.
        # # Esto asegura que el objeto está "conectado" a la transacción actual.
        # user_to_update = db.query(Users).filter(Users.id == current_user.id).first()

        # if not user_to_update:
        #     raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # # 3. Modificamos el objeto recuperado
        current_user.avatar = avatar_filename

        self.session.commit()
        self.session.refresh(current_user)

        return UserResponse(**current_user.model_dump())

    # 3. SUBIR AVATAR (Admin)
    def upload_avatar(self, file: UploadFile) -> AvatarResponse:
        # Asegurar que el directorio existe
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        file_location = f"{UPLOAD_DIR}/{file.filename}"

        # Guardar archivo físico
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        # Guardar referencia en BD si no existe
        query = select(Avatars).where(Avatars.filename == file.filename)
        existing = self.session.exec(query).first()
        if existing:
            return AvatarResponse(
                id=existing.id,
                filename=existing.filename,
                url=f"{BASE_STATIC_URL}/{existing.filename}",
            )

        new_avatar = Avatars(filename=file.filename)
        self.session.add(new_avatar)
        self.session.commit()
        self.session.refresh(new_avatar)

        return AvatarResponse(
            id=new_avatar.id,
            filename=new_avatar.filename,
            url=f"{BASE_STATIC_URL}/{new_avatar.filename}",
        )

    # 4. BORRAR AVATAR (Admin)
    def delete_avatar(self, avatar_id: int) -> Dict[str, str]:
        # 1. Buscar el avatar en la galería
        avatar_to_delete = self.session.get(Avatars, avatar_id)
        if not avatar_to_delete:
            raise HTTPException(status_code=404, detail="Avatars no encontrado")

        filename = avatar_to_delete.filename

        # 2. 🔥 LÓGICA DE SEGURIDAD 🔥
        # Buscamos todos los usuarios que estén usando esta foto actualmente
        query = select(Users).where(Users.avatar == filename)
        users_affected = self.session.exec(query).all()

        # Les ponemos el default para que no se les rompa el perfil
        for user in users_affected:
            user.avatar = "default.png"

        # (Opcional) Si quieres notificar cuántos fueron afectados en el log
        print(f"Resetting avatar for {len(users_affected)} users.")

        # 3. Borrar archivo físico del disco
        try:
            file_path = f"{UPLOAD_DIR}/{filename}"
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error borrando archivo: {e}")
            # Seguimos adelante para borrarlo de la BD aunque el archivo falle

        # 4. Borrar registro de la base de datos
        self.session.delete(avatar_to_delete)
        self.session.commit()

        return {
            "msg": f"Avatars eliminado. {len(users_affected)} usuarios han vuelto al avatar por defecto."
        }
