import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import * as API from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Calendar, Users, Shield, Flag, LayoutGrid, 
  Plus, Trash2, Edit2, CheckCircle, XCircle, Save, AlertTriangle, Upload, Trophy
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
  // TAB: USUARIOS (ACTUALIZADO)
  // ------------------------------------------
  const UsersTab = () => {
    const [users, setUsers] = useState<any[]>([]);
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
        setEditPassword(""); // Siempre vacía por seguridad
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* CARD DE CREACIÓN (Igual que antes) */}
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

        {/* TABLA DE USUARIOS */}
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
              {users.map(u => (
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
                    {/* BOTÓN EDITAR */}
                    <button onClick={() => openEditModal(u)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Edit2 size={18}/>
                    </button>
                    {/* BOTÓN BORRAR */}
                    <button onClick={() => { if(confirm("¿Borrar usuario?")) API.deleteUser(u.id).then(loadUsers) }} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL DE EDICIÓN DE USUARIO */}
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
                                <input 
                                    type="password" 
                                    placeholder="Dejar vacío para no cambiar" 
                                    value={editPassword} 
                                    onChange={e => setEditPassword(e.target.value)} 
                                    className="w-full mt-1 p-3 bg-gray-50 border rounded-xl"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Si escribes aquí, la contraseña del usuario se actualizará.</p>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                                <button onClick={handleUpdateUser} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">Guardar Cambios</button>
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
  // TAB: ESCUDERÍAS (EQUIPOS DE USUARIOS)
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
      API.getTeams(selectedSeasonId).then(setTeams);
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card title="1. Crear Escudería" icon={<Plus size={18}/>}>
            <div className="space-y-4">
              <input value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="Nombre (ej: Ferrari)" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"/>
              <button onClick={() => API.createTeam(selectedSeasonId!, newTeamName).then(() => {setNewTeamName(""); loadTeams();})} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg">Crear</button>
            </div>
          </Card>

          <Card title="2. Asignar Piloto" icon={<Users size={18}/>}>
            <div className="space-y-4">
              <select onChange={e => setSelectedTeam(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none">
                  <option value="">Equipo...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select onChange={e => setSelectedUser(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none">
                  <option value="">Usuario...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
              <button onClick={() => API.addTeamMember(selectedTeam!, selectedUser!).then(loadTeams)} className="w-full py-2 bg-gray-900 text-white font-bold rounded-lg italic">ASIGNAR A BOX</button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                <tr><th className="px-6 py-4">Escudería</th><th className="px-6 py-4">Miembros</th><th className="px-6 py-4 text-right">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4 font-black text-gray-800 italic uppercase tracking-tighter">{t.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {/* 👇 AQUÍ ESTÁ EL CAMBIO DE SEGURIDAD 👇 */}
                        {t.members && t.members.map((m: any, idx: number) => {
                            // Si 'm' es un objeto, intentamos sacar el username. Si es string, lo usamos tal cual.
                            const displayName = typeof m === 'object' ? (m.username || "Usuario") : m;
                            return (
                                <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">
                                    {displayName}
                                </span>
                            );
                        })}
                        {/* 👆 FIN DEL CAMBIO 👆 */}
                        {(!t.members || t.members.length === 0) && <span className="text-gray-300 italic text-xs">Vacío</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => API.deleteTeam(t.id).then(loadTeams)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };
  
  // ------------------------------------------
  // TAB: GRANDES PREMIOS (ACTUALIZADO)
  // ------------------------------------------
  const GPsTab = () => {
    const [gps, setGps] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [driversList, setDriversList] = useState<any[]>([]);
    
    // Estado Resultados
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [resultGp, setResultGp] = useState<any | null>(null);
    const [positions, setPositions] = useState<Record<number, string>>({});
    const [events, setEvents] = useState({ FASTEST_LAP: "", SAFETY_CAR: "No", DNFS: "0", DNF_DRIVER: "" });

    // Estado Edición GP (Fecha/Hora)
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
        // Formatear la fecha para el input datetime-local (YYYY-MM-DDTHH:mm)
        const d = new Date(gp.race_datetime);
        const iso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setNewDate(iso);
    };

    const saveGpUpdate = async () => {
        if(!editingGp || !selectedSeasonId) return;
        try {
            // El backend requiere season_id y name aunque no los cambiemos
            await API.updateGP(editingGp.id, editingGp.name, newDate, selectedSeasonId);
            alert("Horario actualizado 📅");
            setEditingGp(null);
            loadGps();
        } catch(e) {
            alert("Error actualizando GP");
        }
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
                    {/* Botones de acción arriba a la derecha */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {/* Botón EDITAR HORARIO */}
                         <button onClick={() => handleEditGp(gp)} className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100" title="Cambiar Horario">
                            <Edit2 size={14}/>
                         </button>
                         {/* Botón BORRAR */}
                         <button onClick={() => { if(confirm("¿Borrar GP?")) API.deleteGP(gp.id).then(loadGps) }} className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100">
                            <Trash2 size={14}/>
                         </button>
                    </div>

                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 px-2 py-1 rounded">
                            {new Date(gp.race_datetime).toLocaleString()}
                        </span>
                    </div>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter text-gray-800 mb-6 truncate" title={gp.name}>{gp.name}</h4>
                    <button onClick={() => handleOpenResults(gp)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-f1-red transition-all flex items-center justify-center gap-2">
                         <Trophy size={14}/> Gestionar Resultados
                    </button>
                </div>
            ))}
        </div>

        {/* MODAL EDICIÓN HORARIO */}
        <AnimatePresence>
            {editingGp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="bg-gray-50 p-6 border-b border-gray-100">
                            <h3 className="font-black uppercase text-gray-800">Reprogramar GP</h3>
                            <p className="text-xs text-gray-400">{editingGp.name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Nueva Fecha y Hora</label>
                                <input 
                                    type="datetime-local" 
                                    value={newDate} 
                                    onChange={e => setNewDate(e.target.value)} 
                                    className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold text-gray-700"
                                />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setEditingGp(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                                <button onClick={saveGpUpdate} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">Guardar</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* MODAL RESULTADOS (Se mantiene tu modal existente aquí abajo) */}
        <AnimatePresence>
            {showResultsModal && (
               /* ... TU CÓDIGO DEL MODAL DE RESULTADOS QUE YA TENÍAS ... */
               /* (Pégalo aquí o mantén el que ya tenías en tu código original) */
               /* Para ahorrar espacio en la respuesta asumo que mantienes el bloque del modal de resultados */
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
                        <div className="bg-f1-dark p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black italic uppercase">Resultados Oficiales: {resultGp?.name}</h3>
                            <button onClick={() => setShowResultsModal(false)}><XCircle /></button>
                        </div>
                        {/* ... El resto del contenido del modal de resultados ... */}
                        {/* Lo he resumido aquí, pero tú mantén el contenido completo de tu versión anterior */}
                        <div className="p-8 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-f1-red mb-4">Top 10 Clasificación</h4>
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i+1} className="flex items-center gap-3">
                                            <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">#{i+1}</span>
                                            <select value={positions[i+1]} onChange={e => setPositions({...positions, [i+1]: e.target.value})} className="flex-1 bg-gray-50 border-none rounded-lg p-2 text-sm font-bold">
                                                <option value="">--</option>
                                                {driversList.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-xs font-black uppercase text-blue-600">Eventos de Carrera</h4>
                                    <div className="space-y-4 bg-gray-50 p-6 rounded-3xl">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400">Vuelta Rápida</label>
                                                <select value={events.FASTEST_LAP} onChange={e => setEvents({...events, FASTEST_LAP: e.target.value})} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold">
                                                    <option value="">--</option>
                                                    {driversList.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400">Safety Car</label>
                                                <select value={events.SAFETY_CAR} onChange={e => setEvents({...events, SAFETY_CAR: e.target.value})} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold">
                                                    <option value="No">No</option><option value="Yes">Sí</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-gray-400">Abandonos</label>
                                                <input type="number" value={events.DNFS} onChange={e => setEvents({...events, DNFS: e.target.value})} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold"/>
                                            </div>
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
                        <div style={{ backgroundColor: c.color }} className="px-6 py-4 flex justify-between items-center text-white">
                            <h4 className="font-black uppercase italic tracking-tighter">{c.name}</h4>
                            <button onClick={() => API.deleteConstructor(c.id).then(loadGrid)} className="p-1 hover:bg-black/20 rounded"><Trash2 size={14}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                {c.drivers.map((d:any) => (
                                    <div key={d.id} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-xl">
                                        <div className="flex gap-3 items-center">
                                            <span className="text-xs font-black text-gray-400">{d.code}</span>
                                            <span className="text-sm font-bold text-gray-700">{d.name}</span>
                                        </div>
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

  // -------------------------------------------------------------------------
  // RENDER PRINCIPAL
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#fcfcfd] p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
                <div className="bg-gray-900 p-4 rounded-[1.5rem] shadow-xl">
                    <Settings className="text-white" size={32} />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Admin <span className="text-f1-red">Center</span></h1>
                    <p className="text-gray-400 font-medium">Gestión integral del mundial y usuarios</p>
                </div>
            </div>

            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                <span className="pl-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporada:</span>
                <select value={selectedSeasonId || ""} onChange={e => setSelectedSeasonId(Number(e.target.value))} className="bg-gray-50 border-none rounded-xl text-sm font-bold p-2 pr-8 focus:ring-2 focus:ring-blue-500">
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.year} - {s.name}</option>)}
                </select>
            </div>
        </header>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap gap-2 bg-gray-100/50 p-1.5 rounded-[2rem] border border-gray-200/50 backdrop-blur-sm sticky top-5 z-40">
            {[
                {id: 'seasons', label: 'Calendario', icon: <Calendar size={16}/>},
                {id: 'users', label: 'Usuarios', icon: <Users size={16}/>},
                {id: 'teams', label: 'Escuderías', icon: <Shield size={16}/>},
                {id: 'gps', label: 'GPs & Puntos', icon: <Flag size={16}/>},
                {id: 'grid', label: 'Parrilla F1', icon: <LayoutGrid size={16}/>}
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === tab.id ? "bg-white text-gray-900 shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* TAB CONTENT */}
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