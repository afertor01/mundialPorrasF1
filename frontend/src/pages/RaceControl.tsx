import React, { useEffect, useState, useContext } from "react";
import * as API from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Flag, MapPin, Calendar, Search, Plus, X, 
  CheckCircle2, AlertCircle, Trophy
} from "lucide-react";
import { getTrackImage } from "../utils/getTrackImage";

// Interfaces para tipado rápido
interface PredictionData {
  username: string;
  points: number;
  multiplier: number;
  positions: Record<string, string>; // "1": "Verstappen"
  events: Record<string, string>;     // "FASTEST_LAP": "Perez"
}

interface RaceResultData {
    positions: Record<string, string>;
    events: Record<string, string>;
}

const RaceControl: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [currentUser, setCurrentUser] = useState("");
  
  // Estados de datos
  const [gps, setGps] = useState<any[]>([]);
  const [selectedGpId, setSelectedGpId] = useState<number | null>(null);
  
  const [allPredictions, setAllPredictions] = useState<PredictionData[]>([]);
  const [raceResult, setRaceResult] = useState<RaceResultData | null>(null);
  
  // Estados de interfaz (Buscador)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // 1. Identificar usuario actual
  useEffect(() => {
    if (token) {
        try {
            const decoded: any = jwtDecode(token);
            const user = decoded.username || "";
            setCurrentUser(user);
            // Por defecto, nos seleccionamos a nosotros mismos
            if (user && selectedUsers.length === 0) {
                setSelectedUsers([user]);
            }
        } catch (e) {}
    }
  }, [token]);

  // 2. Cargar Temporada y GPs al inicio
  useEffect(() => {
    const init = async () => {
        const seasons = await API.getSeasons();
        const active = seasons.find((s: any) => s.is_active);
        if (active) {
            const gpList = await API.getGPs(active.id);
            setGps(gpList);
            
            // Seleccionar GP por defecto (el más reciente o siguiente)
            if (gpList.length > 0) {
                const now = new Date();
                const pastGps = gpList.filter((gp: any) => new Date(gp.race_datetime) < now);
                const defaultGp = pastGps.length > 0 ? pastGps[pastGps.length - 1] : gpList[0];
                setSelectedGpId(defaultGp.id);
            }
        }
    };
    init();
  }, []);

  // 3. Cargar Predicciones cuando cambia el GP
  useEffect(() => {
    if (selectedGpId) {
        loadGpData(selectedGpId);
    }
  }, [selectedGpId]);

  const loadGpData = async (gpId: number) => {
      setAllPredictions([]);
      setRaceResult(null);
      try {
          const preds = await API.getGpPredictions(gpId);
          setAllPredictions(preds);
          const result = await API.getPublicRaceResult(gpId);
          setRaceResult(result);
      } catch (e) {
          console.error("Error cargando datos del GP");
      }
  };

  // --- LÓGICA DE FILTRADO ---
  const toggleUser = (username: string) => {
      if (selectedUsers.includes(username)) {
          setSelectedUsers(selectedUsers.filter(u => u !== username));
      } else {
          setSelectedUsers([...selectedUsers, username]);
      }
  };

  // Usuarios disponibles para añadir (que tienen predicción y coinciden con la búsqueda)
  const availableUsers = allPredictions
    .filter(p => !selectedUsers.includes(p.username))
    .filter(p => p.username.toLowerCase().includes(searchTerm.toLowerCase()));

  // Datos de los usuarios seleccionados
  const viewData = selectedUsers
    .map(u => allPredictions.find(p => p.username === u))
    .filter(Boolean) as PredictionData[];

  const selectedGpObj = gps.find(g => g.id === selectedGpId);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER & SELECTOR */}
        <header className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
                {/* Contenedor del icono/imagen */}
                    <div className="bg-gray-900 text-white w-28 h-28 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-gray-700 p-1 shadow-2xl shadow-gray-400/50">
                        {selectedGpObj ? (
                            <img 
                                src={getTrackImage(selectedGpObj.name)} 
                                className="w-full h-full object-contain filter invert" 
                                alt="Track"
                            />
                        ) : (
                            <Flag size={48} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-gray-900">Race Control</h1>
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">
                            <MapPin size={16} /> 
                            <span className="text-gray-600">{selectedGpObj?.name || "Selecciona GP"}</span>
                            <span className="mx-1">•</span>
                            <Calendar size={16} /> 
                            <span>{selectedGpObj ? new Date(selectedGpObj.race_datetime).toLocaleDateString() : "--/--"}</span>
                        </div>
                    </div>
            </div>

            <div className="relative min-w-[300px]">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-2">Seleccionar Gran Premio</label>
                <select 
                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 font-bold text-sm py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-f1-red/20 focus:border-f1-red transition-all cursor-pointer"
                    value={selectedGpId || ""}
                    onChange={(e) => setSelectedGpId(Number(e.target.value))}
                >
                    {gps.map(gp => (
                        <option key={gp.id} value={gp.id}>Round {gp.id}: {gp.name}</option>
                    ))}
                </select>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* PANEL IZQUIERDO: BUSCADOR DE USUARIOS */}
            <div className="lg:col-span-3 bg-white p-6 rounded-[2rem] shadow-lg border border-gray-100 h-fit sticky top-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Añadir Comparativa</h3>
                
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuario..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:border-f1-red transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                     {/* Lista de usuarios seleccionados (Tags) */}
                     <AnimatePresence>
                        {selectedUsers.map(u => (
                            <motion.button
                                key={u}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={() => toggleUser(u)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    u === currentUser 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                }`}
                            >
                                {u} <X size={12} />
                            </motion.button>
                        ))}
                     </AnimatePresence>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    {availableUsers.length === 0 ? (
                        <p className="text-xs text-center text-gray-400 italic py-4">No hay más usuarios</p>
                    ) : (
                        availableUsers.map(p => (
                            <button 
                                key={p.username}
                                onClick={() => toggleUser(p.username)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group text-left"
                            >
                                <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900">{p.username}</span>
                                <div className="bg-gray-100 p-1 rounded-full text-gray-400 group-hover:bg-f1-red group-hover:text-white transition-colors">
                                    <Plus size={14} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* PANEL DERECHO: COMPARATIVA */}
            <div className="lg:col-span-9 overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                    
                    {/* COLUMNA 1: RESULTADO OFICIAL (SI EXISTE) */}
                    {raceResult && (
                        <div className="w-[280px] flex-shrink-0">
                             <div className="bg-gray-900 text-white p-4 rounded-t-2xl flex items-center justify-center gap-2">
                                <Trophy size={18} className="text-yellow-400" />
                                <h3 className="font-black uppercase italic tracking-tighter">Resultados</h3>
                             </div>
                             <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-sm p-4 space-y-2">
                                {[...Array(10)].map((_, i) => {
                                    const pos = i + 1;
                                    return (
                                        <div key={pos} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-xs font-black text-gray-600">{pos}</span>
                                            <span className="text-sm font-bold text-gray-900">{raceResult.positions[pos.toString()]}</span>
                                        </div>
                                    )
                                })}
                                <div className="border-t border-dashed border-gray-200 my-4 pt-2"></div>
                                {Object.entries(raceResult.events).map(([key, val]) => (
                                    <div key={key} className="flex justify-between items-center text-xs p-2">
                                        <span className="font-bold text-gray-500 uppercase">{key}</span>
                                        <span className="font-black text-gray-900 bg-gray-100 px-2 py-1 rounded">{val}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {/* COLUMNAS DE USUARIOS */}
                    {viewData.map((p) => (
                        <div key={p.username} className="w-[280px] flex-shrink-0">
                            <div className={`p-4 rounded-t-2xl flex flex-col items-center justify-center relative overflow-hidden ${
                                p.username === currentUser ? 'bg-blue-600 text-white' : 'bg-white border-t border-x border-gray-200 text-gray-900'
                            }`}>
                                <h3 className="font-black text-lg truncate w-full text-center">{p.username}</h3>
                                <div className="flex gap-4 mt-1 text-xs font-bold uppercase tracking-widest opacity-80">
                                    <span>Pts: {p.points}</span>
                                    {p.multiplier > 1 && <span>x{p.multiplier}</span>}
                                </div>
                            </div>

                            <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-sm p-4 space-y-2">
                                {[...Array(10)].map((_, i) => {
                                    const pos = i + 1;
                                    const driver = p.positions[pos.toString()] || "-";
                                    
                                    // Comprobar acierto
                                    let status = "neutral"; 
                                    if (raceResult) {
                                        const realDriver = raceResult.positions[pos.toString()];
                                        const realPosOfDriver = Object.keys(raceResult.positions).find(k => raceResult.positions[k] === driver);
                                        
                                        if (driver === realDriver) status = "exact"; // Acierto exacto (Verde)
                                        else if (realPosOfDriver && Math.abs(parseInt(realPosOfDriver) - pos) === 1) status = "close"; // Acierto por 1 (Amarillo - si tu lógica de puntos da puntos por acercarse)
                                    }

                                    return (
                                        <div key={pos} className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                                            status === "exact" ? 'bg-green-50 border-green-200' :
                                            status === "close" ? 'bg-yellow-50 border-yellow-200' :
                                            'bg-white border-gray-100'
                                        }`}>
                                            <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-black ${
                                                status === "exact" ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                            }`}>{pos}</span>
                                            <span className={`text-sm font-bold truncate ${
                                                status === "exact" ? 'text-green-700' : 'text-gray-600'
                                            }`}>{driver}</span>
                                            
                                            {status === "exact" && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}
                                        </div>
                                    )
                                })}

                                <div className="border-t border-dashed border-gray-200 my-4 pt-2">
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Eventos</span>
                                </div>
                                
                                {Object.entries(p.events).map(([key, val]) => {
                                    // Comprobar evento
                                    const isCorrect = raceResult && raceResult.events[key] == val; // Comparación flexible string/number

                                    return (
                                        <div key={key} className={`flex justify-between items-center text-xs p-2 rounded border ${
                                            isCorrect ? 'bg-green-50 border-green-200' : 'border-transparent'
                                        }`}>
                                            <span className="font-bold text-gray-500 uppercase truncate max-w-[100px]">{key}</span>
                                            <span className={`font-black px-2 py-1 rounded ${
                                                isCorrect ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-900'
                                            }`}>{val}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Mensaje vacío */}
                    {viewData.length === 0 && !raceResult && (
                        <div className="w-full flex flex-col items-center justify-center text-gray-400 py-12">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">Selecciona usuarios a la izquierda para ver sus predicciones</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RaceControl;