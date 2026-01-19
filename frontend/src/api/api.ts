import axios from "axios";

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

export const login = async (email: string, password: string) => {
  const res = await client.post(`/auth/login`, { email, password });
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
  const res = await client.get("/admin/seasons");
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

// ==========================================
// ⚙️ ADMIN - EQUIPOS DE USUARIOS (ESCUDERÍAS JUGADORES)
// ==========================================

export const getTeams = async (season_id: number) => {
  const res = await client.get(`/admin/seasons/${season_id}/teams`);
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

// ==========================================
// 🏎️ ADMIN - PARRILLA F1 (Constructores/Pilotos)
// ==========================================

export const getF1Grid = async (season_id: number) => {
    const res = await client.get(`/admin/seasons/${season_id}/constructors`);
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