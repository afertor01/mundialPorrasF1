import axios, { toFormData } from "axios";

const BASE_URL = "http://127.0.0.1:8000";

// ✅ Configuración de AXIOS
const client = axios.create({
  baseURL: BASE_URL,
  paramsSerializer: {
    indexes: null // Esto convierte params=[1,2] en ?params=1&params=2
  }
});

// 🔒 INTERCEPTOR: Inyecta el token automáticamente en cada petición
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  console.log("👮 Interceptor revisando token:", token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==========================================
// 🔐 AUTENTICACIÓN
// ==========================================

export const register = async (data: { email: string; username: string; password: string; acronym: string }) => {
  const res = await client.post(`/auth/register`, data);
  return res.data;
};

export const login = async (identifier: string, password: string) => {
  const res = await client.post(`/auth/login`, toFormData({ username: identifier, password: password }));
  return res.data;
};

// ==========================================
// 📊 ESTADÍSTICAS (Dashboard)
// ==========================================

export const getEvolution = async (season_id: number, type: "users" | "teams", names?: string[], ids?: number[], mode?: string) => {
  const params: any = { season_id, type };
  if (names && names.length > 0) params.names = names;
  if (ids && ids.length > 0) params.ids = ids;
  if (mode) params.mode = mode;

  const res = await client.get(`/stats/evolution`, { params });
  return res.data;
};

export const getRanking = async (season_id: number, type: "users" | "teams", mode?: string, limit?: number) => {
  const params: any = { season_id, type };
  if (mode) params.mode = mode;
  if (limit) params.limit = limit;

  const res = await client.get(`/stats/ranking`, { params });
  return res.data;
};

// ==========================================
// ⚙️ ADMIN - TEMPORADAS
// ==========================================

export const getSeasons = async () => {
  const res = await client.get("/seasons/");
  return res.data;
};

export const createSeason = async (data: { year: number; name: string; is_active: boolean }) => {
  const res = await client.post("/admin/seasons", data);
  return res.data;
};

export const toggleSeason = async (id: number) => {
  const res = await client.patch(`/admin/seasons/${id}/toggle`);
  return res.data;
};

export const deleteSeason = async (id: number) => {
  const res = await client.delete(`/admin/seasons/${id}`);
  return res.data;
};

// ==========================================
// ⚙️ ADMIN - USUARIOS
// ==========================================

export const getUsers = async () => {
  const res = await client.get("/admin/users");
  return res.data;
};

export const createUser = async (data: { email: string; username: string; password: string; role: string; acronym: string }) => {
  const res = await client.post("/admin/users", null, {
    params: data
  });
  return res.data;
};

export const deleteUser = async (user_id: number) => {
  const res = await client.delete(`/admin/users/${user_id}`);
  return res.data;
};

export const updateUser = async (userId: number, role: string, password?: string) => {
  // Enviamos body JSON
  const body: any = { role };
  if (password && password.trim() !== "") {
    body.password = password;
  }
  const res = await client.patch(`/admin/users/${userId}`, body);
  return res.data;
};

// ==========================================
// ⚙️ ADMIN - EQUIPOS DE USUARIOS (ESCUDERÍAS JUGADORES)
// ==========================================

export const getTeams = async (season_id: number) => {
  const res = await client.get(`/seasons/${season_id}/teams`);
  return res.data;
};

export const createTeam = async (season_id: number, name: string) => {
  const res = await client.post(`/admin/seasons/${season_id}/teams`, null, {
    params: { name }
  });
  return res.data;
};

export const addTeamMember = async (team_id: number, user_id: number) => {
  const res = await client.post(`/admin/teams/${team_id}/members`, null, {
    params: { user_id }
  });
  return res.data;
};

export const deleteTeam = async (team_id: number) => {
  const res = await client.delete(`/admin/teams/${team_id}`);
  return res.data;
};

// ==========================================
// ⚙️ ADMIN - GRANDES PREMIOS (GPs)
// ==========================================

export const getGPs = async (season_id: number) => {
  const res = await client.get(`/grand-prix/season/${season_id}`);
  return res.data;
};

export const importGPs = async (season_id: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await client.post(`/admin/seasons/${season_id}/import-gps`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

export const getAdminGPs = async (seasonId?: number) => {
  const url = seasonId ? `/admin/gps?season_id=${seasonId}` : '/admin/gps';
  const res = await client.get(url);
  return res.data;
};

// Crear (Manual)
export const createGP = async (data: { name: string, race_datetime: string, season_id: number }) => {
  const res = await client.post('/admin/gps', null, { params: data });
  return res.data;
};

// Editar
export const updateGP = async (gpId: number, name: string, race_datetime: string, season_id: number) => {
    // Tu backend actual: @router.put("/gps/{gp_id}") recibe parámetros sueltos (query), no un body Pydantic.
    // Así que lo mandamos como params.
    const res = await client.put(`/admin/gps/${gpId}`, null, {
        params: { name, race_datetime, season_id }
    });
    return res.data;
};

// Borrar
export const deleteGP = async (gpId: number) => {
  const res = await client.delete(`/admin/gps/${gpId}`);
  return res.data;
};

// ==========================================
// 🏎️ ADMIN - PARRILLA F1 (Constructores/Pilotos)
// ==========================================

export const getF1Grid = async (season_id: number) => {
    const res = await client.get(`/seasons/${season_id}/constructors`);
    return res.data; 
};

export const createConstructor = async (season_id: number, name: string, color: string) => {
    const res = await client.post(`/admin/seasons/${season_id}/constructors`, null, {
        params: { name, color }
    });
    return res.data;
};

export const createDriver = async (constructor_id: number, code: string, name: string) => {
    const res = await client.post(`/admin/constructors/${constructor_id}/drivers`, null, {
        params: { code, name }
    });
    return res.data;
};

export const deleteConstructor = async (id: number) => {
    return await client.delete(`/admin/constructors/${id}`);
};

export const deleteDriver = async (id: number) => {
    return await client.delete(`/admin/drivers/${id}`);
};

// ==========================================
// ⚙️ ADMIN - RESULTADOS DE CARRERA
// ==========================================

export const saveRaceResult = async (
  gpId: number, 
  positions: Record<number, string>, 
  events: Record<string, string>
) => {
  // Enviamos positions y events en el body
  const res = await client.post(`/admin/results/${gpId}`, { positions, events });
  return res.data;
};

export const getRaceResult = async (gpId: number) => {
  const res = await client.get(`/admin/results/${gpId}`);
  return res.data;
};

export const syncRaceData = async (gpId: number) => {
    const res = await client.post(`/admin/gps/${gpId}/sync`);
    return res.data; // Devolverá { success: true, logs: [...] }
};

export const syncQualyData = async (gpId: number) => {
    const res = await client.post(`/admin/gps/${gpId}/sync-qualy`);
    return res.data; // Devolverá { success: true, logs: [...] }
};

// ==========================================
// 🔮 PREDICCIONES
// ==========================================

export const getMyPrediction = async (gp_id: number) => {
    try {
      const res = await client.get(`/predictions/${gp_id}/me`);
      return res.data; 
    } catch (error) {
      // Si devuelve 404 o null, simplemente retornamos null para que el frontend sepa que no hay predicción
      return null;
    }
};
  
export const savePrediction = async (gp_id: number, positions: Record<number, string>, events: Record<string, string>) => {
    // Enviamos un JSON Body
    const res = await client.post(`/predictions/${gp_id}`, {
        positions,
        events
    });
    return res.data;
};

// ==========================================
// 🏁 ZONA PÚBLICA (Dashboard / Race Control)
// ==========================================

// 1. Obtener predicciones de TODOS los usuarios en un GP (para la tabla del Dashboard)
export const getGpPredictions = async (gpId: number) => {
  // Usamos 'client' que es tu variable configurada, no axiosInstance
  const response = await client.get(`/predictions/${gpId}/all`);
  return response.data;
};

// 2. Obtener resultados oficiales de un GP (Endpoint Público)
// NOTA: Lo llamamos 'getPublicRaceResult' porque ya tienes un 'getRaceResult' en la zona de ADMIN.
export const getPublicRaceResult = async (gpId: number) => {
  try {
    const response = await client.get(`/results/${gpId}`);
    return response.data;
  } catch (error) {
    // Si no hay resultados aún (404), devolvemos null para que el front no explote
    return null;
  }
};

// ==========================================
// 🤝 GESTIÓN DE EQUIPOS (JUGADORES)
// ==========================================

export const getMyTeam = async () => {
    try {
        const res = await client.get("/teams/my-team");
        return res.data;
    } catch (e) {
        // Si devuelve null o 404, retornamos null
        return null;
    }
};

export const createTeamPlayer = async (name: string) => {
    // El backend espera 'name' como query param
    const res = await client.post("/teams/create", null, { params: { name } });
    return res.data;
};

export const joinTeamPlayer = async (code: string) => {
    // El backend espera 'code' como query param
    const res = await client.post("/teams/join", null, { params: { code } });
    return res.data;
};

export const leaveTeamPlayer = async () => {
    const res = await client.delete("/teams/leave");
    return res.data;
};

export const kickTeamMemberAdmin = async (teamId: number, userId: number) => {
    // Usamos el endpoint genérico o creamos uno. 
    // Como no tenemos endpoint específico de admin para kick en el backend que me pasaste,
    // vamos a asumir que añadiste este endpoint en admin.py:
    // @router.delete("/teams/{team_id}/members/{user_id}")
    
    // SI NO TIENES ESE ENDPOINT, avísame. 
    // Por ahora, asumiré que usas esta ruta:
    return client.delete(`/admin/teams/${teamId}/members/${userId}`);
};

// ==========================================
// 🎲 BINGO F1
// ==========================================

export const createBingoTile = async (description: string) => {
  const res = await client.post("/bingo/tile", { description });
  return res.data;
};

export const updateBingoTile = async (id: number, data: { description?: string; is_completed?: boolean }) => {
  const res = await client.put(`/bingo/tile/${id}`, data);
  return res.data;
};

export const deleteBingoTile = async (id: number) => {
  const res = await client.delete(`/bingo/tile/${id}`);
  return res.data;
};

export const getBingoBoard = async () => {
  const res = await client.get("/bingo/board");
  return res.data;
};

export const toggleBingoTile = async (id: number) => {
  const res = await client.post(`/bingo/toggle/${id}`);
  return res.data;
};

export const getBingoStandings = async () => {
  const res = await client.get("/bingo/standings");
  return res.data;
};

// ==========================================
// 🖼️ AVATARES Y PERFIL
// ==========================================

// Obtener mis datos actualizados (Auth)
export const getMe = async () => {
  const res = await client.get("/auth/me");
  return res.data;
};

// Obtener galería de avatares
export const getAvatars = async () => {
  const res = await client.get("/avatars/");
  return res.data;
};

// Cambiar mi avatar
export const updateMyAvatar = async (filename: string) => {
  const res = await client.put(`/avatars/me/${filename}`);
  return res.data;
};

// (Admin) Subir avatar
export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await client.post("/avatars/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

// (Admin) Borrar avatar
export const deleteAvatar = async (avatarId: number) => {
  const res = await client.delete(`/avatars/${avatarId}`);
  return res.data;
};

// ==========================================
// 👤 PERFIL Y CONFIGURACIÓN
// ==========================================

// Actualizar perfil (Username, Email, Password, Acrónimo)
export const updateProfile = async (data: { 
    username?: string; 
    email?: string; 
    acronym?: string; 
    current_password?: string; 
    new_password?: string; 
}) => {
    const res = await client.patch("/auth/me", data);
    return res.data;
};

// ==========================================
// 📊 ESTADÍSTICAS
// ==========================================

export const getMyStats = async () => {
    const res = await client.get("/stats/me");
    return res.data;
};

// Obtener lista ligera de usuarios para el buscador
export const getUsersList = async () => {
    const res = await client.get("/stats/users");
    return res.data;
};

// Obtener stats de OTRO usuario
export const getUserStats = async (userId: number) => {
    const res = await client.get(`/stats/user/${userId}`);
    return res.data;
};

// ==========================================
// 🏆 LOGROS
// ==========================================

export const getAchievements = async (userId?: number) => {
    const url = userId ? `/stats/achievements/${userId}` : `/achievements/`; // Ajusta la ruta base según dónde pusiste el endpoint
    // Nota: Si pusiste el endpoint en stats.py como hice arriba, la ruta es /stats/achievements/user/{id}
    // Si usas el router 'achievements', ajusta la URL.
    const res = await client.get(url);
    return res.data;
};