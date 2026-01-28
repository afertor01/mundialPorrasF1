import React, { useEffect, useState, useContext } from "react";
import * as API from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Zap, 
  BarChart3, 
  Award,
  Target,
  LayoutDashboard
} from "lucide-react";
import BarChartTop20 from "../components/BarChartTop20";
import ComparisonLineChart from "../components/ComparisonLineChart";

const Dashboard: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"total" | "base" | "multiplier">("total");
  const [activeSeason, setActiveSeason] = useState<any>(null);
  
  const [ranking, setRanking] = useState<any[]>([]);
  const [evolution, setEvolution] = useState<any>({});
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({}); 

  // ✅ 1. AÑADIR ESTADO PARA LOS GPs
  const [gps, setGps] = useState<any[]>([]); 

  // 1. EXTRAER USUARIO
  useEffect(() => {
    if (token) {
        try {
            const decoded: any = jwtDecode(token);
            setUsername(decoded.username || ""); 
        } catch (e) {
            console.error("Error con el token");
        }
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [mode]);

  const loadData = async () => {
      const seasons = await API.getSeasons();
      const active = seasons.find((s: any) => s.is_active);
      if (!active) return;
      setActiveSeason(active);

      // ✅ 2. CARGAR LA LISTA DE GPs (Necesario para la gráfica)
      const gpList = await API.getGPs(active.id);
      setGps(gpList);

      const rankData = await API.getRanking(active.id, "users", mode, 100);
      setRanking(rankData.overall);

      const evoData = await API.getEvolution(active.id, "users", [], undefined, mode);
      setEvolution(evoData);

      const teamsData = await API.getTeams(active.id);
      const map: Record<string, string> = {};
      teamsData.forEach((t: any) => {
          t.members.forEach((mUsername: string) => {
              map[mUsername] = t.name;
          });
      });
      setTeamsMap(map);
  };

  // --- LÓGICA DE RANKING ---
  const userData = ranking.find(r => r.name === username);
  const myRank = ranking.findIndex(r => r.name === username) + 1;
  const myPoints = userData?.accumulated;

  const getTableData = () => {
      const top20 = ranking.slice(0, 20);
      const me = ranking.find(r => r.name === username);
      const data = [...top20];
      if (me && !top20.find(r => r.name === username)) {
          data.push(me);
      }
      return data;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
                <div className="bg-f1-red p-3 rounded-2xl shadow-lg shadow-red-200">
                    <LayoutDashboard className="text-white" size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Telemetría</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                      Temporada {activeSeason?.year || "---"}
                    </p>
                </div>
            </div>
            
            <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
                {[
                    { id: 'total', label: 'General', icon: <Trophy size={14}/> },
                    { id: 'base', label: 'Base', icon: <Target size={14}/> },
                    { id: 'multiplier', label: 'Multi.', icon: <Zap size={14}/> }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setMode(tab.id as any)}
                        className={`flex items-center justify-center gap-2 flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                            mode === tab.id 
                            ? "bg-white text-f1-red shadow-md" 
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>
        </header>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
                icon={<Award className="text-yellow-500" />} 
                label="Tu Posición" 
                value={myRank > 0 ? `#${myRank}` : "---"} 
                color="border-yellow-500"
            />
            <StatCard 
                icon={<TrendingUp className="text-f1-red" />} 
                label="Tus Puntos" 
                value={myPoints !== undefined ? (mode === 'multiplier' ? `${myPoints.toFixed(2)}x` : myPoints) : "---"} 
                color="border-f1-red"
            />
            <StatCard 
                icon={<Users className="text-blue-500" />} 
                label="Parrilla" 
                value={ranking.length} 
                color="border-blue-500"
            />
            <StatCard 
                icon={<BarChart3 className="text-green-500" />} 
                label="Líder" 
                value={ranking[0]?.name || "---"} 
                color="border-green-500"
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* TABLA CLASIFICACIÓN */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-7 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden"
            >
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter">Mundial de Pilotos</h3>
                    <span className="text-[10px] font-black bg-f1-red text-white px-3 py-1 rounded-full uppercase italic">Live Data</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-50">
                                <th className="px-8 py-5">Pos</th>
                                <th className="px-4 py-5">Piloto</th>
                                <th className="px-4 py-5">Escudería</th>
                                <th className="px-8 py-5 text-right">Puntos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {getTableData().map((row) => {
                                const realPos = ranking.findIndex(r => r.name === row.name) + 1;
                                const isMe = row.name === username;
                                return (
                                    <tr key={row.name} className={`transition-colors ${isMe ? 'bg-blue-50/60' : 'hover:bg-gray-50/50'}`}>
                                        <td className="px-8 py-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                                realPos === 1 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-100' :
                                                realPos === 2 ? 'bg-gray-300 text-white' :
                                                realPos === 3 ? 'bg-amber-600 text-white' : 'text-gray-400 bg-gray-100'
                                            }`}>
                                                {realPos}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-f1-dark text-white text-[9px] font-black px-2 py-0.5 rounded italic uppercase">
                                                    {row.name.substring(0, 3)}
                                                </span>
                                                <span className={`text-sm font-bold ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                                                    {row.name} {isMe && " (TÚ)"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                                            {teamsMap[row.name] || "---"}
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-gray-900 tabular-nums">
                                            {mode === "multiplier" ? row.accumulated.toFixed(2) + "x" : row.accumulated}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* GRÁFICA BARRAS */}
            <div className="lg:col-span-5 space-y-8">
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100"
                >
                    <h3 className="text-lg font-black uppercase italic tracking-tighter mb-6">Brechas de Puntos</h3>
                    <div className="h-[380px]">
                        <BarChartTop20 data={ranking} currentUser={username} />
                    </div>
                </motion.div>
            </div>
        </div>

        {/* GRÁFICA COMPARATIVA */}
        <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100"
        >
            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8">Evolución del Campeonato</h3>
            <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                {/* ✅ 3. PASAR GPS AL COMPONENTE */}
                <ComparisonLineChart fullData={evolution} currentUser={username} gps={gps} />
            </div>
        </motion.section>

      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: any) => (
    <div className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-4 ${color} flex items-center gap-5 hover:shadow-md transition-shadow`}>
        <div className="p-3.5 bg-gray-50 rounded-2xl shadow-inner">{icon}</div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
            <h4 className="text-2xl font-black text-gray-800 tracking-tighter tabular-nums">{value}</h4>
        </div>
    </div>
);

export default Dashboard;