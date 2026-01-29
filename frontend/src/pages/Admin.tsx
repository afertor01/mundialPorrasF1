import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Calendar, Users, Shield, Flag, LayoutGrid, 
  Plus, Trash2, Edit2, CheckCircle, XCircle, Save, AlertTriangle, Upload, Trophy,
  Search, X // <--- Importamos Search y X
} from "lucide-react";

const Admin: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<"seasons" | "users" | "teams" | "gps" | "grid">("seasons");
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const data = await API.getSeasons();
      setSeasons(data);
      if (data.length > 0 && !selectedSeasonId) {
        const active = data.find((s: any) => s.is_active);
        setSelectedSeasonId(active ? active.id : data[0].id);
      }
    } catch (e) { console.error(e); }
  };

  // -------------------------------------------------------------------------
  // SUB-COMPONENTES DE ESTILO (Reutilizables)
  // -------------------------------------------------------------------------
  const Card = ({ children, title, icon }: any) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
        {icon} <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wider">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  // ------------------------------------------
  // TAB: TEMPORADAS
  // ------------------------------------------
  const SeasonsTab = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [name, setName] = useState("");
    const [isActive, setIsActive] = useState(false);

    const handleCreate = async () => {
      try {
        await API.createSeason({ year, name, is_active: isActive });
        setName("");
        loadSeasons();
      } catch (err: any) { alert("Error"); }
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Card title="Nueva Temporada" icon={<Plus size={18} className="text-green-500"/>}>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold text-gray-400 uppercase">Año</label>
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: F1 2026" className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-blue-600 rounded"/>
              <span className="text-sm font-medium text-gray-700">Activa</span>
            </label>
            <button onClick={handleCreate} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors mb-1">Crear</button>
          </div>
        </Card>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Año / Nombre</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {seasons.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">#{s.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.year}</div>
                  </td>
                  <td className="px-6 py-4">
                    {s.is_active ? 
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase">Activa</span> : 
                      <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black rounded-full uppercase">Inactiva</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => API.toggleSeason(s.id).then(loadSeasons)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                      <Settings size={18} />
                    </button>
                    <button onClick={() => API.deleteSeason(s.id).then(loadSeasons)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  };

  // ------------------------------------------
  // TAB: USUARIOS (CON BUSCADOR)
  // ------------------------------------------
  const UsersTab = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState(""); // Estado buscador
    // Estados creación
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");
    const [acronym, setAcronym] = useState("");

    // Estados edición
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editRole, setEditRole] = useState("user");
    const [editPassword, setEditPassword] = useState("");

    useEffect(() => { loadUsers(); }, []);
    const loadUsers = () => { API.getUsers().then(setUsers); };

    // Lógica de filtrado
    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.acronym.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateUser = async () => {
      if (acronym.length !== 3) { alert("⚠️ El acrónimo debe tener 3 letras"); return; }
      try {
        await API.createUser({ email, username, password, role, acronym });
        alert("Usuario creado ✅");
        setEmail(""); setUsername(""); setPassword(""); setAcronym(""); setRole("user");
        loadUsers();
      } catch (err: any) { alert("Error: " + (err.response?.data?.detail || "Error desconocido")); }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            await API.updateUser(editingUser.id, editRole, editPassword);
            alert("Usuario actualizado ✅");
            setEditingUser(null);
            setEditPassword("");
            loadUsers();
        } catch (err) {
            alert("Error actualizando usuario");
        }
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setEditRole(user.role);
        setEditPassword("");
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <Card title="Añadir Nuevo Usuario" icon={<Plus size={18} className="text-green-500"/>}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
               <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"/>
            </div>
            <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Usuario</label>
               <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"/>
            </div>
            <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Acrónimo</label>
               <input type="text" maxLength={3} value={acronym} onChange={e => setAcronym(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"/>
            </div>
            <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Rol</label>
               <select value={role} onChange={e => setRole(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold">
                 <option value="user">Jugador</option>
                 <option value="admin">Administrador</option>
               </select>
            </div>
            <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Password</label>
               <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"/>
            </div>
            <button onClick={handleCreateUser} className="px-6 py-2 bg-green-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-green-700 transition-all">Crear</button>
          </div>
        </Card>

        {/* BARRA DE BÚSQUEDA */}
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            <input 
                type="text" 
                placeholder="Buscar por usuario, email o acrónimo..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <span className="w-10 h-6 bg-gray-900 text-white text-[10px] font-black rounded italic flex items-center justify-center">{u.acronym}</span>
                        <div>
                            <div className="font-bold text-gray-800">{u.username}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === "admin" ? 
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[9px] font-black rounded-full uppercase border border-purple-200">Admin</span> : 
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full uppercase border border-blue-200">Piloto</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => openEditModal(u)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <Edit2 size={18}/>
                        </button>
                        <button onClick={() => { if(confirm("¿Borrar usuario?")) API.deleteUser(u.id).then(loadUsers) }} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                  <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">No se encontraron usuarios</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        <AnimatePresence>
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="bg-gray-50 p-6 border-b border-gray-100">
                            <h3 className="font-black uppercase text-gray-800">Editar Usuario: {editingUser.username}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Rol</label>
                                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold">
                                    <option value="user">Piloto (User)</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                                    Nueva Contraseña <AlertTriangle size={12} className="text-yellow-500"/>
                                </label>
                                <input type="password" placeholder="Dejar vacío para no cambiar" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl"/>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                                <button onClick={handleUpdateUser} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">Guardar</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </motion.div>
    );
  };

// ------------------------------------------
  // TAB: ESCUDERÍAS (LIMPIEZA AUTOMÁTICA)
  // ------------------------------------------
  const TeamsTab = () => {
    const [teams, setTeams] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    
    // Buscador SOLO para la tabla de la derecha (para ver datos)
    const [searchTerm, setSearchTerm] = useState(""); 
    
    const [newTeamName, setNewTeamName] = useState("");
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);

    useEffect(() => {
      if(selectedSeasonId) loadTeams();
      API.getUsers().then(setUsers);
    }, [selectedSeasonId]);

    const loadTeams = async () => {
      if(!selectedSeasonId) return;
      API.getTeams(selectedSeasonId).then(setTeams);
    }

    // --- LÓGICA DE FILTRADO AUTOMÁTICO ("SMART LISTS") ---
    
    // 1. Detectar quién tiene ya contrato (Lista Negra)
    const takenUsernames = new Set<string>();
    teams.forEach(t => {
        if (t.members) {
            t.members.forEach((m: any) => {
                const name = typeof m === 'object' ? m.username : m;
                takenUsernames.add(name);
            });
        }
    });

    // 2. Equipos con huecos (Solo mostramos si tienen < 2 miembros)
    const availableTeams = teams
        .filter(t => (t.members?.length || 0) < 2)
        .sort((a, b) => a.name.localeCompare(b.name)); // Orden alfabético

    // 3. Pilotos sin equipo (Solo mostramos si NO están en la lista negra)
    const freeAgents = users
        .filter(u => !takenUsernames.has(u.username))
        .sort((a, b) => a.username.localeCompare(b.username)); // Orden alfabético

    // --- LÓGICA VISUAL TABLA DERECHA ---
    const filteredTeamsTable = teams.filter(t => {
        const term = searchTerm.toLowerCase();
        const nameMatch = t.name.toLowerCase().includes(term);
        const memberMatch = t.members && t.members.some((m: any) => {
            const mName = typeof m === 'object' ? m.username : m;
            return mName.toLowerCase().includes(term);
        });
        return nameMatch || memberMatch;
    });

    // --- ACCIÓN DE EXPULSAR ---
    const handleRemoveMember = async (team: any, memberName: string) => {
        if (!confirm(`¿Expulsar a ${memberName} de ${team.name}?`)) return;
        try {
            const user = users.find(u => u.username === memberName);
            if (!user) { alert("Usuario no encontrado."); return; }

            // Si es el último, borramos equipo
            if (team.members.length <= 1) {
                if (confirm(`${memberName} es el último. Se eliminará la escudería. ¿OK?`)) {
                    await API.deleteTeam(team.id);
                    loadTeams();
                }
            } else {
                // Si hay más, solo expulsamos (Requiere endpoint backend)
                if ((API as any).kickTeamMemberAdmin) {
                     await (API as any).kickTeamMemberAdmin(team.id, user.id);
                     loadTeams();
                } else {
                     alert("Falta endpoint kickTeamMemberAdmin");
                }
            }
        } catch (e) { alert("Error al procesar"); }
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: GESTIÓN */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 1. CREAR */}
          <Card title="1. Crear Escudería" icon={<Plus size={18}/>}>
            <div className="space-y-4">
              <input value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="Nombre (ej: Aston Martin)" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"/>
              <button onClick={() => API.createTeam(selectedSeasonId!, newTeamName).then(() => {setNewTeamName(""); loadTeams();})} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Crear</button>
            </div>
          </Card>

          {/* 2. ASIGNAR (Simplificado) */}
          <Card title="2. Fichar Piloto" icon={<Users size={18}/>}>
            <div className="space-y-4">
              
              {/* Select EQUIPOS */}
              <div>
                  <div className="flex justify-between mb-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Escudería con hueco</label>
                      <span className="text-[10px] font-bold text-blue-600">{availableTeams.length} disponibles</span>
                  </div>
                  <select onChange={e => setSelectedTeam(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 font-bold text-gray-700">
                      <option value="">Seleccionar equipo...</option>
                      {availableTeams.map(t => (
                          <option key={t.id} value={t.id}>
                              {t.name} • (Falta {2 - t.members.length})
                          </option>
                      ))}
                      {availableTeams.length === 0 && <option disabled>¡Todos los equipos están llenos!</option>}
                  </select>
              </div>

              {/* Select PILOTOS */}
              <div>
                  <div className="flex justify-between mb-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Agente Libre</label>
                      <span className="text-[10px] font-bold text-green-600">{freeAgents.length} disponibles</span>
                  </div>
                  <select onChange={e => setSelectedUser(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 font-bold text-gray-700">
                      <option value="">Seleccionar piloto...</option>
                      {freeAgents.map(u => (
                          <option key={u.id} value={u.id}>
                              {u.username} ({u.acronym})
                          </option>
                      ))}
                      {freeAgents.length === 0 && <option disabled>¡No quedan pilotos libres!</option>}
                  </select>
              </div>

              <button 
                onClick={() => API.addTeamMember(selectedTeam!, selectedUser!).then(() => {
                    loadTeams(); 
                    // Resetear selects visualmente podría requerir más estado, 
                    // pero al recargar se actualizan las listas disponibles
                })} 
                disabled={!selectedTeam || !selectedUser}
                className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl italic disabled:opacity-50 disabled:cursor-not-allowed hover:bg-f1-red transition-colors shadow-lg shadow-gray-200"
              >
                CONFIRMAR FICHAJE
              </button>
            </div>
          </Card>
        </div>

        {/* COLUMNA DERECHA: VISUALIZADOR */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                  type="text" 
                  placeholder="Buscar en la parrilla..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                <tr><th className="px-6 py-4">Escudería</th><th className="px-6 py-4">Alineación</th><th className="px-6 py-4 text-right">Gestión</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeamsTable.length > 0 ? (
                    filteredTeamsTable.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-all">
                        <td className="px-6 py-4">
                            <div className="font-black text-gray-800 italic uppercase tracking-tighter text-lg">{t.name}</div>
                            <div className="mt-1">
                                {t.members.length === 2 ? 
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded uppercase">Completo</span> :
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded uppercase animate-pulse">Busca Piloto</span>
                                }
                            </div>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                            {t.members && t.members.map((m: any, idx: number) => {
                                const displayName = typeof m === 'object' ? (m.username || "Usuario") : m;
                                return (
                                    <div key={idx} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                        {displayName}
                                        <button 
                                            onClick={() => handleRemoveMember(t, displayName)}
                                            className="p-0.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Expulsar"
                                        >
                                            <X size={14}/>
                                        </button>
                                    </div>
                                );
                            })}
                            {(!t.members || t.members.length === 0) && <span className="text-gray-300 italic text-xs">Sin pilotos asignados</span>}
                        </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <button onClick={() => API.deleteTeam(t.id).then(loadTeams)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">
                            No hay escuderías que coincidan con la búsqueda
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };
    
  // ------------------------------------------
  // TAB: GRANDES PREMIOS (MANTENIDO)
  // ------------------------------------------
  const GPsTab = () => {
    const [gps, setGps] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [driversList, setDriversList] = useState<any[]>([]);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [resultGp, setResultGp] = useState<any | null>(null);
    const [positions, setPositions] = useState<Record<number, string>>({});
    const [events, setEvents] = useState({ FASTEST_LAP: "", SAFETY_CAR: "No", DNFS: "0", DNF_DRIVER: "" });
    const [editingGp, setEditingGp] = useState<any | null>(null);
    const [newDate, setNewDate] = useState("");

    useEffect(() => { if(selectedSeasonId) loadGps(); }, [selectedSeasonId]);
    
    const loadGps = () => { 
        API.getGPs(selectedSeasonId!).then(setGps); 
        API.getF1Grid(selectedSeasonId!).then(grid => {
            const flat: any[] = [];
            grid.forEach((team: any) => team.drivers.forEach((d: any) => flat.push({ code: d.code, name: d.name })));
            setDriversList(flat.sort((a,b) => a.code.localeCompare(b.code)));
        });
    };

    const handleOpenResults = async (gp: any) => {
        setResultGp(gp);
        const defaultPos: any = {}; for(let i=1; i<=10; i++) defaultPos[i] = "";
        setPositions(defaultPos);
        setEvents({ FASTEST_LAP: "", SAFETY_CAR: "No", DNFS: "0", DNF_DRIVER: "" });
        try {
            const data = await API.getRaceResult(gp.id);
            if (data) { setPositions(data.positions); setEvents(data.events); }
        } catch (e) {}
        setShowResultsModal(true);
    };

    const handleEditGp = (gp: any) => {
        setEditingGp(gp);
        const d = new Date(gp.race_datetime);
        const iso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setNewDate(iso);
    };

    const saveGpUpdate = async () => {
        if(!editingGp || !selectedSeasonId) return;
        try {
            await API.updateGP(editingGp.id, editingGp.name, newDate, selectedSeasonId);
            alert("Horario actualizado 📅");
            setEditingGp(null);
            loadGps();
        } catch(e) { alert("Error actualizando GP"); }
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
            <Card title="Importar Calendario" icon={<Upload size={18}/>}>
                <div className="flex items-center gap-4">
                    <input type="file" accept=".json" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    <button onClick={() => API.importGPs(selectedSeasonId!, file!).then(loadGps)} disabled={!file} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs disabled:opacity-50 transition-all">IMPORTAR</button>
                </div>
            </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gps.map(gp => (
                <div key={gp.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition-all group relative">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEditGp(gp)} className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><Edit2 size={14}/></button>
                         <button onClick={() => { if(confirm("¿Borrar GP?")) API.deleteGP(gp.id).then(loadGps) }} className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                    </div>
                    <div className="flex justify-between items-start mb-4"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 px-2 py-1 rounded">{new Date(gp.race_datetime).toLocaleString()}</span></div>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter text-gray-800 mb-6 truncate">{gp.name}</h4>
                    <button onClick={() => handleOpenResults(gp)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-f1-red transition-all flex items-center justify-center gap-2"><Trophy size={14}/> Gestionar Resultados</button>
                </div>
            ))}
        </div>
        <AnimatePresence>
            {editingGp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="bg-gray-50 p-6 border-b border-gray-100"><h3 className="font-black uppercase text-gray-800">Reprogramar GP</h3></div>
                        <div className="p-6 space-y-4">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Nueva Fecha y Hora</label><input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold text-gray-700"/></div>
                            <div className="flex gap-3 mt-4"><button onClick={() => setEditingGp(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button><button onClick={saveGpUpdate} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">Guardar</button></div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        <AnimatePresence>
            {showResultsModal && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                   <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
                       <div className="bg-f1-dark p-6 text-white flex justify-between items-center"><h3 className="text-xl font-black italic uppercase">Resultados Oficiales: {resultGp?.name}</h3><button onClick={() => setShowResultsModal(false)}><XCircle /></button></div>
                       <div className="p-8 overflow-y-auto max-h-[70vh]">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-3">
                                   <h4 className="text-xs font-black uppercase text-f1-red mb-4">Top 10 Clasificación</h4>
                                   {[...Array(10)].map((_, i) => (
                                       <div key={i+1} className="flex items-center gap-3">
                                           <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">#{i+1}</span>
                                           <select value={positions[i+1]} onChange={e => setPositions({...positions, [i+1]: e.target.value})} className="flex-1 bg-gray-50 border-none rounded-lg p-2 text-sm font-bold"><option value="">--</option>{driversList.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}</select>
                                       </div>
                                   ))}
                               </div>
                               <div className="space-y-6">
                                   <h4 className="text-xs font-black uppercase text-blue-600">Eventos de Carrera</h4>
                                   <div className="space-y-4 bg-gray-50 p-6 rounded-3xl">
                                           <div><label className="text-[10px] font-black uppercase text-gray-400">Vuelta Rápida</label><select value={events.FASTEST_LAP} onChange={e => setEvents({...events, FASTEST_LAP: e.target.value})} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold"><option value="">--</option>{driversList.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}</select></div>
                                           <div><label className="text-[10px] font-black uppercase text-gray-400">Safety Car</label><select value={events.SAFETY_CAR} onChange={e => setEvents({...events, SAFETY_CAR: e.target.value})} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold"><option value="No">No</option><option value="Yes">Sí</option></select></div>
                                           <div><label className="text-[10px] font-black uppercase text-gray-400">Abandonos</label><input type="number" value={events.DNFS} onChange={e => setEvents({...events, DNFS: e.target.value})} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold"/></div>
                                   </div>
                                   <button onClick={() => API.saveRaceResult(resultGp.id, positions, events).then(() => setShowResultsModal(false))} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all uppercase italic tracking-tighter">Guardar y Calcular Puntos</button>
                               </div>
                           </div>
                       </div>
                   </motion.div>
               </div>
            )}
       </AnimatePresence>
      </motion.div>
    );
  };
  
  // ------------------------------------------
  // TAB: PARRILLA F1
  // ------------------------------------------
  const F1GridTab = () => {
    const [constructors, setConstructors] = useState<any[]>([]);
    const [cName, setCName] = useState("");
    const [cColor, setCColor] = useState("#E10600");

    useEffect(() => { if(selectedSeasonId) loadGrid(); }, [selectedSeasonId]);
    const loadGrid = () => API.getF1Grid(selectedSeasonId!).then(setConstructors);

    const handleAddDriver = async (cId: number) => {
        const code = prompt("Acrónimo (3 letras):");
        const name = prompt("Nombre:");
        if(code && name) API.createDriver(cId, code.toUpperCase(), name).then(loadGrid);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card title="Nueva Escudería F1" icon={<Flag size={18}/>}>
                <div className="flex gap-4 items-end">
                    <input value={cName} onChange={e=>setCName(e.target.value)} placeholder="Ej: Red Bull" className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg outline-none"/>
                    <input type="color" value={cColor} onChange={e=>setCColor(e.target.value)} className="w-12 h-10 border-none rounded-lg cursor-pointer"/>
                    <button onClick={() => API.createConstructor(selectedSeasonId!, cName, cColor).then(loadGrid)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg">Crear</button>
                </div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {constructors.map(c => (
                    <div key={c.id} className="bg-white rounded-[2rem] border-2 border-transparent shadow-sm overflow-hidden hover:shadow-md transition-all">
                        <div style={{ backgroundColor: c.color }} className="px-6 py-4 flex justify-between items-center text-white"><h4 className="font-black uppercase italic tracking-tighter">{c.name}</h4><button onClick={() => API.deleteConstructor(c.id).then(loadGrid)} className="p-1 hover:bg-black/20 rounded"><Trash2 size={14}/></button></div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                {c.drivers.map((d:any) => (
                                    <div key={d.id} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-xl">
                                        <div className="flex gap-3 items-center"><span className="text-xs font-black text-gray-400">{d.code}</span><span className="text-sm font-bold text-gray-700">{d.name}</span></div>
                                        <button onClick={() => API.deleteDriver(d.id).then(loadGrid)} className="text-gray-300 hover:text-red-500"><XCircle size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => handleAddDriver(c.id)} className="w-full py-2 border-2 border-dashed border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-all">+ Añadir Piloto</button>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5"><div className="bg-gray-900 p-4 rounded-[1.5rem] shadow-xl"><Settings className="text-white" size={32} /></div><div><h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Admin <span className="text-f1-red">Center</span></h1><p className="text-gray-400 font-medium">Gestión integral del mundial y usuarios</p></div></div>
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3"><span className="pl-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporada:</span><select value={selectedSeasonId || ""} onChange={e => setSelectedSeasonId(Number(e.target.value))} className="bg-gray-50 border-none rounded-xl text-sm font-bold p-2 pr-8 focus:ring-2 focus:ring-blue-500">{seasons.map(s => <option key={s.id} value={s.id}>{s.year} - {s.name}</option>)}</select></div>
        </header>
        <div className="flex flex-wrap gap-2 bg-gray-100/50 p-1.5 rounded-[2rem] border border-gray-200/50 backdrop-blur-sm sticky top-5 z-40">
            {[{id: 'seasons', label: 'Calendario', icon: <Calendar size={16}/>}, {id: 'users', label: 'Usuarios', icon: <Users size={16}/>}, {id: 'teams', label: 'Escuderías', icon: <Shield size={16}/>}, {id: 'gps', label: 'GPs & Puntos', icon: <Flag size={16}/>}, {id: 'grid', label: 'Parrilla F1', icon: <LayoutGrid size={16}/>}].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-white text-gray-900 shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"}`}>{tab.icon} {tab.label}</button>
            ))}
        </div>
        <div className="min-h-[500px] pb-20">
            {activeTab === 'seasons' && <SeasonsTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'teams' && <TeamsTab />}
            {activeTab === 'gps' && <GPsTab />}
            {activeTab === 'grid' && <F1GridTab />}
        </div>
      </div>
    </div>
  );
};

export default Admin;