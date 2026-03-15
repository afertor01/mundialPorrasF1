import React, { useEffect, useState, useContext } from "react";
import * as API from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import {
    Flag, MapPin, Calendar, Search, Plus, X,
    CheckCircle2, Trophy, Medal
} from "lucide-react";
import { getTrackImage } from "../utils/getTrackImage";

// --- INTERFACES ---
interface PredictionData {
    username: string;
    points: number;
    base_points?: number;
    multiplier: number;
    positions: Record<string, string>;
    events: Record<string, string>;
}

interface RaceResultData {
    positions: Record<string, string>;
    events: Record<string, string>;
}

// --- CONSTANTES ---
const IGNORED_EVENTS = ["POLE_POSITION", "INCIDENTS_INFO", "DNF_LIST", "DNF_DRIVER"];

const MULTIPLIER_VALUES = {
    SAFETY_CAR: 1.5,
    DNFS: 1.5,
    DNF_DRIVER: 1.5,
    FASTEST_LAP: 1.5,
    PODIUM_TOTAL: 1.5,
    PODIUM_PARTIAL: 1.25
};

// --- HELPERS ---

// Normaliza cadenas para comparación (quita espacios, minúsculas)
const normalize = (val: any) => String(val || "").toLowerCase().trim();

const isDnfCorrect = (predictedDriver: string | undefined, realDnfList: string | undefined) => {
    if (!predictedDriver) return false;
    const pDriver = normalize(predictedDriver);
    const rListRaw = realDnfList || "";

    // Casos de "Ninguno"
    const isPredictedNone = ["", "0", "none", "-", "no"].includes(pDriver);
    const isRealNone = ["", "0", "none"].includes(normalize(rListRaw));

    if (isPredictedNone && isRealNone) return true;
    if (isPredictedNone && !isRealNone) return false;
    if (!rListRaw) return false;

    // Comparar contenido
    const cleanList = rListRaw.split(",").map(d => normalize(d));
    return cleanList.includes(pDriver);
};

const getPodiumStatus = (predPos: Record<string, string> | undefined, realPos: Record<string, string> | undefined) => {
    if (!predPos || !realPos) return "none";
    const p1 = predPos["1"], p2 = predPos["2"], p3 = predPos["3"];
    const r1 = realPos["1"], r2 = realPos["2"], r3 = realPos["3"];

    if (!p1 || !p2 || !p3 || !r1 || !r2 || !r3) return "none";

    // Exacto
    if (normalize(p1) === normalize(r1) && normalize(p2) === normalize(r2) && normalize(p3) === normalize(r3)) return "exact";

    // Parcial (Set comparison)
    const predSet = new Set([normalize(p1), normalize(p2), normalize(p3)]);
    const realSet = new Set([normalize(r1), normalize(r2), normalize(r3)]);

    if (predSet.size === realSet.size && [...predSet].every(x => realSet.has(x))) {
        return "partial";
    }
    return "none";
};

// Cálculo de multiplicador en Frontend
const calculateMultiplierValue = (
    predEvents: Record<string, string> | undefined,
    result: RaceResultData | null,
    podiumStatus: string
) => {
    if (!result || !predEvents) return 1.0;
    let mult = 1.0;

    const events = result.events || {};

    // Safety Car
    if (normalize(predEvents["SAFETY_CAR"]) === normalize(events["SAFETY_CAR"])) mult *= MULTIPLIER_VALUES.SAFETY_CAR;
    // DNFs (Cantidad)
    if (normalize(predEvents["DNFS"]) === normalize(events["DNFS"])) mult *= MULTIPLIER_VALUES.DNFS;
    // DNF Driver
    if (isDnfCorrect(predEvents["DNF_DRIVER"], events["DNF_DRIVER"])) mult *= MULTIPLIER_VALUES.DNF_DRIVER;
    // Vuelta Rápida
    if (normalize(predEvents["FASTEST_LAP"]) === normalize(events["FASTEST_LAP"])) mult *= MULTIPLIER_VALUES.FASTEST_LAP;
    // Podio
    if (podiumStatus === "exact") mult *= MULTIPLIER_VALUES.PODIUM_TOTAL;
    else if (podiumStatus === "partial") mult *= MULTIPLIER_VALUES.PODIUM_PARTIAL;

    return mult;
};


const RaceControl: React.FC = () => {
    const { token } = useContext(AuthContext);
    const [currentUser, setCurrentUser] = useState("");
    const [gps, setGps] = useState<any[]>([]);
    const [selectedGpId, setSelectedGpId] = useState<number | null>(null);
    const [allPredictions, setAllPredictions] = useState<PredictionData[]>([]);
    const [raceResult, setRaceResult] = useState<RaceResultData | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    useEffect(() => {
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                const user = decoded.username || "";
                setCurrentUser(user);
                if (user && selectedUsers.length === 0) setSelectedUsers([user]);
            } catch (e) { }
        }
    }, [token]);

    useEffect(() => {
        const init = async () => {
            try {
                const seasons = await API.getSeasons();
                const active = seasons.find((s: any) => s.is_active);
                console.log("Active Season:", active);
                if (active) {
                    const gpList = await API.getGPs(active.id);
                    console.log("GP List:", gpList);
                    setGps(gpList);
                    if (gpList.length > 0) {
                        const now = new Date();
                        const pastGps = gpList.filter((gp: any) => new Date(gp.race_datetime) < now);
                        const defaultGp = pastGps.length > 0 ? pastGps[pastGps.length - 1] : gpList[0];
                        setSelectedGpId(defaultGp.id);
                    }
                }
            } catch (error) { console.error(error); }
        };
        init();
    }, []);

    useEffect(() => {
        if (selectedGpId) loadGpData(selectedGpId);
    }, [selectedGpId]);

    const loadGpData = async (gpId: number) => {
        setAllPredictions([]);
        setRaceResult(null);
        try {
            console.log("Loading data for GP:", gpId);
            const preds = await API.getGpPredictions(gpId);
            console.log("Predictions:", preds);
            setAllPredictions(preds || []);
            const result = await API.getPublicRaceResult(gpId);
            console.log("Race Result:", result);
            setRaceResult(result);
        } catch (e) { console.error("Error loading GP data:", e); }
    };

    const toggleUser = (username: string) => {
        if (selectedUsers.includes(username)) setSelectedUsers(selectedUsers.filter(u => u !== username));
        else setSelectedUsers([...selectedUsers, username]);
    };

    const availableUsers = allPredictions
        .filter(p => !selectedUsers.includes(p.username))
        .filter(p => p.username.toLowerCase().includes(searchTerm.toLowerCase()));

    const viewData = selectedUsers
        .map(u => allPredictions.find(p => p.username === u))
        .filter(Boolean) as PredictionData[];

    const selectedGpObj = gps.find(g => g.id === selectedGpId);

    // Componente Fila Posición
    const PositionRow = ({ pos, driver, result }: { pos: number, driver: string, result: RaceResultData | null }) => {
        let status = "neutral";
        if (result && result.positions) {
            const realDriver = result.positions[pos.toString()];
            const realPosOfDriver = Object.keys(result.positions).find(k => result.positions[k] === driver);

            if (normalize(driver) === normalize(realDriver)) status = "exact";
            else if (realPosOfDriver && Math.abs(parseInt(realPosOfDriver) - pos) === 1) status = "close";
        }

        return (
            <div className={`flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-lg border transition-colors mb-0.5 last:mb-0 ${status === "exact" ? 'bg-green-50 border-green-200' : status === "close" ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                <span className={`w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded text-[10px] md:text-xs font-black ${status === "exact" ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{pos}</span>
                <span className={`text-[11px] md:text-sm font-bold truncate ${status === "exact" ? 'text-green-800' : 'text-gray-800'}`}>{driver}</span>
                {status === "exact" && <CheckCircle2 size={12} className="text-green-500 ml-auto flex-shrink-0" />}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-3 md:p-8 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6">

                {/* HEADER PRINCIPAL */}
                <header className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                        <div className="bg-gray-900 text-white w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl flex items-center justify-center overflow-hidden border-2 border-gray-700 p-1 shadow-xl md:shadow-2xl shadow-gray-400/50 shrink-0">
                            {selectedGpObj ? (
                                <img
                                    src={getTrackImage(selectedGpObj.name)}
                                    className="w-full h-full object-contain filter invert"
                                    alt="Track"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            ) : <Flag size={32} className="md:w-12 md:h-12" />}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter text-gray-900 truncate">Race Control</h1>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                                <MapPin size={12} className="md:w-4 md:h-4" /> <span className="text-gray-600 truncate max-w-[120px] md:max-w-none">{selectedGpObj?.name || "Selecciona GP"}</span>
                                <span className="mx-0.5">•</span>
                                <Calendar size={12} className="md:w-4 md:h-4" /> <span>{selectedGpObj ? new Date(selectedGpObj.race_datetime).toLocaleDateString() : "--/--"}</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative w-full md:min-w-[300px]">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-2">Seleccionar Gran Premio</label>
                        <select
                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 font-bold text-sm py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-f1-red/20 focus:border-f1-red transition-all cursor-pointer"
                            value={selectedGpId || ""}
                            onChange={(e) => setSelectedGpId(Number(e.target.value))}
                        >
                            {gps.map(gp => <option key={gp.id} value={gp.id}>Round {gp.id}: {gp.name}</option>)}
                        </select>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* PANEL IZQUIERDO */}
                    <div className="lg:col-span-3 bg-white p-5 rounded-2xl md:rounded-[2rem] shadow-lg border border-gray-100 h-fit lg:sticky lg:top-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Añadir Comparativa</h3>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input type="text" placeholder="Buscar usuario..." className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm font-bold focus:outline-none focus:border-f1-red transition-colors" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        
                        {/* Tags de usuarios seleccionados */}
                        <div className="flex flex-wrap gap-2 mb-4 max-h-[120px] overflow-y-auto pr-1">
                            <AnimatePresence>
                                {selectedUsers.map(u => (
                                    <motion.button key={u} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={() => toggleUser(u)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${u === currentUser ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600'}`}>
                                        {u} <X size={12} />
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>

                        <div className="max-h-[300px] lg:max-h-[400px] overflow-y-auto space-y-1 pr-2 custom-scrollbar border-t border-gray-50 pt-3">
                            {availableUsers.map(p => (
                                <button key={p.username} onClick={() => toggleUser(p.username)} className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors group text-left">
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 truncate pr-2">{p.username}</span>
                                    <div className="bg-gray-100 p-1 rounded-full text-gray-400 group-hover:bg-f1-red group-hover:text-white transition-colors flex-shrink-0"><Plus size={12} /></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PANEL DERECHO: COMPARATIVA */}
                    <div className="lg:col-span-9 relative">
                        <div className="overflow-x-auto pb-4 custom-scrollbar rounded-2xl md:rounded-[2rem]">
                            <div className="flex gap-4 min-w-max p-1">

                                {/* COLUMNA 1: RESULTADO OFICIAL */}
                                {raceResult && (
                                    <div className="w-[180px] md:w-[280px] flex-shrink-0 sticky left-0 z-20">
                                        <div className="bg-gray-900 text-white p-3 md:p-4 rounded-t-2xl flex flex-col items-center justify-center h-[110px] md:h-[130px] border-r border-gray-800">
                                            <Trophy size={20} className="text-yellow-400 mb-1 md:size-28" />
                                            <h3 className="font-black uppercase italic tracking-tighter text-base md:text-xl leading-none">Resultados</h3>
                                            <span className="text-[8px] md:text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">Oficiales</span>
                                        </div>

                                        <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-xl p-3 md:p-4 space-y-1.5 md:space-y-2 border-r-2 border-gray-300">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i + 1} className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-gray-200 rounded text-[10px] md:text-xs font-black text-gray-600">{i + 1}</span>
                                                    <span className="text-[11px] md:text-sm font-bold text-gray-900 truncate">{raceResult.positions ? raceResult.positions[(i + 1).toString()] : '---'}</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-dashed border-gray-200 my-2 md:my-4 pt-2"></div>
                                            {Object.entries(raceResult.events)
                                                .filter(([key]) => !IGNORED_EVENTS.includes(key))
                                                .map(([key, val]) => (
                                                    <div key={key} className="flex justify-between items-center text-[10px] md:text-xs p-1 md:p-2">
                                                        <span className="font-bold text-gray-400 uppercase">{key}</span>
                                                        <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 md:py-1 rounded">{val}</span>
                                                    </div>
                                                ))}
                                            <div className="flex flex-col gap-1 p-2 bg-red-50 rounded border border-red-100 mt-1">
                                                <span className="font-bold text-[8px] md:text-[10px] text-red-500 uppercase">Abandonos</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {raceResult.events && raceResult.events["DNF_DRIVER"] && raceResult.events["DNF_DRIVER"].trim() !== "" ? (
                                                        raceResult.events["DNF_DRIVER"].split(",").map((d, idx) => (
                                                            <span key={idx} className="text-[8px] md:text-[10px] font-black bg-white text-red-600 px-1.5 py-0.5 rounded border border-red-200 shadow-sm">{d.trim()}</span>
                                                        ))
                                                    ) : <span className="text-[8px] md:text-[10px] font-bold text-gray-400 italic">Ninguno</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* COLUMNAS DE USUARIOS */}
                                {viewData.map((p) => {
                                    const podiumStatus = getPodiumStatus(p.positions, raceResult?.positions);
                                    const calculatedMult = calculateMultiplierValue(p.events, raceResult, podiumStatus);

                                    return (
                                        <div key={p.username} className="w-[200px] md:w-[280px] flex-shrink-0">
                                            {/* CABECERA USUARIO */}
                                            <div className={`p-3 md:p-4 rounded-t-2xl flex flex-col items-center justify-center relative overflow-hidden h-[110px] md:h-[130px] transition-all border-l ${p.username === currentUser ? 'bg-blue-600 text-white shadow-md border-transparent' : 'bg-white border-t border-r border-gray-200 text-gray-900'}`}>
                                                <h3 className="font-black text-sm md:text-lg text-center leading-tight break-words line-clamp-2 min-h-[1.5rem] md:min-h-[2.2rem]">{p.username}</h3>
                                                <div className="flex items-baseline gap-1 mt-1 md:mt-0">
                                                    <span className="text-2xl md:text-4xl font-black tracking-tight">{p.points.toFixed(0)}</span>
                                                    <span className="text-[8px] md:text-xs font-bold uppercase opacity-60">PTS</span>
                                                </div>
                                                {p.base_points !== undefined && (
                                                    <div className={`flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[11px] font-mono px-3 md:px-4 py-0.5 md:py-1 rounded-full border mt-1 ${p.username === currentUser ? 'bg-blue-700/50 border-blue-500/50 text-blue-100' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                        <span className="font-bold">{p.base_points}</span>
                                                        <span className="opacity-50 text-[8px]">×</span>
                                                        <span className="font-bold">{calculatedMult.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-sm p-3 md:p-4 space-y-1.5 md:space-y-2">
                                                {/* PODIO */}
                                                {podiumStatus !== "none" ? (
                                                    <div className={`relative rounded-xl p-1.5 md:p-2 mb-2 md:mb-3 mt-1 ${podiumStatus === "exact" ? "border-2 border-yellow-400 bg-yellow-50/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]" : "border-2 border-slate-300 bg-slate-50 shadow-sm"}`}>
                                                        <div className={`absolute -top-2 md:-top-2.5 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 whitespace-nowrap shadow-sm border ${podiumStatus === "exact" ? "bg-yellow-400 text-yellow-900 border-yellow-500" : "bg-slate-200 text-slate-700 border-slate-300"}`}>
                                                            {podiumStatus === "exact" ? <><Trophy size={8} /> Exacto</> : <><Medal size={8} /> Parcial</>}
                                                        </div>
                                                        {[1, 2, 3].map((pos) => <PositionRow key={pos} pos={pos} driver={p.positions[pos.toString()] || "-"} result={raceResult} />)}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 mb-1">
                                                        {[1, 2, 3].map((pos) => <PositionRow key={pos} pos={pos} driver={p.positions[pos.toString()] || "-"} result={raceResult} />)}
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    {[4, 5, 6, 7, 8, 9, 10].map((pos) => (
                                                        <PositionRow key={pos} pos={pos} driver={p.positions[pos.toString()] || "-"} result={raceResult} />
                                                    ))}
                                                </div>

                                                <div className="border-t border-dashed border-gray-200 my-2 md:my-4 pt-2">
                                                    <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 md:mb-2 block">Eventos</span>
                                                </div>

                                                {Object.entries(p.events || {})
                                                    .filter(([key]) => !IGNORED_EVENTS.includes(key))
                                                    .map(([key, val]) => {
                                                        const isCorrect = raceResult && raceResult.events && normalize(raceResult.events[key]) === normalize(val);
                                                        return (
                                                            <div key={key} className={`flex justify-between items-center text-[10px] md:text-xs p-1.5 md:p-2 rounded border mb-0.5 md:mb-1 transition-colors ${isCorrect ? 'bg-green-50 border-green-200' : 'border-transparent'}`}>
                                                                <span className={`font-bold uppercase truncate max-w-[80px] md:max-w-[100px] ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{key}</span>
                                                                <span className={`font-black px-1 md:px-2 py-0.5 md:py-1 rounded flex items-center gap-1 ${isCorrect ? 'bg-green-200 text-green-900' : 'bg-gray-100 text-gray-900'}`}>
                                                                    {val}
                                                                    {isCorrect && <CheckCircle2 size={10} />}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}

                                                {(() => {
                                                    let isDnfHit = false;
                                                    const userDnfPrediction = (p.events || {})["DNF_DRIVER"];
                                                    const realDnfList = (raceResult && raceResult.events) ? raceResult.events["DNF_DRIVER"] : "";
                                                    if (raceResult && raceResult.events) isDnfHit = isDnfCorrect(userDnfPrediction, realDnfList);
                                                    const displayText = (["", "0", "none"].includes(normalize(userDnfPrediction))) ? "Ninguno" : userDnfPrediction;

                                                    return (
                                                        <div className={`flex justify-between items-center text-[10px] md:text-xs p-1.5 md:p-2 rounded border mb-0.5 md:mb-1 transition-colors ${isDnfHit ? 'bg-green-50 border-green-200' : 'border-transparent'}`}>
                                                            <span className={`font-bold uppercase truncate max-w-[80px] md:max-w-[100px] ${isDnfHit ? 'text-green-700' : 'text-gray-500'}`}>ABANDONO</span>
                                                            <span className={`font-black px-1 md:px-2 py-0.5 md:py-1 rounded flex items-center gap-1 ${isDnfHit ? 'bg-green-200 text-green-900' : 'bg-gray-100 text-gray-900'}`}>
                                                                {displayText}
                                                                {isDnfHit && <CheckCircle2 size={10} />}
                                                            </span>
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RaceControl;