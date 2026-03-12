import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { login as apiLogin } from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Lock, User } from "lucide-react";

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { token, login } = useContext(AuthContext) as any;
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await apiLogin(identifier, password);
      login(res.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : "Credenciales incorrectas. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative overflow-hidden">
      {/* Fondo Decorativo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-f1-red/10 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -ml-20 -mb-20" />

      <AnimatePresence mode="wait">
        {!isLoading || !token ? (
          <motion.div 
            key="login-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative z-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 tracking-tighter uppercase italic">Acceso Paddock</h2>
              <p className="text-gray-500 text-sm mt-2 font-medium">Introduce tus credenciales para entrar al box</p>
            </div>

            {error && (
              <motion.div initial={{ x: -10 }} animate={{ x: 0 }} className="bg-red-50 text-f1-red p-3 rounded-lg mb-4 text-sm font-medium border border-red-100 flex flex-col gap-2 relative">
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Email o Acrónimo (ej: ALO)" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none transition-all placeholder:text-gray-300 text-gray-800"
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none transition-all placeholder:text-gray-300 text-gray-800"
                />
              </div>
              
              <motion.button 
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                type="submit" 
                disabled={isLoading}
                className={`w-full h-14 ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-f1-red hover:bg-red-700 shadow-lg shadow-red-500/30"} text-white font-black uppercase tracking-widest italic rounded-lg transition-all flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        <span>Sincronizando...</span>
                    </div>
                ) : (
                    <>
                        <LogIn size={20} />
                        <span>Entrar</span>
                    </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500 font-medium">
              ¿No tienes cuenta? <Link to="/register" className="text-f1-red font-bold hover:underline">Regístrate gratis</Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="loading-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center relative z-10"
          >
             <div className="w-16 h-16 border-4 border-f1-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
             <p className="text-f1-dark font-black italic uppercase tracking-widest">Iniciando Sistemas...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;