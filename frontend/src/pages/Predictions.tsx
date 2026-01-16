import React, { useEffect, useState } from "react";
import * as API from "../api/api";

// 🎨 Estilos Inline (limpios y modernos)
const styles = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Roboto, sans-serif"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    marginTop: "20px"
  },
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "20px",
    backgroundColor: "white",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "relative" as const
  },
  cardDisabled: {
    backgroundColor: "#f9f9f9",
    opacity: 0.7,
    cursor: "default"
  },
  badge: (isOpen: boolean, hasPred: boolean) => ({
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "bold" as const,
    textTransform: "uppercase" as const,
    marginBottom: "10px",
    backgroundColor: !isOpen ? "#e0e0e0" : hasPred ? "#d4edda" : "#fff3cd",
    color: !isOpen ? "#666" : hasPred ? "#155724" : "#856404",
  }),
  formContainer: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    maxWidth: "800px",
    margin: "0 auto",
    borderTop: "5px solid #e10600" // Toque F1
  },
  sectionTitle: {
    borderBottom: "2px solid #eee",
    paddingBottom: "10px",
    marginBottom: "20px",
    color: "#333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline"
  },
  selectGroup: {
    marginBottom: "15px"
  },
  select: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    backgroundColor: "#fff",
    cursor: "pointer"
  },
  saveButton: {
    backgroundColor: "#e10600",
    color: "white",
    padding: "15px",
    fontSize: "1.2rem",
    fontWeight: "bold",
    border: "none",
    borderRadius: "8px",
    width: "100%",
    cursor: "pointer",
    marginTop: "30px",
    transition: "background 0.2s"
  },
  countdown: {
    marginTop: "10px",
    padding: "8px",
    backgroundColor: "#fff3cd", // Fondo amarillo alerta
    color: "#856404",           // Texto oscuro
    border: "1px solid #ffeeba",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "bold" as const,
    textAlign: "center" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    animation: "pulse 2s infinite" // Opcional: si quisieras animarlo
  }
};

const Predictions: React.FC = () => {
  // --- ESTADOS DE DATOS ---
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [gps, setGps] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]); // Lista aplanada de pilotos con color
  
  // --- ESTADOS DE UI ---
  const [selectedGp, setSelectedGp] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingPreds, setExistingPreds] = useState<Record<number, boolean>>({});

  // --- ESTADOS DEL FORMULARIO ---
  const [positions, setPositions] = useState<Record<number, string>>({});
  const [events, setEvents] = useState<Record<string, string>>({
    "FASTEST_LAP": "",
    "SAFETY_CAR": "No",
    "DNFS": "0",
    "DNF_DRIVER": ""
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  // 1. Cargar Datos Iniciales (Temporada, GPs y Parrilla)
  const loadInitialData = async () => {
    try {
      const seasons = await API.getSeasons();
      const active = seasons.find((s: any) => s.is_active);
      setActiveSeason(active);

      if (active) {
        // Cargar GPs
        const gpList = await API.getGPs(active.id);
        setGps(gpList);

        // Cargar Parrilla (Constructores + Pilotos)
        const gridData = await API.getF1Grid(active.id);
        
        // Aplanar la estructura para usarla fácil en los selects
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
        // Ordenar alfabéticamente por código (ALO, VER, etc.)
        flatDrivers.sort((a, b) => a.code.localeCompare(b.code));
        setDriversList(flatDrivers);

        // Verificar qué GPs ya tienen predicción (para pintar badges)
        const predsMap: Record<number, boolean> = {};
        // Nota: Idealmente el backend devolvería esto en el endpoint de GPs, 
        // pero hacemos un loop rápido por ahora.
        for (const gp of gpList) {
            const pred = await API.getMyPrediction(gp.id);
            if (pred) predsMap[gp.id] = true;
        }
        setExistingPreds(predsMap);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  // 2. Abrir modo edición para un GP
  const handleOpenGp = async (gp: any) => {
    // Comprobar fecha
    if (new Date() >= new Date(gp.race_datetime)) {
      alert("⚠️ El plazo para este Gran Premio ha finalizado.");
      return;
    }

    setLoading(true);
    setSelectedGp(gp);

    // Resetear formulario
    const defaultPos: any = {};
    for(let i=1; i<=10; i++) defaultPos[i] = "";
    setPositions(defaultPos);
    setEvents({ "FASTEST_LAP": "", "SAFETY_CAR": "No", "DNFS": "0", "DNF_DRIVER": "" });

    // Intentar cargar predicción existente
    const existing = await API.getMyPrediction(gp.id);
    if (existing) {
        const posMap: any = {};
        existing.positions.forEach((p: any) => posMap[p.position] = p.driver_name); // driver_name es el CODE (ALO)
        setPositions(prev => ({ ...prev, ...posMap }));

        const evtMap: any = {};
        existing.events.forEach((e: any) => evtMap[e.event_type] = e.value);
        setEvents(prev => ({ ...prev, ...evtMap }));
    }
    setLoading(false);
  };

  // 3. Guardar Predicción
  const handleSave = async () => {
    // Validaciones
    const filledPositions = Object.values(positions).filter(p => p !== "");
    const uniqueDrivers = new Set(filledPositions);

    if (filledPositions.length < 10) {
        alert("⚠️ Por favor, completa las 10 posiciones.");
        return;
    }
    if (filledPositions.length !== uniqueDrivers.size) {
        alert("⚠️ Has repetido pilotos en el Top 10.");
        return;
    }
    if (!events.FASTEST_LAP) {
        alert("⚠️ Selecciona quién hará la Vuelta Rápida.");
        return;
    }

    try {
        await API.savePrediction(selectedGp.id, positions, events);
        alert("✅ ¡Predicción guardada correctamente!");
        setExistingPreds(prev => ({ ...prev, [selectedGp.id]: true }));
        setSelectedGp(null); // Volver a la lista
    } catch (err: any) {
        alert("❌ Error: " + (err.response?.data?.detail || "No se pudo guardar"));
    }
  };

  // --- RENDERIZADO DE OPCIONES DE PILOTOS ---
  const renderDriverOptions = () => (
    <>
      <option value="">-- Seleccionar --</option>
      {driversList.map((d) => (
        <option 
            key={d.code} 
            value={d.code} 
            style={{ color: d.color, fontWeight: "bold" }} // Aquí está la magia del color
        >
            {d.code} - {d.name} ({d.team_name})
        </option>
      ))}
    </>
  );

  // ============================================
  // VISTA 1: LISTA DE TARJETAS (DASHBOARD)
  // ============================================
  if (!selectedGp) {
    return (
      <div style={styles.container}>
        <h1 style={{color: "#333"}}>🏁 Mis Predicciones</h1>
        <p style={{color: "#666"}}>Temporada {activeSeason ? activeSeason.year : "..."}</p>

        {!activeSeason && <p>No hay temporada activa actualmente.</p>}

        <div style={styles.grid}>
          {gps.map((gp) => {
            const raceDate = new Date(gp.race_datetime);
            const now = new Date();
            const isOpen = now < raceDate;
            const hasPred = existingPreds[gp.id];

            // 🕒 LÓGICA DE CUENTA ATRÁS
            const diffMs = raceDate.getTime() - now.getTime();
            // Es urgente si está abierto Y queda menos de 24h (24 * 60 * 60 * 1000 ms)
            const isUrgent = isOpen && diffMs < 86400000; 
            
            let timeString = "";
            if (isUrgent) {
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                timeString = `${hours}h ${minutes}m`;
            }

            return (
              <div 
                key={gp.id} 
                style={{ ...styles.card, ...(isOpen ? {} : styles.cardDisabled) }}
                onClick={() => isOpen && handleOpenGp(gp)}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <div style={styles.badge(isOpen, hasPred)}>
                        {isOpen ? (hasPred ? "✅ Modificar" : "🟡 Pendiente") : "🔒 Cerrado"}
                    </div>
                </div>

                <h2 style={{margin: "10px 0", fontSize: "1.4rem"}}>{gp.name}</h2>
                
                <div style={{color: "#555", fontSize: "0.9rem"}}>
                    📅 {raceDate.toLocaleDateString()} <br/>
                    ⏰ {raceDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>

                {/* 🔥 AVISO DE CIERRE PRÓXIMO 🔥 */}
                {isUrgent && (
                    <div style={styles.countdown}>
                        <span>🔥</span> 
                        <span>¡Cierra en <strong>{timeString}</strong>!</span>
                    </div>
                )}

                {isOpen && (
                    <button style={{
                        marginTop: "15px", width: "100%", padding: "10px", 
                        backgroundColor: hasPred ? "#007bff" : "#28a745", 
                        color: "white", border: "none", borderRadius: "6px", cursor: "pointer"
                    }}>
                        {hasPred ? "Editar Porra" : "Hacer Porra"}
                    </button>
                )}
              </div>
            );
          })}        </div>
      </div>
    );
  }

  // ============================================
  // VISTA 2: FORMULARIO DE PREDICCIÓN
  // ============================================
  return (
    <div style={{ backgroundColor: "#f4f7f6", minHeight: "100vh", padding: "20px 0" }}>
        <div style={styles.container}>
            <button 
                onClick={() => setSelectedGp(null)} 
                style={{ marginBottom: "20px", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "1rem" }}
            >
                ⬅ Volver al listado
            </button>

            <div style={styles.formContainer}>
                <div style={styles.sectionTitle}>
                    <h2 style={{margin: 0}}>{selectedGp.name}</h2>
                    <span style={{fontSize: "0.8rem", color: "#d32f2f", fontWeight: "bold"}}>
                        Cierre: {new Date(selectedGp.race_datetime).toLocaleString()}
                    </span>
                </div>

                {loading ? <p>Cargando datos...</p> : (
                <>
                    {/* --- TOP 10 --- */}
                    <h3 style={{color: "#e10600", marginTop: 0}}>🏆 Clasificación Top 10</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                        {[...Array(10)].map((_, i) => {
                            const pos = i + 1;
                            const medals = ["🥇", "🥈", "🥉"];
                            return (
                                <div key={pos} style={styles.selectGroup}>
                                    <label style={{display:"block", fontSize:"0.9rem", fontWeight: "600", marginBottom: "5px"}}>
                                        Puesto {pos} {pos <= 3 ? medals[pos-1] : ""}
                                    </label>
                                    <select 
                                        style={styles.select}
                                        value={positions[pos] || ""}
                                        onChange={(e) => setPositions({...positions, [pos]: e.target.value})}
                                    >
                                        {renderDriverOptions()}
                                    </select>
                                </div>
                            )
                        })}
                    </div>

                    <hr style={{ margin: "30px 0", border: "0", borderTop: "1px solid #eee" }} />

                    {/* --- EVENTOS EXTRA --- */}
                    <h3 style={{color: "#007bff"}}>⚡ Bonus Track</h3>

                    <div style={styles.selectGroup}>
                        <label style={{fontWeight: "bold"}}>🟣 Vuelta Rápida</label>
                        <select 
                            style={styles.select}
                            value={events["FASTEST_LAP"]}
                            onChange={e => setEvents({...events, "FASTEST_LAP": e.target.value})}
                        >
                            {renderDriverOptions()}
                        </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        <div style={styles.selectGroup}>
                            <label style={{fontWeight: "bold"}}>🟡 Safety Car</label>
                            <select 
                                style={styles.select}
                                value={events["SAFETY_CAR"]}
                                onChange={e => setEvents({...events, "SAFETY_CAR": e.target.value})}
                            >
                                <option value="No">No</option>
                                <option value="Yes">Sí</option>
                            </select>
                        </div>

                        <div style={styles.selectGroup}>
                            <label style={{fontWeight: "bold"}}>🔴 Nº Abandonos (DNFs)</label>
                            <input 
                                type="number" min="0" max="20"
                                style={styles.select}
                                value={events["DNFS"]}
                                onChange={e => setEvents({...events, "DNFS": e.target.value})}
                            />
                        </div>
                    </div>

                    {/* DNF Driver condicional */}
                    {parseInt(events["DNFS"]) > 0 && (
                        <div style={{ marginTop: "10px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
                            <label style={{fontWeight: "bold", display: "block", marginBottom: "5px"}}>☠️ Piloto que abandonará (Bonus)</label>
                            <select 
                                style={styles.select}
                                value={events["DNF_DRIVER"]}
                                onChange={e => setEvents({...events, "DNF_DRIVER": e.target.value})}
                            >
                                {renderDriverOptions()}
                            </select>
                        </div>
                    )}

                    <button 
                        onClick={handleSave} 
                        style={styles.saveButton}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#b70500"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#e10600"}
                    >
                        GUARDAR PREDICCIÓN
                    </button>
                </>
                )}
            </div>
        </div>
    </div>
  );
};

export default Predictions;