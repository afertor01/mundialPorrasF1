import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Settings, Image as ImageIcon, Save, Lock, Unlock, 
  Trophy, Activity, Zap, Star, Shield, CheckCircle, Flag, Info,
  Flame, Heart, Skull, TrendingUp, Calendar, MapPin
} from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';

// --- SUB-COMPONENTE: CONFIGURACIÓN ---
const SettingsTab = ({ avatars, avatar, handleSelectAvatar, loadingAvatar, reloadUser }: any) => {
    const { username, login } = useContext(AuthContext) as any;
    const [formData, setFormData] = useState({
        username: "",
        acronym: "",
        current_password: "",
        new_password: ""
    });

    const handleChange = (e: any) => setFormData({...formData, [e.target.name]: e.target.value});

    const handleSave = async () => {
        try {
            const payload: any = {};
            if (formData.username && formData.username !== username) payload.username = formData.username;
            if (formData.acronym) payload.acronym = formData.acronym;
            
            if (formData.new_password) {
                payload.current_password = formData.current_password;
                payload.new_password = formData.new_password;
            }

            if (Object.keys(payload).length === 0) return;

            const response = await API.updateProfile(payload);

            if (response.access_token) {
                if (login) login(response.access_token);
            }

            alert("Perfil actualizado correctamente ✅");
            setFormData({ ...formData, current_password: "", new_password: "" }); 
            if (reloadUser) reloadUser();
        } catch (error: any) {
            alert("Error: " + (error.response?.data?.detail || "No se pudo actualizar"));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* SECCIÓN AVATAR */}
            <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ImageIcon size={16}/> Selección de Casco
                </h3>
                <div className="max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {avatars.map((av: any) => {
                            const isSelected = avatar === av.filename;
                            return (
                                <button
                                    key={av.id}
                                    onClick={() => handleSelectAvatar(av.filename)}
                                    disabled={loadingAvatar}
                                    className={`relative rounded-full aspect-square border-4 transition-all overflow-hidden group ${
                                        isSelected ? "border-green-500 ring-4 ring-green-100" : "border-gray-50 hover:border-purple-200"
                                    }`}
                                >
                                    <img src={av.url} alt={av.filename} className="w-full h-full object-cover" />
                                    {isSelected && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle className="text-white drop-shadow-md"/></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* SECCIÓN DATOS */}
            <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                 <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Settings size={16}/> Datos de Piloto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nuevo Nombre de Usuario</label>
                        <input name="username" placeholder={username} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nuevo Acrónimo (3 Letras)</label>
                        <input name="acronym" maxLength={3} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 uppercase"/>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                    <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Lock size={14}/> Zona de Seguridad
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Contraseña Actual</label>
                            <input name="current_password" type="password" onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-200"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nueva Contraseña</label>
                            <input name="new_password" type="password" onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-200"/>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-f1-red transition-all shadow-lg shadow-gray-300 hover:shadow-red-200">
                        <Save size={16}/> Guardar Cambios
                    </button>
                </div>
            </section>
        </div>
    );
};

// --- SUB-COMPONENTE: ESTADÍSTICAS ---
const StatsTab = () => {
    const [stats, setStats] = useState<any>(null);

    // Definiciones de las métricas (Columna Derecha)
    const metricDefinitions = [
        {
            key: "Regularidad",
            label: "Regularidad",
            desc: "Estabilidad. 100 = Puntuaciones siempre similares.",
            color: "text-blue-500"
        },
        {
            key: "Compromiso",
            label: "Compromiso",
            desc: "Fidelidad. 100 = No te has perdido ninguna carrera.",
            color: "text-purple-500"
        },
        {
            key: "Anticipación",
            label: "Anticipación",
            desc: "Planificación. 100 = Predicciones hechas con mucha antelación.",
            color: "text-green-500"
        },
        {
            key: "Calidad/Podios",
            subject_backend: "Calidad/Podios",
            label: "Calidad",
            desc: "Eficiencia. 100 = Muchos puntos en GPs con muchos rivales.",
            color: "text-yellow-500"
        },
        {
            key: "Vidente",
            label: "Vidente",
            desc: "Precisión. 100 = Alto % de aciertos exactos.",
            color: "text-red-500"
        }
    ];

    useEffect(() => { 
        API.getMyStats().then(setStats).catch(console.error); 
    }, []);

    if (!stats) return <div className="p-10 text-center text-gray-400 font-bold">Cargando telemetría...</div>;

    // --- EXTRACCIÓN DE DATOS REALES (INSIGHTS) ---
    // Usamos fallbacks por si el usuario es nuevo (null)
    const insights = stats.insights || {};
    
    const hero = insights.hero || { code: "---", count: 0 };
    const villain = insights.villain || { code: "---", count: 0 };
    const bestRace = insights.best_race || { gp_name: "Sin datos", year: "----", points: 0, percentile: "---" };
    const momentum = insights.momentum || 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI CARDS (Header Stats) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-gray-400 mb-2"><Activity size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.total_points}</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Puntos Totales</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-blue-400 mb-2"><Zap size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.avg_points}</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Media / Carrera</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-purple-400 mb-2"><Flag size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.races_played}</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">GPs Disputados</div>
                </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-green-400 mb-2"><Star size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.podium_ratio_percent}%</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Ratio Podios</div>
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* COLUMNA IZQUIERDA: TROFEOS + INSIGHTS */}
                <div className="space-y-6">
                    {/* 1. TROPHY CABINET */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Trophy size={16}/> Vitrina de Trofeos
                        </h3>
                        <div className="flex justify-center items-end gap-6 h-48">
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-black text-gray-400 text-xl">{stats.trophies.silver}</span>
                                <div className="w-14 h-20 md:w-16 md:h-24 bg-gradient-to-t from-gray-300 to-gray-100 rounded-t-lg border-t-4 border-gray-400 flex items-center justify-center shadow-lg"><span className="text-xl md:text-2xl font-black text-gray-400">2º</span></div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-black text-yellow-500 text-2xl">{stats.trophies.gold}</span>
                                <div className="w-16 h-28 md:w-20 md:h-32 bg-gradient-to-t from-yellow-200 to-yellow-50 rounded-t-lg border-t-4 border-yellow-400 flex items-center justify-center shadow-xl z-10"><span className="text-3xl md:text-4xl font-black text-yellow-600">1º</span></div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-black text-orange-400 text-xl">{stats.trophies.bronze}</span>
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-t from-orange-200 to-orange-50 rounded-t-lg border-t-4 border-orange-400 flex items-center justify-center shadow-lg"><span className="text-xl md:text-2xl font-black text-orange-600">3º</span></div>
                            </div>
                        </div>
                    </div>

                    {/* 2. CURIOSIDADES DE PADDOCK (DATOS REALES) */}
                    <div className="grid grid-cols-1 gap-4">
                        
                        {/* A. RACHA ACTUAL (MOMENTUM) */}
                        <div className={`p-5 rounded-[2rem] shadow-lg text-white relative overflow-hidden ${
                            momentum > 2 ? "bg-gradient-to-r from-orange-500 to-red-600 shadow-orange-200" : "bg-gray-800"
                        }`}>
                             <div className="absolute -right-6 -bottom-6 text-white/10 rotate-12">
                                <Flame size={100} strokeWidth={1.5} />
                            </div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 text-white/80 mb-1">
                                        <TrendingUp size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Momentum</span>
                                    </div>
                                    <div className="text-2xl font-black italic">
                                        {momentum > 2 ? "Racha Incendiaria" : (momentum > 0 ? "Calentando Motores" : "Motor Frío")}
                                    </div>
                                    <div className="text-xs font-medium text-white/80 mt-1">
                                        {momentum} carreras seguidas por encima de tu media.
                                    </div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                                    <Flame size={24} className={momentum > 2 ? "text-white animate-pulse" : "text-gray-400"} fill="currentColor"/>
                                </div>
                            </div>
                        </div>

                        {/* B. HÉROE Y VILLANO */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Zap size={14}/> Tus Predilecciones
                            </h3>
                            <div className="flex gap-3">
                                {/* HÉROE */}
                                <div className="flex-1 bg-green-50/80 rounded-2xl p-3 flex flex-col items-center text-center relative overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-green-200 flex items-center justify-center shadow-sm mb-2 z-10">
                                        <span className="font-black text-green-700 text-xs">{hero.code}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Ojito Derecho</div>
                                    <div className="text-xs font-black text-gray-800 leading-tight mb-1">Top 3</div>
                                    <div className="text-[9px] text-green-600/70 font-bold bg-green-100 px-2 py-0.5 rounded-full">
                                        {hero.count} Veces
                                    </div>
                                    <Heart className="absolute -bottom-2 -right-2 text-green-200/50" size={40} fill="currentColor"/>
                                </div>

                                {/* VILLANO */}
                                <div className="flex-1 bg-red-50/80 rounded-2xl p-3 flex flex-col items-center text-center relative overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-red-200 flex items-center justify-center shadow-sm mb-2 z-10">
                                        <span className="font-black text-red-700 text-xs">{villain.code}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Bestia Negra</div>
                                    <div className="text-xs font-black text-gray-800 leading-tight mb-1">Predicción DNF</div>
                                    <div className="text-[9px] text-red-500/70 font-bold bg-red-100 px-2 py-0.5 rounded-full">
                                        {villain.count} Veces
                                    </div>
                                    <Skull className="absolute -bottom-2 -right-2 text-red-200/50" size={40} fill="currentColor"/>
                                </div>
                            </div>
                        </div>

                         {/* C. MEJOR RESULTADO (PRIME) */}
                        <div className="bg-gray-900 p-5 rounded-[2rem] shadow-xl relative overflow-hidden text-white group">
                            {/* Background Effects */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 opacity-10 blur-[40px] rounded-full pointer-events-none transform translate-x-10 -translate-y-10 group-hover:opacity-20 transition-opacity"></div>
                            
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Star size={12} fill="currentColor"/> Prime Performance
                                    </h3>
                                    <div className="text-xl font-black italic tracking-tighter text-white">{bestRace.gp_name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-white/10 px-1.5 py-0.5 rounded">
                                            <Calendar size={10}/> {bestRace.year}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-white/10 px-1.5 py-0.5 rounded">
                                            <MapPin size={10}/> {bestRace.percentile}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-yellow-400 leading-none">{bestRace.points}</div>
                                    <div className="text-[9px] font-bold uppercase text-white/40 tracking-widest mt-1">Puntos</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* COLUMNA DERECHA: ARAÑA + GLOSARIO */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col relative overflow-hidden h-full">
                    <div className="flex items-center justify-between w-full mb-4">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Shield size={16}/> ADN de Piloto
                        </h3>
                    </div>
                    
                    <div className="w-full h-64 relative z-10 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radar}>
                                <PolarGrid stroke="#e5e7eb" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 900 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar 
                                    name="Nivel" 
                                    dataKey="A" 
                                    stroke="#E10600" 
                                    strokeWidth={3} 
                                    fill="#E10600" 
                                    fillOpacity={0.2} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#E10600', fontWeight: 'bold' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* GLOSARIO DE MÉTRICAS */}
                    <div className="mt-6 pt-6 border-t border-gray-100 flex-1 flex flex-col justify-center space-y-4">
                        {metricDefinitions.map((def) => (
                            <div key={def.key} className="flex gap-3 items-start group">
                                <div className={`mt-1 p-1.5 rounded-lg bg-gray-50 transition-colors group-hover:bg-white group-hover:shadow-sm ${def.color}`}>
                                    <Info size={14} strokeWidth={2.5}/>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 block mb-0.5">
                                        {def.label}
                                    </span>
                                    <p className="text-xs text-gray-400 leading-snug">
                                        {def.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTE: LOGROS ---
const AchievementsTab = () => {
    const [list, setList] = useState<any[]>([]);

    useEffect(() => {
        API.getMyAchievements().then(setList).catch(console.error);
    }, []);

    const iconMap: any = {
        "Trophy": <Trophy size={24}/>,
        "Flag": <Flag size={24}/>,
        "Eye": <Zap size={24}/>,
        "Star": <Star size={24}/>,
        "Wrench": <Settings size={24}/>
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {list.map(ach => (
                <div key={ach.id} className={`p-6 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                    ach.unlocked 
                    ? "bg-white border-yellow-400 shadow-md" 
                    : "bg-gray-50 border-gray-200 opacity-60 grayscale"
                }`}>
                    <div className={`p-3 rounded-xl ${ach.unlocked ? "bg-yellow-100 text-yellow-600" : "bg-gray-200 text-gray-400"}`}>
                        {iconMap[ach.icon] || <Star />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black text-gray-900 uppercase italic tracking-tighter">{ach.name}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ach.description}</p>
                        {ach.unlocked && (
                            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-yellow-600 uppercase tracking-widest">
                                <Unlock size={12}/> Desbloqueado
                            </div>
                        )}
                        {!ach.unlocked && (
                            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <Lock size={12}/> Bloqueado
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
const Profile: React.FC = () => {
  const { avatar, username, refreshProfile, acronym } = useContext(AuthContext) as any;
  const [avatars, setAvatars] = useState<any[]>([]);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "stats" | "achievements">("settings");

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
    setLoadingAvatar(true);
    try {
      await API.updateMyAvatar(filename);
      if (refreshProfile) await refreshProfile(); 
    } catch (e) {
      alert("Error al cambiar avatar");
    }
    setLoadingAvatar(false);
  };

  const getAvatarUrl = (filename: string) => {
      if (!filename) return "http://127.0.0.1:8000/static/avatars/default.png";
      if (filename.startsWith("http")) return filename;
      return `http://127.0.0.1:8000/static/avatars/${filename}`; 
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] p-4 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* CABECERA (Rediseñada para incluir acrónimo) */}
        <header className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-gray-100">
           <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
                 <img 
                    src={getAvatarUrl(avatar)} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                 />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full border-4 border-[#fcfcfd]">
                 <User size={16} />
              </div>
           </div>
           <div className="text-center md:text-left flex-1 space-y-2">
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                 {username}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                   <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">
                       Piloto Oficial
                   </span>
                   {acronym && (
                       <span className="px-3 py-1 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                           {acronym}
                       </span>
                   )}
              </div>
           </div>
           
           {/* NAVEGACIÓN TABS */}
           <div className="flex bg-gray-100/50 p-1.5 rounded-[2rem] gap-1">
               <button 
                  onClick={() => setActiveTab("settings")}
                  className={`px-6 py-2 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "settings" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
               >
                   Config
               </button>
               <button 
                  onClick={() => setActiveTab("stats")}
                  className={`px-6 py-2 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "stats" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
               >
                   Stats
               </button>
               <button 
                  onClick={() => setActiveTab("achievements")}
                  className={`px-6 py-2 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "achievements" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
               >
                   Logros
               </button>
           </div>
        </header>

        {/* CONTENIDO DE PESTAÑAS */}
        <AnimatePresence mode="wait">
            {activeTab === "settings" && (
                <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <SettingsTab 
                        avatars={avatars} 
                        avatar={avatar} 
                        handleSelectAvatar={handleSelectAvatar} 
                        loadingAvatar={loadingAvatar}
                        reloadUser={refreshProfile}
                    />
                </motion.div>
            )}
            {activeTab === "stats" && (
                <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <StatsTab />
                </motion.div>
            )}
             {activeTab === "achievements" && (
                <motion.div key="achievements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <AchievementsTab />
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Profile;