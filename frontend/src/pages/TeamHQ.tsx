import React, { useEffect, useState, useContext } from "react";
import * as API from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Users, Plus, LogOut, Copy, CheckCircle, Shield, 
    Search, Award, Zap, Loader2 // <--- AÑADE Loader2
} from "lucide-react";

const TeamHQ: React.FC = () => {
    const { token } = useContext(AuthContext);
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Estado para bloquear botones mientras carga
    const [isSubmitting, setIsSubmitting] = useState(false); // <--- NUEVO

    // Inputs
    const [createName, setCreateName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        loadMyTeam();
    }, [token]);

    const loadMyTeam = async () => {
        // No ponemos setLoading(true) aquí para que no parpadee toda la pantalla al recargar acciones
        try {
            const data = await API.getMyTeam();
            setTeam(data);
        } catch (e) {
            setTeam(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!createName.trim() || isSubmitting) return; // Bloqueo doble clic
        setIsSubmitting(true);
        setErrorMsg("");
        
        try {
            await API.createTeamPlayer(createName);
            setCreateName(""); // Limpiar input
            await loadMyTeam(); // Recargar datos
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Error al crear equipo");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleJoin = async () => {
        if (!joinCode.trim() || isSubmitting) return; // Bloqueo doble clic
        setIsSubmitting(true);
        setErrorMsg("");

        try {
            await API.joinTeamPlayer(joinCode);
            setJoinCode(""); // Limpiar input
            await loadMyTeam(); // Recargar datos inmediatamente
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Código inválido o equipo lleno");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLeave = async () => {
        if (!confirm("¿Seguro que quieres romper tu contrato con la escudería?")) return;
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            await API.leaveTeamPlayer();
            setTeam(null); // Borrar equipo de la vista localmente
            await loadMyTeam(); // Verificar con backend
        } catch (err) {
            alert("Error al salir del equipo");
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = () => {
        if (team?.join_code) {
            navigator.clipboard.writeText(team.join_code);
            // Podrías poner un toast aquí, pero el alert funciona
            alert("Código copiado: " + team.join_code);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-4">
            <Loader2 className="animate-spin" size={40}/>
            <p className="text-sm font-bold uppercase tracking-widest">Contactando con la FIA...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-10 flex items-center justify-center">
            <div className="max-w-4xl w-full">
                
                <header className="mb-10 text-center">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic mb-2">
                        Team <span className="text-f1-red">Headquarters</span>
                    </h1>
                    <p className="text-gray-400 font-medium">Gestión de contratos y escuderías</p>
                </header>

                <AnimatePresence mode="wait">
                    {/* CASO 1: TIENE EQUIPO */}
                    {team ? (
                        <motion.div 
                            key="has-team"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="bg-gray-900 p-8 text-white flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-f1-red rounded-2xl flex items-center justify-center shadow-lg shadow-f1-red/50">
                                        <Shield size={32} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Escudería Actual</div>
                                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">{team.name}</h2>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleLeave} 
                                    disabled={isSubmitting}
                                    className="p-3 bg-white/10 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-xl transition-all disabled:opacity-50" 
                                    title="Salir del equipo"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <LogOut size={20} />}
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* LISTA DE PILOTOS */}
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Pilotos Oficiales</h3>
                                    <div className="space-y-3">
                                        {team.members.map((member: string) => (
                                            <div key={member} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-gray-700 shadow-sm border border-gray-100">
                                                    {member.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-800">{member}</span>
                                                <span className="ml-auto text-xs font-black bg-green-100 text-green-700 px-2 py-1 rounded uppercase">Activo</span>
                                            </div>
                                        ))}
                                        {team.members.length < 2 && (
                                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 text-sm font-bold italic">
                                                Asiento Libre
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* TARJETA DE INVITACIÓN */}
                                <div className="bg-f1-dark rounded-[2rem] p-8 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-32 bg-f1-red/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    
                                    <h3 className="text-lg font-black uppercase italic mb-1 z-10 relative">Código de Acceso</h3>
                                    <p className="text-white/60 text-xs mb-6 z-10 relative">Comparte este código con tu compañero para que se una.</p>
                                    
                                    <div className="flex items-center gap-2 bg-white/10 p-4 rounded-xl border border-white/10 z-10 relative backdrop-blur-sm">
                                        <code className="text-2xl font-mono font-black tracking-widest text-f1-red flex-1 text-center select-all">
                                            {team.join_code}
                                        </code>
                                        <button onClick={copyToClipboard} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                            <Copy size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* CASO 2: AGENTE LIBRE (SIN EQUIPO) */
                        <motion.div 
                            key="no-team"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                            {/* CREAR EQUIPO */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 hover:border-blue-200 transition-colors group">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Award size={24}/>
                                </div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-gray-900">Fundar Escudería</h3>
                                <p className="text-gray-400 text-sm mb-6">Crea tu propio equipo y conviértete en el Jefe de Equipo.</p>
                                
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="Nombre del Equipo (Ej: Audi F1)" 
                                        value={createName}
                                        onChange={e => setCreateName(e.target.value)}
                                        disabled={isSubmitting}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <button 
                                        onClick={handleCreate}
                                        disabled={!createName || isSubmitting}
                                        className="w-full bg-gray-900 text-white font-black py-3 rounded-xl uppercase italic tracking-widest hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>}
                                        {isSubmitting ? "Creando..." : "Crear"}
                                    </button>
                                </div>
                            </div>

                            {/* UNIRSE A EQUIPO */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 hover:border-f1-red transition-colors group">
                                <div className="w-12 h-12 bg-red-100 text-f1-red rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Zap size={24}/>
                                </div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-gray-900">Fichar por Equipo</h3>
                                <p className="text-gray-400 text-sm mb-6">Introduce el código que te ha pasado tu compañero.</p>
                                
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="Código (Ej: X9A-2B1)" 
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                        disabled={isSubmitting}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-mono font-bold text-gray-800 focus:ring-2 focus:ring-f1-red text-center tracking-widest disabled:opacity-50"
                                    />
                                    <button 
                                        onClick={handleJoin}
                                        disabled={joinCode.length < 6 || isSubmitting}
                                        className="w-full bg-gray-900 text-white font-black py-3 rounded-xl uppercase italic tracking-widest hover:bg-f1-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                                        {isSubmitting ? "Uniendo..." : "Unirse"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {errorMsg && (
                    <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y:0}} className="mt-6 p-4 bg-red-50 text-red-600 text-sm font-bold text-center rounded-xl border border-red-100">
                        🚨 {errorMsg}
                        <button onClick={() => setErrorMsg("")} className="ml-4 underline">Cerrar</button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default TeamHQ;