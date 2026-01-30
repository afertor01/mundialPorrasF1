import React, { useEffect, useState } from "react";
import * as API from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Flag, 
  AlertTriangle, 
  Clock, 
  Save, 
  ChevronLeft, 
  Lock, 
  CheckCircle,
  Timer,
  Zap
} from "lucide-react";
import { getTrackImage } from "../utils/getTrackImage";

const Predictions: React.FC = () => {
  // --- ESTADOS DE DATOS (Mismos que tu original) ---
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [gps, setGps] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [selectedGp, setSelectedGp] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingPreds, setExistingPreds] = useState<Record<number, boolean>>({});

  const [positions, setPositions] = useState<Record<number, string>>({});
  const [events, setEvents] = useState<Record<string, string>>({
    "FASTEST_LAP": "",
    "SAFETY_CAR": "No",
    "DNFS": "0",
    "DNF_DRIVER": ""
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const seasons = await API.getSeasons();
      const active = seasons.find((s: any) => s.is_active);
      setActiveSeason(active);

      if (active) {
        const gpList = await API.getGPs(active.id);
        setGps(gpList);

        const gridData = await API.getF1Grid(active.id);
        const flatDrivers: any[] = [];
        gridData.forEach((team: any) => {
            team.drivers.forEach((d: any) => {
                flatDrivers.push({
                    code: d.code,
                    name: d.name,
                    team_name: team.name,
                    color: team.color
                });
            });
        });
        flatDrivers.sort((a, b) => a.code.localeCompare(b.code));
        setDriversList(flatDrivers);

        const predsMap: Record<number, boolean> = {};
        for (const gp of gpList) {
            const pred = await API.getMyPrediction(gp.id);
            if (pred) predsMap[gp.id] = true;
        }
        setExistingPreds(predsMap);
      }
    } catch (error) { console.error("Error:", error); }
  };

  const handleOpenGp = async (gp: any) => {
    const isClosed = new Date() >= new Date(gp.race_datetime);
    const hasPred = existingPreds[gp.id]; 
    if (isClosed && !hasPred) {
      alert("⚠️ El plazo para este Gran Premio ha finalizado.");
      return;
    }
    setLoading(true);
    setSelectedGp(gp);
    const defaultPos: any = {};
    for(let i=1; i<=10; i++) defaultPos[i] = "";
    setPositions(defaultPos);
    setEvents({ "FASTEST_LAP": "", "SAFETY_CAR": "No", "DNFS": "0", "DNF_DRIVER": "" });

    const existing = await API.getMyPrediction(gp.id);
    if (existing) {
        const posMap: any = {};
        existing.positions.forEach((p: any) => posMap[p.position] = p.driver_name); 
        setPositions(prev => ({ ...prev, ...posMap }));
        const evtMap: any = {};
        existing.events.forEach((e: any) => evtMap[e.event_type] = e.value);
        setEvents(prev => ({ ...prev, ...evtMap }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const filledPositions = Object.values(positions).filter(p => p !== "");
    const uniqueDrivers = new Set(filledPositions);
    if (filledPositions.length < 10) return alert("⚠️ Completa las 10 posiciones.");
    if (filledPositions.length !== uniqueDrivers.size) return alert("⚠️ Has repetido pilotos.");
    if (!events.FASTEST_LAP) return alert("⚠️ Selecciona la Vuelta Rápida.");

    try {
        await API.savePrediction(selectedGp.id, positions, events);
        alert("✅ Predicción guardada.");
        setExistingPreds(prev => ({ ...prev, [selectedGp.id]: true }));
        setSelectedGp(null);
    } catch (err: any) { alert("❌ Error al guardar"); }
  };

  useEffect(() => {
    if (!selectedGp) return;
    const raceDate = new Date(selectedGp.race_datetime);
    const now = new Date();
    const msUntilClose = raceDate.getTime() - now.getTime();
    if (msUntilClose > 0) {
        const timer = setTimeout(() => {
            alert("⏳ ¡TIEMPO AGOTADO!");
            setSelectedGp(null);
        }, msUntilClose);
        return () => clearTimeout(timer);
    }
  }, [selectedGp]);

  const renderDriverOptions = () => (
    <>
      <option value="">-- Seleccionar --</option>
      {driversList.map((d) => (
        <option key={d.code} value={d.code}>
            {d.code} - {d.name} ({d.team_name})
        </option>
      ))}
    </>
  );

  // ==========================
  // VISTA 1: DASHBOARD (Listado de GPs)
  // ==========================
  if (!selectedGp) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <header className="flex items-center gap-4 mb-10">
            <div className="bg-f1-red p-3 rounded-lg shadow-lg">
                <Flag className="text-white" size={32} />
            </div>
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Mis Predicciones</h1>
                <p className="text-gray-500 font-medium">Temporada {activeSeason?.year}</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {gps.map((gp, idx) => {
              const raceDate = new Date(gp.race_datetime);
              const now = new Date();
              const isOpen = now < raceDate;
              const hasPred = existingPreds[gp.id];
              const canView = isOpen || hasPred;
              const diffMs = raceDate.getTime() - now.getTime();
              const isUrgent = isOpen && diffMs < 86400000; 

              return (
                <motion.div 
                  key={gp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={canView ? { y: -8, scale: 1.02 } : {}}
                  onClick={() => canView && handleOpenGp(gp)}
                  className={`relative bg-white rounded-3xl p-6 shadow-sm border-2 transition-all cursor-pointer overflow-hidden ${
                    !canView ? 'opacity-60 grayscale bg-gray-100 border-gray-200' : 
                    isOpen ? 'border-transparent hover:border-f1-red/20 shadow-xl' : 'border-gray-100 shadow-md'
                  }`}
                >
                    {/* --- NUEVO BLOQUE DE IMAGEN --- */}
                    <div className="h-42 w-full bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden group hover:bg-gray-800 transition-colors">
                        <div className="absolute inset-0 bg-f1-red opacity-10 blur-xl"></div>
                        <img 
                            src={getTrackImage(gp.name)} 
                            alt={gp.name} 
                            // NOTA: Si tus imagenes son negras, usa 'filter invert'. Si son blancas, borra 'filter invert'.
                            className="w-full h-full object-contain filter invert opacity-80 group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    {/* ----------------------------- */}
                  <div className="flex justify-between items-start mb-6">
                    <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                      !isOpen ? 'bg-gray-200 text-gray-600' : hasPred ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {!isOpen ? <Lock size={12}/> : hasPred ? <CheckCircle size={12}/> : <Timer size={12}/>}
                      {!isOpen ? (hasPred ? "Finalizado" : "Cerrado") : (hasPred ? "Completado" : "Pendiente")}
                    </span>
                    {isUrgent && <Zap size={20} className="text-f1-red animate-pulse" />}
                  </div>

                  <h2 className="text-2xl font-bold text-gray-800 mb-4 line-clamp-1">{gp.name}</h2>
                  
                  <div className="space-y-2 text-gray-500 font-medium text-sm mb-6">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span>{raceDate.toLocaleDateString()} · {raceDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>

                  {canView && (
                    <div className={`text-center py-3 rounded-2xl font-black text-xs uppercase tracking-tighter transition-colors ${
                      isOpen ? (hasPred ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-f1-red text-white shadow-lg shadow-red-200') : 'bg-gray-800 text-white'
                    }`}>
                      {isOpen ? (hasPred ? "Modificar" : "Hacer Predicción") : "Consultar"}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================
  // VISTA 2: FORMULARIO (Hoja de Tiempos)
  // ==========================
  const isLocked = new Date() >= new Date(selectedGp.race_datetime);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
      >
        {/* Cabecera Formulario */}
        <div className="bg-f1-dark p-8 text-white relative">
            {/* --- IMAGEN DE FONDO GIGANTE --- */}
            <img 
                src={getTrackImage(selectedGp.name)} 
                className="absolute -right-10 -bottom-10 w-96 h-96 object-contain opacity-10 rotate-12 pointer-events-none filter invert"
            />
            <button 
                onClick={() => setSelectedGp(null)} 
                className="absolute left-8 top-8 text-white/50 hover:text-white transition-colors flex items-center gap-1 text-sm font-bold"
            >
                <ChevronLeft size={18} /> SALIR
            </button>
            <div className="text-center mt-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">{selectedGp.name}</h2>
                <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10 text-xs font-bold">
                    {isLocked ? <Lock size={14} className="text-gray-400" /> : <Clock size={14} className="text-f1-red animate-pulse" />}
                    <span className={isLocked ? "text-gray-300" : "text-f1-red"}>
                        {isLocked ? "MODO LECTURA" : `CIERRE: ${new Date(selectedGp.race_datetime).toLocaleString()}`}
                    </span>
                </div>
            </div>
        </div>

        <div className="p-8 lg:p-12">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-f1-red border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold text-gray-400 animate-pulse">CARGANDO DATOS DEL BOX...</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Top 10 Section */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <Trophy className="text-f1-red" size={24} />
                            <h3 className="text-xl font-black uppercase italic text-gray-800 tracking-tighter">Parrilla de Resultados (Top 10)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                            {[...Array(10)].map((_, i) => {
                                const pos = i + 1;
                                return (
                                    <div key={pos} className="group flex items-center gap-4 bg-gray-50 p-2 rounded-2xl hover:bg-gray-100 transition-colors">
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                                            pos === 1 ? 'bg-yellow-400 text-white' : 
                                            pos === 2 ? 'bg-gray-300 text-white' : 
                                            pos === 3 ? 'bg-amber-600 text-white' : 'bg-white text-gray-400'
                                        }`}>
                                            {pos}
                                        </div>
                                        <div className="flex-grow">
                                            <select 
                                                className="w-full bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer disabled:cursor-default"
                                                value={positions[pos] || ""}
                                                onChange={(e) => setPositions({...positions, [pos]: e.target.value})}
                                                disabled={isLocked}
                                            >
                                                {renderDriverOptions()}
                                            </select>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* Eventos Section */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <AlertTriangle className="text-f1-red" size={24} />
                            <h3 className="text-xl font-black uppercase italic text-gray-800 tracking-tighter">Eventos y Telemetría</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-transparent focus-within:border-f1-red/10 transition-all">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">🟣 Vuelta Rápida</label>
                                <select 
                                    className="w-full bg-white border-none rounded-xl text-sm font-bold p-3 shadow-sm focus:ring-2 focus:ring-f1-red/20"
                                    value={events["FASTEST_LAP"]}
                                    onChange={e => setEvents({...events, "FASTEST_LAP": e.target.value})}
                                    disabled={isLocked}
                                >
                                    {renderDriverOptions()}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-6 rounded-[2rem]">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Safety Car</label>
                                    <select 
                                        className="w-full bg-white border-none rounded-xl text-sm font-bold p-3 shadow-sm"
                                        value={events["SAFETY_CAR"]}
                                        onChange={e => setEvents({...events, "SAFETY_CAR": e.target.value})}
                                        disabled={isLocked}
                                    >
                                        <option value="No">No</option>
                                        <option value="Yes">Sí</option>
                                    </select>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-[2rem]">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Abandonos</label>
                                    <input 
                                        type="number" min="0"
                                        className="w-full bg-white border-none rounded-xl text-sm font-bold p-3 shadow-sm"
                                        value={events["DNFS"]}
                                        onChange={e => setEvents({...events, "DNFS": e.target.value})}
                                        disabled={isLocked}
                                    />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {parseInt(events["DNFS"]) > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-6 bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100"
                                >
                                    <label className="block text-xs font-black text-amber-600 uppercase tracking-widest mb-3">☠️ Primer Piloto en Abandonar</label>
                                    <select 
                                        className="w-full bg-white border-none rounded-xl text-sm font-bold p-3 shadow-sm focus:ring-2 focus:ring-amber-200"
                                        value={events["DNF_DRIVER"]}
                                        onChange={e => setEvents({...events, "DNF_DRIVER": e.target.value})}
                                        disabled={isLocked}
                                    >
                                        {renderDriverOptions()}
                                    </select>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>

                    {!isLocked && (
                        <motion.button 
                            whileHover={{ scale: 1.02, backgroundColor: '#c40500' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSave} 
                            className="w-full bg-f1-red text-white py-6 rounded-3xl font-black text-xl uppercase tracking-tighter italic shadow-2xl shadow-red-500/40 flex items-center justify-center gap-3 transition-all"
                        >
                            <Save size={24} /> GUARDAR PREDICCIÓN
                        </motion.button>
                    )}
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default Predictions;