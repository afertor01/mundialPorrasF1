import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register as apiRegister } from "../api/api"; // función axios post a /auth/register

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRegister({ email, username, password });
      alert("Registro exitoso. Ahora puedes iniciar sesión.");
      navigate("/login"); // redirige a login
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al registrar usuario");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
      <h2>Registro</h2>
      <div style={{ marginBottom: "10px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit">Registrarse</button>
    </form>
  );
};

export default Register;
