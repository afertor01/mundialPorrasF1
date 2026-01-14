import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";

const Admin: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<"seasons" | "users" | "teams" | "gps">("seasons");

  // Estado global de temporadas (necesario para el selector superior)
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  // Cargar temporadas al inicio
  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const data = await API.getSeasons();
      setSeasons(data);
      // Si no hay seleccionada y hay datos, seleccionar la primera (o la activa si la hubiera)
      if (data.length > 0 && !selectedSeasonId) {
        const active = data.find((s: any) => s.is_active);
        setSelectedSeasonId(active ? active.id : data[0].id);
      }
    } catch (e) {
      console.error("Error cargando temporadas. Asegúrate de tener el backend corriendo.", e);
    }
  };

  // ------------------------------------------
  // TAB: GESTIÓN DE TEMPORADAS (Restaurado)
  // ------------------------------------------
  const SeasonsTab = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [name, setName] = useState("");
    const [isActive, setIsActive] = useState(false);

    const handleCreate = async () => {
      try {
        await API.createSeason({ year, name, is_active: isActive });
        alert("Temporada creada ✅");
        setName("");
        loadSeasons(); // Recargar la lista global
      } catch (err: any) {
        alert("Error creando temporada: " + (err.response?.data?.detail || err.message));
      }
    };

    const handleToggle = async (id: number) => {
      try {
        await API.toggleSeason(id);
        loadSeasons();
      } catch (e) { alert("Error cambiando estado"); }
    };

    const handleDelete = async (id: number) => {
      if (!confirm("¿Seguro que quieres borrar esta temporada? Se borrarán todos sus datos.")) return;
      try {
        await API.deleteSeason(id);
        loadSeasons();
      } catch (e) { alert("Error borrando temporada"); }
    };

    return (
      <div>
        <h3>Gestión de Temporadas</h3>
        
        {/* Formulario de creación */}
        <div style={{ padding: 15, border: "1px solid #ddd", marginBottom: 20, borderRadius: 5 }}>
          <h4>Nueva Temporada</h4>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input 
              type="number" 
              value={year} 
              onChange={e => setYear(Number(e.target.value))} 
              placeholder="Año"
              style={{ padding: 5 }}
            />
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Nombre (ej: F1 2026)"
              style={{ padding: 5 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input 
                type="checkbox" 
                checked={isActive} 
                onChange={e => setIsActive(e.target.checked)} 
              />
              Activa
            </label>
            <button onClick={handleCreate} style={{ padding: "5px 15px", cursor: "pointer" }}>Crear</button>
          </div>
        </div>

        {/* Lista de temporadas */}
        <table border={1} style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#f4f4f4" }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Año</th>
              <th style={{ padding: 8 }}>Nombre</th>
              <th style={{ padding: 8 }}>Estado</th>
              <th style={{ padding: 8 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map(s => (
              <tr key={s.id}>
                <td style={{ padding: 8 }}>{s.id}</td>
                <td style={{ padding: 8 }}>{s.year}</td>
                <td style={{ padding: 8 }}>{s.name}</td>
                <td style={{ padding: 8 }}>
                  {s.is_active ? <span style={{ color: "green", fontWeight: "bold" }}>ACTIVA</span> : "Inactiva"}
                </td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => handleToggle(s.id)} style={{ marginRight: 5 }}>
                    {s.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => handleDelete(s.id)} style={{ backgroundColor: "#ffdddd" }}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

// ------------------------------------------
  // TAB: USUARIOS (Actualizado con Creación)
  // ------------------------------------------
  const UsersTab = () => {
    const [users, setUsers] = useState<any[]>([]);
    
    // Estado para el formulario de nuevo usuario
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");

    useEffect(() => {
      loadUsers();
    }, []);

    const loadUsers = () => {
      API.getUsers().then(setUsers).catch(console.error);
    };

    const handleCreateUser = async () => {
      if (!email || !username || !password) {
        alert("Rellena todos los campos");
        return;
      }
      try {
        await API.createUser({ email, username, password, role });
        alert("Usuario creado correctamente ✅");
        // Limpiar formulario
        setEmail("");
        setUsername("");
        setPassword("");
        setRole("user");
        // Recargar lista
        loadUsers();
      } catch (err: any) {
        alert("Error: " + (err.response?.data?.detail || err.message));
      }
    };

    const handleDelete = async (id: number) => {
      if(!confirm("¿Borrar usuario? Esta acción no se puede deshacer.")) return;
      try {
        await API.deleteUser(id);
        loadUsers();
      } catch (e) { alert("Error borrando usuario"); }
    };

    return (
      <div>
        <h3>Gestión de Usuarios</h3>

        {/* Formulario de creación */}
        <div style={{ marginBottom: 20, padding: 15, border: "1px solid #ccc", borderRadius: 5, backgroundColor: "#f9f9f9" }}>
          <h4 style={{marginTop: 0}}>➕ Añadir Nuevo Usuario</h4>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{display:"block", fontSize:"0.8em"}}>Email</label>
              <input 
                type="email" placeholder="ejemplo@correo.com" 
                value={email} onChange={e => setEmail(e.target.value)} 
                style={{padding: 5}}
              />
            </div>
            <div>
              <label style={{display:"block", fontSize:"0.8em"}}>Usuario</label>
              <input 
                type="text" placeholder="NombreUsuario" 
                value={username} onChange={e => setUsername(e.target.value)} 
                style={{padding: 5}}
              />
            </div>
            <div>
              <label style={{display:"block", fontSize:"0.8em"}}>Contraseña</label>
              <input 
                type="password" placeholder="******" 
                value={password} onChange={e => setPassword(e.target.value)} 
                style={{padding: 5}}
              />
            </div>
            <div>
              <label style={{display:"block", fontSize:"0.8em"}}>Rol</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{padding: 5, height: 30}}>
                <option value="user">Jugador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button onClick={handleCreateUser} style={{height: 30, backgroundColor: "#28a745", color: "white", border: "none", cursor: "pointer"}}>
              Crear
            </button>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <table border={1} style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
          <thead style={{backgroundColor: "#eee"}}>
            <tr>
              <th style={{padding: 8}}>ID</th>
              <th style={{padding: 8}}>Usuario</th>
              <th style={{padding: 8}}>Email</th>
              <th style={{padding: 8}}>Rol</th>
              <th style={{padding: 8}}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{padding: 8}}>{u.id}</td>
                <td style={{padding: 8, fontWeight: "bold"}}>{u.username}</td>
                <td style={{padding: 8}}>{u.email}</td>
                <td style={{padding: 8}}>
                  {u.role === "admin" 
                    ? <span style={{backgroundColor: "purple", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: "0.8em"}}>ADMIN</span>
                    : "Jugador"
                  }
                </td>
                <td style={{padding: 8}}>
                  <button onClick={() => handleDelete(u.id)} style={{backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 10px", cursor: "pointer", borderRadius: 3}}>
                    🗑️ Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ------------------------------------------
  // TAB: ESCUDERÍAS
  // ------------------------------------------
  const TeamsTab = () => {
    const [teams, setTeams] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [newTeamName, setNewTeamName] = useState("");
    
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);

    useEffect(() => {
      if(selectedSeasonId) loadTeams();
      API.getUsers().then(setUsers);
    }, [selectedSeasonId]);

    const loadTeams = async () => {
        if(!selectedSeasonId) return;
        const data = await API.getTeams(selectedSeasonId);
        setTeams(data);
    }

    const handleCreateTeam = async () => {
      if(!selectedSeasonId || !newTeamName) return;
      try {
        await API.createTeam(selectedSeasonId, newTeamName);
        setNewTeamName("");
        loadTeams();
      } catch (e) { alert("Error creando equipo"); }
    };

    const handleAddMember = async () => {
        if(!selectedTeam || !selectedUser) return;
        try {
            await API.addTeamMember(selectedTeam, selectedUser);
            alert("Miembro añadido");
            loadTeams();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Error añadiendo miembro");
        }
    };

    const handleDeleteTeam = async (id: number) => {
        if(!confirm("¿Borrar equipo?")) return;
        await API.deleteTeam(id);
        loadTeams();
    }

    if (!selectedSeasonId) return <p>⚠️ Selecciona una temporada arriba primero.</p>;

    return (
      <div>
        <h3>Escuderías ({seasons.find(s=>s.id === selectedSeasonId)?.name})</h3>
        
        <div style={{marginBottom: 20, border: '1px solid #ccc', padding: 15, borderRadius: 5}}>
            <h4 style={{marginTop: 0}}>1. Crear Escudería</h4>
            <div style={{display: 'flex', gap: 10}}>
              <input value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="Nombre escudería (ej: Ferrari)" />
              <button onClick={handleCreateTeam}>Crear</button>
            </div>
        </div>

        <div style={{marginBottom: 20, border: '1px solid #ccc', padding: 15, borderRadius: 5}}>
            <h4 style={{marginTop: 0}}>2. Asignar Piloto a Escudería</h4>
            <div style={{display: 'flex', gap: 10}}>
              <select onChange={e => setSelectedTeam(Number(e.target.value))}>
                  <option value="">Selecciona Equipo...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.members.length}/2)</option>)}
              </select>
              <select onChange={e => setSelectedUser(Number(e.target.value))}>
                  <option value="">Selecciona Usuario...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
              <button onClick={handleAddMember}>Asignar</button>
            </div>
        </div>

        <table border={1} style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead><tr style={{backgroundColor: '#f4f4f4'}}><th>Equipo</th><th>Miembros (Usuarios)</th><th>Acción</th></tr></thead>
          <tbody>
            {teams.map(t => (
              <tr key={t.id}>
                <td style={{padding: 8}}>{t.name}</td>
                <td style={{padding: 8}}>
                  {t.members.length > 0 ? t.members.join(", ") : <em style={{color:'#999'}}>Sin miembros</em>}
                </td>
                <td style={{padding: 8}}><button onClick={() => handleDeleteTeam(t.id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // ------------------------------------------
  // TAB: GRANDES PREMIOS (GPs)
  // ------------------------------------------
  const GPsTab = () => {
      const [gps, setGps] = useState<any[]>([]);
      const [file, setFile] = useState<File | null>(null);

      useEffect(() => {
          if(selectedSeasonId) API.getGPs(selectedSeasonId).then(setGps);
      }, [selectedSeasonId]);

      const handleImport = async () => {
          if(!selectedSeasonId || !file) return;
          try {
              const res = await API.importGPs(selectedSeasonId, file);
              alert(res.message);
              API.getGPs(selectedSeasonId).then(setGps);
          } catch(e: any) { 
            alert("Error importando: " + (e.response?.data?.detail || e.message)); 
          }
      }

      if (!selectedSeasonId) return <p>⚠️ Selecciona una temporada arriba primero.</p>;

      return (
          <div>
              <h3>Grandes Premios</h3>
              <div style={{marginBottom: 20, padding: 15, border: '1px solid #ccc', borderRadius: 5}}>
                  <h4 style={{marginTop: 0}}>Importar desde JSON</h4>
                  <input type="file" accept=".json" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
                  <button onClick={handleImport} disabled={!file}>Subir Archivo</button>
              </div>
              
              <ul style={{listStyle: 'none', padding: 0}}>
                  {gps.map(gp => (
                      <li key={gp.id} style={{padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between'}}>
                          <span>
                            <strong>{gp.name}</strong> 
                            <span style={{color: '#666', marginLeft: 10, fontSize: '0.9em'}}>
                                {new Date(gp.race_datetime).toLocaleString()}
                            </span>
                          </span>
                      </li>
                  ))}
                  {gps.length === 0 && <p style={{color: '#666'}}>No hay carreras registradas en esta temporada.</p>}
              </ul>
          </div>
      )
  }

  // ------------------------------------------
  // RENDER PRINCIPAL DEL ADMIN
  // ------------------------------------------
  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1>⚙️ Panel de Administración</h1>
      
      {/* Selector Global de Temporada */}
      <div style={{ marginBottom: 20, padding: 10, backgroundColor: "#f0f8ff", borderRadius: 5 }}>
        <label style={{marginRight: 10, fontWeight: "bold"}}>Temporada activa para gestión: </label>
        <select 
            value={selectedSeasonId || ""} 
            onChange={e => setSelectedSeasonId(Number(e.target.value))}
            style={{padding: 5}}
        >
            <option value="" disabled>Selecciona una temporada...</option>
            {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.year} - {s.name} {s.is_active ? "(Activa)" : ""}</option>
            ))}
        </select>
        {seasons.length === 0 && <span style={{color: "red", marginLeft: 10}}> Crea una temporada primero en la pestaña "Temporadas"</span>}
      </div>

      {/* Navegación Tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 20, borderBottom: "2px solid #ddd" }}>
        {[
          {id: 'seasons', label: '📅 Temporadas'},
          {id: 'users', label: '👥 Usuarios'},
          {id: 'teams', label: '🏎️ Escuderías'},
          {id: 'gps', label: '🏁 Grandes Premios'}
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{ 
                  padding: "10px 20px",
                  cursor: "pointer",
                  backgroundColor: activeTab === tab.id ? "#007bff" : "transparent",
                  color: activeTab === tab.id ? "white" : "black",
                  border: "none",
                  borderRadius: "5px 5px 0 0",
                  fontWeight: activeTab === tab.id ? "bold" : "normal"
                }}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {/* Contenido de la Tab Activa */}
      <div style={{ minHeight: 300 }}>
        {activeTab === 'seasons' && <SeasonsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'teams' && <TeamsTab />}
        {activeTab === 'gps' && <GPsTab />}
      </div>
    </div>
  );
};

export default Admin;