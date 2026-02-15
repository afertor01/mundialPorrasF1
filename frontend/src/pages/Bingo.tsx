/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";
import { motion } from "framer-motion";
import { Trophy, CheckCircle2, Hexagon, TrendingUp, Loader2, MousePointerClick } from "lucide-react";
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
    const [currentUser, setCurrentUser] = useState<TokenPayload | null>(null);

    const [tiles, setTiles] = useState<any[]>([]);
    const [standings, setStandings] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"board" | "standings">("board");
    const [loading, setLoading] = useState(true);

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
            const [boardData, standingsData] = await Promise.all([
                API.getBingoBoard(),
                API.getBingoStandings()
            ]);
            setTiles(boardData);
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
            alert(`⚠️ ¡Límite alcanzado! Solo puedes elegir ${MAX_SELECTIONS} casillas. Desmarca alguna para elegir esta.`);
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
            const updatedBoard = await API.getBingoBoard();
            setTiles(updatedBoard);
        } catch (error: any) {
            setTiles(originalTiles);
            alert(error.response?.data?.detail || "No se pudo cambiar la selección.");
        }
    };

    const mySelectionsCount = tiles.filter(t => t.is_selected_by_me).length;
    
    const potentialPoints = tiles
        .filter(t => t.is_selected_by_me)
        .reduce((acc, curr) => acc + curr.current_value, 0);

    // --- LÓGICA DE CLASIFICACIÓN (Top 20 + Usuario) ---
    const top20 = standings.slice(0, 20);
    const myRankingIndex = standings.findIndex(s => s.username === currentUser?.username);
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
                                <Hexagon className="text-f1-red fill-f1-red animate-pulse" size={28}/>
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Official Game</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">
                                Season <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-f1-red to-orange-500">Bingo</span>
                            </h1>
                            <p className="text-gray-400 font-medium max-w-lg text-sm md:text-base border-l-2 border-f1-red pl-4">
                                Tienes <strong>{MAX_SELECTIONS} fichas</strong>. Úsalas sabiamente. 
                                Cuanto menos gente elija una casilla, más puntos valdrá si ocurre.
                            </p>
                        </div>
                        
                        <div className="flex gap-4 w-full md:w-auto">
                            <div className={`flex-1 md:flex-none backdrop-blur-md border rounded-3xl p-5 text-center min-w-[120px] transition-colors ${mySelectionsCount >= MAX_SELECTIONS ? "bg-red-500/20 border-red-500/50" : "bg-white/5 border-white/10"}`}>
                                <div className={`text-3xl font-black ${mySelectionsCount >= MAX_SELECTIONS ? "text-red-400" : "text-white"}`}>
                                    {mySelectionsCount}<span className="text-sm text-gray-400">/{MAX_SELECTIONS}</span>
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Usadas</div>
                            </div>
                            <div className="flex-1 md:flex-none bg-gradient-to-br from-f1-red to-red-700 rounded-3xl p-5 text-center min-w-[120px] shadow-lg shadow-red-900/50">
                                <div className="text-3xl font-black text-white">{potentialPoints}</div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/80 mt-1">Puntos Potenc.</div>
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
                                    onClick={() => handleToggle(tile.id)}
                                    className={`
                                        relative group cursor-pointer rounded-3xl p-6 border-2 transition-all duration-300 flex flex-col justify-between min-h-[180px] select-none
                                        ${cardStyle}
                                        ${!isSelected && !isCompleted && mySelectionsCount >= MAX_SELECTIONS ? "opacity-40 grayscale" : "opacity-100"}
                                    `}
                                >
                                    {/* Header: Puntos y Check */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 border ${badgeStyle}`}>
                                            <TrendingUp size={12}/> {tile.current_value} pts
                                        </div>
                                        
                                        <div className={`transition-all duration-300 ${isSelected ? "opacity-100 scale-100" : "opacity-20 scale-75 group-hover:opacity-50"}`}>
                                            {isCompleted ? (
                                                // Check completado
                                                isCompleted && isSelected ? (
                                                    // Versión Dorada: Check verde oscuro o blanco sobre fondo oscuro
                                                    <div className="bg-yellow-950 rounded-full p-0.5">
                                                        <CheckCircle2 className="text-yellow-400" size={20}/>
                                                    </div>
                                                ) : (
                                                    // Versión Normal
                                                    <CheckCircle2 className="text-white" size={24}/>
                                                )
                                            ) : (
                                                // Círculo de selección vacío/lleno
                                                <div className={`w-6 h-6 rounded-full border-4 ${isSelected ? "border-f1-red bg-f1-red" : "border-gray-300"}`}/>
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
                                <div className="bg-f1-red p-2 rounded-lg"><Trophy size={24}/></div>
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
                                        {top20.length > 0 ? top20.map((s, idx) => (
                                            <tr key={idx} className={`hover:bg-gray-50 transition-colors ${s.username === currentUser?.username ? "bg-blue-50/50" : ""}`}>
                                                <td className="px-6 py-4 font-mono font-bold text-gray-400">
                                                    #{idx + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-6 bg-gray-900 text-white rounded flex items-center justify-center text-[9px] font-black italic">{s.acronym}</span>
                                                        <span className={`font-bold ${s.username === currentUser?.username ? "text-blue-600" : "text-gray-800"}`}>
                                                            {s.username} {s.username === currentUser?.username && "(Tú)"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-500">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <MousePointerClick size={14}/> {s.selections_count}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black flex items-center justify-center gap-1 w-fit mx-auto">
                                                        <CheckCircle2 size={12}/> {s.hits}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-red-400 font-bold">
                                                    {s.missed > 0 ? `-${s.missed}` : "-"}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xl font-black italic tracking-tighter text-gray-900">{s.total_points}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic font-medium">
                                                    Aún no hay datos.
                                                </td>
                                            </tr>
                                        )}
                                        
                                        {/* TU FILA (Si no estás en el Top 20) */}
                                        {!amInTop20 && myStats && (
                                            <>
                                                <tr><td colSpan={6} className="bg-gray-50/50 p-2 text-center text-xs text-gray-400 uppercase tracking-widest font-black">... Tu Posición ...</td></tr>
                                                <tr className="bg-blue-50 border-t-2 border-blue-100">
                                                    <td className="px-6 py-4 font-mono font-bold text-blue-400">#{myRankingIndex + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-8 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-[9px] font-black italic">{myStats.acronym}</span>
                                                            <span className="font-bold text-blue-800">{myStats.username} (Tú)</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-gray-500">{myStats.selections_count}</td>
                                                    <td className="px-6 py-4 text-center"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black w-fit mx-auto">{myStats.hits}</span></td>
                                                    <td className="px-6 py-4 text-center text-red-400 font-bold">-{myStats.missed}</td>
                                                    <td className="px-6 py-4 text-right"><span className="text-xl font-black italic tracking-tighter text-blue-900">{myStats.total_points}</span></td>
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
        </div>
    );
};

export default Bingo;