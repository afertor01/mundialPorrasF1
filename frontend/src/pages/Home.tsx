import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Home: React.FC = () => {
  const { token, role, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: "20px" }}>
      <h1>🏎️ Mundial de Porras F1</h1>
      <p>Bienvenido al sistema oficial de gestión del Mundial de Porras de F1.</p>

      {!token ? (
        <div>
          <p>Para acceder a las funcionalidades protegidas, por favor regístrate o inicia sesión:</p>
          <Link to="/login" style={{ marginRight: "10px" }}>Login</Link>
          <Link to="/register">Register</Link>
        </div>
      ) : (
        <div>
          <p>¡Bienvenido de nuevo!</p>
          <p>Tu rol: <strong>{role}</strong></p>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      )}

      <hr style={{ margin: "20px 0" }} />

      <nav>
        <Link to="/dashboard" style={{ marginRight: "10px" }}>Ver Clasificaciones</Link>
        {role === "admin" && <Link to="/admin">Panel Admin</Link>}
      </nav>

      <div style={{ marginTop: "40px" }}>
        <h2>Resumen del sistema</h2>
        <p>
          En esta plataforma podrás consultar rankings y clasificaciones acumuladas, seguir la evolución de tus predicciones GP a GP, 
          y, si eres administrador, registrar temporadas, añadir usuarios, asignar equipos y actualizar resultados reales.
        </p>
      </div>
    </div>
  );
};

export default Home;
