from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from app.db.session import SessionLocal
from app.core.deps import get_current_user
from app.db.models.prediction import Prediction
from app.db.models.grand_prix import GrandPrix
from app.db.models.user import User
from app.db.models.team import Team
from app.db.models.race_result import RaceResult
from app.db.models.race_position import RacePosition
from app.db.models.race_event import RaceEvent
from app.db.models.prediction_position import PredictionPosition
from app.db.models.prediction_event import PredictionEvent

import statistics
from datetime import datetime, timezone

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/evolution")
def evolution(
    season_id: int,
    type: str = Query(..., pattern="^(users|teams)$"),
    ids: list[int] = Query(None),
    names: list[str] = Query(None),
    mode: str = Query("total", pattern="^(base|total|multiplier)$")
):
    db: Session = SessionLocal()
    response = {}

    try:
        # --- PROCESAMIENTO SEGÚN TIPO ---
        # Hemos eliminado el filtro automático de Top 5 para devolver todos los datos
        # y que el frontend pueda buscar usuarios.

        if type == "users":
            query = db.query(User)
            
            # Aplicar filtros solo si se especifican
            if ids and names:
                query = query.filter(or_(User.id.in_(ids), User.username.in_(names)))
            elif ids:
                query = query.filter(User.id.in_(ids))
            elif names:
                query = query.filter(User.username.in_(names))
            
            # Si no hay filtros, query.all() devuelve TODOS los usuarios (admins incluidos)
            items = query.all()
            
            if not items:
                return {}

            for user in items:
                preds = (
                    db.query(Prediction)
                    .join(GrandPrix)
                    .filter(
                        Prediction.user_id == user.id,
                        GrandPrix.season_id == season_id
                    )
                    .order_by(GrandPrix.race_datetime)
                    .all()
                )

                acc_value = 1.0 if mode == "multiplier" else 0
                evolution_list = []

                for p in preds:
                    if mode == "base":
                        acc_value += p.points_base
                    elif mode == "total":
                        acc_value += p.points
                    elif mode == "multiplier":
                        acc_value *= p.multiplier

                    evolution_list.append({
                        "gp_id": p.gp_id,
                        "value": round(acc_value, 4)
                    })

                response[user.username] = evolution_list

        elif type == "teams":
            query = db.query(Team).filter(Team.season_id == season_id)
            
            if ids and names:
                query = query.filter(or_(Team.id.in_(ids), Team.name.in_(names)))
            elif ids:
                query = query.filter(Team.id.in_(ids))
            elif names:
                query = query.filter(Team.name.in_(names))

            items = query.all()
            if not items:
                return {}

            for team in items:
                member_ids = [tm.user_id for tm in team.members]
                preds = (
                    db.query(Prediction)
                    .join(GrandPrix)
                    .filter(
                        Prediction.user_id.in_(member_ids),
                        GrandPrix.season_id == season_id
                    )
                    .order_by(GrandPrix.race_datetime, Prediction.user_id)
                    .all()
                )

                # Agrupar predicciones por GP
                gp_map = {}
                for p in preds:
                    gp_map.setdefault(p.gp_id, []).append(p)

                acc_value = 1.0 if mode == "multiplier" else 0
                evolution_list = []

                for gp_id in sorted(gp_map.keys()):
                    gp_preds = gp_map[gp_id]

                    if mode == "base":
                        gp_points = sum(p.points_base for p in gp_preds)
                        acc_value += gp_points
                    elif mode == "total":
                        gp_points = sum(p.points for p in gp_preds)
                        acc_value += gp_points
                    elif mode == "multiplier":
                        gp_multiplier = 1.0
                        for p in gp_preds:
                            gp_multiplier *= p.multiplier
                        acc_value *= gp_multiplier

                    evolution_list.append({
                        "gp_id": gp_id,
                        "value": round(acc_value, 4)
                    })

                response[team.name] = evolution_list

        return response

    finally:
        db.close()


@router.get("/ranking")
def ranking(
    season_id: int,
    type: str = Query(..., pattern="^(users|teams)$"),
    mode: str = Query("total", pattern="^(base|total|multiplier)$"),
    limit: int = Query(None)
):
    db: Session = SessionLocal()
    try:
        result = {}

        # Obtener todos los GPs de la temporada
        gps = db.query(GrandPrix).filter(GrandPrix.season_id == season_id).order_by(GrandPrix.race_datetime).all()
        if not gps:
            # Si no hay GPs, devolvemos listas vacías pero estructura válida
            return {"by_gp": {}, "overall": []}

        gp_ids = [gp.id for gp in gps]

        if type == "users":
            users = db.query(User).all()
            if not users:
                 return {"by_gp": {}, "overall": []}

            # Inicializar acumuladores por usuario
            acc = {u.username: 1.0 if mode=="multiplier" else 0 for u in users}

            # Ranking por GP
            ranking_by_gp = {}
            for gp_id in gp_ids:
                preds = db.query(Prediction).filter(Prediction.gp_id==gp_id).all()
                gp_ranking = []
                
                # Crear mapa rápido de predicciones para este GP
                preds_map = {p.user_id: p for p in preds}

                for u in users:
                    p = preds_map.get(u.id)
                    gp_points = 0
                    if mode == "multiplier": gp_points = 1.0

                    if p:
                        if mode == "base":
                            gp_points = p.points_base
                            acc[u.username] += gp_points
                        elif mode == "total":
                            gp_points = p.points
                            acc[u.username] += gp_points
                        elif mode == "multiplier":
                            gp_points = p.multiplier
                            acc[u.username] *= gp_points
                    
                    # Si no hay predicción, el acumulado se mantiene (o suma 0)

                    gp_ranking.append({
                        "name": u.username,
                        "acronym": u.acronym, # <--- Devolvemos el acrónimo
                        "gp_points": gp_points,
                        "accumulated": round(acc[u.username], 4)
                    })

                # Ordenar descendente por acumulado
                gp_ranking.sort(key=lambda x: x["accumulated"], reverse=True)
                if limit:
                    gp_ranking = gp_ranking[:limit]
                ranking_by_gp[gp_id] = gp_ranking

            result["by_gp"] = ranking_by_gp
            
            # Ranking GENERAL final
            overall_list = [
                {
                    "name": u.username, 
                    "acronym": u.acronym, # <--- Devolvemos el acrónimo
                    "accumulated": round(acc[u.username], 4)
                }
                for u in sorted(users, key=lambda u: acc[u.username], reverse=True)
            ]
            
            if limit:
                overall_list = overall_list[:limit]
            
            result["overall"] = overall_list

        elif type == "teams":
            teams = db.query(Team).filter(Team.season_id==season_id).all()
            if not teams:
                 return {"by_gp": {}, "overall": []}

            # Inicializar acumuladores
            acc = {t.name: 1.0 if mode=="multiplier" else 0 for t in teams}
            ranking_by_gp = {}

            for gp_id in gp_ids:
                gp_ranking = []
                for t in teams:
                    member_ids = [tm.user_id for tm in t.members]
                    preds = db.query(Prediction).filter(
                        Prediction.user_id.in_(member_ids),
                        Prediction.gp_id==gp_id
                    ).all()

                    gp_points = 0
                    if mode == "multiplier": gp_points = 1.0

                    if preds:
                        if mode == "base":
                            gp_points = sum(p.points_base for p in preds)
                            acc[t.name] += gp_points
                        elif mode == "total":
                            gp_points = sum(p.points for p in preds)
                            acc[t.name] += gp_points
                        elif mode == "multiplier":
                            for p in preds:
                                gp_points *= p.multiplier
                            acc[t.name] *= gp_points
                    
                    gp_ranking.append({
                        "name": t.name,
                        "gp_points": gp_points,
                        "accumulated": round(acc[t.name], 4)
                    })

                # Ordenar descendente
                gp_ranking.sort(key=lambda x: x["accumulated"], reverse=True)
                if limit:
                    gp_ranking = gp_ranking[:limit]

                ranking_by_gp[gp_id] = gp_ranking

            result["by_gp"] = ranking_by_gp
            result["overall"] = [
                {"name": t.name, "accumulated": round(acc[t.name], 4)}
                for t in sorted(teams, key=lambda t: acc[t.name], reverse=True)
            ][:limit]

        return result
    
    finally:
        db.close()

# --- FUNCIÓN AUXILIAR DE NORMALIZACIÓN ---
def normalize_score(value, min_val, max_val, reverse=False):
    """Escala un valor entre 0 y 100."""
    if max_val == min_val: return 100
    
    # Protección contra división por cero
    denom = max_val - min_val
    if denom == 0: return 100

    if reverse:
        # Para métricas donde "menos es mejor" (Varianza, Tiempo de anticipación invertido?)
        # En anticipación: Más tiempo = Mejor (No reverse)
        # En regularidad (varianza): Menos varianza = Mejor (Reverse = True)
        ratio = (value - min_val) / denom
        score = int((1 - ratio) * 100)
    else:
        # Más es mejor
        score = int(((value - min_val) / denom) * 100)
    
    return max(0, min(100, score)) # Asegurar límites 0-100

@router.get("/me")
def get_my_stats(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        # --- 1. DATOS PRELIMINARES ---
        all_users = db.query(User).all()
        total_gps_in_db = db.query(GrandPrix).count()
        
        # Maps auxiliares
        # Usamos UTC para estandarizar
        gps_data = {gp.id: gp for gp in db.query(GrandPrix).all()}
        gps_dates = {gp.id: gp.race_datetime.replace(tzinfo=timezone.utc) if gp.race_datetime.tzinfo is None else gp.race_datetime for gp in gps_data.values()}

        # Participación por GP
        part_counts = db.query(Prediction.gp_id, func.count(Prediction.user_id)).group_by(Prediction.gp_id).all()
        gp_participation_map = {gp_id: count for gp_id, count in part_counts}

        # Resultados oficiales para Vidente
        official_results = {}
        race_results_db = db.query(RaceResult).all()
        for rr in race_results_db:
            official_results[rr.gp_id] = {
                "positions": {p.position: p.driver_name for p in rr.positions},
                "events": {e.event_type: e.value for e in rr.events}
            }

        # --- 2. CÁLCULO DE MÉTRICAS RAW (EL BUCLE QUE FALTABA) ---
        metrics_raw = []

        for u in all_users:
            u_preds = db.query(Prediction).filter(Prediction.user_id == u.id).all()
            
            if not u_preds:
                continue

            # A. REGULARIDAD (Varianza)
            points_list = [p.points for p in u_preds]
            if len(points_list) < 3:
                regularity_raw = 999999 # Penalización
            else:
                regularity_raw = statistics.variance(points_list)

            # B. COMPROMISO (% Participación desde creación)
            user_created_at = u.created_at.replace(tzinfo=timezone.utc) if u.created_at else datetime.min.replace(tzinfo=timezone.utc)
            relevant_gps_count = 0
            for gp_date in gps_dates.values():
                gp_dt = gp_date if gp_date.tzinfo else gp_date.replace(tzinfo=timezone.utc)
                u_dt = user_created_at if user_created_at.tzinfo else user_created_at.replace(tzinfo=timezone.utc)
                if gp_dt > u_dt:
                    relevant_gps_count += 1
            
            if relevant_gps_count == 0:
                commitment_raw = 1.0 
            else:
                commitment_raw = len(u_preds) / relevant_gps_count

            # C. ANTICIPACIÓN (Tiempo medio)
            deltas = []
            for p in u_preds:
                gp_date = gps_dates.get(p.gp_id)
                if gp_date:
                    p_date = p.updated_at if p.updated_at.tzinfo else p.updated_at.replace(tzinfo=timezone.utc)
                    gp_date = gp_date if gp_date.tzinfo else gp_date.replace(tzinfo=timezone.utc)
                    diff = (gp_date - p_date).total_seconds()
                    deltas.append(max(0, diff))
            anticipation_raw = statistics.mean(deltas) if deltas else 0

            # D. PODIOS PONDERADOS (Calidad)
            weighted_score_sum = 0
            for p in u_preds:
                n_participants = gp_participation_map.get(p.gp_id, 1)
                weighted_score_sum += (p.points * n_participants)
            podium_raw = weighted_score_sum / len(u_preds) if u_preds else 0

            # E. VIDENTE (Aciertos exactos)
            total_hits = 0
            total_possible_hits = 0
            for p in u_preds:
                official = official_results.get(p.gp_id)
                if not official: continue
                
                # Posiciones
                for pp in p.positions:
                    total_possible_hits += 1
                    driver_real = official["positions"].get(pp.position)
                    if driver_real and driver_real == pp.driver_name:
                        total_hits += 1
                # Eventos
                for pe in p.events:
                    total_possible_hits += 1
                    val_real = official["events"].get(pe.event_type)
                    if val_real and val_real.lower() == pe.value.lower():
                        total_hits += 1
            
            vidente_raw = total_hits / total_possible_hits if total_possible_hits > 0 else 0

            metrics_raw.append({
                "id": u.id,
                "reg": regularity_raw,
                "com": commitment_raw,
                "ant": anticipation_raw,
                "pod": podium_raw,
                "vid": vidente_raw
            })

        # --- 3. DATOS PROPIOS BÁSICOS ---
        my_preds = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
        # Ordenar para Momentum
        my_preds_sorted = sorted(my_preds, key=lambda p: gps_dates.get(p.gp_id, datetime.min))
        
        total_points = sum(p.points for p in my_preds)
        races_played = len(my_preds)
        avg_points = round(total_points / races_played, 2) if races_played > 0 else 0

        # --- 4. VITRINA DE TROFEOS ---
        trophies = {"gold": 0, "silver": 0, "bronze": 0}
        for p in my_preds:
            better_than_me = db.query(func.count(Prediction.id)).filter(
                Prediction.gp_id == p.gp_id,
                Prediction.points > p.points
            ).scalar()
            rank = better_than_me + 1
            if rank == 1: trophies["gold"] += 1
            elif rank == 2: trophies["silver"] += 1
            elif rank == 3: trophies["bronze"] += 1

        podium_count = trophies["gold"] + trophies["silver"] + trophies["bronze"]
        podium_ratio_percent = int((podium_count / races_played * 100)) if races_played > 0 else 0


        # --- 5. INSIGHTS (CURIOSIDADES REALES) ---
        insights = {
            "hero": None,
            "villain": None,
            "best_race": None,
            "momentum": 0
        }

        if races_played > 0:
            # A) HÉROE: Piloto más puesto en Top 3 (Podio)
            hero_query = (db.query(PredictionPosition.driver_name, func.count(PredictionPosition.driver_name).label('count'))
                          .join(Prediction)
                          .filter(Prediction.user_id == current_user.id)
                          .filter(PredictionPosition.position <= 3)
                          .group_by(PredictionPosition.driver_name)
                          .order_by(desc('count'))
                          .first())
            if hero_query:
                insights["hero"] = {"code": hero_query[0], "count": hero_query[1]}

            # B) VILLANO: Piloto más puesto en DNF_DRIVER
            villain_query = (db.query(PredictionEvent.value, func.count(PredictionEvent.value).label('count'))
                             .join(Prediction)
                             .filter(Prediction.user_id == current_user.id)
                             .filter(PredictionEvent.event_type == "DNF_DRIVER")
                             .group_by(PredictionEvent.value)
                             .order_by(desc('count'))
                             .first())
            if villain_query:
                insights["villain"] = {"code": villain_query[0], "count": villain_query[1]}

            # C) MEJOR CARRERA (Prime)
            best_pred = max(my_preds, key=lambda p: p.points)
            best_gp = gps_data.get(best_pred.gp_id)
            if best_gp:
                total_in_that_race = gp_participation_map.get(best_pred.gp_id, 1)
                worse_than_me = db.query(func.count(Prediction.id)).filter(
                    Prediction.gp_id == best_pred.gp_id, 
                    Prediction.points < best_pred.points
                ).scalar()
                
                percentile = 100
                if total_in_that_race > 1:
                    percentile_val = (worse_than_me / (total_in_that_race - 1)) * 100
                    percentile = 100 - int(percentile_val)
                    if percentile < 1: percentile = 1 

                insights["best_race"] = {
                    "gp_name": best_gp.name,
                    "year": best_gp.season.year if best_gp.season else 2026,
                    "points": best_pred.points,
                    "percentile": f"Top {percentile}%"
                }

            # D) MOMENTUM (Racha)
            current_streak = 0
            for p in reversed(my_preds_sorted):
                if p.points >= avg_points:
                    current_streak += 1
                else:
                    break 
            insights["momentum"] = current_streak

        # --- 6. CONSTRUCCIÓN DE LA ARAÑA (CON LOS DATOS CALCULADOS) ---
        radar_data = []
        if metrics_raw:
            # Extraer listas para min/max
            regs = [m["reg"] for m in metrics_raw]
            coms = [m["com"] for m in metrics_raw]
            ants = [m["ant"] for m in metrics_raw]
            pods = [m["pod"] for m in metrics_raw]
            vids = [m["vid"] for m in metrics_raw]

            # Buscar mis métricas
            my_m = next((m for m in metrics_raw if m["id"] == current_user.id), None)
            
            if my_m:
                radar_data = [
                {"subject": "Regularidad", "A": normalize_score(my_m["reg"], min(regs), max(regs), reverse=True), "fullMark": 100},
                {"subject": "Compromiso", "A": normalize_score(my_m["com"], min(coms), max(coms)), "fullMark": 100},
                {"subject": "Anticipación", "A": normalize_score(my_m["ant"], min(ants), max(ants)), "fullMark": 100},
                {"subject": "Calidad/Podios", "A": normalize_score(my_m["pod"], min(pods), max(pods)), "fullMark": 100},
                {"subject": "Vidente", "A": normalize_score(my_m["vid"], min(vids), max(vids)), "fullMark": 100}
                ]
        
        # Fallback si no hay datos de nadie
        if not radar_data:
             radar_data = [
                 {"subject": "Regularidad", "A": 0, "fullMark": 100},
                 {"subject": "Compromiso", "A": 0, "fullMark": 100},
                 {"subject": "Anticipación", "A": 0, "fullMark": 100},
                 {"subject": "Calidad/Podios", "A": 0, "fullMark": 100},
                 {"subject": "Vidente", "A": 0, "fullMark": 100}
             ]

        return {
            "total_points": total_points,
            "avg_points": avg_points,
            "races_played": races_played,
            "podium_ratio_percent": podium_ratio_percent,
            "trophies": trophies,
            "radar": radar_data,
            "insights": insights
        }

    finally:
        db.close()