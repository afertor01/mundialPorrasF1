import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";
import { motion } from "framer-motion";
import { User, CheckCircle, Settings, Image as ImageIcon } from "lucide-react";

const Profile: React.FC = () => {
  const { avatar, username, refreshProfile } = useContext(AuthContext) as any;
  const [avatars, setAvatars] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      const data = await API.getAvatars();
      setAvatars(data);
    } catch (e) { console.error(e); }
  };

  const handleSelectAvatar = async (filename: string) => {
    setLoading(true);
    try {
      await API.updateMyAvatar(filename);
      // Recargamos el contexto para que el Navbar se actualice al instante
      if (refreshProfile) await refreshProfile(); 
      // Pequeño feedback visual o alert si quieres, pero el cambio visual es evidente
    } catch (e) {
      alert("Error al cambiar avatar");
    }
    setLoading(false);
  };

  // Helper para mostrar la imagen actual del contexto o de la galería
  const getAvatarUrl = (filename: string) => {
      // Si ya viene con http (gestión del backend)
      if (filename.startsWith("http")) return filename;
      // Si es solo el nombre de archivo (gestión local/fallback)
      return `http://127.0.0.1:8000/static/avatars/${filename}`; 
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] p-4 md:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* CABECERA */}
        <header className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-gray-100">
           <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
                 <img 
                    src={getAvatarUrl(avatar || "default.png")} 
                    alt="Current Profile" 
                    className="w-full h-full object-cover"
                 />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full border-4 border-[#fcfcfd]">
                 <Settings size={16} />
              </div>
           </div>
           <div className="text-center md:text-left">
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
                 {username}
              </h1>
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">
                 Configuración de Piloto
              </p>
           </div>
        </header>

        {/* SELECCIÓN DE AVATAR */}
        <section>
           <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                 <ImageIcon size={20} />
              </div>
              <h3 className="text-xl font-black text-gray-800 uppercase italic tracking-tighter">
                 Selecciona tu Casco
              </h3>
           </div>

           <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              {avatars.length === 0 ? (
                 <p className="text-center text-gray-400 py-10 font-bold">No hay avatares disponibles en la galería.</p>
              ) : (
                 <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-6">
                    {avatars.map((av) => {
                       const isSelected = avatar === av.filename;
                       return (
                          <motion.button
                             key={av.id}
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             onClick={() => handleSelectAvatar(av.filename)}
                             disabled={loading}
                             className={`relative group rounded-full aspect-square border-4 transition-all overflow-hidden ${
                                isSelected 
                                ? "border-green-500 shadow-lg shadow-green-100 ring-4 ring-green-100" 
                                : "border-gray-100 hover:border-purple-200"
                             }`}
                          >
                             <img src={av.url} alt={av.filename} className="w-full h-full object-cover" />
                             
                             {isSelected && (
                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                   <CheckCircle className="text-white drop-shadow-md" size={32} />
                                </div>
                             )}
                          </motion.button>
                       );
                    })}
                 </div>
              )}
           </div>
        </section>

      </div>
    </div>
  );
};

export default Profile;