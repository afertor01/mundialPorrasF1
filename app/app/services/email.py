import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

def send_verification_email_sync(email: str, token: str, username: str):
    load_dotenv(override=True) # Forzar recarga de las variables
    
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

    if not SMTP_USER or not SMTP_PASSWORD:
        print("ADVERTENCIA: Credenciales SMTP no configuradas. Simulando envío.")
        print(f"Token para {email}: {token}")
        return

    msg = EmailMessage()
    msg['Subject'] = 'Verifica tu cuenta en Mundial de Porras'
    msg['From'] = SMTP_FROM
    msg['To'] = email

    # Frontend URL - Ajustable mediante variable de entorno para producción
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    verify_url = f"{frontend_url}/verify-email?token={token}"

    content = f"""\
    Hola {username},

    ¡Bienvenido a la Parrilla del Mundial de Porras!
    Para poder acceder a tu cuenta y empezar a jugar, por favor verifica tu correo electrónico haciendo clic en el siguiente enlace:

    {verify_url}

    Si no has solicitado este registro, puedes ignorar este correo.

    ¡Nos vemos en la pista!
    """

    msg.set_content(content)

    try:
        # Usamos SMTP_SSL para el puerto 465 (el típico de Gmail)
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Error enviando correo: {e}")
