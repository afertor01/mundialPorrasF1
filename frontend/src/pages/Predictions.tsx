/* eslint-disable @typescript-eslint/no-explicit-any */
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
  // --- ESTADOS DE DATOS ---
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [gps, setGps] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [selectedGp, setSelectedGp] = useState<any | null>(null);
  
  // Estado para la carga de un GP individual
  const [loadingGp, setLoadingGp] = useState(false);
  
  // Estado para la carga INICIAL de la temporada (Pantalla de Carga)
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [existingPreds, setExistingPreds] = useState<Record<number, boolean>>({});

  const [positions, setPositions] = useState<{position: number, driver_code: string}[]>([]);
  const [events, setEvents] = useState<{type: string, description: string}[]>([
    { type: "FASTEST_LAP", description: "" },
    { type: "SAFETY_CAR", description: "No" },
    { type: "DNFS", description: "0" },
    { type: "DNF_DRIVER", description: "" },
  ]);

  const getDriverAtPosition = (pos: number) =>
    positions.find(p => p.position === pos)?.driver_code || "";

  const setDriverAtPosition = (pos: number, driver_code: string) =>
    setPositions(prev => {
      const filtered = prev.filter(p => p.position !== pos);
      return driver_code ? [...filtered, { position: pos, driver_code }] : filtered;
    });

  const getEventValue = (type: string) =>
    events.find(e => e.type === type)?.description || "";

  const setEventValue = (type: string, description: string) =>
    setEvents(prev => {
      const exists = prev.some(e => e.type === type);
      if (exists) return prev.map(e => e.type === type ? { ...e, description } : e);
      return [...prev, { type, description }];
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
    } catch (error) { 
        console.error("Error:", error); 
    } finally {
        // CAMBIO: Eliminado el setTimeout. Se quita en cuanto termina la carga.
        setIsInitialLoading(false);
    }
  };

  const handleOpenGp = async (gp: any) => {
    const isClosed = new Date() >= new Date(gp.race_datetime);
    const hasPred = existingPreds[gp.id]; 
    if (isClosed && !hasPred) {
      alert("⚠️ El plazo para este Gran Premio ha finalizado.");
      return;
    }
    setLoadingGp(true);
    setSelectedGp(gp);
    setPositions([]);
    setEvents([
      { type: "FASTEST_LAP", description: "" },
      { type: "SAFETY_CAR", description: "No" },
      { type: "DNFS", description: "0" },
      { type: "DNF_DRIVER", description: "" },
    ]);

    const existing = await API.getMyPrediction(gp.id);
    if (existing) {
        const loadedPositions = existing.positions.map((p: any) => ({
          position: p.position,
          driver_code: p.driver_name,
        }));
        setPositions(loadedPositions);
        const loadedEvents = existing.events.map((e: any) => ({
          type: e.event_type,
          description: e.value,
        }));
        setEvents(prev =>
          prev.map(ev => {
            const found = loadedEvents.find((le: any) => le.type === ev.type);
            return found ? found : ev;
          })
        );
    }
    setLoadingGp(false);
  };

  const handleSave = async () => {
    const filledPositions = positions.filter(p => p.driver_code !== "");
    const uniqueDrivers = new Set(filledPositions.map(p => p.driver_code));
    if (filledPositions.length < 10) return alert("⚠️ Completa las 10 posiciones.");
    if (filledPositions.length !== uniqueDrivers.size) return alert("⚠️ Has repetido pilotos.");
    if (!getEventValue("FASTEST_LAP")) return alert("⚠️ Selecciona la Vuelta Rápida.");

    try {
        await API.savePrediction(selectedGp.id, positions, events);
        alert("✅ Predicción guardada.");
        setExistingPreds(prev => ({ ...prev, [selectedGp.id]: true }));
        setSelectedGp(null);
    } catch { alert("❌ Error al guardar"); }
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

  // --------------------------------------------------------
  // PANTALLA DE CARGA (Clean & Dark)
  // --------------------------------------------------------
  if (isInitialLoading) {
    return (
      // Fondo oscuro sólido con gradiente suave, sin texturas raras
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center relative overflow-hidden z-50">
        
        <div className="z-10 flex flex-col items-center gap-10">
            {/* Semáforo F1 */}
            <div className="flex gap-4 p-5 bg-black rounded-2xl shadow-2xl border border-gray-800">
                {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ backgroundColor: "#374151" }} // Gris oscuro
                        animate={{ backgroundColor: "#ef4444" }} // Rojo F1
                        transition={{ 
                            duration: 0.5, 
                            delay: i * 0.15, 
                            repeat: Infinity, 
                            repeatType: "reverse",
                            repeatDelay: 0.5 
                        }}
                        className="w-10 h-10 md:w-14 md:h-14 rounded-full border-4 border-gray-700 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                    />
                ))}
            </div>

            {/* Texto Blanco Alto Contraste */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-center space-y-3"
            >
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    Cargando Mundial...
                </h2>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-f1-red rounded-full animate-bounce" style={{ animationDelay: '0s' }}/>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}/>
                    <div className="w-2 h-2 bg-f1-red rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}/>
                </div>
            </motion.div>
        </div>
      </div>
    );
  }

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
                    {/* IMAGEN TRACK */}
                    <div className="h-42 w-full bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden group hover:bg-gray-800 transition-colors">
                        <div className="absolute inset-0 bg-f1-red opacity-10 blur-xl"></div>
                        <img 
                            src={getTrackImage(gp.name)} 
                            alt={gp.name} 
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                            className="w-full h-full object-contain filter invert opacity-80 group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    
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
  // VISTA 2: FORMULARIO (Hoja de Tiempos + Sidebar Qualy)
  // ==========================
  const isLocked = new Date() >= new Date(selectedGp.race_datetime);
  
  // Comprobamos si hay datos de qualy
  const qualyResults = selectedGp.qualy_results && Array.isArray(selectedGp.qualy_results) ? selectedGp.qualy_results : [];
  const hasQualy = qualyResults.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        // CAMBIO: Aumentado el ancho máximo para acomodar el sidebar
        className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
      >
        {/* Cabecera Formulario */}
        <div className="bg-f1-dark p-8 text-white relative overflow-hidden">
            <img 
                src={getTrackImage(selectedGp.name)} 
                className="absolute -right-10 -bottom-10 w-96 h-96 object-contain opacity-10 rotate-12 pointer-events-none filter invert"
                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
            />
            <button 
                onClick={() => setSelectedGp(null)} 
                className="absolute left-8 top-8 text-white/50 hover:text-white transition-colors flex items-center gap-1 text-sm font-bold z-10"
            >
                <ChevronLeft size={18} /> SALIR
            </button>
            <div className="text-center mt-4 relative z-10">
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">{selectedGp.name}</h2>
                <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10 text-xs font-bold">
                    {isLocked ? <Lock size={14} className="text-gray-400" /> : <Clock size={14} className="text-f1-red animate-pulse" />}
                    <span className={isLocked ? "text-gray-300" : "text-f1-red"}>
                        {isLocked ? "MODO LECTURA" : `CIERRE: ${new Date(selectedGp.race_datetime).toLocaleString()}`}
                    </span>
                </div>
            </div>
        </div>

        <div className="p-6 md:p-10">
            {loadingGp ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-f1-red border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold text-gray-400 animate-pulse">CARGANDO DATOS DEL BOX...</p>
                </div>
            ) : (
                // CAMBIO: Grid Layout para separar Formulario y Qualy
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    
                    {/* COLUMNA IZQUIERDA: FORMULARIO (Ocupa 8 de 12 columnas) */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* Top 10 Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-8">
                                <Trophy className="text-f1-red" size={24} />
                                <h3 className="text-xl font-black uppercase italic text-gray-800 tracking-tighter">Tu Predicción (Top 10)</h3>
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
                                                    value={getDriverAtPosition(pos)}
                                                    onChange={(e) => setDriverAtPosition(pos, e.target.value)}
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
                                        value={getEventValue("FASTEST_LAP")}
                                        onChange={e => setEventValue("FASTEST_LAP", e.target.value)}
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
                                            value={getEventValue("SAFETY_CAR")}
                                            onChange={e => setEventValue("SAFETY_CAR", e.target.value)}
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
                                            value={getEventValue("DNFS")}
                                            onChange={e => setEventValue("DNFS", e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {parseInt(getEventValue("DNFS")) > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mt-6 bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100"
                                    >
                                        <label className="block text-xs font-black text-amber-600 uppercase tracking-widest mb-3">☠️ Piloto en Abandonar</label>
                                        <select 
                                            className="w-full bg-white border-none rounded-xl text-sm font-bold p-3 shadow-sm focus:ring-2 focus:ring-amber-200"
                                            value={getEventValue("DNF_DRIVER")}
                                            onChange={e => setEventValue("DNF_DRIVER", e.target.value)}
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

                    {/* COLUMNA DERECHA: RESULTADOS QUALY (Sticky Sidebar) */}
                    <div className="lg:col-span-4">
                         <div className="lg:sticky lg:top-8 space-y-6">
                            <div className="bg-indigo-50 rounded-[2rem] p-6 border-2 border-indigo-100 relative overflow-hidden">
                                {/* Decoración de fondo */}
                                <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-200 rounded-full blur-2xl opacity-50"></div>
                                
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-300">
                                        <Timer size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase italic text-indigo-900 leading-none">Resultados Qualy</h3>
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Referencia Oficial</span>
                                    </div>
                                </div>

                                {hasQualy ? (
                                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {qualyResults.map((driverName: string, idx: number) => (
                                            <div key={idx} className="flex items-center bg-white p-3 rounded-xl shadow-sm border border-indigo-50">
                                                <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black mr-3 ${
                                                    idx === 0 ? 'bg-yellow-400 text-white' : 
                                                    idx === 1 ? 'bg-gray-300 text-white' : 
                                                    idx === 2 ? 'bg-amber-600 text-white' : 'bg-indigo-100 text-indigo-500'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-bold text-gray-700 text-sm truncate">{driverName}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 px-4 border-2 border-dashed border-indigo-200 rounded-xl bg-white/50">
                                        <Clock className="mx-auto text-indigo-300 mb-2" size={32} />
                                        <p className="text-sm font-bold text-indigo-400">Resultados no disponibles aún.</p>
                                        <p className="text-xs text-indigo-300 mt-1">Sincroniza los datos en el panel Admin.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Tip Rápido */}
                            {hasQualy && !isLocked && (
                                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 text-xs text-yellow-700 font-medium flex gap-3 items-start">
                                    <Zap size={16} className="flex-shrink-0 mt-0.5 text-yellow-500"/>
                                    <p>Usa los resultados de la Qualy como guía, pero recuerda considerar penalizaciones o cambios de motor.</p>
                                </div>
                            )}
                         </div>
                    </div>

                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default Predictions;