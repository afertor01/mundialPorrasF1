import React, { useState, useEffect, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  fullData: Record<string, { gp_id: number; value: number }[]>;
  currentUser: string;
}

const ComparisonLineChart: React.FC<Props> = ({ fullData, currentUser }) => {
  const allUsers = Object.keys(fullData);
  
  // Estados
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Calcular Ranking (Ordenar usuarios por puntos totales de mayor a menor)
  const rankedUsers = useMemo(() => {
      return [...allUsers].sort((a, b) => {
          const pointsA = fullData[a][fullData[a].length - 1]?.value || 0;
          const pointsB = fullData[b][fullData[b].length - 1]?.value || 0;
          return pointsB - pointsA; // Descendente
      });
  }, [allUsers, fullData]);

  // 2. Selección Inicial (Yo + Líder)
  useEffect(() => {
    if (currentUser && allUsers.includes(currentUser) && selectedUsers.length === 0) {
        const leader = rankedUsers[0];
        const initial = [currentUser];
        if (leader && leader !== currentUser) initial.push(leader);
        setSelectedUsers(initial);
    }
  }, [currentUser, rankedUsers]);

  // 3. 🧠 Lógica de Botones Visibles (Top 10 + TÚ)
  const buttonsToShow = useMemo(() => {
    // A) Si busco algo, filtro sobre toda la lista
    if (searchTerm.trim() !== "") {
        return rankedUsers.filter(u => u.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    // B) Si no busco: Top 10 + Seleccionados + YO MISMO (Siempre visible)
    const top10 = rankedUsers.slice(0, 10);
    const visibleSet = new Set([...top10, ...selectedUsers]);
    
    if (currentUser) visibleSet.add(currentUser); // <--- TU BOTÓN SIEMPRE ESTARÁ AQUÍ
    
    // Devolvemos filtrado pero manteniendo el orden del ranking
    return rankedUsers.filter(u => visibleSet.has(u)); 
  }, [searchTerm, rankedUsers, selectedUsers, currentUser]);

  // Preparar datos ChartJS
  const firstUser = allUsers[0];
  const labels = firstUser ? fullData[firstUser].map((_, i) => `GP ${i+1}`) : [];

  const datasets = selectedUsers.map((user, i) => {
    const isMe = user === currentUser;
    // Color hash consistente
    const stringHash = user.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = isMe ? "#e10600" : `hsl(${stringHash % 360}, 70%, 45%)`;

    return {
        label: user,
        data: fullData[user]?.map(d => d.value) || [],
        borderColor: color,
        backgroundColor: color,
        borderWidth: isMe ? 3 : 2,
        tension: 0.3,
        pointRadius: isMe ? 4 : 3,
        pointHoverRadius: 6,
        // Orden visual: ponemos mi línea por encima de las demás (z-index simulado)
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

  return (
    <div>
        <input 
            type="text" 
            placeholder="🔍 Buscar piloto/usuario..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
                width: "100%",
                padding: "12px",
                marginBottom: "15px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "1rem",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)"
            }}
        />

        <div style={{
            marginBottom: 20, 
            maxHeight: 150,
            overflowY: "auto", 
            border: "1px solid #eee", 
            borderRadius: "12px",
            padding: "15px", 
            display: "flex", 
            flexWrap: "wrap", 
            gap: "10px",
            backgroundColor: "#f8f9fa"
        }}>
            {!searchTerm && <div style={{width: "100%", fontSize: "0.8rem", color: "#888", marginBottom: "5px"}}>Top 10 y Tú:</div>}
            
            {buttonsToShow.length > 0 ? (
                buttonsToShow.map(u => {
                    const isActive = selectedUsers.includes(u);
                    const isMe = u === currentUser;
                    return (
                        <button 
                            key={u} 
                            onClick={() => toggleUser(u)}
                            style={{
                                padding: "6px 14px", 
                                fontSize: "0.9rem", 
                                borderRadius: "20px",
                                border: isActive ? (isMe ? "2px solid #e10600" : "1px solid #333") : "1px solid #ddd",
                                backgroundColor: isActive ? (isMe ? "#ffebeb" : "#333") : "#fff", // Color especial para ti activo
                                color: isActive ? (isMe ? "#e10600" : "#fff") : "#555",
                                fontWeight: isMe ? "bold" : "normal",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                        >
                            {rankedUsers.indexOf(u) === 0 && "🥇"}
                            {rankedUsers.indexOf(u) === 1 && "🥈"}
                            {rankedUsers.indexOf(u) === 2 && "🥉"}
                            {u} {isMe && "(Tú)"}
                            <span style={{opacity: 0.6, fontSize: "0.8em"}}>{isActive ? "×" : "+"}</span>
                        </button>
                    )
                })
            ) : (
                <span style={{color: "#999", padding: "10px", width: "100%", textAlign: "center"}}>
                    No se encontraron usuarios
                </span>
            )}
        </div>

        <div style={{height: 400, padding: "10px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #eee"}}>
            <Line 
                data={{ labels, datasets }} 
                options={{ 
                    maintainAspectRatio: false, 
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { position: 'bottom' },
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