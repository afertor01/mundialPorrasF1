import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Activity, Cpu, ShieldCheck } from "lucide-react";

const TelemetryBoot: React.FC = () => {
    const [lines, setLines] = useState<string[]>([]);
    
    const logMessages = [
        "ESTABLISHING SECURE PADDOCK CONNECTION...",
        "SYNCING SEASON 2026 CALENDAR...",
        "FETCHING GLOBAL STANDINGS...",
        "CALCULATING MULTIPLIERS...",
        "DECRYPTING TELEMETRY STREAMS...",
        "PADDOCK ACCESS GRANTED.",
        "BOX BOX BOX - INITIALIZING DASHBOARD..."
    ];

    useEffect(() => {
        let currentIdx = 0;
        const interval = setInterval(() => {
            if (currentIdx < logMessages.length) {
                setLines(prev => [...prev.slice(-5), logMessages[currentIdx]]);
                currentIdx++;
            } else {
                clearInterval(interval);
            }
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-f1-dark z-50 flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
            
            <div className="relative w-full max-w-xl">
                {/* Header Area */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-12"
                >
                    <div className="p-4 bg-f1-red rounded-2xl shadow-[0_0_30px_rgba(225,6,0,0.4)]">
                        <Cpu className="text-white animate-pulse" size={32} />
                    </div>
                    <div>
                        <h2 className="text-white text-2xl font-black italic uppercase tracking-tighter">Telemetry Master</h2>
                        <div className="flex items-center gap-2 text-f1-red text-[10px] font-bold tracking-[0.3em] uppercase">
                            <Activity size={12} /> System Live
                        </div>
                    </div>
                </motion.div>

                {/* Console Output */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 font-mono text-[11px] min-h-[220px] shadow-2xl">
                    <AnimatePresence>
                        {lines.map((line, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`mb-2 ${idx === lines.length - 1 ? 'text-f1-red font-bold' : 'text-gray-400'}`}
                            >
                                <span className="opacity-30 mr-3">[{new Date().toLocaleTimeString()}]</span>
                                {line}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    <motion.div 
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-2 h-4 bg-f1-red ml-1 align-middle"
                    />
                </div>

                {/* Bottom Status */}
                <div className="mt-12 flex justify-between items-center px-4">
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => (
                            <motion.div 
                                key={i}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, delay: i * 0.2 }}
                                className="w-1.5 h-1.5 rounded-full bg-f1-red" 
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-widest">
                        <ShieldCheck size={14} className="text-green-500" /> Secure Link Active
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TelemetryBoot;
