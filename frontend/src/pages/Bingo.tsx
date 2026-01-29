import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";
import { motion } from "framer-motion";
import { Trophy, CheckCircle2, Hexagon, TrendingUp, Loader2 } from "lucide-react";
// 👇 IMPORTANTE: Necesitamos esto para leer el token localmente
import { jwtDecode } from "jwt-decode"; 

// Definimos qué tiene tu token (ajusta si tienes más campos)
interface TokenPayload {
    sub: string;
    username: string;
    acronym: string;
    role: string;
}

const Bingo: React.FC = () => {
    // 👇 CAMBIO 1: Solo pedimos el 'token', ya que 'user' no existe en tu contexto
    const { token } = useContext(AuthContext);
    
    // 👇 CAMBIO 2: Estado local para guardar los datos del usuario decodificados
    const [currentUser, setCurrentUser] = useState<TokenPayload | null>(null);

    const [tiles, setTiles] = useState<any[]>([]);
    const [standings, setStandings] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"board" | "standings">("board");
    const [loading, setLoading] = useState(true);

    // 👇 CAMBIO 3: Efecto para decodificar el usuario al cargar
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

        const newTiles = [...tiles];
        const wasSelected = newTiles[tileIndex].is_selected_by_me;
        
        newTiles[tileIndex] = {
            ...newTiles[tileIndex],
            is_selected_by_me: !wasSelected,
            selection_count: wasSelected ? newTiles[tileIndex].selection_count - 1 : newTiles[tileIndex].selection_count + 1
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
                                Elige sabiamente. Cuanto menos gente elija una casilla, más puntos valdrá si ocurre.
                                <br/><span className="text-white font-bold">¡Arriésgate para ganar!</span>
                            </p>
                        </div>
                        
                        <div className="flex gap-4 w-full md:w-auto">
                            <div className="flex-1 md:flex-none bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 text-center min-w-[120px]">
                                <div className="text-3xl font-black text-white">{mySelectionsCount}</div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Selecciones</div>
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
                            
                            let rarityClass = "text-blue-600 bg-blue-50 border-blue-100";
                            if (tile.current_value >= 50) rarityClass = "text-orange-600 bg-orange-50 border-orange-100";
                            if (tile.current_value >= 100) rarityClass = "text-purple-600 bg-purple-50 border-purple-100";
                            
                            if (isCompleted) rarityClass = "text-green-600 bg-green-50 border-green-100";

                            return (
                                <div 
                                    key={tile.id}
                                    onClick={() => handleToggle(tile.id)}
                                    className={`
                                        relative group cursor-pointer rounded-3xl p-6 border-2 transition-all duration-300 flex flex-col justify-between min-h-[180px] select-none
                                        ${isCompleted 
                                            ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200" 
                                            : isSelected 
                                                ? "bg-gray-900 border-gray-900 text-white shadow-xl translate-y-[-4px]" 
                                                : "bg-white border-gray-100 hover:border-blue-300 hover:shadow-lg"
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 border ${isCompleted || isSelected ? "bg-white/20 border-transparent text-white" : rarityClass}`}>
                                            <TrendingUp size={12}/> {tile.current_value} pts
                                        </div>
                                        <div className={`transition-all duration-300 ${isSelected ? "opacity-100 scale-100" : "opacity-20 scale-75 group-hover:opacity-50"}`}>
                                            {isCompleted ? <CheckCircle2 className="text-white" size={24}/> : (
                                                <div className={`w-6 h-6 rounded-full border-4 ${isSelected ? "border-f1-red bg-f1-red" : "border-gray-300"}`}/>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p className={`text-sm font-bold leading-snug ${isCompleted || isSelected ? "text-white" : "text-gray-800"}`}>
                                        {tile.description}
                                    </p>

                                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                                        <div className={`text-[9px] font-bold uppercase tracking-widest ${isCompleted || isSelected ? "text-white/60" : "text-gray-400"}`}>
                                            {tile.selection_count} {tile.selection_count === 1 ? "Pick" : "Picks"}
                                        </div>
                                        {isCompleted && <span className="text-[9px] font-black bg-white text-green-600 px-2 py-0.5 rounded uppercase">Completado</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                ) : (
                    // STANDINGS TABLE
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-8 py-6 bg-gray-900 text-white flex items-center gap-4">
                                <div className="bg-f1-red p-2 rounded-lg"><Trophy size={24}/></div>
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-lg">Ranking Bingo</h3>
                                    <p className="text-gray-400 text-xs font-medium">Clasificación basada en rareza de aciertos</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Pos</th>
                                            <th className="px-6 py-4">Piloto</th>
                                            <th className="px-6 py-4 text-center">Aciertos</th>
                                            <th className="px-6 py-4 text-right">Puntos Totales</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {standings.length > 0 ? standings.map((s, idx) => (
                                            // 👇 CAMBIO 4: Usamos currentUser.username
                                            <tr key={idx} className={`hover:bg-gray-50 transition-colors ${s.username === currentUser?.username ? "bg-blue-50/50" : ""}`}>
                                                <td className="px-6 py-4">
                                                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black ${
                                                        idx === 0 ? "bg-yellow-100 text-yellow-700" : 
                                                        idx === 1 ? "bg-gray-100 text-gray-600" :
                                                        idx === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400"
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-6 bg-gray-900 text-white rounded flex items-center justify-center text-[9px] font-black italic">{s.acronym}</span>
                                                        {/* 👇 CAMBIO 5: Usamos currentUser.username */}
                                                        <span className={`font-bold text-sm ${s.username === currentUser?.username ? "text-blue-600" : "text-gray-800"}`}>
                                                            {s.username} {s.username === currentUser?.username && "(Tú)"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black">{s.hits}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xl font-black italic tracking-tighter text-gray-900">{s.total_points}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic font-medium">
                                                    Aún no hay puntos registrados. ¡Esperad a que ocurran cosas!
                                                </td>
                                            </tr>
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