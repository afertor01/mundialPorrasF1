import React, { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  // Career / Achievement icons
  Flag, TrendingUp, Award, Star, Calendar, Crosshair, Trophy, Crown, Medal, Target,
  Gauge, Zap, AlertTriangle, Shield, Activity, Skull, Ghost, UserX,

  // Season icons
  Battery, BatteryCharging, UserCheck, ShoppingBag,

  // Event icons
  Play, Users, DollarSign, Package, Hand, Eye, Mic, Sun, Maximize, Swords,
  
  // Bingo Icons (NUEVOS)
  Hexagon, CheckCircle2,

  // Extra icons from your second import
  User, Settings, Image as ImageIcon, Save, Lock, Unlock, CheckCircle, Info,
  Flame, Heart, MapPin, Search, ChevronDown, Watch, Smile, Frown, Umbrella,
  RefreshCw, PenTool, LayoutGrid
} from "lucide-react";

import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';

// --- HELPERS ---
const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Desconocido";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Desconocido";
        const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
        const formatted = formatter.format(date);
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch (e) { return "Desconocido"; }
};

// --- MAPEO SEGURO DE ICONOS ---
const ICON_MAP: any = {
  Trophy: <Trophy size={20} />,
  Star: <Star size={20} />,
  Award: <Award size={20} />,
  Crown: <Crown size={20} />,
  Flag: <Flag size={20} />,
  Shield: <Shield size={20} />,
  Zap: <Zap size={20} />,
  Flame: <Flame size={20} />,
  Heart: <Heart size={20} />,
  Skull: <Skull size={20} />,
  Ghost: <Ghost size={20} />,
  UserX: <UserX size={20} />,
  TrendingUp: <TrendingUp size={20} />,
  Calendar: <Calendar size={20} />,
  Watch: <Watch size={20} />,
  Crosshair: <Crosshair size={20} />,
  Target: <Crosshair size={20} />,
  Gauge: <Gauge size={20} />,
  AlertTriangle: <AlertTriangle size={20} />,
  Battery: <Battery size={20} />,
  BatteryCharging: <BatteryCharging size={20} />,
  UserCheck: <UserCheck size={20} />,
  ShoppingBag: <ShoppingBag size={20} />,
  Play: <Play size={20} />,
  Users: <Users size={20} />,
  DollarSign: <DollarSign size={20} />,
  Package: <Package size={20} />,
  Hand: <Hand size={20} />,
  Eye: <Eye size={20} />,
  Mic: <Mic size={20} />,
  Sun: <Sun size={20} />,
  Maximize: <Maximize size={20} />,
  Swords: <Swords size={20} />,
  User: <User size={20} />,
  Settings: <Settings size={20} />,
  ImageIcon: <ImageIcon size={20} />,
  Save: <Save size={20} />,
  Lock: <Lock size={20} />,
  Unlock: <Unlock size={20} />,
  CheckCircle: <CheckCircle size={20} />,
  Info: <Info size={20} />,
  MapPin: <MapPin size={20} />,
  Search: <Search size={20} />,
  ChevronDown: <ChevronDown size={20} />,
  Smile: <Smile size={20} />,
  Frown: <Frown size={20} />,
  Umbrella: <Umbrella size={20} />,
  RefreshCw: <RefreshCw size={20} />,
  PenTool: <PenTool size={20} />,
  Grid: <LayoutGrid size={20} />,
  DEFAULT: <Star size={20} />
};

const RARITY_STYLES: any = {
    COMMON: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500", badge: "bg-gray-200 text-gray-600", label: "Común" },
    RARE: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", badge: "bg-blue-100 text-blue-700", label: "Raro" },
    EPIC: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", badge: "bg-purple-100 text-purple-700", label: "Épico" },
    LEGENDARY: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", badge: "bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-800", label: "Legendario" },
    HIDDEN: { bg: "bg-gray-100", border: "border-gray-300 border-dashed", text: "text-gray-400", badge: "bg-gray-800 text-gray-300", label: "Secreto" },
};

const TYPE_LABELS: any = {
    CAREER: "Salón de la Fama (Histórico)",
    SEASON: "Temporada Actual",
    EVENT: "Eventos y Hazañas"
};

// --- COMPONENTE BINGO (NUEVO) ---
const BingoTab = ({ targetUser }: { targetUser: any }) => {
    const [tiles, setTiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        API.getUserBingoBoard(targetUser.id)
            .then(setTiles)
            .catch((err) => console.error("Error cargando bingo de usuario", err))
            .finally(() => setLoading(false));
    }, [targetUser.id]);

    if (loading) return <div className="p-10 text-center animate-pulse text-gray-400 font-bold">Cargando tablero de Bingo...</div>;

    const selectionsCount = tiles.filter(t => t.is_selected_by_me).length;
    const points = tiles.filter(t => t.is_selected_by_me && t.is_completed).reduce((acc, curr) => acc + curr.current_value, 0);
    const potentialPoints = tiles.filter(t => t.is_selected_by_me).reduce((acc, curr) => acc + curr.current_value, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Bingo */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-wrap gap-6 items-center justify-between">
                <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-2">
                        <Hexagon className="text-f1-red fill-f1-red" size={20}/>
                        Bingo {new Date().getFullYear()}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">Predicciones de temporada de {targetUser.username}</p>
                </div>
                <div className="flex gap-4">
                     <div className="text-right">
                        <div className="text-2xl font-black text-gray-900">{selectionsCount}</div>
                        <div className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Picks</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-f1-red">{points} <span className="text-gray-300 text-sm">/ {potentialPoints}</span></div>
                        <div className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Puntos</div>
                    </div>
                </div>
            </div>

            {/* Grid Bingo */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {tiles.map((tile) => {
                    const isSelected = tile.is_selected_by_me;
                    const isCompleted = tile.is_completed;

                    let cardStyle = "bg-white border-gray-100 opacity-60"; 
                    let badgeStyle = "text-blue-600 bg-blue-50 border-blue-100";
                    let textStyle = "text-gray-500";
                    let completedBadgeStyle = "bg-white text-green-600";

                    if (tile.current_value >= 50) badgeStyle = "text-orange-600 bg-orange-50 border-orange-100";
                    if (tile.current_value >= 80) badgeStyle = "text-purple-600 bg-purple-50 border-purple-100";

                    if (isCompleted && isSelected) {
                        cardStyle = "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 border-yellow-400 shadow-lg ring-1 ring-yellow-200 opacity-100 transform scale-[1.02] z-10";
                        textStyle = "text-yellow-950";
                        badgeStyle = "bg-white border-transparent text-yellow-800 shadow-sm";
                        completedBadgeStyle = "bg-white text-yellow-800 shadow-sm";
                    } else if (isCompleted) {
                        cardStyle = "bg-green-500 border-green-500 text-white opacity-100 shadow-md";
                        textStyle = "text-white";
                        badgeStyle = "bg-white/20 border-transparent text-white";
                        completedBadgeStyle = "bg-white text-green-700 shadow-sm";
                    } else if (isSelected) {
                        cardStyle = "bg-gray-800 border-gray-800 text-white opacity-100 shadow-md";
                        textStyle = "text-white";
                        badgeStyle = "bg-white/20 border-transparent text-white";
                    }

                    return (
                        <div key={tile.id} className={`relative rounded-2xl p-4 border-2 flex flex-col justify-between min-h-[140px] ${cardStyle}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${badgeStyle}`}>
                                    {tile.current_value} pts
                                </div>
                                <div>
                                    {isCompleted ? (
                                        isCompleted && isSelected ? (
                                            <div className="bg-yellow-950 rounded-full p-0.5"><CheckCircle2 className="text-yellow-400" size={16}/></div>
                                        ) : (
                                            <CheckCircle2 className="text-white" size={18}/>
                                        )
                                    ) : (
                                        isSelected && <div className="w-4 h-4 rounded-full border-2 border-f1-red bg-f1-red"/>
                                    )}
                                </div>
                            </div>
                            <p className={`text-xs font-bold leading-snug ${textStyle}`}>{tile.description}</p>
                             <div className={`mt-3 pt-2 border-t flex justify-between items-center ${isCompleted && isSelected ? "border-yellow-600/20" : "border-white/10"}`}>
                                <div className={`text-[8px] font-bold uppercase tracking-widest ${isSelected || isCompleted ? (isCompleted && isSelected ? "text-yellow-900/60" : "text-white/60") : "text-gray-400"}`}>
                                    {tile.selection_count} picks
                                </div>
                                {isCompleted && (
                                    <span className={`text-[8px] font-black px-1.5 py-0 rounded uppercase ${completedBadgeStyle}`}>OK</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- OTROS COMPONENTES ---

const UserSearch = ({ currentUser, onSelectUser, usersList }: any) => {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredUsers = (usersList || []).filter((u: any) => 
        u.username.toLowerCase().includes(query.toLowerCase()) || 
        u.acronym.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (user: any) => {
        onSelectUser(user);
        setQuery(""); 
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full md:w-64 z-50">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-white/50 group-focus-within:text-f1-red transition-colors"/>
                </div>
                <input
                    type="text"
                    placeholder="Buscar rival..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-f1-red/50 transition-all placeholder:text-white/30 uppercase tracking-wider"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                     <ChevronDown size={14} className={`text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                    >
                        <button 
                            onClick={() => handleSelect(usersList.find((u:any) => u.id === currentUser.id) || currentUser)}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 border-b border-gray-800 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-f1-red flex items-center justify-center text-white text-xs font-bold border-2 border-white/10">YO</div>
                            <div>
                                <div className="text-xs font-bold text-white uppercase">Mi Perfil</div>
                                <div className="text-[10px] text-gray-500">Volver a mis stats</div>
                            </div>
                        </button>

                        {filteredUsers.filter((u: any) => u.id !== currentUser.id).map((u: any) => (
                            <button 
                                key={u.id} 
                                onClick={() => handleSelect(u)}
                                className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 transition-colors group border-b border-gray-800/50 last:border-0"
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-gray-500">
                                    <img src={`http://127.0.0.1:8000/static/avatars/${u.avatar}`} className="w-full h-full object-cover" alt={u.acronym}/>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-200 group-hover:text-white">{u.username}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-gray-500 group-hover:text-f1-red bg-gray-800 px-1.5 rounded w-max mt-0.5">{u.acronym}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SettingsTab = ({ avatars, avatar, handleSelectAvatar, loadingAvatar, reloadUser }: any) => {
    const { username, login } = useContext(AuthContext) as any;
    const [formData, setFormData] = useState({ username: "", acronym: "", current_password: "", new_password: "" });

    const handleChange = (e: any) => setFormData({...formData, [e.target.name]: e.target.value});
    
    const handleSave = async () => {
        try {
            const payload: any = {};
            if (formData.username && formData.username !== username) payload.username = formData.username;
            if (formData.acronym) payload.acronym = formData.acronym;
            if (formData.new_password) {
                if (!formData.current_password) { alert("⚠️ Debes introducir tu contraseña actual."); return; }
                if (formData.new_password === formData.current_password) { alert("⚠️ La nueva contraseña no puede ser igual."); return; }
                payload.current_password = formData.current_password;
                payload.new_password = formData.new_password;
            }

            if (Object.keys(payload).length === 0) return;
            const response = await API.updateProfile(payload);
            if (response.access_token && login) login(response.access_token);
            alert("✅ Perfil actualizado");
            setFormData({ ...formData, current_password: "", new_password: "" }); 
            if (reloadUser) reloadUser();
        } catch (error: any) { alert("❌ Error al actualizar"); }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><ImageIcon size={20}/></div><div><h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Identidad Visual</h3></div></div>
                <div className="max-h-64 overflow-y-auto p-4 -m-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                        {avatars.map((av: any) => {
                            const isSelected = avatar === av.filename;
                            return (
                                <button key={av.id} onClick={() => handleSelectAvatar(av.filename)} disabled={loadingAvatar} className={`relative rounded-full aspect-square transition-all duration-200 group ${isSelected ? "scale-110 z-10 ring-4 ring-green-100 bg-white" : "hover:scale-110 hover:z-20 opacity-80 hover:opacity-100"}`}>
                                    <div className={`absolute inset-0 rounded-full border-2 ${isSelected ? "border-green-500" : "border-transparent group-hover:border-purple-200"}`}></div>
                                    <img src={av.url} alt={av.filename} className="w-full h-full rounded-full object-cover shadow-sm" />
                                    {isSelected && (<div className="absolute inset-0 bg-green-500/20 rounded-full flex items-center justify-center"><CheckCircle className="text-white drop-shadow-md w-1/2 h-1/2"/></div>)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>
            <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Settings size={20}/></div><div><h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Credenciales</h3></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Usuario</label><input name="username" placeholder={username} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none"/></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Acrónimo</label><input name="acronym" maxLength={3} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none uppercase"/></div>
                </div>
                <div className="pt-6 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-red-50/50 p-4 rounded-xl border border-red-100">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Contraseña Actual</label><input name="current_password" type="password" onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl"/></div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nueva Contraseña</label><input name="new_password" type="password" onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl"/></div>
                    </div>
                </div>
                <div className="mt-8 flex justify-end"><button onClick={handleSave} className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-f1-red transition-all"><Save size={16}/> Guardar Cambios</button></div>
            </section>
        </div>
    );
};

const StatsTab = ({ targetUser, isMe }: { targetUser: any, isMe: boolean }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const metricDefinitions = [
        { key: "Regularidad", label: "Regularidad", desc: "Estabilidad. 100 = Puntuaciones siempre similares.", color: "text-blue-500" },
        { key: "Compromiso", label: "Compromiso", desc: "Fidelidad. 100 = No te has perdido ninguna carrera.", color: "text-purple-500" },
        { key: "Anticipación", label: "Anticipación", desc: "Planificación. 100 = Predicciones con mucha antelación.", color: "text-green-500" },
        { key: "Calidad/Podios", label: "Calidad", desc: "Eficiencia. 100 = Puntos altos contra muchos rivales.", color: "text-yellow-500" },
        { key: "Vidente", label: "Vidente", desc: "Precisión. 100 = Alto % de aciertos exactos.", color: "text-red-500" }
    ];

    useEffect(() => { 
        setLoading(true);
        const fetchStats = isMe ? API.getMyStats() : API.getUserStats(targetUser.id);
        fetchStats.then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
    }, [targetUser.id, isMe]);

    if (loading) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse flex flex-col items-center gap-4"><Activity className="animate-spin text-f1-red"/> Cargando telemetría...</div>;
    if (!stats) return <div className="p-10 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl m-4">No hay datos disponibles para este piloto.</div>;

    const insights = stats.insights || {};
    const hero = insights.hero || { code: "---", count: 0 };
    const villain = insights.villain || { code: "---", count: 0 };
    const bestRace = insights.best_race || { gp_name: "Sin datos", year: "----", points: 0, percentile: "---" };
    const momentum = insights.momentum || 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center md:text-left">
                    <div className="text-gray-400 mb-2 flex justify-center md:justify-start"><Activity size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.total_points}</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Puntos Totales</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center md:text-left">
                    <div className="text-blue-400 mb-2 flex justify-center md:justify-start"><Zap size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.avg_points}</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Media / Carrera</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center md:text-left">
                    <div className="text-purple-400 mb-2 flex justify-center md:justify-start"><Flag size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.races_played}</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">GPs Disputados</div>
                </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center md:text-left">
                    <div className="text-green-400 mb-2 flex justify-center md:justify-start"><Star size={20}/></div>
                    <div className="text-3xl font-black text-gray-900">{stats.podium_ratio_percent}%</div>
                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Ratio Podios</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Trophy size={16}/> Vitrina de Trofeos</h3>
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

                    <div className="grid grid-cols-1 gap-4">
                        <div className={`p-5 rounded-[2rem] shadow-lg text-white relative overflow-hidden ${momentum > 2 ? "bg-gradient-to-r from-orange-500 to-red-600 shadow-orange-200" : "bg-gray-800"}`}>
                             <div className="absolute -right-6 -bottom-6 text-white/10 rotate-12"><Flame size={100} strokeWidth={1.5} /></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 text-white/80 mb-1"><TrendingUp size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Momentum</span></div>
                                    <div className="text-2xl font-black italic">{momentum > 2 ? "Racha Incendiaria" : (momentum > 0 ? "Calentando Motores" : "Motor Frío")}</div>
                                    <div className="text-xs font-medium text-white/80 mt-1">{momentum} carreras seguidas por encima de tu media.</div>
                                </div>
                                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm border border-white/20"><Flame size={24} className={momentum > 2 ? "text-white animate-pulse" : "text-gray-400"} fill="currentColor"/></div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14}/> Tus Predilecciones</h3>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-green-50/80 rounded-2xl p-3 flex flex-col items-center text-center relative overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-green-200 flex items-center justify-center shadow-sm mb-2 z-10"><span className="font-black text-green-700 text-xs">{hero.code}</span></div>
                                    <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Ojito Derecho</div>
                                    <div className="text-xs font-black text-gray-800 leading-tight mb-1">Top 3</div>
                                    <div className="text-[9px] text-green-600/70 font-bold bg-green-100 px-2 py-0.5 rounded-full">{hero.count} Veces</div>
                                </div>
                                <div className="flex-1 bg-red-50/80 rounded-2xl p-3 flex flex-col items-center text-center relative overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-red-200 flex items-center justify-center shadow-sm mb-2 z-10"><span className="font-black text-red-700 text-xs">{villain.code}</span></div>
                                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Bestia Negra</div>
                                    <div className="text-xs font-black text-gray-800 leading-tight mb-1">Predicción DNF</div>
                                    <div className="text-[9px] text-red-500/70 font-bold bg-red-100 px-2 py-0.5 rounded-full">{villain.count} Veces</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900 p-5 rounded-[2rem] shadow-xl relative overflow-hidden text-white group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 opacity-10 blur-[40px] rounded-full pointer-events-none transform translate-x-10 -translate-y-10 group-hover:opacity-20 transition-opacity"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Star size={12} fill="currentColor"/> Prime Performance</h3>
                                    <div className="text-xl font-black italic tracking-tighter text-white">{bestRace.gp_name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-white/10 px-1.5 py-0.5 rounded"><Calendar size={10}/> {bestRace.year}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-white/10 px-1.5 py-0.5 rounded"><MapPin size={10}/> {bestRace.percentile}</div>
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

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col relative overflow-hidden h-full">
                    <div className="flex items-center justify-between w-full mb-4">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Shield size={16}/> ADN de Piloto</h3>
                    </div>
                    <div className="w-full h-64 relative z-10 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radar || []}>
                                <PolarGrid stroke="#e5e7eb" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 900 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Nivel" dataKey="A" stroke="#E10600" strokeWidth={3} fill="#E10600" fillOpacity={0.2} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#E10600', fontWeight: 'bold' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100 flex-1 flex flex-col justify-center space-y-4">
                        {metricDefinitions.map((def) => (
                            <div key={def.key} className="flex gap-3 items-start group">
                                <div className={`mt-1 p-1.5 rounded-lg bg-gray-50 transition-colors group-hover:bg-white group-hover:shadow-sm ${def.color}`}><Info size={14} strokeWidth={2.5}/></div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 block mb-0.5">{def.label}</span>
                                    <p className="text-xs text-gray-400 leading-snug">{def.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AchievementsTab = ({ targetUser }: { targetUser: any }) => {
    const [list, setList] = useState<any[]>([]);
    
    useEffect(() => {
        API.getAchievements(targetUser.id).then(setList).catch(console.error);
    }, [targetUser.id]);

    const grouped = {
        CAREER: (list || []).filter(a => a.type === 'CAREER'),
        SEASON: (list || []).filter(a => a.type === 'SEASON'),
        EVENT: (list || []).filter(a => a.type === 'EVENT')
    };

    const typeOrder = ['CAREER', 'SEASON', 'EVENT'];

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {typeOrder.map(type => {
                const achievements = grouped[type as keyof typeof grouped];
                if (!achievements || achievements.length === 0) return null;

                const unlockedCount = achievements.filter(a => a.unlocked).length;

                return (
                    <div key={type} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black text-gray-900 italic uppercase tracking-tighter flex items-center gap-2">
                                {type === 'CAREER' && <Crown className="text-yellow-500" size={24}/>}
                                {type === 'SEASON' && <Calendar className="text-blue-500" size={24}/>}
                                {type === 'EVENT' && <Zap className="text-purple-500" size={24}/>}
                                {TYPE_LABELS[type] || type}
                            </h3>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{unlockedCount} / {achievements.length}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {achievements.map((ach: any) => {
                                const styles = RARITY_STYLES[ach.rarity] || RARITY_STYLES.COMMON;
                                const isHidden = ach.rarity === 'HIDDEN' && !ach.unlocked;
                                const IconComponent = ICON_MAP[ach.icon] || <Star size={24}/>;

                                return (
                                    <div key={ach.id} className={`relative p-6 rounded-2xl border-2 transition-all flex items-start gap-4 overflow-hidden group hover:shadow-lg ${ach.unlocked ? `${styles.bg} ${styles.border}` : "bg-gray-50 border-gray-100 opacity-70 grayscale hover:grayscale-0"}`}>
                                        
                                        <div className={`p-3 rounded-xl shrink-0 ${ach.unlocked ? "bg-white shadow-sm" : "bg-gray-200 text-gray-400"}`}>
                                            <div className={ach.unlocked ? styles.text : "text-gray-400"}>
                                                {isHidden ? <Lock size={24}/> : IconComponent}
                                            </div>
                                        </div>

                                        <div className="flex-1 z-10">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${styles.badge}`}>
                                                    {isHidden ? "???" : styles.label}
                                                </span>
                                            </div>
                                            
                                            <h4 className={`font-black text-sm uppercase italic tracking-tighter leading-tight ${ach.unlocked ? "text-gray-900" : "text-gray-500"}`}>
                                                {isHidden ? "Logro Secreto" : ach.name}
                                            </h4>
                                            
                                            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                                {isHidden ? "Sigue jugando para descubrirlo..." : ach.description}
                                            </p>

                                            {ach.unlocked && (
                                                <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-2">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                        <Unlock size={10}/> 
                                                        {ach.unlocked_at ? formatDate(ach.unlocked_at) : (ach.date ? formatDate(ach.date) : "Desbloqueado")}
                                                    </div>

                                                    {(ach.gp_name || ach.season_name) && (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {ach.gp_name && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider border border-gray-200">
                                                                        <MapPin size={10} /> {ach.gp_name}
                                                                </span>
                                                            )}
                                                            
                                                            {ach.season_name && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-gray-100">
                                                                        <Calendar size={10} /> {ach.season_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function Profile() {
    const { refreshProfile, avatar, username: ctxUsername, acronym: ctxAcronym, createdAt: ctxCreatedAt } = useContext(AuthContext) as any;
    
    const [currentUserFull, setCurrentUserFull] = useState<any>(null);
    const [displayedUser, setDisplayedUser] = useState<any>(null);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [isLoadingInit, setIsLoadingInit] = useState(true);

    const [avatars, setAvatars] = useState<any[]>([]);
    const [loadingAvatar, setLoadingAvatar] = useState(false);
    const [activeTab, setActiveTab] = useState("stats");
    
    useEffect(() => {
        Promise.all([
            API.getMe().catch(err => null),
            API.getUsersList().catch(err => []),
            API.getAvatars().catch(err => [])
        ]).then(([meData, usersData, avatarsData]) => {
            if (meData) setCurrentUserFull(meData);
            if (usersData) setUsersList(usersData);
            if (avatarsData) setAvatars(avatarsData);

            if (meData) {
                const meInList = usersData ? usersData.find((u: any) => u.id === meData.id) : null;
                setDisplayedUser(meInList || meData);
            }
            setIsLoadingInit(false);
        });
    }, []);
    
    useEffect(() => {
        if (displayedUser && usersList.length > 0) {
            const found = usersList.find((u: any) => u.id === displayedUser.id);
            if (found && found.created_at && !displayedUser.created_at) {
                setDisplayedUser((prev: any) => ({ ...prev, created_at: found.created_at }));
            }
        }
    }, [usersList, displayedUser?.id]); 

    const handleSelectAvatar = async (filename: string) => {
        setLoadingAvatar(true);
        try { await API.updateMyAvatar(filename); if (refreshProfile) await refreshProfile(); } catch (e) { alert("Error"); }
        setLoadingAvatar(false);
    };

    const getAvatarUrl = (filename: string) => {
        if (!filename) return "http://127.0.0.1:8000/static/avatars/default.png";
        if (filename.startsWith("http")) return filename;
        return `http://127.0.0.1:8000/static/avatars/${filename}`; 
    };

    if (isLoadingInit || !displayedUser) return <div className="p-10 text-center animate-pulse text-gray-400 font-black uppercase tracking-widest">Cargando perfil...</div>;

    const isMe = currentUserFull && displayedUser.id === currentUserFull.id;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20 p-4">
            <div className="relative text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-gray-800 bg-gray-900">
                <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-f1-red opacity-10 blur-[100px] rounded-full transform translate-x-20 -translate-y-20"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 opacity-10 blur-[80px] rounded-full transform -translate-x-10 translate-y-10"></div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="relative group shrink-0">
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full p-1.5 bg-gradient-to-br from-f1-red to-purple-600 shadow-2xl shadow-purple-900/50">
                            <img 
                                src={getAvatarUrl(isMe ? avatar : displayedUser.avatar)} 
                                alt="Avatar" 
                                className="w-full h-full rounded-full object-cover bg-gray-800 border-4 border-gray-900"
                            />
                        </div>
                        <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                            <div className="bg-white text-gray-900 text-xs font-black px-3 py-1 rounded-md shadow-lg border-2 border-gray-900 uppercase tracking-widest transform skew-x-[-10deg]">
                                {isMe ? ctxAcronym : (displayedUser.acronym || "---")}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center md:text-left space-y-1 flex-1 w-full">
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center mb-2">
                            <span className={`px-3 py-1 rounded-full border backdrop-blur-md text-[10px] font-black uppercase tracking-widest ${isMe ? "bg-white/10 border-white/20 text-white/80" : "bg-f1-red/20 border-f1-red/30 text-f1-red"}`}>
                                {isMe ? "Licencia Oficial" : "Perfil Visitante"}
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/50">
                                <Calendar size={10}/> Debut: {formatDate(isMe ? ctxCreatedAt : displayedUser.created_at)}
                            </span>
                        </div>
                        
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic text-white leading-tight">
                            {isMe ? ctxUsername : displayedUser.username}
                        </h1>
                        <p className="text-gray-400 text-sm max-w-md mx-auto md:mx-0 leading-relaxed">
                            {isMe 
                                ? "Gestiona tu trayectoria, analiza tu rendimiento y mejora tus predicciones." 
                                : `Analizando métricas de rendimiento y palmarés de ${displayedUser.username}.`}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 items-center md:items-end w-full md:w-auto">
                        <div className="flex flex-col items-end gap-1 w-full">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:block">Explorar Parrilla</label>
                            <UserSearch currentUser={currentUserFull} onSelectUser={setDisplayedUser} usersList={usersList} />
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 bg-white/5 p-1.5 rounded-xl backdrop-blur-sm border border-white/10 w-full md:w-auto">
                            <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'stats' ? "bg-white text-gray-900 shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                <Activity size={16} /> Stats
                            </button>
                            <button onClick={() => setActiveTab('achievements')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'achievements' ? "bg-white text-gray-900 shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                <Trophy size={16} /> Logros
                            </button>
                            
                            {!isMe && (
                                <button onClick={() => setActiveTab('bingo')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'bingo' ? "bg-white text-gray-900 shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                    <Hexagon size={16} /> Bingo
                                </button>
                            )}

                            {isMe && (
                                <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'settings' ? "bg-white text-gray-900 shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                    <Settings size={16} /> Ajustes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={activeTab + displayedUser.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {activeTab === 'stats' && <StatsTab targetUser={displayedUser} isMe={isMe} />}
                    {activeTab === 'achievements' && <AchievementsTab targetUser={displayedUser} />}
                    {activeTab === 'bingo' && !isMe && <BingoTab targetUser={displayedUser} />}
                    {activeTab === 'settings' && isMe && <SettingsTab avatars={avatars} avatar={avatar} handleSelectAvatar={handleSelectAvatar} loadingAvatar={loadingAvatar} reloadUser={refreshProfile}/>}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}