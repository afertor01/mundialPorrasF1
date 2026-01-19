import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import type { AuthContextType } from "../context/AuthContext";
import { login as apiLogin } from "../api/api"; // crea función axios post a /auth/login
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext) as AuthContextType;
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiLogin(identifier, password);
      login(res.access_token);
      navigate("/dashboard");
    } catch (err) {
      alert("Credenciales incorrectas");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
      <h2>Login</h2>
      {/* 👇 Actualizamos el placeholder y el value */}
      <input 
        type="text" // Cambiamos type="email" a "text" para que no valide formato email
        placeholder="Email o Acrónimo (ej: ALO)" 
        value={identifier} 
        onChange={e => setIdentifier(e.target.value)} 
      /><br/>
      
      <input 
        type="password" 
        placeholder="Password" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
      /><br/>
      
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
