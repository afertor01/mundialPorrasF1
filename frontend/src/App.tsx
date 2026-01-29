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
  LogOut,
  Shield, 
  LayoutGrid // <--- NUEVO ICONO PARA BINGO
} from "lucide-react";

// Importamos las páginas
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Predictions from "./pages/Predictions";
import RaceControl from "./pages/RaceControl";
import TeamHQ from "./pages/TeamHQ"; 
import Bingo from "./pages/Bingo"; // <--- IMPORTAR BINGO

// --- PROTECTOR DE RUTAS PRIVADAS ---
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useContext(AuthContext) as AuthContextType;
  return token ? <>{children}</> : <Navigate to="/login" />;
};

// --- RUTAS DE LA APP ---
const AppRoutes = () => {
  const { role } = useContext(AuthContext) as AuthContextType;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* RUTAS PROTEGIDAS */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/predict" element={<PrivateRoute><Predictions /></PrivateRoute>} />
      <Route path="/bingo" element={<PrivateRoute><Bingo /></PrivateRoute>} /> {/* <--- NUEVA RUTA */}
      <Route path="/race-control" element={<PrivateRoute><RaceControl /></PrivateRoute>} />
      <Route path="/team-hq" element={<PrivateRoute><TeamHQ /></PrivateRoute>} />
      
      {/* RUTA ADMIN */}
      <Route path="/admin" element={role === "admin" ? <Admin /> : <Navigate to="/login" />} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

// --- COMPONENTE DE NAVEGACIÓN ---
const NavBar = () => {
  const location = useLocation();
  const { token, role, logout } = useContext(AuthContext) as AuthContextType;

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) => `
    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap
    ${isActive(path) 
      ? "bg-f1-red text-white shadow-md shadow-red-200" 
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" 
    }
  `;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
             <div className="bg-gray-900 text-white p-1.5 rounded-lg group-hover:bg-f1-red transition-colors">
                <Flag size={20} className="italic" />
             </div>
             <span className="text-xl font-black italic tracking-tighter text-gray-900 group-hover:text-f1-red transition-colors hidden sm:inline">
               F1 <span className="text-f1-red group-hover:text-gray-900">PORRAS</span>
             </span>
             <span className="text-xl font-black italic tracking-tighter text-gray-900 sm:hidden">
               F1
             </span>
          </Link>

          {/* MENÚ DE NAVEGACIÓN DESKTOP */}
          {token && (
            <nav className="hidden lg:flex items-center gap-1">
              <Link to="/" className={linkClass("/")}>
                <HomeIcon size={16} /> Inicio
              </Link>
              <Link to="/predict" className={linkClass("/predict")}>
                <Target size={16} /> Jugar
              </Link>
              {/* ENLACE BINGO */}
              <Link to="/bingo" className={linkClass("/bingo")}>
                <LayoutGrid size={16} /> Bingo
              </Link>
              <Link to="/team-hq" className={linkClass("/team-hq")}>
                <Shield size={16} /> Escudería
              </Link>
              <Link to="/race-control" className={linkClass("/race-control")}>
                <Flag size={16} /> Live
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
                    <Settings size={14} /> <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                <button 
                  onClick={logout} 
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                 <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-f1-red px-3 py-2">Login</Link>
                 <Link to="/register" className="text-sm font-bold bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-f1-red transition-colors">Registro</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MENÚ MÓVIL (Barra inferior scrollable) */}
      {token && (
        <div className="lg:hidden border-t border-gray-100 overflow-x-auto py-2 px-4 scrollbar-hide bg-white">
          <div className="flex gap-2 min-w-max">
              <Link to="/" className={linkClass("/")}>
                <HomeIcon size={16} /> Inicio
              </Link>
              <Link to="/predict" className={linkClass("/predict")}>
                <Target size={16} /> Jugar
              </Link>
              {/* ENLACE BINGO MÓVIL */}
              <Link to="/bingo" className={linkClass("/bingo")}>
                <LayoutGrid size={16} /> Bingo
              </Link>
              <Link to="/team-hq" className={linkClass("/team-hq")}>
                <Shield size={16} /> Escudería
              </Link>
              <Link to="/race-control" className={linkClass("/race-control")}>
                <Flag size={16} /> Live
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
        <main className="pt-4 pb-20 lg:pb-10">
          <AppRoutes />
        </main>
      </div>
    </Router>
  </AuthProvider>
);

export default App;