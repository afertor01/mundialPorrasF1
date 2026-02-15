import json
from datetime import datetime
from typing import Annotated, Dict, List
from app.schemas.shared import DriverPosition, RaceEvent
from fastapi import Depends, HTTPException, UploadFile
from sqlmodel import Session, delete, select, update
from app.db.models.multiplier_config import MultiplierConfigs
from app.db.models.prediction import Predictions
from app.db.models.prediction_event import PredictionEvents
from app.db.models.prediction_position import PredictionPositions
from app.db.models.race_event import RaceEvents
from app.db.models.race_position import RacePositions
from app.schemas.requests import (
    AdminUserUpdateRequest,
    ConstructorCreateRequest,
    DriverCreateRequest,
    GrandPrixCreateRequest,
    SeasonCreateRequest,
    UserCreateRequest,
    GrandPrixUpdateRequest,
    AdminTeamCreateRequest,
    UpdateRaceResultRequest,
    UpdateRacePredictionRequest,
    TeamMemberCreateRequest,
)
from app.schemas.responses import AdminRaceResultResponse
from app.utils.scoring import calculate_prediction_score
from app.db.session import get_session
from app.db.models.season import Seasons
from app.db.models.user import Users
from app.db.models.grand_prix import GrandPrix
from app.db.models.team import Teams
from app.db.models.team_member import TeamMembers
from app.db.models.constructor import Constructors
from app.db.models.driver import Drivers
from app.db.models.race_result import RaceResults
from app.core.security import hash_password
from app.utils.f1_sync import sync_qualy_results, sync_race_data_manual
from app.core.deps import generate_join_code

SessionDep = Annotated[Session, Depends(get_session)]


class AdminRepository:

    def __init__(self, session: SessionDep):
        self.session = session

    def list_users(self) -> List[Users]:
        query = select(Users)
        users = self.session.exec(query).all()

        return users

    def create_user(
        self,
        user_data: UserCreateRequest,
    ) -> Users:
        # 1. Validar duplicados
        query = select(Users).where(
            (Users.email == user_data.email)
            | (Users.username == user_data.username)
            | (Users.acronym == user_data.acronym.upper())
        )
        existing = self.session.exec(query).first()
        if existing:
            raise HTTPException(
                status_code=400, detail="Email, usuario o acrónimo ya están registrados"
            )

        # 2. Validar longitud acrónimo
        if len(user_data.acronym) > 3:
            raise HTTPException(
                400, "El acrónimo debe ser de máx 3 letras"
            )  # Maybe se puede quitar, se chequea en el frontend

        # 3. Crear usuario
        user = Users(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hash_password(user_data.password),
            role=user_data.role,
            acronym=user_data.acronym.upper(),  # <--- GUARDARLO (Siempre mayúsculas)
        )
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)

        return user

    def delete_user(self, user_id: int) -> Dict[str, str]:
        query = select(Users).where(Users.id == user_id)
        user = self.session.exec(query).first()
        if not user:
            raise HTTPException(404, "Usuario no encontrado")
        self.session.delete(user)
        self.session.commit()

        return {"message": "Usuario eliminado"}

    def update_user(
        self,
        user_data: AdminUserUpdateRequest,
    ) -> Users:
        query = select(Users).where(Users.id == user_data.user_id)
        user = self.session.exec(query).first()

        if not user:
            raise HTTPException(404, "Usuario no encontrado")

        # 1. Actualizar Rol
        user.role = user_data.role

        # 2. Actualizar Contraseña (solo si viene en el JSON)
        if user_data.password and user_data.password.strip():
            user.hashed_password = hash_password(user_data.password)

        self.session.commit()

        return user

    # -----------------------
    # Temporadas
    # -----------------------
    def list_seasons(self) -> List[Seasons]:
        query = select(Seasons)
        seasons = self.session.exec(query).all()

        return seasons

    def create_season(
        self,
        season: SeasonCreateRequest,
    ) -> Seasons:

        # Comprobar si ya existe temporada con ese año (usamos season.year)
        query = select(Seasons).where(Seasons.year == season.year)
        existing = self.session.exec(query).first()
        if existing:
            raise HTTPException(
                400, f"Ya existe una temporada con el año {season.year}"
            )

        # Si is_active es True, desactivar otras temporadas (usamos season.is_active)
        if season.is_active:
            query = (
                update(Seasons).where(Seasons.is_active == True).values(is_active=False)
            )
            self.session.exec(query)

        # Creamos el modelo de base de datos usando los datos del esquema
        new_season = Seasons(
            year=season.year, name=season.name, is_active=season.is_active
        )

        self.session.add(new_season)
        self.session.commit()
        self.session.refresh(new_season)

        return new_season

    def delete_season(self, season_id: int) -> Dict[str, str]:
        query = select(Seasons).where(Seasons.id == season_id)
        season = self.session.exec(query).first()
        if not season:
            raise HTTPException(404, "Temporada no encontrada")
        self.session.delete(season)
        self.session.commit()

        return {"message": "Temporada eliminada"}

    def toggle_season_active(self, season_id: int) -> Seasons:
        query = select(Seasons).where(Seasons.id == season_id)
        season = self.session.exec(query).first()

        if not season:
            raise HTTPException(404, "Temporada no encontrada")

        season.is_active = not season.is_active  # Alternamos el estado actual

        # Si la vamos a activar, desactivamos TODAS las demás primero
        if season.is_active:
            query = update(Seasons).values(is_active=False)
            self.session.exec(query)

        self.session.commit()

        return season

    # -----------------------
    # Gran Premio
    # -----------------------
    def create_grand_prix(self, gp_data: GrandPrixCreateRequest) -> GrandPrix:
        season = self.session.get(Seasons, gp_data.season_id)

        if not season:
            raise HTTPException(404, "Temporada no encontrada")

        query = select(GrandPrix).where(
            GrandPrix.season_id == gp_data.season_id, GrandPrix.name == gp_data.name
        )
        existing_gp = self.session.exec(query).first()
        if existing_gp:
            raise HTTPException(
                400, f"Ya existe un GP con el nombre '{gp_data.name}' en esta temporada"
            )

        gp = GrandPrix(**gp_data.model_dump())
        self.session.add(gp)
        self.session.commit()
        self.session.refresh(gp)

        return gp

    def get_admin_gps_list(self, season_id: int = None) -> List[GrandPrix]:
        """
        Lista los GPs para la tabla de administración.
        Ordenados por FECHA (ya que no existe el campo 'round').
        """

        query = select(GrandPrix)

        if season_id:
            query = query.where(GrandPrix.season_id == season_id)

        # Ordenamos por fecha
        query = query.order_by(GrandPrix.race_datetime.asc())
        gps = self.session.exec(query).all()

        return gps

    def update_gp(self, gp_data: GrandPrixUpdateRequest) -> GrandPrix:
        """
        Edita nombre y fecha SIN tocar el ID.
        Las predicciones NO se pierden.
        """
        gp = self.session.get(GrandPrix, gp_data.id)
        if not gp:
            raise HTTPException(404, "GP no encontrado")

        if gp_data.season_id:
            query = select(Seasons).where(Seasons.id == gp_data.season_id)
            season = self.session.exec(query).first()
            if not season:
                raise HTTPException(404, "Temporada no encontrada")

        if gp_data.name:
            query = select(GrandPrix).where(
                GrandPrix.season_id == gp_data.season_id,
                GrandPrix.name == gp_data.name,
                GrandPrix.id != gp_data.id,
            )
            existing_gp = self.session.exec(query).first()
            if existing_gp:
                raise HTTPException(
                    400,
                    f"Ya existe un GP con el nombre '{gp_data.name}' en esta temporada",
                )

        gp.name = gp_data.name or gp.name
        gp.race_datetime = gp_data.race_datetime or gp.race_datetime
        gp.season_id = gp_data.season_id or gp.season_id

        self.session.commit()
        self.session.refresh(gp)

        return gp

    def delete_gp(self, gp_id: int) -> Dict[str, str]:
        """
        Borra el GP.
        ATENCIÓN: Si no tienes CASCADE configurado en la BD,
        habría que borrar las predicciones manualmente antes.
        """

        gp = self.session.get(GrandPrix, gp_id)

        if not gp:
            raise HTTPException(404, "GP no encontrado")

        self.session.delete(gp)
        self.session.commit()

        return {"message": "GP eliminado correctamente"}

    # -----------------------
    # Carga Masiva de GPs
    # -----------------------
    async def import_gps(
        self,
        season_id: int,
        file: UploadFile,
    ) -> Dict[str, str]:
        """
        Carga un JSON de GPs.
        - Si el GP (por nombre) ya existe en la temporada: ACTUALIZA su fecha.
        - Si no existe: LO CREA.
        """

        season = self.session.get(Seasons, season_id)
        if not season:
            raise HTTPException(404, "Temporada no encontrada")

        try:
            content = await file.read()
            data = json.loads(content)

            created_count = 0
            updated_count = 0

            for item in data:
                # Parsear fecha (asumiendo ISO format)
                try:
                    race_dt = datetime.fromisoformat(item["race_datetime"])
                except ValueError:
                    # Si falla el formato, saltamos o lanzamos error.
                    # Aquí optamos por saltar para no bloquear todo el archivo.
                    continue

                # Buscar si ya existe este GP en esta temporada
                query = select(GrandPrix).where(
                    GrandPrix.season_id == season_id, GrandPrix.name == item["name"]
                )
                existing_gp = self.session.exec(query).first()

                if existing_gp:
                    # --- ACTUALIZAR (Sobreescribir fecha) ---
                    existing_gp.race_datetime = race_dt
                    updated_count += 1
                else:
                    # --- CREAR NUEVO ---
                    gp = GrandPrix(
                        name=item["name"], race_datetime=race_dt, season_id=season_id
                    )
                    self.session.add(gp)
                    created_count += 1

            self.session.commit()

            return {
                "message": f"Proceso completado: {created_count} creados, {updated_count} actualizados."
            }

        except Exception as e:
            self.session.rollback()
            raise HTTPException(400, f"Error procesando archivo: {str(e)}")

    # -----------------------
    # Resultados de GP
    # -----------------------

    def get_race_result_admin(self, gp_id: int) -> AdminRaceResultResponse | None:

        # Buscar si existe resultado
        query = select(RaceResults).where(RaceResults.gp_id == gp_id)
        result = self.session.exec(query).first()

        if not result:
            # Devolvemos null/vacío para indicar que no hay datos
            return None

        # Formatear posiciones: {1: "VER", 2: "ALO"...}
        positions = [
            DriverPosition(position=p.position, driver_code=p.driver_name)
            for p in result.positions
        ]

        # Formatear eventos: {"FASTEST_LAP": "VER", ...}
        events = [
            RaceEvent(type=e.event_type, description=e.value) for e in result.events
        ]

        return AdminRaceResultResponse(positions=positions, events=events)

    def update_race_result(
        self, race_result_data: UpdateRaceResultRequest
    ) -> Dict[str, str]:
        gp = self.session.get(GrandPrix, race_result_data.gp_id)

        if not gp:
            raise HTTPException(404, "GP no encontrado")

        # Comprobar si ya hay resultado
        query = select(RaceResults).where(RaceResults.gp_id == race_result_data.gp_id)
        result = self.session.exec(query).first()

        if not result:
            result = RaceResults(gp_id=race_result_data.gp_id)
            self.session.add(result)
            self.session.flush()

        # Borrar posiciones y eventos anterioresç
        query = delete(RacePositions).where(RacePositions.race_result_id == result.id)
        self.session.exec(query)
        query = delete(RaceEvents).where(RaceEvents.race_result_id == result.id)
        self.session.exec(query)

        # Guardar posiciones
        for position in race_result_data.positions:
            race_position = RacePositions(
                race_result_id=result.id,
                position=position.position,
                driver_name=position.driver_code,
            )
            self.session.add(race_position)

        # Guardar eventos
        for event in race_result_data.events:
            race_event = RaceEvents(
                race_result_id=result.id, event_type=event.type, value=event.description
            )
            self.session.add(race_event)

        self.session.commit()

        # -------------------------
        # 🔥 Calcular puntuaciones automáticamente
        # -------------------------
        query = select(Predictions).where(Predictions.gp_id == race_result_data.gp_id)
        predictions = self.session.exec(query).all()

        season_id = gp.season_id
        query = select(MultiplierConfigs).where(
            MultiplierConfigs.season_id == season_id
        )
        multipliers = self.session.exec(query).all()

        for prediction in predictions:
            result_score = calculate_prediction_score(prediction, result, multipliers)
            prediction.points = result_score["final_points"]
            prediction.points_base = result_score["base_points"]
            prediction.multiplier = result_score["multiplier"]

        self.session.commit()

        return {
            "message": "Resultado guardado y puntuaciones calculadas automáticamente"
        }

    def update_prediction_admin(
        self, prediction_data: UpdateRacePredictionRequest
    ) -> Dict[str, str]:

        # Comprobar si el usuario existe
        user = self.session.get(Users, prediction_data.user_id)
        if not user:
            raise HTTPException(404, "Usuario no encontrado")

        gp = self.session.get(GrandPrix, prediction_data.gp_id)
        if not gp:
            raise HTTPException(404, "GP no encontrado")

        # Comprobar si ya hay predicción
        query = select(Predictions).where(
            Predictions.user_id == prediction_data.user_id,
            Predictions.gp_id == prediction_data.gp_id,
        )
        prediction = self.session.exec(query).first()

        if not prediction:
            prediction = Predictions(
                user_id=prediction_data.user_id, gp_id=prediction_data.gp_id
            )
            self.session.add(prediction)
            self.session.flush()

        # Borrar datos anteriores
        query = delete(PredictionPositions).where(
            PredictionPositions.prediction_id == prediction.id
        )
        self.session.exec(query)
        query = delete(PredictionEvents).where(
            PredictionEvents.prediction_id == prediction.id
        )
        self.session.exec(query)

        # Guardar posiciones
        for position in prediction_data.positions:
            prediction_position = PredictionPositions(
                prediction_id=prediction.id,
                position=position.position,
                driver_name=position.driver_code,
            )
            self.session.add(prediction_position)

        # Guardar eventos
        for event in prediction_data.events:
            prediction_event = PredictionEvents(
                prediction_id=prediction.id,
                event_type=event.type,
                value=event.description,
            )
            self.session.add(prediction_event)

        self.session.commit()
        self.session.close()

        return {"message": "Predicción guardada"}

    def sync_gp_data(self, gp_id: int) -> Dict[str, bool | List[str]]:
        """
        Dispara la sincronización manual con FastF1 y devuelve los logs.
        """

        success, logs = sync_race_data_manual(self.session, gp_id)

        return {"success": success, "logs": logs}

    def sync_gp_qualy(self, gp_id: int) -> Dict[str, bool | List[str]]:
        """
        Sincroniza los resultados de la CLASIFICACIÓN (Sábado) usando FastF1.
        """
        result = sync_qualy_results(self.session, gp_id)

        if not result["success"]:
            raise HTTPException(
                status_code=400, detail=result.get("error", "Error syncing qualy")
            )

        return result

    # -----------------------
    # Gestión de Escuderías (Teams)
    # -----------------------
    def list_teams(self, season_id: int) -> List[Dict[str, int | str | List[str]]]:
        query = select(Teams).where(Teams.season_id == season_id)
        teams = self.session.exec(query).all()

        # Enriquecemos la respuesta con los nombres de los miembros
        result = []
        for t in teams:
            members = [m.user.username for m in t.members]
            result.append({"id": t.id, "name": t.name, "members": members})

        return result

    def create_team(self, team_data: AdminTeamCreateRequest) -> Teams:
        query = select(Teams).where(
            Teams.name == team_data.name, Teams.season_id == team_data.season_id
        )
        existing_team = self.session.exec(query).first()
        if existing_team:
            raise HTTPException(
                400, "Ya existe una escudería con ese nombre en esta temporada"
            )

        query = select(Teams.join_code).where(Teams.season_id == team_data.season_id)
        existing_codes = (code for code, in self.session.exec(query).all())
        while join_code := generate_join_code() in existing_codes:
            continue

        team = Teams(
            name=team_data.name, season_id=team_data.season_id, join_code=join_code
        )
        self.session.add(team)
        self.session.commit()
        self.session.refresh(team)

        return team

    def add_team_member(
        self, team_member_data: TeamMemberCreateRequest
    ) -> Dict[str, str]:

        team = self.session.get(Teams, team_member_data.team_id)
        if not team:
            raise HTTPException(404, "Equipo no encontrado")

        # 1. Validar si el equipo ya tiene 2 miembros
        if len(team.members) >= 2:
            raise HTTPException(400, "El equipo ya está completo (máx 2)")

        # 2. Validar si el usuario ya está en OTRO equipo esta temporada
        query = select(TeamMembers).where(
            TeamMembers.user_id == team_member_data.user_id,
            TeamMembers.season_id == team.season_id,
        )
        existing_membership = self.session.exec(query).first()
        if existing_membership:
            raise HTTPException(
                400, "El usuario ya pertenece a una escudería esta temporada"
            )

        new_member = TeamMembers(
            team_id=team_member_data.team_id,
            user_id=team_member_data.user_id,
            season_id=team.season_id,
        )

        self.session.add(new_member)
        self.session.commit()

        return {"message": "Usuario añadido al equipo"}

    def remove_team_member(self, team_id: int, user_id: int) -> Dict[str, str]:
        """
        Expulsa a un usuario específico de un equipo.
        """

        # Buscar la membresía específica
        query = select(TeamMembers).where(
            TeamMembers.team_id == team_id, TeamMembers.user_id == user_id
        )
        membership = self.session.exec(query).first()

        if not membership:
            raise HTTPException(
                status_code=404, detail="El usuario no es miembro de este equipo"
            )

        # Borrar la relación
        self.session.delete(membership)
        self.session.commit()

        return {"message": "Usuario expulsado del equipo"}

    def delete_team(self, team_id: int) -> Dict[str, str]:
        team = self.session.get(Teams, team_id)
        if not team:
            raise HTTPException(404)

        # Borrar miembros primero (cascade manual si no está configurado en DB)
        self.session.delete(team)
        self.session.commit()

        return {"message": "Equipo eliminado"}

    # -----------------------
    # GESTIÓN PARRILLA F1 (Constructores y Pilotos)
    # -----------------------

    def list_constructors(
        self, season_id: int
    ) -> List[Dict[str, int | str | List[Dict[str, int | str]]]]:
        query = select(Constructors).where(Constructors.season_id == season_id)
        constructors = self.session.exec(query).all()

        result = []
        for c in constructors:
            result.append(
                {
                    "id": c.id,
                    "name": c.name,
                    "color": c.color,
                    "drivers": [
                        {"id": d.id, "code": d.code, "name": d.name} for d in c.drivers
                    ],
                }
            )

        return result

    def create_constructor(
        self, constructor_data: ConstructorCreateRequest
    ) -> Constructors:
        # Verificar duplicado
        query = select(Constructors).where(
            Constructors.season_id == constructor_data.season_id,
            Constructors.name == constructor_data.name,
        )
        exists = self.session.exec(query).first()
        if exists:
            raise HTTPException(400, "Ya existe esa escudería en esta temporada")

        new_c = Constructors(**constructor_data.model_dump())
        self.session.add(new_c)
        self.session.commit()
        self.session.refresh(new_c)

        return new_c

    def create_driver(self, driver_data: DriverCreateRequest) -> Drivers:
        driver = Drivers(
            code=driver_data.code.upper(),
            name=driver_data.name,
            constructor_id=driver_data.constructor_id,
        )
        self.session.add(driver)
        self.session.commit()
        self.session.refresh(driver)

        return driver

    def delete_constructor(self, id: int) -> Dict[str, str]:
        constructor = self.session.get(Constructors, id)
        if not constructor:
            raise HTTPException(404, "Constructor no encontrado")

        self.session.delete(constructor)
        self.session.commit()

        return {"message": "Constructor eliminado"}

    def delete_driver(self, id: int) -> Dict[str, str]:
        driver = self.session.get(Drivers, id)
        if not driver:
            raise HTTPException(404, "Piloto no encontrado")

        self.session.delete(driver)
        self.session.commit()

        return {"message": "Piloto eliminado"}
