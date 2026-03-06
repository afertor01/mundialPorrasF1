from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
import shutil
import os
from typing import List

from app.db.session import SessionLocal
from app.db.models.user import User
from app.db.models.avatar import Avatar
from app.schemas.user import UserOut, AvatarSchema
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/avatars", tags=["Avatars"])

# CONFIGURACIÓN
UPLOAD_DIR = "app/static/avatars"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. VER GALERÍA (Público/Usuarios)
@router.get("/", response_model=List[AvatarSchema])
def get_all_avatars(request: Request, db: Session = Depends(get_db)):
    base_url = str(request.base_url).rstrip("/")
    avatars = db.query(Avatar).all()
    results = []
    for av in avatars:
        results.append({
            "id": av.id,
            "filename": av.filename,
            "url": f"{base_url}/static/avatars/{av.filename}"
        })
    return results

# 2. CAMBIAR MI AVATAR (Usuario)
@router.put("/me/{avatar_filename}", response_model=UserOut)
def select_avatar(
    avatar_filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validar que el avatar existe en la galería (o es default)
    exists = db.query(Avatar).filter(Avatar.filename == avatar_filename).first()
    if not exists and avatar_filename != "default.png":
        raise HTTPException(status_code=404, detail="Ese avatar no existe en la galería")
    
    user_to_update = db.query(User).filter(User.id == current_user.id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user_to_update.avatar = avatar_filename
    db.commit()
    db.refresh(user_to_update)
    return user_to_update

# 3. SUBIR AVATAR (Admin)
@router.post("/upload", response_model=AvatarSchema)
def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    base_url = str(request.base_url).rstrip("/")
    existing = db.query(Avatar).filter(Avatar.filename == file.filename).first()
    if existing:
        return {
            "id": existing.id,
            "filename": existing.filename,
            "url": f"{base_url}/static/avatars/{existing.filename}"
        }

    new_avatar = Avatar(filename=file.filename)
    db.add(new_avatar)
    db.commit()
    db.refresh(new_avatar)
    
    return {
        "id": new_avatar.id,
        "filename": new_avatar.filename,
        "url": f"{base_url}/static/avatars/{new_avatar.filename}"
    }

# 4. BORRAR AVATAR (Admin)
@router.delete("/{avatar_id}")
def delete_avatar(
    avatar_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    avatar_to_delete = db.query(Avatar).get(avatar_id)
    if not avatar_to_delete:
        raise HTTPException(status_code=404, detail="Avatar no encontrado")
    
    filename = avatar_to_delete.filename
    users_affected = db.query(User).filter(User.avatar == filename).all()
    
    for user in users_affected:
        user.avatar = "default.png"
    
    try:
        file_path = f"{UPLOAD_DIR}/{filename}"
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error borrando archivo: {e}")
        
    db.delete(avatar_to_delete)
    db.commit()
    return {"msg": f"Avatar eliminado. {len(users_affected)} usuarios han vuelto al avatar por defecto."}