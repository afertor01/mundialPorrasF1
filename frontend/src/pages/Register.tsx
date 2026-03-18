import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as apiRegister } from "../api/api";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Lock, User, Hash, ChevronLeft } from "lucide-react";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [acronym, setAcronym] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let timer: any;
    setIsLoading(true);
    setShowSlowMessage(false);

    timer = setTimeout(() => {
      setShowSlowMessage(true);
    }, 10000);

    try {
      await apiRegister({ email, username, password, acronym });
      toast("¡Registro completado! Ya puedes iniciar sesión.", "success");
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      toast("Error: " + (err.response?.data?.detail || "Error en el registro"), "error");
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
      setShowSlowMessage(false);
    }
  };

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
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent transition-all placeholder-gray-400 text-gray-800"
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
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent transition-all placeholder-gray-400 text-gray-800 font-mono uppercase tracking-wider"
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
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent transition-all placeholder-gray-400 text-gray-800"
            />
          </div>

          <motion.button
            whileHover={!isLoading ? { scale: 1.02 } : {}}
            whileTap={!isLoading ? { scale: 0.98 } : {}}
            type="submit"
            disabled={isLoading}
            className={`w-full ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-f1-red hover:bg-red-700 shadow-lg shadow-red-500/30"} text-white font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6`}
          >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
                <UserPlus size={20} />
            )}
            {isLoading ? "Conectando al paddock..." : "Registrarse"}
          </motion.button>

          <AnimatePresence>
            {showSlowMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium text-center leading-relaxed"
              >
                🚀 El servidor está arrancando. <br/>
                Por favor, ten paciencia, esto puede tardar hasta un minuto en el plan gratuito de Render.
              </motion.div>
            )}
          </AnimatePresence>
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
