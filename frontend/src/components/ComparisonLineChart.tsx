import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  fullData: Record<string, { gp_id: number; value: number }[]>; // Datos de TODOS los usuarios
  currentUser: string;
}

const ComparisonLineChart: React.FC<Props> = ({ fullData, currentUser }) => {
  const allUsers = Object.keys(fullData);
  // Por defecto seleccionamos al usuario actual y al Top 1 (si no soy yo)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser && allUsers.includes(currentUser)) {
        // Buscar el líder (el que tenga más puntos en el último GP)
        let leader = allUsers[0];
        let maxPoints = -1;
        
        allUsers.forEach(u => {
            const points = fullData[u][fullData[u].length - 1]?.value || 0;
            if (points > maxPoints) { maxPoints = points; leader = u; }
        });
        
        const initial = [currentUser];
        if (leader !== currentUser) initial.push(leader);
        setSelectedUsers(initial);
    }
  }, [currentUser, fullData]);

  // Preparar datos para ChartJS
  // Asumimos que todos tienen los mismos GPs, cogemos los labels del primero
  const firstUser = allUsers[0];
  const labels = firstUser ? fullData[firstUser].map((_, i) => `GP ${i+1}`) : [];

  const datasets = selectedUsers.map((user, i) => {
    const isMe = user === currentUser;
    return {
        label: user,
        data: fullData[user]?.map(d => d.value) || [],
        borderColor: isMe ? "#e10600" : `hsl(${(i * 137) % 360}, 70%, 50%)`, // Colores "random" pero fijos
        borderWidth: isMe ? 3 : 2,
        tension: 0.3,
        pointRadius: 4
    }
  });

  const toggleUser = (user: string) => {
      if (selectedUsers.includes(user)) {
          setSelectedUsers(selectedUsers.filter(u => u !== user));
      } else {
          if (selectedUsers.length >= 10) return alert("Máximo 10 usuarios a la vez");
          setSelectedUsers([...selectedUsers, user]);
      }
  }

  return (
    <div>
        {/* Selector simple de usuarios */}
        <div style={{marginBottom: 15, maxHeight: 100, overflowY: "auto", border: "1px solid #ddd", padding: 5, display: "flex", flexWrap: "wrap", gap: 5}}>
            {allUsers.map(u => (
                <button 
                    key={u} 
                    onClick={() => toggleUser(u)}
                    style={{
                        padding: "4px 8px", 
                        fontSize: "0.8em", 
                        borderRadius: 15,
                        border: "1px solid #ccc",
                        backgroundColor: selectedUsers.includes(u) ? "#333" : "#fff",
                        color: selectedUsers.includes(u) ? "#fff" : "#333",
                        cursor: "pointer"
                    }}
                >
                    {u}
                </button>
            ))}
        </div>
        <div style={{height: 350}}>
            <Line data={{ labels, datasets }} options={{ maintainAspectRatio: false, responsive: true }} />
        </div>
    </div>
  );
};

export default ComparisonLineChart;