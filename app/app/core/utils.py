import secrets
import string

def generate_join_code():
    """Genera un código aleatorio de 6 caracteres (Ej: A7X-9Y2)"""
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(secrets.choice(chars) for _ in range(3))
    part2 = ''.join(secrets.choice(chars) for _ in range(3))
    return f"{part1}-{part2}"
