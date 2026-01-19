import React, { useEffect, useState, useContext } from "react";
import * as API from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import BarChartTop20 from "../components/BarChartTop20";
import ComparisonLineChart from "../components/ComparisonLineChart";

const styles = {
    container: { padding: "20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" },
    tabs: { display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #eee" },
    tab: (active: boolean) => ({
        padding: "10px 20px", cursor: "pointer", border: "none", background: "none",
        borderBottom: active ? "3px solid #e10600" : "3px solid transparent",
        fontWeight: active ? "bold" : "normal", fontSize: "1.1em", color: active ? "#e10600" : "#555"
    }),
    section: { marginBottom: "40px", backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
    podiumRow: (rank: number) => ({
        backgroundColor: rank === 1 ? "#fff8e1" : rank === 2 ? "#f5f5f5" : rank === 3 ? "#fff3e0" : "transparent",
        fontWeight: rank <= 3 ? "bold" : "normal",
        borderLeft: rank === 1 ? "4px solid #ffd700" : rank === 2 ? "4px solid #c0c0c0" : rank === 3 ? "4px solid #cd7f32" : "none"
    }),
    acronym: { backgroundColor: "#333", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "0.85em", fontWeight: "bold" }
};

const Dashboard: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  
  const [mode, setMode] = useState<"total" | "base" | "multiplier">("total");
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  
  // Datos
  const [ranking, setRanking] = useState<any[]>([]);
  const [evolution, setEvolution] = useState<any>({});
  
  // Equipos (para mostrar nombre de equipo en tabla)
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({}); 

  useEffect(() => {
    if (token) {
        const decoded: any = jwtDecode(token);
        // Ajuste: si el token no tiene username, habrá que pedirlo a /me, pero asumimos que lo sacamos de algun lado
        // Por simplicidad, asumimos que el endpoint de ranking devuelve nombres y lo comparamos
        // Para este ejemplo, si no guardaste el username en el token, usaremos una llamada al backend o simplemente "afertor"
        // *Truco*: decodificamos el token si tiene el campo, si no, tendrás que actualizar el backend auth.
        // Asumamos que sabes tu usuario.
        setUsername("afertor"); // ⚠️ CAMBIA ESTO O MEJORA EL TOKEN
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [mode]);

  const loadData = async () => {
      // 1. Obtener temporada activa
      const seasons = await API.getSeasons();
      const active = seasons.find((s: any) => s.is_active);
      if (!active) return;
      setActiveSeason(active.id);

      // 2. Obtener Ranking (Limitamos a 100 para tener margen y filtrar en frontend)
      const rankData = await API.getRanking(active.id, "users", mode, 100);
      setRanking(rankData.overall);

      // 3. Obtener Evolución (Todos)
      const evoData = await API.getEvolution(active.id, "users", [], undefined, mode);
      setEvolution(evoData);

      // 4. Obtener Equipos para mapear Usuario -> Equipo
      const teamsData = await API.getTeams(active.id);
      const map: Record<string, string> = {};
      teamsData.forEach((t: any) => {
          t.members.forEach((memberUsername: string) => {
              map[memberUsername] = t.name;
          });
      });
      setTeamsMap(map);
  };

  const getAcronym = (name: string) => name.substring(0, 3).toUpperCase();

  // Filtrado para tabla Top 20 + Usuario
  const getTableData = () => {
      const top20 = ranking.slice(0, 20);
      const me = ranking.find(r => r.name === username);
      // Si yo no estoy en el top 20, me añado al final visualmente
      const data = [...top20];
      if (me && !top20.find(r => r.name === username)) {
          data.push(me);
      }
      return data;
  };

  return (
    <div style={styles.container}>
      <h1 style={{fontSize: "2rem", marginBottom: "10px"}}>📊 Panel de Clasificación</h1>
      
      {/* PESTAÑAS */}
      <div style={styles.tabs}>
          <button style={styles.tab(mode === "total")} onClick={() => setMode("total")}>🏆 Mundial General</button>
          <button style={styles.tab(mode === "base")} onClick={() => setMode("base")}>🏁 Puntos Base</button>
          <button style={styles.tab(mode === "multiplier")} onClick={() => setMode("multiplier")}>🚀 Multiplicadores</button>
      </div>

      {/* GRÁFICA BARRAS */}
      <div style={styles.section}>
          <h3 style={{marginTop: 0}}>Top 20 Clasificación Actual</h3>
          <BarChartTop20 data={ranking} currentUser={username} />
      </div>

      {/* TABLA DE CLASIFICACIÓN */}
      <div style={styles.section}>
          <h3 style={{marginTop: 0}}>Tabla Detallada</h3>
          <table style={{width: "100%", borderCollapse: "collapse", textAlign: "left"}}>
              <thead>
                  <tr style={{borderBottom: "2px solid #ddd", color: "#666"}}>
                      <th style={{padding: 10}}>Pos</th>
                      <th style={{padding: 10}}>Piloto</th>
                      <th style={{padding: 10}}>Escudería</th>
                      <th style={{padding: 10, textAlign: "right"}}>Puntos</th>
                  </tr>
              </thead>
              <tbody>
                  {getTableData().map((row, index) => {
                      // Buscar la posición REAL en el array original (por si soy el 25 y salgo el ultimo en la tabla)
                      const realIndex = ranking.findIndex(r => r.name === row.name);
                      const pos = realIndex + 1;
                      const isMe = row.name === username;

                      return (
                        <tr key={row.name} style={{
                            ...styles.podiumRow(pos), 
                            borderBottom: "1px solid #eee",
                            backgroundColor: isMe ? "#e3f2fd" : styles.podiumRow(pos).backgroundColor // Azulito si soy yo
                        }}>
                            <td style={{padding: "12px 10px", fontSize: "1.1em"}}>{pos}</td>
                            <td style={{padding: "10px"}}>
                                <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                    <span style={styles.acronym}>{getAcronym(row.name)}</span>
                                    <span style={{fontWeight: isMe ? "bold" : "normal"}}>{row.name} {isMe && "(Tú)"}</span>
                                </div>
                            </td>
                            <td style={{padding: "10px", color: "#666"}}>{teamsMap[row.name] || "Sin Equipo"}</td>
                            <td style={{padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "1.1em"}}>
                                {mode === "multiplier" ? row.accumulated.toFixed(2) + "x" : row.accumulated}
                            </td>
                        </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>

      {/* GRÁFICA EVOLUCIÓN */}
      <div style={styles.section}>
          <h3 style={{marginTop: 0}}>📈 Evolución Carrera a Carrera</h3>
          <p style={{color: "#666", fontSize: "0.9em"}}>Selecciona los pilotos que quieres comparar:</p>
          <ComparisonLineChart fullData={evolution} currentUser={username} />
      </div>

    </div>
  );
};

export default Dashboard;