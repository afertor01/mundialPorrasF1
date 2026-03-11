import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

def send_verification_email_sync(email: str, token: str, username: str):
    load_dotenv(override=True)
    
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587")) # Recomiendo 587 para Vercel
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

    if not SMTP_USER or not SMTP_PASSWORD:
        print("ADVERTENCIA: Credenciales SMTP no configuradas. Simulando envío.")
        print(f"Token para {email}: {token}")
        return

    msg = EmailMessage()
    msg['Subject'] = 'Verifica tu cuenta en Mundial de Porras'
    msg['From'] = f"Mundial de Porras <{SMTP_FROM}>"
    msg['To'] = email

    # Frontend URL dinámico
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

    print(f"📧 Intentando enviar correo a {email} vía SMTP ({SMTP_HOST}:{SMTP_PORT})...")

    try:
        # En Vercel es CRÍTICO que esto sea síncrono y se espere a que termine (ya lo es en auth.py)
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls() # STARTTLS para puerto 587
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        print("✅ Correo enviado exitosamente.")
    except Exception as e:
        print(f"❌ Error enviando correo: {e}")
        # En producción, podrías querer relanzar el error o manejarlo de forma que el usuario lo sepa
