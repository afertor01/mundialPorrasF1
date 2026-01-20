import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion"; // ✨ Animaciones
import { Trophy, Calendar, Flag, BarChart3, LogIn, UserPlus } from "lucide-react"; // ✨ Iconos

const Home: React.FC = () => {
  const { token, logout } = useContext(AuthContext);

  // Variantes para la animación de entrada
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 } // Efecto cascada
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      
      {/* --- HERO SECTION --- */}
      <div className="relative bg-f1-dark text-white overflow-hidden">
        {/* Fondo decorativo (círculos abstractos) */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-f1-red opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-blue-600 opacity-20 blur-3xl"></div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
              Mundial de Porras <span className="text-f1-red">F1</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Demuestra quién sabe más de Fórmula 1. Predice resultados, compite con amigos y sube al podio.
            </p>
          </motion.div>

          {!token && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center gap-4"
            >
              <Link to="/login" className="flex items-center gap-2 bg-f1-red hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-red-500/30">
                <LogIn size={20} /> Iniciar Sesión
              </Link>
              <Link to="/register" className="flex items-center gap-2 bg-white text-f1-dark hover:bg-gray-100 px-8 py-3 rounded-full font-bold transition-all shadow-lg">
                <UserPlus size={20} /> Registrarse
              </Link>
            </motion.div>
          )}

           {token && (
            <motion.button 
              onClick={logout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-4 text-gray-400 hover:text-white underline text-sm"
            >
              Cerrar Sesión actual
            </motion.button>
          )}
        </div>
      </div>

      {/* --- DASHBOARD PREVIEW CARDS --- */}
      {token && (
        <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-10 pb-20">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <MenuCard 
              to="/dashboard" 
              title="Dashboard" 
              desc="Panel principal y estadísticas"
              icon={<BarChart3 size={32} className="text-blue-500" />}
              color="border-l-4 border-blue-500"
            />
            <MenuCard 
              to="/predict" 
              title="Mis Predicciones" 
              desc="Haz tu porra para la próxima carrera"
              icon={<Flag size={32} className="text-f1-red" />}
              color="border-l-4 border-f1-red"
            />
            <MenuCard 
              to="/dashboard" // O /standings si creas esa página
              title="Clasificación" 
              desc="Ranking global de jugadores"
              icon={<Trophy size={32} className="text-yellow-500" />}
              color="border-l-4 border-yellow-500"
            />
            <MenuCard 
              to="/admin" 
              title="Zona Admin" 
              desc="Gestión de carreras y usuarios"
              icon={<Calendar size={32} className="text-purple-500" />}
              color="border-l-4 border-purple-500"
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Componente reutilizable para las tarjetas
const MenuCard = ({ to, title, desc, icon, color }: any) => (
  <Link to={to}>
    <motion.div 
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
      whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
      className={`bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all h-full flex flex-col items-start ${color}`}
    >
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{desc}</p>
    </motion.div>
  </Link>
);

export default Home;