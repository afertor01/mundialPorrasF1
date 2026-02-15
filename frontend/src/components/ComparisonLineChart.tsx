/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  fullData: Record<string, { gp_id: number; value: number }[]>;
  currentUser: string;
  gps: any[];
}

// 🎨 FUNCIÓN DE COLOR
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs((hash * 137) % 360);
    return `hsl(${hue}, 70%, 45%)`;
};

const ComparisonLineChart: React.FC<Props> = ({ fullData, currentUser, gps }) => {
  const allUsers = Object.keys(fullData);
  
  // --- 1. LÓGICA DE GESTIÓN DE USUARIOS ---
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const playedGps = useMemo(() => {
    if (!gps || gps.length === 0) return [];
    const now = new Date();
    return gps
        .filter(gp => new Date(gp.race_datetime) < now)
        .sort((a, b) => new Date(a.race_datetime).getTime() - new Date(b.race_datetime).getTime());
  }, [gps]);

  const rankedUsers = useMemo(() => {
      const lastGpId = playedGps.length > 0 ? playedGps[playedGps.length - 1].id : null;
      return [...allUsers].sort((a, b) => {
          const pointA = fullData[a]?.find(d => d.gp_id === lastGpId)?.value || 0;
          const pointB = fullData[b]?.find(d => d.gp_id === lastGpId)?.value || 0;
          return pointB - pointA;
      });
  }, [allUsers, fullData, playedGps]);

  useEffect(() => {
    if (currentUser && allUsers.includes(currentUser) && selectedUsers.length === 0) {
        const leader = rankedUsers[0];
        const initial = [currentUser];
        if (leader && leader !== currentUser) initial.push(leader);
        setSelectedUsers(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, rankedUsers, allUsers]);

  const buttonsToShow = useMemo(() => {
    if (searchTerm.trim() !== "") {
        return rankedUsers.filter(u => u.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    const top10 = rankedUsers.slice(0, 10);
    const visibleSet = new Set([...top10, ...selectedUsers]);
    if (currentUser) visibleSet.add(currentUser);
    return rankedUsers.filter(u => visibleSet.has(u)); 
  }, [searchTerm, rankedUsers, selectedUsers, currentUser]);

  const toggleUser = (user: string) => {
      if (selectedUsers.includes(user)) {
          setSelectedUsers(selectedUsers.filter(u => u !== user));
      } else {
          if (selectedUsers.length >= 10) return alert("Máximo 10 líneas a la vez");
          setSelectedUsers([...selectedUsers, user]);
      }
  }

  // --- 2. DATOS PARA RECHARTS ---
  const chartData = useMemo(() => {
    return playedGps.map((gp) => {
      const point: any = { 
          name: gp.name, 
      };
      
      selectedUsers.forEach((username) => {
        const userPoints = fullData[username];
        if (userPoints) {
            const p = userPoints.find((item) => item.gp_id === gp.id);
            point[username] = p ? p.value : null;
        }
      });
      return point;
    });
  }, [fullData, playedGps, selectedUsers]);

  // --- 3. CÁLCULO DE LÍMITES ---
  const { maxVal } = useMemo(() => {
      let max = 10; 
      const allValues: number[] = [];
      
      selectedUsers.forEach(u => {
          fullData[u]?.forEach(d => allValues.push(d.value));
      });

      if (allValues.length > 0) {
          max = Math.max(...allValues);
      }
      return { maxVal: max };
  }, [selectedUsers, fullData]);
  
  const topPadding = maxVal * 0.1;

  if (playedGps.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">
            Esperando resultados de la primera carrera...
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full w-full">
        {/* PARTE SUPERIOR: CONTROLES */}
        <div className="mb-4">
            <input 
                type="text" 
                placeholder="🔍 Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 mb-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-f1-red transition-all shadow-sm"
            />

            <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto custom-scrollbar p-1">
                {!searchTerm && <span className="w-full text-[10px] font-black uppercase text-gray-300 tracking-widest mb-1">Top 10 & Tú</span>}
                
                {buttonsToShow.length > 0 ? buttonsToShow.map(u => {
                    const isActive = selectedUsers.includes(u);
                    const isMe = u === currentUser;
                    const btnColor = isMe ? "#e10600" : stringToColor(u);
                    
                    return (
                        <button 
                            key={u} 
                            onClick={() => toggleUser(u)}
                            className={`
                                flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-all border
                                ${isActive ? "shadow-sm scale-105" : "hover:bg-gray-50 opacity-70 hover:opacity-100"}
                            `}
                            style={{
                                borderColor: isActive ? btnColor : "#eee",
                                backgroundColor: isActive ? (isMe ? "#fff1f1" : "white") : "white",
                                color: isActive ? "#222" : "#888",
                                fontWeight: isActive ? 700 : 400
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: btnColor }}></span>
                            {rankedUsers.indexOf(u) === 0 && "🥇"}
                            {rankedUsers.indexOf(u) === 1 && "🥈"}
                            {rankedUsers.indexOf(u) === 2 && "🥉"}
                            {u} {isMe && "(Tú)"}
                        </button>
                    )
                }) : <span className="text-xs text-gray-400 italic pl-2">Sin resultados</span>}
            </div>
        </div>

        {/* PARTE INFERIOR: GRÁFICA */}
        <div className="flex-1 w-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 5 }} // Bottom reducido pq el XAxis height ya da espacio
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    
                    {/* EJE X: OBLICUO */}
                    <XAxis 
                        dataKey="name" 
                        // ✅ SOLUCIÓN: Movemos 'angle' aquí como propiedad directa
                        angle={-30} 
                        // En 'tick' dejamos solo las propiedades estándar de SVG
                        tick={{ 
                            fontSize: 10, 
                            fill: "#9ca3af", 
                            fontWeight: "bold", 
                            textAnchor: 'end' 
                        }} 
                        axisLine={false}
                        tickLine={false}
                        dy={5} 
                        dx={-5} 
                        height={60} 
                        interval="preserveStartEnd" 
                    />
                    
                    {/* EJE Y: Empezando en 0 */}
                    <YAxis 
                        domain={[0, maxVal + topPadding]} 
                        tick={{ fontSize: 10, fill: "#9ca3af" }} 
                        axisLine={false}
                        tickLine={false}
                        width={40} 
                        allowDecimals={false} 
                    />
                    
                    <Tooltip 
                        itemSorter={(item) => (item.value as number) * -1}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                        itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                        labelStyle={{ color: "#9ca3af", fontSize: "10px", textTransform: "uppercase", marginBottom: "5px" }}
                    />
                    
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} iconType="circle"/>

                    {selectedUsers.map((username) => {
                        const isMe = username === currentUser;
                        const color = isMe ? "#e10600" : stringToColor(username);
                        
                        return (
                            <Line
                                key={username}
                                type="monotone"
                                dataKey={username}
                                stroke={color}
                                strokeWidth={isMe ? 4 : 2}
                                dot={isMe ? { r: 4, strokeWidth: 2, fill: "white" } : false}
                                activeDot={{ r: 6 }}
                                strokeOpacity={isMe ? 1 : 0.4}
                                connectNulls={true}
                                animationDuration={2000}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default ComparisonLineChart;