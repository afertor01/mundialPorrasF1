from fastapi import APIRouter, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import SessionLocal
from app.db.models.prediction import Prediction
from app.db.models.grand_prix import GrandPrix
from app.db.models.user import User
from app.db.models.team import Team

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/evolution")
def evolution(
    season_id: int,
    type: str = Query(..., regex="^(users|teams)$"),
    ids: list[int] = Query(None),
    names: list[str] = Query(None),
    mode: str = Query("total", regex="^(base|total|multiplier)$")
):
    if not ids and not names:
        raise HTTPException(status_code=400, detail="Se requiere al menos ids o names")

    db: Session = SessionLocal()
    response = {}

    if type == "users":
        query = db.query(User)
        if ids and names:
            query = query.filter(or_(User.id.in_(ids), User.username.in_(names)))
        elif ids:
            query = query.filter(User.id.in_(ids))
        elif names:
            query = query.filter(User.username.in_(names))

        items = query.all()
        if not items:
            db.close()
            raise HTTPException(status_code=404, detail="Usuarios no encontrados")

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
            db.close()
            raise HTTPException(status_code=404, detail="Escuderías no encontradas")

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

    db.close()
    return response

@router.get("/ranking")
def ranking(
    season_id: int,
    type: str = Query(..., regex="^(users|teams)$"),
    mode: str = Query("total", regex="^(base|total|multiplier)$"),
    limit: int = Query(None)
):
    db: Session = SessionLocal()
    result = {}

    # Obtener todos los GPs de la temporada
    gps = db.query(GrandPrix).filter(GrandPrix.season_id == season_id).order_by(GrandPrix.race_datetime).all()
    if not gps:
        db.close()
        raise HTTPException(status_code=404, detail="No hay GPs para esta temporada")

    gp_ids = [gp.id for gp in gps]

    if type == "users":
        users = db.query(User).all()
        if not users:
            db.close()
            raise HTTPException(status_code=404, detail="No hay usuarios en la temporada")

        # Inicializar acumuladores por usuario
        acc = {u.username: 1.0 if mode=="multiplier" else 0 for u in users}

        # Ranking por GP
        ranking_by_gp = {}
        for gp_id in gp_ids:
            preds = db.query(Prediction).filter(Prediction.gp_id==gp_id).all()
            gp_ranking = []
            for p in preds:
                if mode == "base":
                    gp_points = p.points_base
                    acc[p.user.username] += gp_points
                elif mode == "total":
                    gp_points = p.points
                    acc[p.user.username] += gp_points
                elif mode == "multiplier":
                    gp_points = p.multiplier
                    acc[p.user.username] *= gp_points

                gp_ranking.append({
                    "name": p.user.username,
                    "gp_points": gp_points,
                    "accumulated": round(acc[p.user.username],4)
                })

            # Ordenar descendente
            gp_ranking.sort(key=lambda x: x["accumulated"], reverse=True)
            if limit:
                gp_ranking = gp_ranking[:limit]
            ranking_by_gp[gp_id] = gp_ranking

        result["by_gp"] = ranking_by_gp
        result["overall"] = [
            {"name": u.username, "accumulated": round(acc[u.username],4)}
            for u in sorted(users, key=lambda u: acc[u.username], reverse=True)
        ][:limit]

    elif type == "teams":
        teams = db.query(Team).filter(Team.season_id==season_id).all()
        if not teams:
            db.close()
            raise HTTPException(status_code=404, detail="No hay escuderías en la temporada")

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

                if not preds:
                    continue

                if mode == "base":
                    gp_points = sum(p.points_base for p in preds)
                    acc[t.name] += gp_points
                elif mode == "total":
                    gp_points = sum(p.points for p in preds)
                    acc[t.name] += gp_points
                elif mode == "multiplier":
                    gp_points = 1.0
                    for p in preds:
                        gp_points *= p.multiplier
                    acc[t.name] *= gp_points

                gp_ranking.append({
                    "name": t.name,
                    "gp_points": gp_points,
                    "accumulated": round(acc[t.name],4)
                })

            # Ordenar descendente
            gp_ranking.sort(key=lambda x: x["accumulated"], reverse=True)
            if limit:
                gp_ranking = gp_ranking[:limit]

            ranking_by_gp[gp_id] = gp_ranking

        result["by_gp"] = ranking_by_gp
        result["overall"] = [
            {"name": t.name, "accumulated": round(acc[t.name],4)}
            for t in sorted(teams, key=lambda t: acc[t.name], reverse=True)
        ][:limit]

    db.close()
    return result