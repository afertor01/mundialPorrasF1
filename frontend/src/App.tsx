import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import type { AuthContextType } from "./context/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";

const AppRoutes = () => {
  const { role } = useContext(AuthContext) as AuthContextType;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
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
      <nav style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
        <Link to="/" style={{ marginRight: "10px" }}>Home</Link>
        <Link to="/dashboard" style={{ marginRight: "10px" }}>Dashboard</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <AppRoutes />
    </Router>
  </AuthProvider>
);

export default App;
