import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register as apiRegister } from "../api/api"; // Importamos correctamente

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [acronym, setAcronym] = useState(""); // Estado para el acrónimo
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          // CORREGIDO: Usamos 'apiRegister', no 'API.register'
          await apiRegister({ email, username, password, acronym });
          alert("Usuario registrado correctamente. ¡Ahora inicia sesión!");
          navigate("/login");
      } catch (err: any) {
          console.error(err);
          alert("Error: " + (err.response?.data?.detail || "Error en el registro"));
      }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Registro</h2>
      
      <div style={{ marginBottom: "10px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "8px" }}
        />
      </div>
      
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      {/* 👇 ESTO ES LO QUE FALTABA EN TU ARCHIVO SUBIDO */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text" 
          placeholder="Acrónimo (3 letras, ej: ALO)" 
          maxLength={3}
          value={acronym}
          onChange={e => setAcronym(e.target.value.toUpperCase())}
          required
          style={{ width: "100%", padding: "8px" }}
        />
      </div>
      {/* 👆 ------------------------------------------ */}

      <div style={{ marginBottom: "10px" }}>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: "8px" }}
        />
      </div>
      
      <button type="submit" style={{ width: "100%", padding: "10px", cursor: "pointer" }}>
        Registrarse
      </button>
    </form>
  );
};

export default Register;