import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as apiRegister } from "../api/api"; // Importación correcta
import { motion } from "framer-motion";
import { UserPlus, Mail, Lock, User, Hash, ChevronLeft } from "lucide-react";

const Register: React.FC = () => {
  // --- LÓGICA (Mantenemos la tuya intacta) ---
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [acronym, setAcronym] = useState(""); 
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ CORREGIDO: Pasamos un objeto como espera tu api.ts
      await apiRegister({ email, username, password, acronym });
      alert("✅ Usuario registrado correctamente. ¡Ahora inicia sesión!");
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      alert("❌ Error: " + (err.response?.data?.detail || "Error en el registro"));
    }
  };

  // --- RENDERIZADO VISUAL (Estilo F1) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative overflow-hidden py-10 px-4">
      
      {/* Fondo Decorativo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-f1-red/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative z-10 border border-gray-100"
      >
        <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Únete a la <span className="text-f1-red">Parrilla</span>
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Crea tu perfil de piloto
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Input: Email */}
            <div className="relative group">
                <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-f1-red transition-colors">
                    <Mail size={20} />
                </div>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent transition-all placeholder-gray-400 text-gray-800"
                />
            </div>

            {/* Input: Usuario */}
            <div className="relative group">
                <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-f1-red transition-colors">
                    <User size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Nombre de usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent transition-all placeholder-gray-400 text-gray-800"
                />
            </div>

            {/* Input: Acrónimo */}
            <div className="relative group">
                <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-f1-red transition-colors">
                    <Hash size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Acrónimo (Ej: ALO)"
                    maxLength={3}
                    value={acronym}
                    onChange={e => setAcronym(e.target.value.toUpperCase())}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent transition-all placeholder-gray-400 text-gray-800 font-mono uppercase tracking-wider"
                />
                <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-mono">
                    {acronym.length}/3
                </span>
            </div>

            {/* Input: Contraseña */}
            <div className="relative group">
                <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-f1-red transition-colors">
                    <Lock size={20} />
                </div>
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent transition-all placeholder-gray-400 text-gray-800"
                />
            </div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-f1-red text-white font-bold py-3.5 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 mt-6"
            >
                <UserPlus size={20} />
                Registrarse
            </motion.button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <Link 
                to="/login" 
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-f1-red transition-colors font-medium"
            >
                <ChevronLeft size={16} /> Volver al Login
            </Link>
        </div>

      </motion.div>
    </div>
  );
};

export default Register;