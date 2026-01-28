import React, { useState, useEffect, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  fullData: Record<string, { gp_id: number; value: number }[]>;
  currentUser: string;
  gps: any[];
}

// 🎨 NUEVA FUNCIÓN DE COLOR ROBUSTA
const stringToColor = (str: string) => {
    let hash = 0;
    // Algoritmo DJB2 (muy común para hash de strings)
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Multiplicamos por un número primo (ej. 137) para dispersar usuarios con nombres similares
    // y aseguramos que sea positivo.
    const hue = Math.abs((hash * 137) % 360);
    
    // Devolvemos un color con buena saturación (70%) y legibilidad (45%)
    return `hsl(${hue}, 70%, 45%)`;
};

const ComparisonLineChart: React.FC<Props> = ({ fullData, currentUser, gps }) => {
  const allUsers = Object.keys(fullData);
  
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

  const labels = playedGps.map(gp => gp.name); 

  const datasets = selectedUsers.map((user) => {
    const isMe = user === currentUser;
    
    // ✅ AQUÍ USAMOS LA NUEVA LÓGICA DE COLOR
    const color = isMe ? "#e10600" : stringToColor(user);

    const data = playedGps.map(gp => {
        const point = fullData[user]?.find(d => d.gp_id === gp.id);
        return point ? point.value : null; 
    });

    return {
        label: user,
        data: data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: isMe ? 4 : 2, // Hice tu línea un poco más gruesa (4px)
        tension: 0.3,
        pointRadius: isMe ? 5 : 3,
        pointHoverRadius: 7,
        order: isMe ? 0 : 1 
    }
  });

  const toggleUser = (user: string) => {
      if (selectedUsers.includes(user)) {
          setSelectedUsers(selectedUsers.filter(u => u !== user));
      } else {
          if (selectedUsers.length >= 10) return alert("Máximo 10 líneas a la vez");
          setSelectedUsers([...selectedUsers, user]);
      }
  }

  if (playedGps.length === 0) {
      return (
        <div className="h-[400px] flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
            <p className="font-bold">Aún no se ha disputado ninguna carrera esta temporada.</p>
        </div>
      );
  }

  return (
    <div>
        <input 
            type="text" 
            placeholder="🔍 Buscar piloto/usuario..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
                width: "100%", padding: "12px", marginBottom: "15px",
                borderRadius: "8px", border: "1px solid #ddd", fontSize: "1rem"
            }}
        />

        <div style={{
            marginBottom: 20, maxHeight: 150, overflowY: "auto", 
            border: "1px solid #eee", borderRadius: "12px", padding: "15px", 
            display: "flex", flexWrap: "wrap", gap: "10px", backgroundColor: "#f8f9fa"
        }}>
            {!searchTerm && <div style={{width: "100%", fontSize: "0.8rem", color: "#888", marginBottom: "5px"}}>Top 10 y Tú:</div>}
            
            {buttonsToShow.length > 0 ? (
                buttonsToShow.map(u => {
                    const isActive = selectedUsers.includes(u);
                    const isMe = u === currentUser;
                    // Calculamos el color también para el borde del botón
                    const btnColor = isMe ? "#e10600" : stringToColor(u);
                    
                    return (
                        <button 
                            key={u} 
                            onClick={() => toggleUser(u)}
                            style={{
                                padding: "6px 14px", fontSize: "0.9rem", borderRadius: "20px",
                                border: isActive ? `2px solid ${btnColor}` : "1px solid #ddd", // Borde del color del usuario
                                backgroundColor: isActive ? (isMe ? "#ffebeb" : "#fff") : "#fff",
                                color: isActive ? "#333" : "#555",
                                fontWeight: isActive ? "bold" : "normal", 
                                cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "6px",
                                boxShadow: isActive ? `0 2px 5px ${btnColor}40` : "none" // Sombra sutil con el color
                            }}
                        >
                            {/* Puntos de color indicativo */}
                            <span style={{
                                width: 10, height: 10, borderRadius: "50%", 
                                backgroundColor: btnColor, display: "inline-block"
                            }}></span>
                            
                            {rankedUsers.indexOf(u) === 0 && "🥇"}
                            {rankedUsers.indexOf(u) === 1 && "🥈"}
                            {rankedUsers.indexOf(u) === 2 && "🥉"}
                            {u} {isMe && "(Tú)"}
                        </button>
                    )
                })
            ) : (
                <span style={{color: "#999", width: "100%", textAlign: "center"}}>No se encontraron usuarios</span>
            )}
        </div>

        <div style={{height: 400, padding: "10px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #eee"}}>
            <Line 
                data={{ labels, datasets }} 
                options={{ 
                    maintainAspectRatio: false, 
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true } }, // Estilo de punto en leyenda
                        title: { display: true, text: 'Evolución de Puntos' }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                        x: { grid: { display: false } }
                    }
                }} 
            />
        </div>
    </div>
  );
};

export default ComparisonLineChart;