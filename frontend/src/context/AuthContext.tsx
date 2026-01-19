import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";

export interface AuthContextType {
  token: string | null;
  role: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  login: () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // 1. Cargamos el token directamente del almacenamiento
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  
  // 2. 🔥 AQUÍ ESTÁ EL ARREGLO 🔥
  // En lugar de esperar a un useEffect (que tarda), leemos el rol INMEDIATAMENTE.
  // Así, cuando la página carga, React YA SABE que eres admin y no te expulsa.
  const [role, setRole] = useState<string | null>(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      try {
        const decoded: any = jwtDecode(savedToken);
        return decoded.role;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Este efecto mantiene sincronizado el rol si el token cambia mientras usas la app
  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setRole(decoded.role);
      } catch (e) {
        setRole(null);
      }
    } else {
      setRole(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    // El estado 'role' se actualizará automáticamente por el useEffect de arriba
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};