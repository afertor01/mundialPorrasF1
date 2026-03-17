import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import * as API from "../api/api";
import { Trophy, CheckCircle2, Hexagon, TrendingUp, Loader2, XCircle, MousePointerClick, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";

// LÍMITE DE SELECCIONES PARA EVITAR EL "ALL-IN"
const MAX_SELECTIONS = 20;

interface TokenPayload {
    sub: string;
    username: string;
    acronym: string;
    role: string;
}

const Bingo: React.FC = () => {
    const { token } = useContext(AuthContext);
    const { toast } = useToast();
    const [currentUser, setCurrentUser] = useState<TokenPayload | null>(null);

    const [tiles, setTiles] = useState<any[]>([]);
    const [standings, setStandings] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"board" | "standings">("board");
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [status, setStatus] = useState<"preseason" | "closed" | "admin_force_open">("closed");

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode<TokenPayload>(token);
                setCurrentUser(decoded);
            } catch (e) {
                console.error("Error decodificando token", e);
            }
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [boardResponse, standingsData] = await Promise.all([
                API.getBingoBoard(),
                API.getBingoStandings()
            ]);
            setTiles(boardResponse.tiles);
            setIsOpen(boardResponse.is_open);
            setStatus(boardResponse.status);
            setStandings(standingsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (tileId: number) => {
        const originalTiles = [...tiles];
        const tileIndex = tiles.findIndex(t => t.id === tileId);

        if (tileIndex === -1) return;

        const isCurrentlySelected = tiles[tileIndex].is_selected_by_me;
        const currentSelectionsCount = tiles.filter(t => t.is_selected_by_me).length;

        // --- VALIDACIÓN DE LÍMITE ---
        if (!isCurrentlySelected && currentSelectionsCount >= MAX_SELECTIONS) {
            toast(`¡Límite alcanzado! Solo puedes elegir ${MAX_SELECTIONS} casillas. Desmarca alguna para elegir esta.`, "warning");
            return;
        }

        // Optimistic Update
        const newTiles = [...tiles];
        newTiles[tileIndex] = {
            ...newTiles[tileIndex],
            is_selected_by_me: !isCurrentlySelected,
            selection_count: isCurrentlySelected ? newTiles[tileIndex].selection_count - 1 : newTiles[tileIndex].selection_count + 1
        };
        setTiles(newTiles);

        try {
            await API.toggleBingoTile(tileId);
            const boardResponse = await API.getBingoBoard();
            setTiles(boardResponse.tiles);
            setIsOpen(boardResponse.is_open);
            setStatus(boardResponse.status);
        } catch (error: any) {
            setTiles(originalTiles);
            toast(error.response?.data?.detail || "No se pudo cambiar la selección.", "error");
        }
    };

    const mySelectionsCount = tiles.filter(t => t.is_selected_by_me).length;

    const earnedPoints = tiles
        .filter(t => t.is_selected_by_me && t.is_completed)
        .reduce((acc, curr) => acc + curr.current_value, 0);

    const potentialPoints = tiles
        .filter(t => t.is_selected_by_me)
        .reduce((acc, curr) => acc + curr.current_value, 0);

    // --- LÓGICA DE CLASIFICACIÓN (Top 20 + Usuario) ---
    const top20 = standings.slice(0, 20);
    const myRankingIndex = standings.findIndex(s => s.username.toLowerCase() === currentUser?.username?.toLowerCase());
    const amInTop20 = myRankingIndex !== -1 && myRankingIndex < 20;
    const myStats = myRankingIndex !== -1 ? standings[myRankingIndex] : null;

    return (
        <div className="min-h-screen bg-[#fcfcfd] p-4 pb-24 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER HERO */}
                <div className="bg-gray-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl overflow-hidden relative border-4 border-gray-800">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-f1-red opacity-20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Hexagon className="text-f1-red fill-f1-red animate-pulse" size={28} />
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Official Game</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-f1-red to-orange-500 font-black italic">Bingo</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <p className="text-gray-400 font-medium max-w-lg text-sm md:text-base border-l-2 border-f1-red pl-4">
                                    Tienes <strong>{MAX_SELECTIONS} fichas</strong>. Úsalas sabiamente.
                                    Cuanto menos gente elija una casilla, más puntos valdrá si ocurre.
                                </p>
                                <button 
                                    onClick={() => setShowHelp(true)}
                                    className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all border border-white/10 shadow-lg"
                                    title="¿Cómo jugar?"
                                >
                                    <Info size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 w-full md:w-auto">
                            <div className={`flex-1 md:flex-none backdrop-blur-md border rounded-3xl p-5 text-center min-w-[120px] transition-colors ${mySelectionsCount >= MAX_SELECTIONS ? "bg-red-500/20 border-red-500/50" : "bg-white/5 border-white/10"}`}>
                                <div className={`text-3xl font-black ${mySelectionsCount >= MAX_SELECTIONS ? "text-red-400" : "text-white"}`}>
                                    {mySelectionsCount}<span className="text-sm text-gray-400">/{MAX_SELECTIONS}</span>
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Usadas</div>
                            </div>
                            <div className="flex-1 md:flex-none bg-gradient-to-br from-f1-red to-red-700 rounded-3xl p-5 text-center min-w-[120px] shadow-lg shadow-red-900/50">
                                <div className="text-3xl font-black text-white">
                                    {earnedPoints}<span className="text-sm opacity-60 ml-1">/ {potentialPoints}</span>
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/80 mt-1">Puntos (Hits / Potenc)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex justify-center sticky top-4 z-30">
                    <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-gray-100 inline-flex gap-2">
                        <button
                            onClick={() => setActiveTab("board")}
                            className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === "board" ? "bg-gray-900 text-white shadow-md transform scale-105" : "text-gray-400 hover:bg-gray-100"}`}
                        >
                            Mi Tablero
                        </button>
                        <button
                            onClick={() => setActiveTab("standings")}
                            className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === "standings" ? "bg-gray-900 text-white shadow-md transform scale-105" : "text-gray-400 hover:bg-gray-100"}`}
                        >
                            Clasificación
                        </button>
                    </div>
                </div>

                {/* STATUS ALERT */}
                {!loading && activeTab === "board" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-4 p-4 rounded-3xl border ${status === "preseason" ? "bg-blue-50 border-blue-100 text-blue-800" :
                            status === "admin_force_open" ? "bg-purple-50 border-purple-100 text-purple-800" :
                                "bg-amber-50 border-amber-100 text-amber-800"
                            }`}
                    >
                        <div className={`p-2 rounded-2xl ${status === "preseason" ? "bg-blue-500 text-white" :
                            status === "admin_force_open" ? "bg-purple-500 text-white" :
                                "bg-amber-500 text-white"
                            }`}>
                            {status === "closed" ? <XCircle size={20} /> : <TrendingUp size={20} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black uppercase text-xs tracking-widest">
                                {status === "preseason" ? "🎯 Bingo Abierto (Pretemporada)" :
                                    status === "admin_force_open" ? "🔓 Bingo Abierto (Habilitado por Admin)" :
                                        "🔒 Bingo Cerrado"}
                            </h4>
                            <p className="text-[10px] font-medium opacity-80">
                                {status === "preseason" ? "La temporada aún no ha comenzado. ¡Elige tus casillas libremente!" :
                                    status === "admin_force_open" ? "Un administrador ha abierto el bingo de forma excepcional. Aprovecha para reajustar tus selecciones." :
                                        "La temporada ya ha comenzado y las selecciones están bloqueadas. ¡Suerte con tus predicciones!"}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* CONTENT AREA */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                        <Loader2 className="animate-spin text-f1-red" size={48} />
                        <span className="font-bold uppercase tracking-widest text-xs">Cargando datos...</span>
                    </div>
                ) : activeTab === "board" ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                    >
                        {tiles.map((tile) => {
                            const isSelected = tile.is_selected_by_me;
                            const isCompleted = tile.is_completed;

                            // --- LÓGICA DE ESTILOS ---

                            // 1. Estilos Base (Blanco / Gris)
                            let cardStyle = "bg-white border-gray-100 hover:border-blue-300 hover:shadow-lg";
                            let badgeStyle = "text-blue-600 bg-blue-50 border-blue-100";
                            let textStyle = "text-gray-800";
                            let completedBadgeStyle = "bg-white text-green-600"; // Estilo del sticker "Completado"

                            // Rareza visual en los badges (solo afecta cuando no está completada/seleccionada)
                            if (tile.current_value >= 50) badgeStyle = "text-orange-600 bg-orange-50 border-orange-100";
                            if (tile.current_value >= 80) badgeStyle = "text-purple-600 bg-purple-50 border-purple-100";

                            // 2. Sobrescritura por Estado

                            // A) JACKPOT (Dorado): Completado Y Seleccionado
                            if (isCompleted && isSelected) {
                                // Fondo degradado dorado intenso
                                cardStyle = "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 border-yellow-400 shadow-xl shadow-yellow-500/40 ring-2 ring-yellow-200 ring-offset-2 transform scale-[1.02] z-10";
                                // Texto oscuro para contraste (Marrón muy oscuro)
                                textStyle = "text-yellow-950";
                                // Badges en blanco puro con texto dorado oscuro
                                badgeStyle = "bg-white border-transparent text-yellow-800 shadow-sm";
                                completedBadgeStyle = "bg-white text-yellow-800 shadow-sm";
                            }
                            // B) Oportunidad Perdida (Verde): Completado pero NO seleccionado
                            else if (isCompleted) {
                                cardStyle = "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200";
                                textStyle = "text-white";
                                badgeStyle = "bg-white/20 border-transparent text-white";
                                completedBadgeStyle = "bg-white text-green-700 shadow-sm";
                            }
                            // C) Mi Apuesta (Negro): Seleccionado pero pendiente
                            else if (isSelected) {
                                cardStyle = "bg-gray-900 border-gray-900 text-white shadow-xl translate-y-[-4px]";
                                textStyle = "text-white";
                                badgeStyle = "bg-white/20 border-transparent text-white";
                            }

                            return (
                                <div
                                    key={tile.id}
                                    onClick={() => isOpen && handleToggle(tile.id)}
                                    className={`
                                        relative group rounded-3xl p-6 border-2 transition-all duration-300 flex flex-col justify-between min-h-[180px] select-none
                                        ${isOpen ? "cursor-pointer" : "cursor-default"}
                                        ${cardStyle}
                                        ${!isSelected && !isCompleted && mySelectionsCount >= MAX_SELECTIONS ? "opacity-40 grayscale" : "opacity-100"}
                                    `}
                                >
                                    {/* Header: Puntos y Check */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 border ${badgeStyle}`}>
                                            <TrendingUp size={12} /> {tile.current_value} pts
                                        </div>

                                        <div className={`transition-all duration-300 ${isSelected ? "opacity-100 scale-100" : "opacity-20 scale-75 group-hover:opacity-50"}`}>
                                            {isCompleted ? (
                                                // Check completado
                                                isCompleted && isSelected ? (
                                                    // Versión Dorada: Check verde oscuro o blanco sobre fondo oscuro
                                                    <div className="bg-yellow-950 rounded-full p-0.5">
                                                        <CheckCircle2 className="text-yellow-400" size={20} />
                                                    </div>
                                                ) : (
                                                    // Versión Normal
                                                    <CheckCircle2 className="text-white" size={24} />
                                                )
                                            ) : (
                                                // Círculo de selección vacío/lleno
                                                <div className={`w-6 h-6 rounded-full border-4 ${isSelected ? "border-f1-red bg-f1-red" : "border-gray-300"}`} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Descripción */}
                                    <p className={`text-sm font-bold leading-snug ${textStyle}`}>
                                        {tile.description}
                                    </p>

                                    {/* Footer: Picks y Badge Completado */}
                                    <div className={`mt-4 pt-3 border-t flex justify-between items-center ${isCompleted && isSelected ? "border-yellow-600/20" : "border-white/10"}`}>
                                        <div className={`text-[9px] font-bold uppercase tracking-widest ${isSelected || isCompleted ? (isCompleted && isSelected ? "text-yellow-900/60" : "text-white/60") : "text-gray-400"}`}>
                                            {tile.selection_count} picks
                                        </div>

                                        {isCompleted && (
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${completedBadgeStyle}`}>
                                                Completado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                ) : (
                    // --- TABLA DE CLASIFICACIÓN (TOP 20) ---
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-8 py-6 bg-gray-900 text-white flex items-center gap-4">
                                <div className="bg-f1-red p-2 rounded-lg"><Trophy size={24} /></div>
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-lg">Ranking Bingo</h3>
                                    <p className="text-gray-400 text-xs font-medium">Top 20 • Basado en rareza de aciertos</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Pos</th>
                                            <th className="px-6 py-4">Piloto</th>
                                            <th className="px-6 py-4 text-center" title="Casillas elegidas">Picks</th>
                                            <th className="px-6 py-4 text-center" title="Aciertos de tus picks">Hits</th>
                                            <th className="px-6 py-4 text-center text-red-400" title="Casillas completadas que NO elegiste">Missed</th>
                                            <th className="px-6 py-4 text-right">Puntos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {top20.length > 0 ? top20.map((s, idx) => {
                                            const isMe = s.username.toLowerCase() === currentUser?.username?.toLowerCase();
                                            return (
                                                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isMe ? "bg-blue-50 border-l-4 border-blue-600" : ""}`}>
                                                    <td className={`px-6 py-4 font-mono font-black ${isMe ? "text-blue-600" : "text-gray-400"}`}>
                                                        #{idx + 1}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-8 h-6 rounded flex items-center justify-center text-[9px] font-black italic shadow-sm transition-colors ${isMe ? "bg-blue-600 text-white" : "bg-gray-900 text-white"}`}>
                                                                {s.acronym}
                                                            </span>
                                                            <span className={`font-bold transition-colors ${isMe ? "text-blue-700" : "text-gray-800"}`}>
                                                                {s.username} {isMe && "(Tú)"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-500">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <MousePointerClick size={14} /> {s.selections_count}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center justify-center gap-1 w-fit mx-auto transition-all ${isMe ? "bg-blue-600 text-white" : "bg-green-100 text-green-700"}`}>
                                                            <CheckCircle2 size={12} /> {s.hits}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-center font-bold ${isMe ? "text-blue-300" : "text-red-400"}`}>
                                                        {s.missed > 0 ? `-${s.missed}` : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`text-xl font-black italic tracking-tighter transition-colors ${isMe ? "text-blue-800" : "text-gray-900"}`}>
                                                            {s.total_points}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic font-medium">
                                                    Aún no hay datos.
                                                </td>
                                            </tr>
                                        )}

                                        {/* TU FILA (Si no estás en el Top 20) */}
                                        {!amInTop20 && myStats && (
                                            <>
                                                <tr className="bg-gray-50/50"><td colSpan={6} className="p-2 text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black border-t-2 border-gray-100 italic">--- Fuera del Top 20 ---</td></tr>
                                                <tr className="bg-blue-900 text-white shadow-2xl relative z-10 border-t-2 border-blue-400">
                                                    <td className="px-6 py-5 font-mono font-black text-blue-200 text-lg">
                                                        #{myRankingIndex + 1}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-10 h-8 bg-white text-blue-900 rounded-lg flex items-center justify-center text-xs font-black italic shadow-inner">{myStats.acronym}</span>
                                                            <span className="font-black text-white uppercase tracking-tighter text-base">
                                                                {myStats.username} (Tú)
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="flex items-center justify-center gap-1 font-black text-blue-200 italic">
                                                            <MousePointerClick size={16} /> {myStats.selections_count}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-black flex items-center justify-center gap-2 w-fit mx-auto border border-blue-400 shadow-lg">
                                                            <CheckCircle2 size={16} /> {myStats.hits}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center text-blue-300 font-bold text-base">
                                                        {myStats.missed > 0 ? `-${myStats.missed}` : "-"}
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-3xl font-black italic tracking-tighter text-white drop-shadow-md leading-none">{myStats.total_points}</span>
                                                            <span className="text-[10px] text-blue-300 font-bold uppercase mt-1">Puntos Totales</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* MODAL DE AYUDA BINGO */}
            <AnimatePresence>
                {showHelp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="bg-white rounded-[2.5rem] shadow-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
                        >
                            {/* Cabecera Modal */}
                            <div className="p-6 md:p-10 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-f1-red rounded-xl text-white shadow-lg shadow-red-200">
                                            <Hexagon size={24} fill="currentColor" />
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-gray-900">
                                            Cómo Jugar al <span className="text-f1-red">Bingo</span>
                                        </h2>
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-12">El desafío de la regularidad y la suerte</p>
                                </div>
                                <button 
                                    onClick={() => setShowHelp(false)} 
                                    className="p-3 bg-gray-200 hover:bg-gray-300 rounded-2xl text-gray-600 transition-all hover:rotate-90"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Cuerpo Modal */}
                            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar space-y-10">
                                {/* REGLA 1: EL PLAZO */}
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-f1-red flex items-center gap-2">
                                        <div className="w-2 h-2 bg-f1-red rounded-full"></div> Plazo de Selección
                                    </h3>
                                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl text-amber-900 text-sm leading-relaxed">
                                        <p className="font-bold mb-2 flex items-center gap-2 animate-pulse">
                                            <XCircle size={18} className="text-amber-600" /> ¡Atención! Ventana limitada
                                        </p>
                                        Tu selección del Bingo debe realizarse íntegramente durante la <strong>Pretemporada</strong> (antes de que se apague el semáforo de la Round 1). Una vez comenzado el mundial, el tablero se bloquea de forma permanente para todos los jugadores.
                                        <div className="mt-3 text-xs opacity-70 italic border-t border-amber-200/50 pt-2">
                                            * Excepcionalmente, un administrador podría abrir el bingo durante la temporada si se añaden nuevas casillas o eventos especiales.
                                        </div>
                                    </div>
                                </section>

                                {/* REGLA 2: LAS FICHAS */}
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div> Las 20 Fichas
                                    </h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        Dispones de un presupuesto máximo de <strong>{MAX_SELECTIONS} fichas</strong>. No es obligatorio gastarlas todas, pero cada una es una oportunidad de puntuar. Elije eventos que creas que ocurrirán a lo largo de toda la temporada (desde accidentes concretos hasta hazañas de pilotos).
                                    </p>
                                </section>

                                {/* REGLA 3: EL PUNTAJE (RAREZA) */}
                                <section className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div> Sistema de Rareza
                                    </h3>
                                    <div className="bg-gray-900 rounded-[2rem] p-6 text-white overflow-hidden relative border border-gray-700">
                                        <TrendingUp className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 pointer-events-none" />
                                        <div className="relative z-10 space-y-4">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                                Los puntos son dinámicos: cuanto menos gente elija una casilla, más valor tendrá si el evento se completa.
                                            </p>
                                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                                                <div className="flex-1 space-y-1">
                                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="w-[15%] h-full bg-f1-red shadow-[0_0_10px_#ff1801]"></div>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-gray-500 italic">
                                                        <span>Common</span>
                                                        <span className="text-f1-red">Jackpot</span>
                                                    </div>
                                                </div>
                                                <div className="text-2xl font-black italic text-f1-red">10-100 <span className="text-xs opacity-50">PTS</span></div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 italic">
                                                * El valor puede fluctuar durante la pretemporada mientras la gente cambia sus votos. Se congela al cerrar el periodo de apuestas.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* LEYENDA VISUAL */}
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div> Estados de las Casillas
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-4 p-3 bg-gray-900 text-white rounded-2xl border border-gray-800 shadow-lg">
                                            <div className="w-4 h-4 rounded-full border-4 border-f1-red bg-f1-red shrink-0" />
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest text-white leading-none mb-1">Tu Apuesta</div>
                                                <div className="text-[10px] text-gray-400 font-medium">Casilla seleccionada por ti, pendiente de ocurrir.</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-950 rounded-2xl border border-yellow-400 shadow-xl shadow-yellow-500/20">
                                            <div className="bg-yellow-950 rounded-full p-0.5 shrink-0"><CheckCircle2 className="text-yellow-400" size={16} /></div>
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest leading-none mb-1 text-yellow-900">Jackpot</div>
                                                <div className="text-[10px] text-yellow-800 font-medium font-black italic">+ Puntos sumados a tu marcador.</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-green-500 text-white rounded-2xl border border-green-600 shadow-lg shadow-green-200">
                                            <CheckCircle2 className="text-white shrink-0" size={24} />
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest leading-none mb-1">Ocurrió</div>
                                                <div className="text-[10px] text-green-100 font-medium">Este evento ha sido marcado por un admin, pero no lo elegiste.</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-3 bg-white text-gray-800 rounded-2xl border-2 border-gray-100 hover:border-blue-300">
                                            <div className="w-4 h-4 rounded-full border-4 border-gray-300 shrink-0" />
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest leading-none mb-1">Disponible</div>
                                                <div className="text-[10px] text-gray-400 font-medium italic select-none">Evento no reclamado aún.</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* CLASIFICACIÓN */}
                                <section className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div> Clasificación
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                             <div className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Hits</div>
                                             <div className="text-sm font-bold text-gray-800">Total de aciertos que has tenido.</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                             <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Missed</div>
                                             <div className="text-sm font-bold text-gray-800">Eventos completados que no elegiste.</div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Footer Modal */}
                            <div className="p-6 md:p-10 border-t border-gray-100 bg-gray-50/80">
                                <button 
                                    onClick={() => setShowHelp(false)}
                                    className="w-full bg-gray-900 text-white py-4 rounded-3xl font-black uppercase tracking-[0.2em] italic shadow-xl shadow-gray-400/30 hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    ¡Entendido, Capitán! 🏎️
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Bingo;