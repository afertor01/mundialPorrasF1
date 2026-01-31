import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import * as API from "../api/api"; // <--- Importamos la API

export interface AuthContextType {
  token: string | null;
  role: string | null;
  avatar: string | null;      // <--- Nuevo campo
  username: string | null;    // <--- Nuevo campo
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => void; // <--- Función para recargar si cambias de foto
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  avatar: null,
  username: null,
  login: () => {},
  logout: () => {},
  refreshProfile: () => {}
});

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // 1. Cargamos el token
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  
  // 2. Estado inicial del rol (Optimización para no esperar a la API en la primera carga)
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

  // 3. Nuevos estados para Perfil
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // --- FUNCIÓN PARA TRAER DATOS FRESCOS DEL USUARIO ---
  const fetchMe = async () => {
    if (!token) return;
    try {
        const userData = await API.getMe(); // Llama al backend /auth/me
        setRole(userData.role);         // Actualizamos rol (por seguridad)
        setAvatar(userData.avatar);     // <--- AQUÍ GUARDAMOS EL AVATAR
        setUsername(userData.username);
    } catch (e) {
        console.error("Error cargando perfil", e);
        // Si el token es inválido, podríamos hacer logout aquí, 
        // pero por ahora lo dejamos pasar para no ser intrusivos
    }
  };

  // Efecto: Cuando cambia el token, intentamos cargar el perfil completo
  useEffect(() => {
    if (token) {
      // 1. Decodificar básico (síncrono)
      try {
        const decoded: any = jwtDecode(token);
        setRole(decoded.role);
      } catch (e) {
        setRole(null);
      }
      // 2. Cargar datos completos (asíncrono: avatar, username, etc)
      fetchMe();
    } else {
      setRole(null);
      setAvatar(null);
      setUsername(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    // El useEffect se disparará y llamará a fetchMe() automáticamente
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setRole(null);
    setAvatar(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ 
        token, 
        role, 
        avatar,    // <--- Pasamos el avatar a toda la app
        username, 
        login, 
        logout, 
        refreshProfile: fetchMe // <--- Exponemos la función para usarla en Profile.tsx
    }}>
      {children}
    </AuthContext.Provider>
  );
};