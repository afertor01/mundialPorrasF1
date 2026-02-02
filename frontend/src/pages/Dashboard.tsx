import React, { useEffect, useState, useContext } from "react";
import * as API from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, TrendingUp, Users, Zap, BarChart3, Award, Target,
  LayoutDashboard, Shield, ArrowUp, ArrowDown, Minus, Sparkles
} from "lucide-react";
import BarChartTop20 from "../components/BarChartTop20";
import ComparisonLineChart from "../components/ComparisonLineChart";

// --- TYPE DEFINITIONS ---
interface CustomJwtPayload {
  username: string;
  // añade otros campos si tu token los tiene
}

interface Gp {
  id: number;
  name: string;
  race_datetime: string;
}

interface RankingRow {
  name: string;
  acronym: string;
  gp_points: number;
  accumulated: number;
}

interface RankingData {
  // Las claves de objetos JSON suelen ser strings, aseguramos el acceso con String(id)
  by_gp: Record<string, RankingRow[]>;
  overall: RankingRow[];
}

interface Team {
  id: number;
  name: string;
  members: (string | { username: string })[]; // Maneja ambos casos por seguridad
}

interface ActiveSeason {
  id: number;
  year: number;
  name: string;
  is_active: boolean;
}

interface EvolutionDataPoint {
  gp_id: number;
  value: number;
}

type EvolutionData = Record<string, EvolutionDataPoint[]>;

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const Dashboard: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [username, setUsername] = useState<string>("");
  
  // Estados de Configuración
  const [mode, setMode] = useState<"total" | "base" | "multiplier">("total");
  const [view, setView] = useState<"drivers" | "teams">("drivers");
  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  
  // Estados de Datos
  const [rankingDataDrivers, setRankingDataDrivers] = useState<RankingData | null>(null);
  const [evolutionDrivers, setEvolutionDrivers] = useState<EvolutionData>({}); // Tipo corregido
  
  const [rankingDataTeams, setRankingDataTeams] = useState<RankingData | null>(null);
  const [evolutionTeams, setEvolutionTeams] = useState<EvolutionData>({}); // Tipo corregido
  
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({}); 
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [gps, setGps] = useState<Gp[]>([]); 

  // 1. EXTRAER USUARIO
  useEffect(() => {
    if (token) {
        try {
            // Tipado genérico para jwtDecode
            const decoded = jwtDecode<CustomJwtPayload>(token);
            setUsername(decoded.username || ""); 
        } catch (e) {
            console.error("Error decodificando token", e);
        }
    }
  }, [token]);

  // Carga de datos
  useEffect(() => {
    const fetchData = async () => {
        try {
            const seasons = await API.getSeasons();
            const active = seasons.find((s: any) => s.is_active);
            if (!active) return;
            setActiveSeason(active);

            const gpList = await API.getGPs(active.id);
            setGps(gpList);

            // --- CARGA DE PILOTOS ---
            const rankData = await API.getRanking(active.id, "users", mode, 100);
            setRankingDataDrivers(rankData);

            const evoData = await API.getEvolution(active.id, "users", [], [], mode);
            setEvolutionDrivers(evoData);

            // --- CARGA DE ESCUDERÍAS ---
            const teamsData = await API.getTeams(active.id);
            
            // Lógica para encontrar mi equipo (soporta array de strings o de objetos)
            if (username) {
                const foundMyTeam = teamsData.find((t: Team) => 
                    t.members.some((m) => {
                        const mName = typeof m === 'object' ? m.username : m;
                        return mName === username;
                    })
                );
                setMyTeam(foundMyTeam || null);
            }

            const map: Record<string, string> = {};
            teamsData.forEach((t: Team) => {
                t.members.forEach((m) => {
                    const mName = typeof m === 'object' ? m.username : m;
                    map[mName] = t.name;
                });
            });
            setTeamsMap(map);

            const rankTeamsData = await API.getRanking(active.id, "teams", mode, 100);
            setRankingDataTeams(rankTeamsData);

            const evoTeamsData = await API.getEvolution(active.id, "teams", [], [], mode);
            setEvolutionTeams(evoTeamsData);
        } catch (error) {
            console.error("Error cargando dashboard:", error);
        }
    };

    fetchData();
  }, [mode, username]); // Dependencias del efecto

  // --- LÓGICA DE VISUALIZACIÓN ---
  const currentData = view === 'drivers' ? rankingDataDrivers : rankingDataTeams;
  const currentOverallRanking = currentData ? currentData.overall : [];
  const currentEvolution = view === 'drivers' ? evolutionDrivers : evolutionTeams;
  
  // Determinar el objetivo a resaltar (usuario o escudería)
  const currentTargetName = view === 'drivers' ? username : (myTeam ? myTeam.name : "");

  // Stats cards
  const myRankIndex = currentOverallRanking.findIndex(r => r.name === currentTargetName);
  const myRankPos = myRankIndex !== -1 ? myRankIndex + 1 : 0;
  const myPoints = currentOverallRanking.find(r => r.name === currentTargetName)?.accumulated;

  // Lógica de datos para la tabla (Safeguards añadidos)
  const completedGps = gps
    .filter(gp => currentData?.by_gp && currentData.by_gp[String(gp.id)] && currentData.by_gp[String(gp.id)].length > 0)
    .sort((a, b) => new Date(a.race_datetime).getTime() - new Date(b.race_datetime).getTime());

  const lastGp = completedGps.length > 0 ? completedGps[completedGps.length - 1] : null;
  const prevGp = completedGps.length > 1 ? completedGps[completedGps.length - 2] : null;

  const showDiff = !!prevGp;

  // Datos de la tabla actual (fallback a array vacío)
  const tableData = (lastGp && currentData?.by_gp) ? currentData.by_gp[String(lastGp.id)] : currentOverallRanking;
  
  // Mapa del GP anterior para calcular diferencias
  const prevRankMap = new Map<string, number>();
  if (prevGp && currentData?.by_gp) {
      const prevList = currentData.by_gp[String(prevGp.id)] || [];
      prevList.forEach((p, i) => prevRankMap.set(p.name, i + 1));
  }

  // Función tipada para cortar la tabla
  const getTableDataForDisplay = (fullTableData: RankingRow[], targetName: string): RankingRow[] => {
      if (!fullTableData) return [];
      const top20 = fullTableData.slice(0, 20);
      
      if (!targetName) return top20;

      const isTargetInTop20 = top20.some(r => r.name === targetName);
      if (isTargetInTop20) return top20;

      const targetData = fullTableData.find(r => r.name === targetName);
      if (targetData) return [...top20, targetData];

      return top20;
  }
  
  const finalTableData = getTableDataForDisplay(tableData, currentTargetName);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER & CONTROLS */}
        <header className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="bg-f1-red p-3 rounded-2xl shadow-lg shadow-red-200 shrink-0">
                    <LayoutDashboard className="text-white" size={28} />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Telemetría</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                      Temporada {activeSeason?.year || "---"}
                    </p>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                {/* SELECTOR DE VISTA */}
                <div className="flex bg-gray-900 p-1.5 rounded-2xl">
                    <button onClick={() => setView('drivers')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'drivers' ? "bg-f1-red text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
                        <Users size={14}/> Pilotos
                    </button>
                    <button onClick={() => setView('teams')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'teams' ? "bg-f1-red text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
                        <Shield size={14}/> Escuderías
                    </button>
                </div>

                {/* SELECTOR DE MODO */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl overflow-x-auto">
                    {[
                        { id: 'total', label: 'General', icon: <Trophy size={14}/> },
                        { id: 'base', label: 'Base', icon: <Target size={14}/> },
                        { id: 'multiplier', label: 'Multi.', icon: <Zap size={14}/> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setMode(tab.id as any)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
                                mode === tab.id ? "bg-white text-gray-900 shadow-md" : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </header>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
                icon={<Award className="text-yellow-500" />} 
                label={view === 'drivers' ? "Tu Posición" : "Pos. Escudería"}
                value={myRankPos > 0 ? `#${myRankPos}` : "---"} 
                color="border-yellow-500"
            />
            <StatCard 
                icon={<TrendingUp className="text-f1-red" />} 
                label="Puntos" 
                value={myPoints !== undefined ? (mode === 'multiplier' ? `${myPoints.toFixed(2)}x` : myPoints) : "---"} 
                color="border-f1-red"
            />
            <StatCard 
                icon={view === 'drivers' ? <Users className="text-blue-500" /> : <Shield className="text-blue-500"/>} 
                label={view === 'drivers' ? "Pilotos" : "Escuderías"}
                value={currentOverallRanking.length} 
                color="border-blue-500"
            />
            <StatCard 
                icon={<BarChart3 className="text-green-500" />} 
                label="Líder Mundial" 
                value={currentOverallRanking[0]?.name || "---"} 
                color="border-green-500"
            />
        </div>

        <AnimatePresence mode="wait">
            <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
            >
                {/* 1. SECCIÓN TABLA CLASIFICACIÓN */}
                <section className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                        <h3 className="text-lg font-black uppercase italic tracking-tighter">
                            {view === 'drivers' ? "Clasificación de Pilotos" : "Clasificación de Constructores"}
                        </h3>
                        <span className="text-[10px] font-black bg-f1-red text-white px-3 py-1 rounded-full uppercase italic">
                            {lastGp ? `Tras ${lastGp.name}`: "Live Data"}
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-50">
                                    <th className="px-6 py-5">Pos</th>
                                    <th className="px-4 py-5">{view === 'drivers' ? "Piloto" : "Escudería"}</th>
                                    {showDiff && <th className="px-4 py-5 text-center">Cambio</th>}
                                    <th className="px-4 py-5">{view === 'drivers' ? "Escudería" : ""}</th>
                                    {showDiff && <th className="px-4 py-5 text-right">Puntos GP</th>}
                                    <th className="px-6 py-5 text-right">Total Puntos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {finalTableData.map((row) => {
                                    // Búsqueda segura en tableData (evitar -1 visual)
                                    const index = tableData.findIndex(r => r.name === row.name);
                                    const realPos = index !== -1 ? index + 1 : 0;
                                    const isMe = row.name === currentTargetName;
                                    
                                    let posChange: number | 'new' | null = null;
                                    if (showDiff && realPos > 0) {
                                        const prevRank = prevRankMap.get(row.name);
                                        posChange = prevRank ? prevRank - realPos : 'new';
                                    }

                                    return (
                                        <tr key={row.name} className={`transition-colors ${isMe ? 'bg-blue-50/60' : 'hover:bg-gray-50/50'}`}>
                                            <td className="px-6 py-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                                    realPos === 1 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-100' :
                                                    realPos === 2 ? 'bg-gray-300 text-white' :
                                                    realPos === 3 ? 'bg-amber-600 text-white' : 'text-gray-400 bg-gray-100'
                                                }`}>
                                                    {realPos > 0 ? realPos : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    {view === 'drivers' && (
                                                        <span className="bg-f1-dark text-white text-[9px] font-black px-2 py-0.5 rounded italic uppercase hidden sm:inline-block">
                                                            {row.acronym || row.name.substring(0, 3)}
                                                        </span>
                                                    )}
                                                    <span className={`text-sm font-bold truncate ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                                                        {row.name}
                                                    </span>
                                                </div>
                                            </td>
                                            {showDiff && (
                                                <td className="px-4 py-4 text-xs font-bold text-center">
                                                    {posChange === 'new' ? <span className="flex justify-center text-blue-400"><Sparkles size={16}/></span> :
                                                     posChange === 0 || posChange === null ? <span className="flex justify-center text-gray-400"><Minus size={16}/></span> :
                                                     posChange > 0 ? <span className="flex justify-center items-center gap-1 text-green-500"><ArrowUp size={14}/> {posChange}</span> :
                                                     posChange < 0 ? <span className="flex justify-center items-center gap-1 text-red-500"><ArrowDown size={14}/> {Math.abs(posChange)}</span> : 
                                                     '-'}
                                                </td>
                                            )}
                                            <td className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                                                {view === 'drivers' && (teamsMap[row.name] || <span className="text-gray-200">---</span>)}
                                            </td>
                                            {showDiff && (
                                                <td className="px-4 py-4 text-right font-mono text-sm">
                                                    +{mode === 'multiplier' ? row.gp_points.toFixed(2) : row.gp_points}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-right font-black text-gray-900 tabular-nums">
                                                {mode === "multiplier" ? row.accumulated.toFixed(2) + "x" : row.accumulated}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 2. SECCIÓN GRÁFICA BARRAS */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter mb-6">
                        {view === 'drivers' ? "Diferencia de Puntos (Top 20)" : "Diferencia de Puntos (Constructores)"}
                    </h3>
                    <div className="h-[400px]">
                        <BarChartTop20 data={currentOverallRanking} currentUser={currentTargetName} />
                    </div>
                </section>

                {/* 3. SECCIÓN GRÁFICA COMPARATIVA */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8">
                        Evolución Histórica
                    </h3>
                    <div className="bg-gray-50 rounded-[2rem] p-2 md:p-6 border border-gray-100 h-[500px] w-full relative">
                        {/* Validación añadida para evitar renderizar el gráfico sin datos */}
                        {currentEvolution && (
                            <ComparisonLineChart fullData={currentEvolution} currentUser={currentTargetName} gps={gps} />
                        )}
                    </div>
                </section>
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
    <div className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color} flex items-center gap-5 hover:shadow-md transition-shadow`}>
        <div className="p-3.5 bg-gray-50 rounded-2xl shadow-inner">{icon}</div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
            <h4 className="text-2xl font-black text-gray-800 tracking-tighter tabular-nums truncate max-w-[150px]" title={String(value)}>{value}</h4>
        </div>
    </div>
);

export default Dashboard;