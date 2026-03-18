import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Flag, 
  LogIn, 
  UserPlus, 
  Target, 
  LayoutGrid, 
  Zap,
  ChevronRight,
  Shield,
  Settings,
  Mail,
  MessageCircle,
  HelpCircle
} from "lucide-react";
import SpeedStreak from "../components/SpeedStreak";

const Home: React.FC = () => {
  const { token, logout } = useContext(AuthContext);
  const [showContent, setShowContent] = useState(false);
  const [streakActive, setStreakActive] = useState(true);

  useEffect(() => {
    // Reveal content slightly before the streak finishes for a smooth feel
    const timer = setTimeout(() => setShowContent(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
    }
  };


  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Speed Intro Transition */}
      <AnimatePresence>
        {streakActive && (
          <SpeedStreak onComplete={() => setStreakActive(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* --- HERO SECTION --- */}
            <div className="relative min-h-[85vh] flex items-center bg-f1-dark text-white slant-hero">
              {/* Premium Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center grayscale opacity-40 mix-blend-overlay scale-110"
                style={{ backgroundImage: "url('/f1-hero-bg.png')" }}
              />
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-f1-red/5 to-transparent animate-scanline pointer-events-none" />

              <div className="relative max-w-7xl mx-auto px-6 py-24 w-full">
                <div className="max-w-3xl">
                  <motion.div
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <div className="flex items-center gap-2 mb-6 text-f1-red">
                      <Zap size={20} fill="currentColor" />
                      <span className="text-sm font-black uppercase tracking-[0.3em] italic">Official Paddock Club</span>
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none mb-6">
                      MUNDIAL DE <br />
                      <span className="text-f1-red">PORRAS F1</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-400 font-medium max-w-xl mb-10 leading-relaxed">
                      Siente la adrenalina del Gran Circo. Predice el Top 10, domina el Bingo de temporada y escala hasta el escalón más alto del podio.
                    </p>
                  </motion.div>

                  {!token ? (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-wrap gap-4"
                    >
                      <Link to="/login" className="group flex items-center gap-3 bg-f1-red hover:bg-red-700 text-white px-10 py-4 rounded-xl font-black uppercase tracking-tighter italic transition-all shadow-2xl shadow-red-600/40 hover:-translate-y-1">
                        <LogIn size={20} /> Entrar en Box <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <Link to="/register" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-10 py-4 rounded-xl font-black uppercase tracking-tighter italic transition-all hover:-translate-y-1">
                        <UserPlus size={20} /> Registro
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 font-bold text-sm mb-6">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        SISTEMAS ONLINE - BIENVENIDO A LA PARRILLA
                      </div>
                      <div className="flex gap-4">
                        <Link to="/predict" className="bg-white text-f1-dark px-8 py-3 rounded-xl font-black uppercase italic tracking-tighter hover:bg-gray-200 transition-colors">
                          Ir a Jugar
                        </Link>
                        <button onClick={logout} className="text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Decorative Corner Element */}
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-f1-red/10 to-transparent pointer-events-none" />
            </div>

            {/* --- MENU GRID --- */}
            <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 pb-24">
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <MenuCard 
                  to={token ? "/dashboard" : "/login"} 
                  title="Clasificación" 
                  desc="Ranking global y telemetría de puntos acumulados."
                  icon={<Trophy size={28} />}
                  accent="bg-yellow-500"
                />
                
                <MenuCard 
                  to={token ? "/predict" : "/login"} 
                  title="Hacer Porra" 
                  desc="Predice el Top 10 y eventos antes del GP."
                  icon={<Target size={28} />}
                  accent="bg-f1-red"
                />

                <MenuCard 
                  to={token ? "/bingo" : "/login"} 
                  title="Bingo F1" 
                  desc="Estrategia a largo plazo: tacha eventos de la temporada."
                  icon={<LayoutGrid size={28} />}
                  accent="bg-orange-500"
                />

                <MenuCard 
                  to={token ? "/race-control" : "/login"} 
                  title="Race Control" 
                  desc="Comparativa detallada driver-to-driver."
                  icon={<Flag size={28} />}
                  accent="bg-blue-600"
                />

                <MenuCard 
                  to={token ? "/team-hq" : "/login"} 
                  title="Escudería" 
                  desc="Gestiona tu equipo y compite en el mundial por equipos."
                  icon={<Shield size={28} />}
                  accent="bg-teal-500"
                />

                <MenuCard 
                  to={token ? "/profile" : "/login"} 
                  title="Ajustes Piloto" 
                  desc="Stats detalladas, logros y configuración de cuenta."
                  icon={<Settings size={28} />}
                  accent="bg-purple-600"
                />
              </motion.div>
            </div>

            {/* --- SUPPORT SECTION --- */}
            <div className="max-w-7xl mx-auto px-6 pb-24">
              <div className="bg-gray-50 rounded-[3rem] p-8 md:p-12 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-f1-red/5 rounded-full blur-3xl -mr-32 -mt-32" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 text-f1-red">
                      <HelpCircle size={24} />
                      <span className="text-xs font-black uppercase tracking-[0.3em]">Centro de Asistencia</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-gray-900 leading-none">
                      ¿Necesitas <br /> <span className="text-gray-400 font-medium">Soporte Técnico?</span>
                    </h2>
                    <p className="text-gray-500 font-medium max-w-sm">
                      Si tienes problemas con tu cuenta, bugs o sugerencias, estamos a un mensaje de distancia.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <a 
                      href="mailto:mundialporrasf1@gmail.com"
                      className="flex items-center justify-center gap-4 bg-white border border-gray-200 p-6 rounded-3xl hover:border-f1-red hover:shadow-xl transition-all group lg:min-w-[280px]"
                    >
                      <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-f1-red group-hover:text-white transition-all">
                        <Mail size={24} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-f1-red transition-colors">Escríbenos</div>
                        <div className="text-sm font-black text-gray-900 truncate">mundialporrasf1@gmail.com</div>
                      </div>
                    </a>

                    <a 
                      href="https://whatsapp.com/channel/0029VbCxZADGZNCqXOkrXu1X"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-4 bg-[#25D366]/5 border border-[#25D366]/20 p-6 rounded-3xl hover:bg-[#25D366]/10 hover:shadow-xl transition-all group lg:min-w-[280px]"
                    >
                      <div className="p-3 bg-[#25D366] text-white rounded-2xl shadow-lg shadow-[#25D366]/20 group-hover:scale-110 transition-transform">
                        <MessageCircle size={24} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#25D366]">Canal Oficial</div>
                        <div className="text-sm font-black text-gray-900">Avisos y Novedades</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer decoration */}
            <div className="h-2 bg-f1-red w-full" />
            <div className="bg-f1-dark py-12 text-center">
              <span className="text-gray-600 font-black italic uppercase tracking-[0.5em] text-xs">Push to talk · DRS Enabled · Box Box</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuCard = ({ to, title, desc, icon, accent }: any) => (
  <Link to={to} className="group">
    <motion.div 
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
      className="relative bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-full overflow-hidden transition-all group-hover:shadow-2xl group-hover:shadow-f1-dark/5 group-hover:-translate-y-2"
    >
      <div className={`absolute top-0 right-0 w-2 h-full ${accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div className={`inline-flex p-4 rounded-2xl mb-6 bg-gray-50 text-gray-400 group-hover:text-white group-hover:bg-f1-dark transition-all shadow-inner`}>
        {icon}
      </div>
      
      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-3 group-hover:text-f1-red transition-colors italic">
        {title}
      </h3>
      <p className="text-gray-500 font-medium text-sm leading-relaxed">
        {desc}
      </p>

      <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase text-gray-400 group-hover:text-f1-dark transition-colors">
        Entrar <ChevronRight size={14} />
      </div>
    </motion.div>
  </Link>
);

export default Home;