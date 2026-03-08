from sqlalchemy import text
from sqlalchemy.orm import Session

def sync_all_sequences(db: Session):
    """
    Sincroniza todas las secuencias de las tablas de PostgreSQL para evitar el error
    'UniqueViolation: duplicate key value violates unique constraint' tras hacer imports manuales.
    """
    if db.bind.dialect.name != "postgresql":
        return

    print("🔄 Sincronizando secuencias de PostgreSQL...")
    
    tables = [
        "users", "seasons", "achievements", "user_achievements", 
        "teams", "team_members", "grand_prix", "race_results", 
        "race_positions", "race_events", "predictions", 
        "prediction_positions", "prediction_events", "bingo_tiles", 
        "bingo_selections", "avatars", "user_stats", "user_gp_stats"
    ]
    
    for table in tables:
        try:
            # Sincronizamos la secuencia al máximo ID actual + 1
            # El tercer parámetro 'false' en setval hace que el PRÓXIMO sea el valor dado.
            # Pero usando 'coalesce(MAX(id), 0) + 1' con 'false', el próximo será ese valor.
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('\"{table}\"', 'id'), coalesce((SELECT MAX(id) FROM \"{table}\"), 0) + 1, false);"))
            db.commit()
        except Exception as e:
            # Probablemente la tabla no existe o no tiene una secuencia estándar de id
            db.rollback()
            continue

    print("✅ Secuencias sincronizadas.")
