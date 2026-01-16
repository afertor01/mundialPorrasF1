import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import type { AuthContextType } from "./context/AuthContext";

// Importamos las páginas
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Predictions from "./pages/Predictions"; // 👈 Asegúrate de importar esto

const AppRoutes = () => {
  const { role } = useContext(AuthContext) as AuthContextType;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* 👇 La ruta para hacer predicciones 👇 */}
      <Route path="/predict" element={<Predictions />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={role === "admin" ? <Admin /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <nav style={{ padding: "15px", borderBottom: "1px solid #ccc", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff" }}>
        
        <div style={{display: "flex", gap: "20px", alignItems: "center"}}>
          <Link to="/" style={{ textDecoration: "none", fontWeight: "bold", fontSize: "1.2rem", color: "#e10600" }}>
            🏎️ F1 Porras
          </Link>
          
          {/* 👇 AQUÍ ESTÁ EL ENLACE QUE TE FALTABA 👇 */}
          <Link to="/predict" style={{ textDecoration: "none", color: "#333", fontWeight: "bold" }}>
             🎯 Jugar Porra
          </Link>

          <Link to="/dashboard" style={{ textDecoration: "none", color: "#333" }}>
             📊 Clasificación
          </Link>
        </div>

        <div>
          <Link to="/admin" style={{ textDecoration: "none", color: "#007bff", fontWeight: "bold" }}>
             ⚙️ Admin
          </Link>
        </div>

      </nav>
      <div style={{paddingTop: 10}}>
        <AppRoutes />
      </div>
    </Router>
  </AuthProvider>
);

export default App;