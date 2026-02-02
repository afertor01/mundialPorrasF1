import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import * as API from "../api/api";

export interface AuthContextType {
  token: string | null;
  role: string | null;
  avatar: string | null;
  username: string | null;
  acronym: string | null;       // <--- Nuevo
  createdAt: string | null;     // <--- Nuevo (Ya formateado como texto)
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  avatar: null,
  username: null,
  acronym: null,
  createdAt: null,
  login: () => {},
  logout: () => {},
  refreshProfile: () => {}
});

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  
  // Estado inicial del rol desde el token (para evitar parpadeos)
  const [role, setRole] = useState<string | null>(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      try {
        const decoded: any = jwtDecode(savedToken);
        return decoded.role;
      } catch (e) { return null; }
    }
    return null;
  });

  // Estados del perfil
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [acronym, setAcronym] = useState<string | null>(null); // <--- Nuevo
  const [createdAt, setCreatedAt] = useState<string | null>(null); // <--- Nuevo

  const fetchMe = async () => {
    if (!token) return;
    try {
        const userData = await API.getMe();
        setRole(userData.role);
        setAvatar(userData.avatar);
        setUsername(userData.username);
        setAcronym(userData.acronym); // Guardamos acrónimo
        
        // Formateamos la fecha de creación
        if (userData.created_at) {
            const date = new Date(userData.created_at);
            const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
            // Ejemplo: "febrero 2026"
            const fechaFormateada = formatter.format(date);
            // Capitalizar la primera letra: "Febrero 2026"
            setCreatedAt(fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1));
        }
    } catch (e) {
        console.error("Error cargando perfil", e);
    }
  };

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setRole(decoded.role);
      } catch (e) {
        setRole(null);
      }
      fetchMe();
    } else {
      setRole(null);
      setAvatar(null);
      setUsername(null);
      setAcronym(null);
      setCreatedAt(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setRole(null);
    setAvatar(null);
    setUsername(null);
    setAcronym(null);
    setCreatedAt(null);
  };

  return (
    <AuthContext.Provider value={{ 
        token, role, avatar, username, acronym, createdAt,
        login, logout, refreshProfile: fetchMe 
    }}>
      {children}
    </AuthContext.Provider>
  );
};