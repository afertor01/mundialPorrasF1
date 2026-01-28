import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import type { AuthContextType } from "./context/AuthContext";
import { 
  Trophy, 
  Flag, 
  Target, 
  Settings, 
  Home as HomeIcon,
  LogOut
} from "lucide-react";

// Importamos las páginas
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Predictions from "./pages/Predictions";
import RaceControl from "./pages/RaceControl";

// --- RUTAS DE LA APP ---
const AppRoutes = () => {
  const { role } = useContext(AuthContext) as AuthContextType;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/predict" element={<Predictions />} />
      <Route path="/race-control" element={<RaceControl />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={role === "admin" ? <Admin /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

// --- COMPONENTE DE NAVEGACIÓN (CON ESTILOS MEJORADOS) ---
const NavBar = () => {
  const location = useLocation();
  const { token, role, logout } = useContext(AuthContext) as AuthContextType;

  // Función para determinar si el link está activo
  const isActive = (path: string) => location.pathname === path;

  // Clase base para los links
  const linkClass = (path: string) => `
    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200
    ${isActive(path) 
      ? "bg-f1-red text-white shadow-md shadow-red-200" // Activo: Rojo F1 y sombra
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" // Inactivo: Gris y hover suave
    }
  `;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 group">
             {/* Icono animado al hacer hover */}
             <div className="bg-gray-900 text-white p-1.5 rounded-lg group-hover:bg-f1-red transition-colors">
                <Flag size={20} className="italic" />
             </div>
             <span className="text-xl font-black italic tracking-tighter text-gray-900 group-hover:text-f1-red transition-colors">
               F1 <span className="text-f1-red group-hover:text-gray-900">PORRAS</span>
             </span>
          </Link>

          {/* MENÚ DE NAVEGACIÓN (Visible si hay token) */}
          {token && (
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/" className={linkClass("/")}>
                <HomeIcon size={16} /> Inicio
              </Link>
              <Link to="/predict" className={linkClass("/predict")}>
                <Target size={16} /> Jugar
              </Link>
              <Link to="/race-control" className={linkClass("/race-control")}>
                <Flag size={16} /> Race Control
              </Link>
              <Link to="/dashboard" className={linkClass("/dashboard")}>
                <Trophy size={16} /> Clasificación
              </Link>
            </nav>
          )}

          {/* MENÚ DERECHO (Admin / Logout) */}
          <div className="flex items-center gap-3">
            {token ? (
              <>
                {role === "admin" && (
                  <Link 
                    to="/admin" 
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                      isActive("/admin")
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <Settings size={14} /> Admin
                  </Link>
                )}
                {/* Botón Logout (Solo icono en móvil, texto en desktop) */}
                <button 
                  onClick={logout} 
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              // Si no hay token, mostrar Login
              <div className="flex gap-2">
                 <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-f1-red">Login</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MENÚ MÓVIL (Barra inferior scrollable si la pantalla es pequeña) */}
      {token && (
        <div className="md:hidden border-t border-gray-100 overflow-x-auto py-2 px-4 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
              <Link to="/" className={linkClass("/")}>
                <HomeIcon size={16} /> Inicio
              </Link>
              <Link to="/predict" className={linkClass("/predict")}>
                <Target size={16} /> Jugar
              </Link>
              <Link to="/race-control" className={linkClass("/race-control")}>
                <Flag size={16} /> Race Control
              </Link>
              <Link to="/dashboard" className={linkClass("/dashboard")}>
                <Trophy size={16} /> Ranking
              </Link>
          </div>
        </div>
      )}
    </header>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <NavBar />
        <main className="pt-4">
          <AppRoutes />
        </main>
      </div>
    </Router>
  </AuthProvider>
);

export default App;