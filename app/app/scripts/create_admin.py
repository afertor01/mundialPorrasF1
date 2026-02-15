from app.db.session import get_session
from app.db.models.user import Users
from app.core.security import hash_password
from sqlmodel import Session, select


def create_admin_user(session: Session):
    email = "administrador@example.com"
    username = "ADMINISTRADOR"
    password = "admin123"  # 👉 luego la cambias

    try:
        # Comprobar si ya existe
        query = select(Users).where((Users.email == email) | (Users.username == username))
        existing_user = session.exec(query).first()

        if existing_user:
            print("⚠️  Ya existe un usuario con ese email o username")
            print("➡️  Email:", existing_user.email)
            print("➡️  Usuario:", existing_user.username)
            print("➡️  Rol:", existing_user.role)
            return

        admin_user = Users(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            role="admin",
        )

        session.add(admin_user)
        session.commit()

        print("✅ Usuario administrador creado correctamente")
        print("➡️  Email:", email)
        print("➡️  Usuario:", username)
        print("➡️  Contraseña:", password)
        print("⚠️  Cambia la contraseña cuanto antes")

    except Exception as e:
        session.rollback()
        print("❌ Error creando el usuario administrador")
        print(e)

if __name__ == "__main__":
    create_admin_user(get_session())
