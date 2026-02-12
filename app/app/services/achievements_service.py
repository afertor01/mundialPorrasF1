from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_
from typing import Set, List, Optional

# Modelos
from app.db.models.achievement import Achievement, UserAchievement, AchievementType
from app.db.models.prediction import Prediction
from app.db.models.prediction_position import PredictionPosition
from app.db.models.prediction_event import PredictionEvent
from app.db.models.race_result import RaceResult
from app.db.models.race_position import RacePosition
from app.db.models.race_event import RaceEvent
from app.db.models.grand_prix import GrandPrix
from app.db.models.user import User
from app.db.models.driver import Driver
from app.db.models.constructor import Constructor
from app.db.models.user_stats import UserStats, UserGpStats
from app.db.models.team_member import TeamMember

# ==============================================================================
# 0. CONFIGURACIÓN
# ==============================================================================

def get_dynamic_slugs() -> Set[str]:
    """
    Devuelve los slugs de logros que se evalúan carrera a carrera.
    Los logros de 'Finale' (Campeón, Mochila, Squad Leader) NO están aquí 
    porque no deben revocarse durante la temporada regular.
    """
    return {
        # Career Stats
        "career_debut", "career_500", "career_1000", "career_2500", 
        "career_50_gps", "career_50_exact", 
        "career_goat", "career_100_exact", "career_10_full_podium",
        "career_5_fl", "career_10_fl",
        "career_5_sc", "career_10_sc",
        "career_5_dnf_count", "career_10_dnf_count",
        "career_5_dnf_driver", "career_10_dnf_driver",
        # Season Stats (Puntos)
        "season_100", "season_300", "season_500",
        # Eventos
        "event_first", "event_join_team", "event_25pts", "event_50pts", 
        "event_nostradamus", "event_high_five", "event_la_decima", 
        "event_oracle", "event_mc", "event_god", "event_grand_chelem", 
        "event_civil_war", "event_chaos", "event_maldonado"
    }

# ==============================================================================
# 1. GESTIÓN DE ESTADÍSTICAS
# ==============================================================================

def recalculate_user_stats(db: Session, user_id: int, current_gp: GrandPrix) -> UserStats:
    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
    if not stats:
        stats = UserStats(user_id=user_id)
        db.add(stats)

    # 1. Puntos Totales y Season (MANTENER LO QUE YA TIENES)
    stats.total_points = db.query(func.sum(Prediction.points)).filter(Prediction.user_id == user_id).scalar() or 0.0
    stats.current_season_points = db.query(func.sum(Prediction.points))\
        .join(GrandPrix).filter(Prediction.user_id == user_id, GrandPrix.season_id == current_gp.season_id).scalar() or 0.0
    stats.total_gps_played = db.query(func.count(Prediction.id)).filter(Prediction.user_id == user_id).scalar() or 0

    # 2. Aciertos Exactos Totales (MANTENER)
    stats.exact_positions_count = db.query(func.count(PredictionPosition.id))\
        .join(Prediction).join(RaceResult, Prediction.gp_id == RaceResult.gp_id)\
        .join(RacePosition, and_(
            RaceResult.id == RacePosition.race_result_id,
            PredictionPosition.position == RacePosition.position,
            PredictionPosition.driver_name == RacePosition.driver_name
        )).filter(Prediction.user_id == user_id).scalar() or 0

    # --- NUEVO: CÁLCULO DE EVENTOS ACUMULADOS ---
    # Obtenemos todas las predicciones del usuario que tengan resultado de carrera asociado
    history = db.query(Prediction).join(RaceResult, Prediction.gp_id == RaceResult.gp_id)\
        .filter(Prediction.user_id == user_id)\
        .options(
            joinedload(Prediction.events),
            joinedload(Prediction.positions),
            joinedload(Prediction.grand_prix).joinedload(GrandPrix.race_result).joinedload(RaceResult.events),
            joinedload(Prediction.grand_prix).joinedload(GrandPrix.race_result).joinedload(RaceResult.positions)
        ).all()

    # Contadores
    c_podium_exact = 0
    c_fl = 0
    c_sc = 0
    c_dnf_count = 0
    c_dnf_driver = 0

    for pred in history:
        if not pred.grand_prix.race_result: continue
        
        # Mapas para comparar
        u_evts = {e.event_type: e.value for e in pred.events}
        r_evts = {e.event_type: e.value for e in pred.grand_prix.race_result.events}
        u_pos = {p.position: p.driver_name for p in pred.positions}
        r_pos = {p.position: p.driver_name for p in pred.grand_prix.race_result.positions}

        # 1. Podio Exacto (1, 2 y 3 coinciden)
        if (u_pos.get(1) == r_pos.get(1) and 
            u_pos.get(2) == r_pos.get(2) and 
            u_pos.get(3) == r_pos.get(3)):
            c_podium_exact += 1

        # 2. Eventos Simples (String match)
        if u_evts.get("FASTEST_LAP") == r_evts.get("FASTEST_LAP"): c_fl += 1
        if u_evts.get("SAFETY_CAR") == r_evts.get("SAFETY_CAR"): c_sc += 1
        if u_evts.get("DNFS") == r_evts.get("DNFS"): c_dnf_count += 1

        # 3. DNF Driver (Lógica compleja)
        u_dnf_val = u_evts.get("DNF_DRIVER")
        r_dnf_val = r_evts.get("DNF_DRIVER", "")
        r_dnf_count = int(r_evts.get("DNFS", 0))

        # Si hubo 0 abandonos y predijo 0/None -> Acierto
        if r_dnf_count == 0 and (not u_dnf_val or u_dnf_val in ["0", "None", ""]):
            c_dnf_driver += 1
        # Si hubo abandonos y acertó uno de la lista
        elif r_dnf_count > 0 and u_dnf_val and r_dnf_val:
            real_dnf_list = [x.strip() for x in r_dnf_val.split(",")]
            if u_dnf_val in real_dnf_list:
                c_dnf_driver += 1

    # Guardar en Stats
    stats.exact_podiums_count = c_podium_exact
    stats.fastest_lap_hits = c_fl
    stats.safety_car_hits = c_sc
    stats.dnf_count_hits = c_dnf_count
    stats.dnf_driver_hits = c_dnf_driver
    
    stats.last_gp_played_date = current_gp.race_datetime
    stats.last_gp_played_id = current_gp.id

    db.add(stats)
    db.flush()
    return stats

# ==============================================================================
# 2. CALCULADORA DE LOGROS (CHECKERS)
# ==============================================================================

def check_event_achievements(db: Session, user_id: int, gp: GrandPrix) -> Set[str]:
    """Verifica logros tipo EVENT basándose ÚNICAMENTE en el GP actual."""
    unlocks = set()
    
    prediction = db.query(Prediction).filter(Prediction.user_id == user_id, Prediction.gp_id == gp.id).first()
    if not prediction or not gp.race_result: return unlocks
    res = gp.race_result
    
    points = prediction.points or 0
    real_pos = {rp.position: rp.driver_name for rp in res.positions}
    user_pos = {pp.position: pp.driver_name for pp in prediction.positions}
    real_evts = {re.event_type: re.value for re in res.events}
    user_evts = {ue.event_type: ue.value for ue in prediction.events}

    exact_hits = sum(1 for i in range(1, 11) if user_pos.get(i) == real_pos.get(i))
    podium_hits = sum(1 for i in range(1, 4) if user_pos.get(i) == real_pos.get(i))
    
    hit_sc = user_evts.get("SAFETY_CAR") == real_evts.get("SAFETY_CAR")
    hit_fl = user_evts.get("FASTEST_LAP") == real_evts.get("FASTEST_LAP")
    hit_dnf = int(user_evts.get("DNFS", 0)) == int(real_evts.get("DNFS", 0))
    
    # Comprobación del DNF Driver
    user_dnf_driver_pred = user_evts.get("DNF_DRIVER")
    real_dnf_drivers_str = real_evts.get("DNF_DRIVER") # Puede ser una lista "VER,PER"
    real_dnfs_count = int(real_evts.get("DNFS", 0))
    hit_dnf_driver = False
    if hit_dnf and real_dnfs_count == 0:
        hit_dnf_driver = True
    elif real_dnfs_count > 0 and user_dnf_driver_pred and real_dnf_drivers_str:
        hit_dnf_driver = user_dnf_driver_pred in real_dnf_drivers_str.split(',')

    events_hit_count = sum([hit_sc, hit_fl, hit_dnf, hit_dnf_driver])

    # Logros
    if points > 0: unlocks.add("event_first")
    if points > 25: unlocks.add("event_25pts")
    if points > 50: unlocks.add("event_50pts")
    if points == 0: unlocks.add("event_maldonado")

    if podium_hits == 3: unlocks.add("event_nostradamus")
    if exact_hits >= 5: unlocks.add("event_high_five")
    if exact_hits >= 10: unlocks.add("event_la_decima")
    
    real_top10 = {real_pos.get(i) for i in range(1,11) if real_pos.get(i)}
    user_top10 = {user_pos.get(i) for i in range(1,11) if user_pos.get(i)}
    if len(real_top10) == 10 and real_top10 == user_top10: unlocks.add("event_oracle")

    if events_hit_count == 4: unlocks.add("event_mc")
    if exact_hits == 10 and events_hit_count == 4: unlocks.add("event_god")
    
    hit_p1 = user_pos.get(1) == real_pos.get(1)
    if hit_sc and hit_fl and hit_p1: unlocks.add("event_grand_chelem")

    real_dnf_num = int(real_evts.get("DNFS", 0))
    if real_dnf_num > 4 and hit_dnf: unlocks.add("event_chaos")

    # Civil War
    p1, p2 = user_pos.get(1), user_pos.get(2)
    if p1 and p2 and p1 == real_pos.get(1) and p2 == real_pos.get(2):
        d1 = db.query(Driver).filter_by(code=p1).first()
        d2 = db.query(Driver).filter_by(code=p2).first()
        if d1 and d2 and d1.constructor_id == d2.constructor_id:
            unlocks.add("event_civil_war")
    
    # Join Team
    has_team = db.query(TeamMember).filter(TeamMember.user_id == user_id, TeamMember.season_id == gp.season_id).first()
    if has_team: unlocks.add("event_join_team")

    return unlocks

def check_career_season_achievements(db: Session, user_id: int, stats: UserStats) -> Set[str]:
    """Verifica logros CAREER y SEASON."""
    unlocks = set()
    
    # CAREER (Acumulativo Global)
    if stats.total_gps_played >= 1: unlocks.add("career_debut")
    if stats.total_points >= 500: unlocks.add("career_500")
    if stats.total_points >= 1000: unlocks.add("career_1000")
    if stats.total_points >= 2500: unlocks.add("career_2500")
    if stats.total_gps_played >= 50: unlocks.add("career_50_gps")
    if stats.exact_positions_count >= 50: unlocks.add("career_50_exact")
    if stats.total_points >= 5000: unlocks.add("career_goat")
    if stats.exact_positions_count >= 100: unlocks.add("career_100_exact")
    if stats.exact_podiums_count >= 10: unlocks.add("career_10_full_podium")
    if stats.safety_car_hits >= 5: unlocks.add("career_5_sc")
    if stats.safety_car_hits >= 10: unlocks.add("career_10_sc")
    if stats.fastest_lap_hits >= 5: unlocks.add("career_5_fl")
    if stats.fastest_lap_hits >= 10: unlocks.add("career_10_fl")
    if stats.dnf_count_hits >= 5: unlocks.add("career_5_dnf_count")
    if stats.dnf_count_hits >= 10: unlocks.add("career_10_dnf_count")
    if stats.dnf_driver_hits >= 5: unlocks.add("career_5_dnf_driver")
    if stats.dnf_driver_hits >= 10: unlocks.add("career_10_dnf_driver")


    # SEASON (Acumulativo Temporada Actual)
    if stats.current_season_points >= 100: unlocks.add("season_100")
    if stats.current_season_points >= 300: unlocks.add("season_300")
    if stats.current_season_points >= 500: unlocks.add("season_500")
    
    return unlocks

def check_season_finale_achievements(db: Session, user_id: int, season_id: int) -> Set[str]:
    """
    Logros que SOLO se dan al cerrar la temporada (Campeón, Mochila).
    """
    unlocks = set()
    
    stats_all = db.query(UserStats)\
        .filter(UserStats.last_gp_played_id.isnot(None))\
        .order_by(desc(UserStats.current_season_points))\
        .all()
    
    rank = next((i+1 for i, s in enumerate(stats_all) if s.user_id == user_id), 999)
    if rank == 1: unlocks.add("career_champion")
    if rank == 2: unlocks.add("career_runner_up")
    if rank == 3: unlocks.add("career_bronze")

    stat_entry = next((s for s in stats_all if s.user_id == user_id), None)
    if stat_entry:
        tm = db.query(TeamMember).filter(TeamMember.user_id == user_id, TeamMember.season_id == season_id).first()
        if tm:
            mates = db.query(TeamMember.user_id).filter(TeamMember.team_id == tm.team_id, TeamMember.season_id == season_id).all()
            mate_ids = [m[0] for m in mates]
            if len(mate_ids) > 1:
                team_stats = [s for s in stats_all if s.user_id in mate_ids]
                if team_stats:
                    team_pts = [s.current_season_points for s in team_stats]
                    if stat_entry.current_season_points == max(team_pts): unlocks.add("season_squad_leader")
                    if stat_entry.current_season_points == min(team_pts): unlocks.add("season_backpack")
    
    return unlocks

# ==============================================================================
# 3. VERIFICACIÓN HISTÓRICA
# ==============================================================================

def verify_historical_validity(db: Session, user_id: int, slug: str) -> bool:
    def _has_gp_with_exact_hits(n):
        preds = db.query(Prediction).filter(Prediction.user_id == user_id).all()
        for p in preds:
            rr = db.query(RaceResult).filter(RaceResult.gp_id == p.gp_id).first()
            if not rr: continue
            r_pos = {rp.position: rp.driver_name for rp in rr.positions}
            u_pos = {pp.position: pp.driver_name for pp in p.positions}
            hits = sum(1 for i in range(1,21) if r_pos.get(i) == u_pos.get(i))
            if hits >= n: return True
        return False

    if slug == "event_25pts": return db.query(Prediction).filter(Prediction.user_id==user_id, Prediction.points > 25).first() is not None
    if slug == "event_50pts": return db.query(Prediction).filter(Prediction.user_id==user_id, Prediction.points > 50).first() is not None
    if slug == "event_maldonado": return db.query(Prediction).filter(Prediction.user_id==user_id, Prediction.points == 0).first() is not None
    if slug == "event_high_five": return _has_gp_with_exact_hits(5)
    if slug == "event_la_decima": return _has_gp_with_exact_hits(10)
    if slug == "event_join_team": return db.query(TeamMember).filter(TeamMember.user_id == user_id).first() is not None
    if slug == "event_first": return db.query(Prediction).filter(Prediction.user_id == user_id).count() >= 1

    return True

# ==============================================================================
# 4. ORQUESTADOR (SYNC CON PROTECCIÓN DE TEMPORADA + GP ID)
# ==============================================================================

def grant_achievements(
    db: Session, 
    user_id: int, 
    slugs: List[str], 
    season_id: int = None, 
    gp_id: int = None
):
    """
    Otorga logros, guardando el contexto (GP y Season) cuando corresponde.
    """
    # Obtenemos lista de slugs que ya tiene (para comprobar existencia)
    existing_rows = db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
    
    for slug in slugs:
        ach = db.query(Achievement).filter_by(slug=slug).first()
        if not ach: continue

        already_has = False
        
        # Lógica de Duplicados: Un logro solo se otorga una vez en la vida.
        already_has = any(r.achievement_id == ach.id for r in existing_rows)

        if not already_has:
            print(f"🏆 DESBLOQUEADO: {slug}")
            
            # Contexto a guardar
            save_season = season_id
            save_gp = None
            
            if ach.type == AchievementType.EVENT:
                save_gp = gp_id # Guardamos DÓNDE ocurrió
            elif ach.type == AchievementType.CAREER:
                save_gp = gp_id # Guardamos CUÁNDO ocurrió (opcional, pero útil)
            
            db.add(UserAchievement(
                user_id=user_id, 
                achievement_id=ach.id, 
                season_id=save_season,
                gp_id=save_gp
            ))
            
    db.commit()


def sync_achievements(db: Session, user_id: int, current_gp: GrandPrix):
    """
    Sincroniza logros asegurando que NO se borran logros de temporadas pasadas.
    """
    # 1. Stats Actuales
    stats = recalculate_user_stats(db, user_id, current_gp)
    
    # 2. Qué debería tener HOY
    should_have = set()
    should_have.update(check_career_season_achievements(db, user_id, stats))
    should_have.update(check_event_achievements(db, user_id, current_gp))
    
    # 3. GRANT (Pasamos current_gp.id para guardar el contexto)
    grant_achievements(
        db, 
        user_id, 
        list(should_have), 
        season_id=current_gp.season_id,
        gp_id=current_gp.id
    )
    
    # 4. REVOKE (Quitar lo que ya no cumple, CON PROTECCIÓN)
    current_achs_rows = db.query(UserAchievement, Achievement.slug, Achievement.type)\
        .join(Achievement).filter(UserAchievement.user_id == user_id).all()
        
    dynamic_slugs = get_dynamic_slugs()

    for ua, slug, atype in current_achs_rows:
        
        # A) PROTECCIÓN: ¿Es un logro gestionado dinámicamente?
        if slug not in dynamic_slugs:
            continue

        # B) PROTECCIÓN DE TEMPORADA
        if atype == AchievementType.SEASON:
            if ua.season_id is not None and ua.season_id != current_gp.season_id:
                continue # Es un logro histórico, se respeta.
        
        # C) CHECK DE VALIDEZ ACTUAL
        if slug not in should_have:
            must_delete = True
            
            if atype == AchievementType.EVENT:
                if verify_historical_validity(db, user_id, slug):
                    must_delete = False
            
            if must_delete:
                print(f"🚫 REVOCADO: {slug} (Season {ua.season_id})")
                db.delete(ua)
            
    db.commit()

# Entry Points
def evaluate_race_achievements(db: Session, gp_id: int):
    gp = db.query(GrandPrix).get(gp_id)
    if not gp: return
    users = [u[0] for u in db.query(Prediction.user_id).filter(Prediction.gp_id == gp_id).distinct().all()]
    # print(f"🔄 Sync Logros ({gp.name}) para {len(users)} usuarios...")
    for uid in users: sync_achievements(db, uid, gp)

def evaluate_season_finale_achievements(db: Session, season_id: int):
    print(f"🏆 Evaluando Premios Finales Temporada {season_id}...")
    last_gp = db.query(GrandPrix).filter(GrandPrix.season_id == season_id).order_by(desc(GrandPrix.race_datetime)).first()
    if not last_gp: return
    
    all_users = db.query(User).all()
    # 1. Recalcular stats finales
    for user in all_users:
        recalculate_user_stats(db, user.id, last_gp)
        
    # 2. Dar premios finales (gp_id=None porque es de toda la temporada)
    for user in all_users:
        slugs = check_season_finale_achievements(db, user.id, season_id)
        if slugs: 
            grant_achievements(db, user.id, list(slugs), season_id=season_id, gp_id=None)