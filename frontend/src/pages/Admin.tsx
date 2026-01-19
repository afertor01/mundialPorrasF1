import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";

const Admin: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<"seasons" | "users" | "teams" | "gps" | "grid" >("seasons");

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
    const [acronym, setAcronym] = useState("");

    useEffect(() => {
      loadUsers();
    }, []);

    const loadUsers = () => {
      API.getUsers().then(setUsers).catch(console.error);
    };

    const handleCreateUser = async () => {
      if (!email || !username || !password || !acronym) {
        alert("Rellena todos los campos");
        return;
      }
      try {
        await API.createUser({ email, username, password, role, acronym });
        alert("Usuario creado correctamente ✅");
        // Limpiar formulario
        setEmail("");
        setUsername("");
        setPassword("");
        setAcronym("");
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
                <label style={{display:"block", fontSize:"0.8em"}}>Acrónimo</label>
                <input 
                type="text" placeholder="ALO" 
                value={acronym} onChange={e => setAcronym(e.target.value.toUpperCase())} 
                maxLength={3}
                style={{padding: 5, width: 60}}
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

    // --- ESTADOS PARA GESTIÓN MANUAL ---
    const [showModal, setShowModal] = useState(false);
    const [editingGp, setEditingGp] = useState<any | null>(null);
    const [gpForm, setGpForm] = useState({ name: "", race_datetime: "" });
    
    // Estados para borrado seguro
    const [deleteStep, setDeleteStep] = useState(0); 
    const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);

    useEffect(() => {
        if(selectedSeasonId) loadGps();
    }, [selectedSeasonId]);

    const loadGps = () => {
        if(selectedSeasonId) API.getGPs(selectedSeasonId).then(setGps);
    }

    // --- IMPORTACIÓN MASIVA (Tu código original) ---
    const handleImport = async () => {
        if(!selectedSeasonId || !file) return;
        try {
            const res = await API.importGPs(selectedSeasonId, file);
            alert(res.message);
            loadGps();
        } catch(e: any) { 
            alert("Error importando: " + (e.response?.data?.detail || e.message)); 
        }
    }

    // --- GESTIÓN MANUAL: ABRIR MODAL ---
    const handleOpenModal = (gp?: any) => {
        if (gp) {
            setEditingGp(gp);
            // Formatear fecha para el input datetime-local (yyyy-MM-ddThh:mm)
            const isoDate = new Date(gp.race_datetime).toISOString().slice(0, 16);
            setGpForm({ name: gp.name, race_datetime: isoDate });
        } else {
            setEditingGp(null);
            // Fecha por defecto: hoy
            setGpForm({ name: "", race_datetime: new Date().toISOString().slice(0, 16) });
        }
        setShowModal(true);
    };

    // --- GESTIÓN MANUAL: GUARDAR ---
    const handleSave = async () => {
        if (!selectedSeasonId) return;
        try {
            const payload = {
                name: gpForm.name,
                race_datetime: gpForm.race_datetime,
                season_id: selectedSeasonId
            };

            if (editingGp) {
                await API.updateGP(editingGp.id, payload);
                alert("✅ GP Actualizado");
            } else {
                await API.createGP(payload);
                alert("✅ GP Creado");
            }
            setShowModal(false);
            loadGps();
        } catch (e: any) {
            alert("Error guardando GP: " + (e.response?.data?.detail || e.message));
        }
    };

    // --- GESTIÓN MANUAL: BORRAR ---
    const handleDeleteClick = (gp: any) => {
        setDeleteCandidate(gp);
        setDeleteStep(1); // Confirmación inicial
    };

    const confirmDelete = async () => {
        if (deleteCandidate) {
            try {
                await API.deleteGP(deleteCandidate.id);
                loadGps();
            } catch (e) { alert("Error eliminando GP"); }
        }
        setDeleteStep(0);
        setDeleteCandidate(null);
    };

    if (!selectedSeasonId) return <p>⚠️ Selecciona una temporada arriba primero.</p>;

    return (
        <div>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <h3>Grandes Premios</h3>
                <button onClick={() => handleOpenModal()} style={styles.btnAdd}>+ Añadir GP Manual</button>
            </div>

            {/* SECCIÓN IMPORTACIÓN */}
            <div style={{marginBottom: 20, padding: 15, border: '1px solid #ccc', borderRadius: 5, background: "#f9f9f9"}}>
                <h4 style={{marginTop: 0}}>Importar desde JSON</h4>
                <div style={{display: "flex", gap: 10}}>
                    <input type="file" accept=".json" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
                    <button onClick={handleImport} disabled={!file}>Subir Archivo</button>
                </div>
            </div>
            
            {/* LISTA DE GPS */}
            <table border={1} style={{width: "100%", borderCollapse: "collapse"}}>
                <thead style={{background: "#eee"}}>
                    <tr>
                        <th style={{padding: 10}}>Fecha</th>
                        <th style={{padding: 10}}>Nombre</th>
                        <th style={{padding: 10}}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {gps.map(gp => (
                        <tr key={gp.id}>
                            <td style={{padding: 10}}>{new Date(gp.race_datetime).toLocaleString()}</td>
                            <td style={{padding: 10, fontWeight: "bold"}}>{gp.name}</td>
                            <td style={{padding: 10, textAlign: "center"}}>
                                <button onClick={() => handleOpenModal(gp)} style={styles.btnEdit}>✏️</button>
                                <button onClick={() => handleDeleteClick(gp)} style={styles.btnDelete}>🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {gps.length === 0 && <p style={{color: '#666', textAlign: "center"}}>No hay carreras registradas.</p>}

            {/* --- MODAL EDICIÓN/CREACIÓN --- */}
            {showModal && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modal}>
                        <h3>{editingGp ? "Editar GP" : "Nuevo GP"}</h3>
                        <div style={styles.formGroup}>
                            <label>Nombre:</label>
                            <input 
                                type="text" 
                                value={gpForm.name} 
                                onChange={e => setGpForm({...gpForm, name: e.target.value})} 
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label>Fecha y Hora:</label>
                            <input 
                                type="datetime-local" 
                                value={gpForm.race_datetime} 
                                onChange={e => setGpForm({...gpForm, race_datetime: e.target.value})} 
                                style={styles.input}
                            />
                        </div>
                        <div style={{display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end"}}>
                            <button onClick={() => setShowModal(false)} style={styles.btnCancel}>Cancelar</button>
                            <button onClick={handleSave} style={styles.btnSave}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL BORRADO PASO 1 --- */}
            {deleteStep === 1 && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modal}>
                        <h3>⚠️ ¿Borrar {deleteCandidate?.name}?</h3>
                        <p>Esto eliminará el GP de la lista.</p>
                        <div style={{display: "flex", gap: 10, marginTop: 20, justifyContent: "center"}}>
                            <button onClick={() => setDeleteStep(0)} style={styles.btnCancel}>Cancelar</button>
                            <button onClick={() => setDeleteStep(2)} style={styles.btnWarning}>Continuar...</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL BORRADO PASO 2 (PELIGRO) --- */}
            {deleteStep === 2 && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modalDanger}>
                        <h3 style={{color: "white"}}>☠️ CONFIRMACIÓN FINAL</h3>
                        <p style={{color: "white"}}>Se borrarán todas las <strong>predicciones</strong> asociadas a este GP.</p>
                        <div style={{display: "flex", gap: 10, marginTop: 20, justifyContent: "center"}}>
                            <button onClick={() => setDeleteStep(0)} style={{...styles.btnCancel, background: "white", color: "black"}}>Cancelar</button>
                            <button onClick={confirmDelete} style={{...styles.btnDelete, background: "white", color: "red", fontWeight: "bold"}}>SÍ, BORRAR TODO</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
  }
  // ------------------------------------------
  // TAB: PARRILLA F1 (Constructores y Pilotos)
  // ------------------------------------------
  const F1GridTab = () => {
      const [constructors, setConstructors] = useState<any[]>([]);
      
      // Inputs para crear Constructor
      const [cName, setCName] = useState("");
      const [cColor, setCColor] = useState("#ff0000");

      // Inputs para crear Piloto (asociado a un constructor seleccionado)
      const [dCode, setDCode] = useState("");
      const [dName, setDName] = useState("");
      const [selectedConstructorId, setSelectedConstructorId] = useState<number|null>(null);

      useEffect(() => {
          if(selectedSeasonId) loadGrid();
      }, [selectedSeasonId]);

      const loadGrid = async () => {
          if(!selectedSeasonId) return;
          const data = await API.getF1Grid(selectedSeasonId);
          setConstructors(data);
      }

      const handleCreateConstructor = async () => {
          if(!cName) return;
          await API.createConstructor(selectedSeasonId!, cName, cColor);
          setCName("");
          loadGrid();
      }

      const handleCreateDriver = async (constId: number) => {
        // Usamos prompt simple o un estado local para no complicar la UI por ahora
        const code = prompt("Acrónimo del piloto (Ej: ALO):");
        if(!code) return;
        const name = prompt("Nombre completo:");
        if(!name) return;

        try {
            await API.createDriver(constId, code, name);
            loadGrid();
        } catch(e) { alert("Error al crear piloto"); }
      }

      const handleDeleteDriver = async (id: number) => {
          if(confirm("¿Borrar piloto?")) {
              await API.deleteDriver(id);
              loadGrid();
          }
      }

      if (!selectedSeasonId) return <p>Selecciona temporada.</p>;

      return (
          <div>
              <h3>Configuración Parrilla F1</h3>
              
              {/* Crear Escudería */}
              <div style={{marginBottom: 20, padding: 15, border: '1px solid #ccc', borderRadius: 5, background: '#f9f9f9'}}>
                  <h4>Nueva Escudería F1</h4>
                  <div style={{display:'flex', gap: 10}}>
                      <input value={cName} onChange={e=>setCName(e.target.value)} placeholder="Nombre (Ej: Ferrari)" />
                      <input type="color" value={cColor} onChange={e=>setCColor(e.target.value)} title="Color oficial" />
                      <button onClick={handleCreateConstructor}>Crear Escudería</button>
                  </div>
              </div>

              {/* Listado */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15}}>
                  {constructors.map(c => (
                      <div key={c.id} style={{border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden'}}>
                          <div style={{backgroundColor: c.color, padding: 10, color: 'white', display:'flex', justifyContent:'space-between'}}>
                              <strong>{c.name}</strong>
                              <button onClick={() => API.deleteConstructor(c.id).then(loadGrid)} style={{fontSize:'0.7em', color:'black'}}>X</button>
                          </div>
                          <div style={{padding: 10}}>
                              <ul style={{paddingLeft: 20, margin: '5px 0'}}>
                                  {c.drivers.map((d: any) => (
                                      <li key={d.id} style={{marginBottom: 5}}>
                                          <strong>{d.code}</strong> - {d.name}
                                          <span onClick={() => handleDeleteDriver(d.id)} style={{cursor:'pointer', marginLeft: 10}}>🗑️</span>
                                      </li>
                                  ))}
                              </ul>
                              <button 
                                onClick={() => handleCreateDriver(c.id)} 
                                style={{width:'100%', marginTop: 5, fontSize: '0.8em'}}
                              >
                                + Añadir Piloto
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
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
          {id: 'gps', label: '🏁 Grandes Premios'},
          {id: 'grid', label: '🏎️ Parrilla F1'}
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
        {activeTab === 'grid' && <F1GridTab />}
      </div>
    </div>
  );
};

export default Admin;

// Estilos para los modales y botones
const styles: any = {
    btnAdd: { background: "#28a745", color: "white", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer" },
    btnEdit: { background: "#ffc107", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", marginRight: "5px" },
    btnDelete: { background: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" },
    
    modalBackdrop: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    modal: { background: "white", padding: "30px", borderRadius: "10px", width: "400px", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" },
    modalDanger: { background: "#c82333", padding: "30px", borderRadius: "10px", width: "400px", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" },
    
    formGroup: { marginBottom: "15px" },
    input: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginTop: "5px", boxSizing: "border-box" },
    
    btnSave: { background: "#007bff", color: "white", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer" },
    btnCancel: { background: "#6c757d", color: "white", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer" },
    btnWarning: { background: "#ffc107", color: "black", border: "none", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" },
};