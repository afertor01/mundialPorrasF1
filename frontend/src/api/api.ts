import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

export const getEvolution = async (season_id: number, type: "users" | "teams", names?: string[], ids?: number[], mode?: string) => {
  const params: any = { season_id, type };
  if (names) params.names = names.join(",");
  if (ids) params.ids = ids.join(",");
  if (mode) params.mode = mode;

  const res = await axios.get(`${BASE_URL}/stats/evolution`, { params });
  return res.data;
};

export const getRanking = async (season_id: number, type: "users" | "teams", mode?: string, limit?: number) => {
  const params: any = { season_id, type };
  if (mode) params.mode = mode;
  if (limit) params.limit = limit;

  const res = await axios.get(`${BASE_URL}/stats/ranking`, { params });
  return res.data;
};

export const register = async (data: { email: string; username: string; password: string }) => {
  const res = await axios.post(`${BASE_URL}/auth/register`, data);
  return res.data;
};

export const login = async (email: string, password: string) => {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return res.data;
};