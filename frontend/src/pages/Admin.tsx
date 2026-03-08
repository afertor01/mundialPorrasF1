import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import * as API from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Calendar, Users, Shield, Flag, LayoutGrid,
  Plus, Trash2, Edit2, CheckCircle, XCircle, AlertTriangle, Upload, Trophy,
  Search, X, Image, RefreshCw, Terminal, Timer
} from "lucide-react";

const Admin: React.FC = () => {
  const { } = useContext(AuthContext);
  const { toast, showConfirm, showPrompt } = useToast();
  const [activeTab, setActiveTab] = useState<"seasons" | "users" | "teams" | "gps" | "grid" | "bingo" | "avatars" | "panic">("seasons");
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  // Estados de carga
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    // Simular una pequeña transición al cambiar de pestaña
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const loadSeasons = async () => {
    try {
      const data = await API.getSeasons();
      setSeasons(data);
      if (data.length > 0 && !selectedSeasonId) {
        const active = data.find((s: any) => s.is_active);
        setSelectedSeasonId(active ? active.id : data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // COMPONENTES DE CARGA
  // -------------------------------------------------------------------------
  const LoadingOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-f1-red border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse">Sincronizando datos...</p>
      </div>
    </motion.div>
  );

  const TabLoader = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="text-gray-200 animate-spin" size={48} />
      <div className="space-y-2 text-center">
        <div className="h-4 w-32 bg-gray-100 rounded-full animate-pulse mx-auto" />
        <div className="h-3 w-48 bg-gray-50 rounded-full animate-pulse mx-auto" />
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // SUB-COMPONENTES DE ESTILO (Reutilizables)
  // -------------------------------------------------------------------------

  // ------------------------------------------
  // TAB: TEMPORADAS
  // ------------------------------------------
  // ------------------------------------------
  // RENDER SECCION SELECCIONADA
  // ------------------------------------------
  const renderTab = () => {
    const props = { selectedSeasonId, setIsUpdating, seasons, loadSeasons, toast, showConfirm, showPrompt, API };

    switch (activeTab) {
      case 'seasons': return <SeasonsTab {...props} />;
      case 'users': return <UsersTab {...props} />;
      case 'teams': return <TeamsTab {...props} />;
      case 'gps': return <GPsTab {...props} />;
      case 'grid': return <F1GridTab {...props} />;
      case 'bingo': return <BingoTab {...props} />;
      case 'avatars': return <AvatarsTab {...props} />;
      case 'panic': return <PanicTab {...props} />;
      default: return null;
    }
  };


  return (
    <div className="min-h-screen bg-[#fcfcfd] p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5"><div className="bg-gray-900 p-4 rounded-[1.5rem] shadow-xl"><Settings className="text-white" size={32} /></div><div><h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Admin <span className="text-f1-red">Center</span></h1><p className="text-gray-400 font-medium">Gestión integral del mundial y usuarios</p></div></div>
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3"><span className="pl-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporada:</span><select value={selectedSeasonId || ""} onChange={e => setSelectedSeasonId(Number(e.target.value))} className="bg-gray-50 border-none rounded-xl text-sm font-bold p-2 pr-8 focus:ring-2 focus:ring-blue-500">{seasons.map(s => <option key={s.id} value={s.id}>{s.year} - {s.name}</option>)}</select></div>
        </header>
        <div className="flex flex-wrap gap-2 bg-gray-100/50 p-1.5 rounded-[2rem] border border-gray-200/50 backdrop-blur-sm sticky top-5 z-40">
          {[{ id: 'seasons', label: 'Calendario', icon: <Calendar size={16} /> }, { id: 'users', label: 'Usuarios', icon: <Users size={16} /> }, { id: 'teams', label: 'Escuderías', icon: <Shield size={16} /> }, { id: 'gps', label: 'GPs & Puntos', icon: <Flag size={16} /> }, { id: 'grid', label: 'Parrilla F1', icon: <LayoutGrid size={16} /> }, { id: 'bingo', label: 'Bingo', icon: <Trophy size={16} /> }, { id: 'avatars', label: 'Galería Avatares', icon: <Image size={16} /> }, { id: 'panic', label: 'Zona Pánico', icon: <AlertTriangle size={16} /> }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-white text-gray-900 shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"}`}>{tab.icon} {tab.label}</button>
          ))}
        </div>
        <div className="min-h-[500px] pb-20 relative">
          <AnimatePresence>
            {isUpdating && <LoadingOverlay />}
          </AnimatePresence>

          {isLoading ? (
            <TabLoader />
          ) : (
            <>
              {renderTab()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;

// =============================================================================
// SUB-COMPONENTES ESTABILIZADOS (Fuera del render para evitar re-montaje)
// =============================================================================

const Card = ({ children, title, icon }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
    <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
      {icon} <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wider">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const SeasonsTab = ({ seasons, setIsUpdating, loadSeasons, toast, showConfirm, API }: any) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(false);

  const handleCreate = async () => {
    try {
      setIsUpdating(true);
      await API.createSeason({ year, name, is_active: isActive });
      setName("");
      await loadSeasons();
      toast("Temporada creada ✅", "success");
    } catch (err: any) {
      toast("Error creando temporada", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      setIsUpdating(true);
      await API.toggleSeason(id);
      await loadSeasons();
    } catch (e) {
      toast("Error al cambiar estado", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await showConfirm({ title: "Borrar Temporada", message: "¿Seguro que quieres borrar esta temporada? Se perderán todos los datos asociados.", danger: true })) {
      try {
        setIsUpdating(true);
        await API.deleteSeason(id);
        await loadSeasons();
        toast("Temporada eliminada", "success");
      } catch (e) {
        toast("Error al eliminar temporada", "error");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card title="Nueva Temporada" icon={<Plus size={18} className="text-green-500" />}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-bold text-gray-400 uppercase">Año</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: F1 2026" className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Activa</span>
          </label>
          <button onClick={handleCreate} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all mb-1">Crear</button>
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
            {seasons.map((s: any) => (
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
                  <button onClick={() => handleToggle(s.id)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                    <Settings size={18} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
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

const UsersTab = ({ setIsUpdating, toast, showConfirm, API }: any) => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Create State
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [acronym, setAcronym] = useState("");

  // Edit State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState("user");
  const [editPassword, setEditPassword] = useState("");

  useEffect(() => { loadUsers(); }, []);
  const loadUsers = async () => {
    try {
      const data = await API.getUsers();
      setUsers(data);
    } catch (e) { }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.acronym.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async () => {
    if (acronym.length !== 3) { toast("El acrónimo debe tener 3 letras", "warning"); return; }
    try {
      setIsUpdating(true);
      await API.createUser({ email, username, password, role, acronym });
      toast("Usuario creado correctamente ✅", "success");
      setEmail(""); setUsername(""); setPassword(""); setAcronym(""); setRole("user");
      await loadUsers();
    } catch (err: any) {
      toast("Error: " + (err.response?.data?.detail || "Error desconocido"), "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      setIsUpdating(true);
      await API.updateUser(editingUser.id, editRole, editPassword);
      toast("Usuario actualizado correctamente ✅", "success");
      setEditingUser(null);
      setEditPassword("");
      await loadUsers();
    } catch (err) {
      toast("Error actualizando usuario", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (u: any) => {
    const confirmed = await showConfirm({
      title: "Borrar Usuario",
      message: `¿Estás seguro de que quieres borrar a ${u.username}? Esta acción es irreversible.`,
      danger: true
    });
    if (confirmed) {
      try {
        setIsUpdating(true);
        await API.deleteUser(u.id);
        await loadUsers();
        toast("Usuario eliminado", "success");
      } catch (e) {
        toast("Error al eliminar usuario", "error");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPassword("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card title="Añadir Nuevo Usuario" icon={<Plus size={18} className="text-green-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Usuario</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Acrónimo</label><input type="text" maxLength={3} value={acronym} onChange={e => setAcronym(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Rol</label><select value={role} onChange={e => setRole(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold"><option value="user">Jugador</option><option value="admin">Administrador</option></select></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" /></div>
          <button onClick={handleCreateUser} className="px-6 py-2 bg-green-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-green-700 transition-all">Crear</button>
        </div>
      </Card>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type="text" placeholder="Buscar por usuario, email o acrónimo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
                    <div><div className="font-bold text-gray-800">{u.username}</div><div className="text-xs text-gray-400">{u.email}</div></div>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === "admin" ? <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[9px] font-black rounded-full uppercase border border-purple-200">Admin</span> : <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full uppercase border border-blue-200">Piloto</span>}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEditModal(u)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteUser(u)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">No se encontraron usuarios</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="bg-gray-50 p-6 border-b border-gray-100"><h3 className="font-black uppercase text-gray-800">Editar Usuario: {editingUser.username}</h3></div>
              <div className="p-6 space-y-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Rol</label><select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold"><option value="user">Piloto (User)</option><option value="admin">Administrador</option></select></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">Nueva Contraseña <AlertTriangle size={12} className="text-yellow-500" /></label><input type="password" placeholder="Dejar vacío para no cambiar" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl" /></div>
                <div className="flex gap-3 mt-6"><button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button><button onClick={handleUpdateUser} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">Guardar</button></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TeamsTab = ({ selectedSeasonId, setIsUpdating, toast, showConfirm, API }: any) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  useEffect(() => {
    if (selectedSeasonId) loadTeams();
    API.getUsers().then(setUsers);
  }, [selectedSeasonId]);

  const loadTeams = async () => {
    if (!selectedSeasonId) return;
    API.getTeams(selectedSeasonId).then(setTeams);
  }

  const takenUsernames = new Set<string>();
  teams.forEach(t => { if (t.members) t.members.forEach((m: any) => takenUsernames.add(typeof m === 'object' ? m.username : m)); });

  const availableTeams = teams.filter(t => (t.members?.length || 0) < 2).sort((a, b) => a.name.localeCompare(b.name));
  const freeAgents = users.filter(u => !takenUsernames.has(u.username)).sort((a, b) => a.username.localeCompare(b.username));

  const filteredTeamsTable = teams.filter(t => {
    const term = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(term) || (t.members && t.members.some((m: any) => (typeof m === 'object' ? m.username : m).toLowerCase().includes(term)));
  });

  const handleRemoveMember = async (team: any, memberName: string) => {
    const confirmed = await showConfirm({
      title: "Expulsar Miembro",
      message: `¿Expulsar a ${memberName} de ${team.name}?`,
      danger: true
    });
    if (!confirmed) return;

    try {
      setIsUpdating(true);
      const user = users.find(u => u.username === memberName);
      if (!user) return;
      if (team.members.length <= 1) {
        const finalConfirm = await showConfirm({
          title: "Eliminar Escudería",
          message: `${memberName} es el último miembro. Se eliminará la escudería por completo. ¿Continuar?`,
          danger: true
        });
        if (finalConfirm) {
          await API.deleteTeam(team.id);
          await loadTeams();
          toast("Escudería eliminada", "info");
        }
      } else {
        if ((API as any).kickTeamMemberAdmin) {
          await (API as any).kickTeamMemberAdmin(team.id, user.id);
          await loadTeams();
          toast("Piloto expulsado", "info");
        } else { toast("Falta endpoint kickTeamMemberAdmin", "error"); }
      }
    } catch (e) { toast("Error al procesar la expulsión", "error"); }
    finally { setIsUpdating(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card title="1. Crear Escudería" icon={<Plus size={18} />}>
          <div className="space-y-4">
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Nombre (ej: Aston Martin)" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" />
            <button onClick={async () => {
              try {
                setIsUpdating(true);
                await API.createTeam(selectedSeasonId!, newTeamName);
                setNewTeamName("");
                await loadTeams();
                toast("Escudería creada ✅", "success");
              } catch (e) {
                toast("Error creando escudería", "error");
              } finally {
                setIsUpdating(false);
              }
            }} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Crear</button>
          </div>
        </Card>
        <Card title="2. Fichar Piloto" icon={<Users size={18} />}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Escudería con hueco</label><span className="text-[10px] font-bold text-blue-600">{availableTeams.length} disponibles</span></div>
              <select onChange={e => setSelectedTeam(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 font-bold text-gray-700">
                <option value="">Seleccionar equipo...</option>
                {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name} • (Falta {2 - t.members.length})</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Agente Libre</label><span className="text-[10px] font-bold text-green-600">{freeAgents.length} disponibles</span></div>
              <select onChange={e => setSelectedUser(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 font-bold text-gray-700">
                <option value="">Seleccionar piloto...</option>
                {freeAgents.map(u => <option key={u.id} value={u.id}>{u.username} ({u.acronym})</option>)}
              </select>
            </div>
            <button onClick={async () => {
              try {
                setIsUpdating(true);
                await API.addTeamMember(selectedTeam!, selectedUser!);
                await loadTeams();
                toast("Piloto fichado ✅", "success");
              } catch (e) {
                toast("Error fichando piloto", "error");
              } finally {
                setIsUpdating(false);
              }
            }} disabled={!selectedTeam || !selectedUser} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl italic disabled:opacity-50 disabled:cursor-not-allowed hover:bg-f1-red transition-colors shadow-lg shadow-gray-200">CONFIRMAR FICHAJE</button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Buscar en la parrilla..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest"><tr><th className="px-6 py-4">Escudería</th><th className="px-6 py-4">Alineación</th><th className="px-6 py-4 text-right">Gestión</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeamsTable.length > 0 ? (
                filteredTeamsTable.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4"><div className="font-black text-gray-800 italic uppercase tracking-tighter text-lg">{t.name}</div><div className="mt-1">{t.members.length === 2 ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded uppercase">Completo</span> : <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded uppercase animate-pulse">Busca Piloto</span>}</div></td>
                    <td className="px-6 py-4"><div className="flex gap-2 flex-wrap">{t.members && t.members.map((m: any, idx: number) => { const displayName = typeof m === 'object' ? (m.username || "Usuario") : m; return (<div key={idx} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm">{displayName}<button onClick={() => handleRemoveMember(t, displayName)} className="p-0.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"><X size={14} /></button></div>); })}{(!t.members || t.members.length === 0) && <span className="text-gray-300 italic text-xs">Sin pilotos asignados</span>}</div></td>
                    <td className="px-6 py-4 text-right"><button onClick={async () => {
                      try {
                        setIsUpdating(true);
                        await API.deleteTeam(t.id);
                        await loadTeams();
                        toast("Escudería eliminada", "info");
                      } catch (e) {
                        toast("Error eliminando escudería", "error");
                      } finally {
                        setIsUpdating(false);
                      }
                    }} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button></td>
                  </tr>))
              ) : (<tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">No hay escuderías que coincidan</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const GPsTab = ({ selectedSeasonId, setIsUpdating, toast, showConfirm, API }: any) => {
  const [gps, setGps] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [driversList, setDriversList] = useState<any[]>([]);

  // --- Manual Edit States (Carrera) ---
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultGp, setResultGp] = useState<any | null>(null);
  const [positions, setPositions] = useState<Record<number, string>>({});
  const [events, setEvents] = useState({ FASTEST_LAP: "", SAFETY_CAR: "No", DNFS: "0", DNF_DRIVER: "" });
  const [editingGp, setEditingGp] = useState<any | null>(null);
  const [newDate, setNewDate] = useState("");

  // --- Qualy View States ---
  const [showQualyModal, setShowQualyModal] = useState(false);
  const [selectedQualyGp, setSelectedQualyGp] = useState<any | null>(null);

  // --- Auto-Sync States (Consola) ---
  const [syncingId, setSyncingId] = useState<number | null>(null);      // Para Carrera
  const [syncingQualyId, setSyncingQualyId] = useState<number | null>(null); // Para Qualy
  const [syncResult, setSyncResult] = useState<{ success: boolean, logs: string[] } | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => { if (selectedSeasonId) loadGps(); }, [selectedSeasonId]);

  const loadGps = () => {
    API.getGPs(selectedSeasonId!).then(setGps);
    API.getF1Grid(selectedSeasonId!).then((grid: any) => {
      const flat: any[] = [];
      grid.forEach((team: any) => team.drivers.forEach((d: any) => flat.push({ code: d.code, name: d.name })));
      setDriversList(flat.sort((a, b) => a.code.localeCompare(b.code)));
    });
  };

  // --- Lógica Modal Carrera ---
  const handleOpenResults = async (gp: any) => {
    setResultGp(gp);
    const defaultPos: any = {}; for (let i = 1; i <= 10; i++) defaultPos[i] = "";
    setPositions(defaultPos);
    setEvents({ FASTEST_LAP: "", SAFETY_CAR: "No", DNFS: "0", DNF_DRIVER: "" });
    try {
      const data = await API.getRaceResult(gp.id);
      if (data) { setPositions(data.positions); setEvents(data.events); }
    } catch (e) { }
    setShowResultsModal(true);
  };

  // --- Lógica Modal Qualy ---
  const handleOpenQualy = (gp: any) => {
    setSelectedQualyGp(gp);
    setShowQualyModal(true);
  };

  const handleEditGp = (gp: any) => {
    setEditingGp(gp);
    const d = new Date(gp.race_datetime);
    const iso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setNewDate(iso);
  };

  const saveGpUpdate = async () => {
    if (!editingGp || !selectedSeasonId) return;
    try {
      setIsUpdating(true);
      await API.updateGP(editingGp.id, editingGp.name, newDate, selectedSeasonId);
      toast("Horario actualizado correctamente 📅", "success");
      setEditingGp(null);
      await loadGps();
    } catch (e) { toast("Error actualizando GP", "error"); }
    finally { setIsUpdating(false); }
  };

  // --- SINCRONIZACIÓN AUTOMÁTICA (CARRERA) ---
  const handleSync = async (gp: any) => {
    const confirmed = await showConfirm({
      title: "Sincronizar Carrera",
      message: `¿Conectar con la FIA para descargar resultados de CARRERA de ${gp.name}?`,
      confirmText: "Sincronizar"
    });
    if (!confirmed) return;

    setSyncingId(gp.id);
    setSyncResult(null);
    setShowSyncModal(true); // Abre consola

    try {
      setIsUpdating(true);
      const data = await API.syncRaceData(gp.id);
      const result = data && data.logs ? data : { success: data?.success, logs: ["✅ Operación completada, pero no se generaron logs detallados."] };
      setSyncResult(result);
      await loadGps();
    } catch (e) {
      setSyncResult({
        success: false,
        logs: ["❌ Error de conexión con el servidor.", "Por favor revisa la consola del navegador."]
      });
    } finally {
      setSyncingId(null);
      setIsUpdating(false);
    }
  };

  // --- SINCRONIZACIÓN AUTOMÁTICA (QUALY) ---
  const handleSyncQualy = async (gp: any) => {
    const confirmed = await showConfirm({
      title: "Sincronizar Clasificación",
      message: `¿Conectar con la FIA para descargar resultados de CLASIFICACIÓN (Qualy) de ${gp.name}?`,
      confirmText: "Sincronizar"
    });
    if (!confirmed) return;

    setSyncingQualyId(gp.id);
    setSyncResult(null);
    setShowSyncModal(true); // Reutilizamos la misma consola

    try {
      setIsUpdating(true);
      const data = await (API as any).syncQualyData(gp.id);
      const result = data && data.logs ? data : { success: data?.success, logs: ["✅ Operación completada, pero no se generaron logs detallados."] };
      setSyncResult(result);
      await loadGps();
    } catch (e) {
      setSyncResult({
        success: false,
        logs: ["❌ Error de conexión al sincronizar Qualy.", "Revisa logs del servidor."]
      });
    } finally {
      setSyncingQualyId(null);
      setIsUpdating(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <Card title="Importar Calendario" icon={<Upload size={18} />}>
          <div className="flex items-center gap-4">
            <input type="file" accept=".json" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <button onClick={async () => {
              try {
                setIsUpdating(true);
                await API.importGPs(selectedSeasonId!, file!);
                await loadGps();
                setFile(null);
                toast("Calendario importado ✅", "success");
              } catch (e) {
                toast("Error importando calendario", "error");
              } finally {
                setIsUpdating(false);
              }
            }} disabled={!file} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs disabled:opacity-50 transition-all">IMPORTAR</button>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gps.map(gp => {
          const hasQualyData = gp.qualy_results && gp.qualy_results.length > 0;

          return (
            <div key={gp.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition-all group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => handleEditGp(gp)} className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><Edit2 size={14} /></button>
                <button onClick={async () => {
                  const confirmed = await showConfirm({
                    title: "Borrar GP",
                    message: `¿Seguro que quieres borrar el GP de ${gp.name}?`,
                    danger: true
                  });
                  if (confirmed) {
                    try {
                      setIsUpdating(true);
                      await API.deleteGP(gp.id);
                      await loadGps();
                      toast("GP eliminado", "info");
                    } catch (e) {
                      toast("Error eliminando GP", "error");
                    } finally {
                      setIsUpdating(false);
                    }
                  }
                }} className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100"><Trash2 size={14} /></button>
              </div>

              <div className="flex justify-between items-start mb-4"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 px-2 py-1 rounded">{new Date(gp.race_datetime).toLocaleString()}</span></div>
              <h4 className="text-xl font-black italic uppercase tracking-tighter text-gray-800 mb-6 truncate">{gp.name}</h4>

              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button onClick={() => handleOpenResults(gp)} className="flex-[2] py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                    <Trophy size={14} /> Edit Race
                  </button>
                  <button onClick={() => handleSync(gp)} disabled={syncingId !== null} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg transition-all flex items-center justify-center gap-2 ${syncingId === gp.id ? "bg-f1-red/80 cursor-wait" : "bg-f1-red hover:bg-red-700 shadow-red-200"}`} title="Sincronizar Carrera">
                    {syncingId === gp.id ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  {hasQualyData ? (
                    <button onClick={() => handleOpenQualy(gp)} className="flex-[2] py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                      <Timer size={14} /> Ver Qualy
                    </button>
                  ) : (
                    <div className="flex-[2] py-3 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-[9px] text-gray-300 font-bold uppercase select-none">No Data</div>
                  )}
                  <button onClick={() => handleSyncQualy(gp)} disabled={syncingQualyId !== null} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg transition-all flex items-center justify-center gap-2 ${syncingQualyId === gp.id ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"}`} title="Sincronizar Clasificación">
                    {syncingQualyId === gp.id ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {editingGp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="bg-gray-50 p-6 border-b border-gray-100"><h3 className="font-black uppercase text-gray-800">Reprogramar GP</h3></div>
              <div className="p-6 space-y-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Nueva Fecha y Hora</label><input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl font-bold text-gray-700" /></div>
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
              <div className="bg-f1-dark p-6 text-white flex justify-between items-center"><h3 className="text-xl font-black italic uppercase">Resultados Carrera: {resultGp?.name}</h3><button onClick={() => setShowResultsModal(false)}><XCircle /></button></div>
              <div className="p-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-f1-red mb-4">Top 10 Clasificación</h4>
                    {[...Array(10)].map((_, i) => (
                      <div key={i + 1} className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">#{i + 1}</span>
                        <select value={positions[i + 1]} onChange={e => setPositions({ ...positions, [i + 1]: e.target.value })} className="flex-1 bg-gray-50 border-none rounded-lg p-2 text-sm font-bold"><option value="">--</option>{driversList.map((d: any) => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}</select>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-blue-600">Eventos de Carrera</h4>
                    <div className="space-y-4 bg-gray-50 p-6 rounded-3xl">
                      <div><label className="text-[10px] font-black uppercase text-gray-400">Vuelta Rápida</label><select value={events.FASTEST_LAP} onChange={e => setEvents({ ...events, FASTEST_LAP: e.target.value })} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold"><option value="">--</option>{driversList.map((d: any) => <option key={d.code} value={d.code}>{d.code}</option>)}</select></div>
                      <div><label className="text-[10px] font-black uppercase text-gray-400">Safety Car</label><select value={events.SAFETY_CAR} onChange={e => setEvents({ ...events, SAFETY_CAR: e.target.value })} className="w-full mt-1 bg-white border-none rounded-lg p-2 text-sm font-bold"><option value="No">No</option><option value="Yes">Sí</option></select></div>
                      <div className="bg-red-50 p-4 rounded-xl space-y-3 border border-red-100">
                        <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-red-400">Lista de Abandonos</label><span className="text-[10px] font-bold text-red-600 bg-white px-2 py-0.5 rounded-full shadow-sm">Total: {events.DNFS || 0}</span></div>
                        <select value="" onChange={(e) => {
                          const selectedDriverCode = e.target.value;
                          if (!selectedDriverCode) return;
                          const currentList = events.DNF_DRIVER ? events.DNF_DRIVER.split(",").map(s => s.trim()).filter(s => s) : [];
                          if (!currentList.includes(selectedDriverCode)) {
                            const newList = [...currentList, selectedDriverCode];
                            setEvents({ ...events, DNF_DRIVER: newList.join(", "), DNFS: newList.length.toString() });
                          }
                        }} className="w-full bg-white border border-red-100 rounded-lg p-2 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-200">
                          <option value="">+ Añadir Piloto a DNF</option>{driversList.map((d: any) => (<option key={d.code} value={d.code}>{d.code} - {d.name}</option>))}
                        </select>
                        <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-2 bg-white rounded-lg border border-red-50">
                          {!events.DNF_DRIVER ? (<span className="text-xs text-gray-300 italic p-1">Ningún abandono seleccionado</span>) : (
                            events.DNF_DRIVER.split(",").map(code => code.trim()).filter(c => c).map((code, idx) => (
                              <div key={idx} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-red-100 text-red-700 rounded-full border border-red-200 shadow-sm animate-in fade-in zoom-in duration-200">
                                <span className="text-xs font-black">{code}</span>
                                <button onClick={() => {
                                  const currentList = events.DNF_DRIVER.split(",").map(s => s.trim());
                                  const newList = currentList.filter(c => c !== code);
                                  setEvents({ ...events, DNF_DRIVER: newList.join(", "), DNFS: newList.length.toString() });
                                }} className="p-1 hover:bg-red-200 rounded-full text-red-400 hover:text-red-800 transition-colors"><XCircle size={14} /></button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={async () => {
                      try {
                        setIsUpdating(true);
                        await API.saveRaceResult(resultGp.id, positions, events);
                        setShowResultsModal(false);
                        toast("Resultados guardados y puntos calculados ✅", "success");
                        await loadGps();
                      } catch (err: any) {
                        const msg = err.response?.data?.detail || "Error al guardar resultados";
                        toast(msg, "error");
                      } finally {
                        setIsUpdating(false);
                      }
                    }} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all uppercase italic tracking-tighter">Guardar y Calcular Puntos</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQualyModal && selectedQualyGp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-2"><Timer className="text-indigo-200" size={20} /><h3 className="text-lg font-black italic uppercase">Clasificación: {selectedQualyGp.name}</h3></div>
                <button onClick={() => setShowQualyModal(false)} className="hover:text-indigo-200 transition-colors"><XCircle /></button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh] bg-gray-50">
                {selectedQualyGp.qualy_results && selectedQualyGp.qualy_results.length > 0 ? (
                  <div className="space-y-2">
                    {selectedQualyGp.qualy_results.map((driver: string, index: number) => (
                      <div key={index} className="flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><div className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 font-black rounded-lg mr-3 text-sm">{index + 1}</div><span className="font-bold text-gray-800 text-lg">{driver}</span>{index < 3 && <span className="ml-auto text-yellow-400"><Trophy size={16} /></span>}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400 italic font-bold">No hay datos de clasificación disponibles.</div>
                )}
                <button onClick={() => setShowQualyModal(false)} className="w-full mt-6 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300 transition-all">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#1e1e1e] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col max-h-[80vh]">
              <div className="bg-[#2d2d2d] px-4 py-3 flex justify-between items-center border-b border-gray-700"><div className="flex items-center gap-2 text-gray-400 text-xs font-mono"><Terminal size={14} /><span>f1_sync_service.exe</span></div>{(!syncingId && !syncingQualyId) && (<button onClick={() => setShowSyncModal(false)} className="text-gray-400 hover:text-white transition-colors"><XCircle size={18} /></button>)}</div>
              <div className="p-6 overflow-y-auto font-mono text-xs md:text-sm space-y-2 flex-1">
                {(syncingId || syncingQualyId) && !syncResult && (<div className="flex items-center gap-3 text-yellow-400 animate-pulse"><RefreshCw size={16} className="animate-spin" /><span>Conectando satélite con FIA API ({syncingQualyId ? "Qualy" : "Race"})...</span></div>)}
                {syncResult?.logs.map((log: string, idx: number) => {
                  let colorClass = "text-gray-300";
                  if (log.includes("✅")) colorClass = "text-green-400";
                  if (log.includes("⚠️")) colorClass = "text-yellow-400";
                  if (log.includes("❌") || log.includes("Error")) colorClass = "text-red-400 font-bold";
                  if (log.includes("🚀") || log.includes("🎉")) colorClass = "text-blue-400 font-bold";
                  return (<div key={idx} className={`${colorClass} border-b border-white/5 pb-1 mb-1 last:border-0`}><span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>{log}</div>);
                })}
              </div>
              {(!syncingId && !syncingQualyId) && (<div className="bg-[#2d2d2d] p-4 flex justify-end border-t border-gray-700"><button onClick={() => setShowSyncModal(false)} className="px-6 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider rounded hover:bg-gray-200 transition-colors">Cerrar Consola</button></div>)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const F1GridTab = ({ selectedSeasonId, setIsUpdating, toast, showPrompt, API }: any) => {
  const [constructors, setConstructors] = useState<any[]>([]);
  const [cName, setCName] = useState("");
  const [cColor, setCColor] = useState("#E10600");

  useEffect(() => { if (selectedSeasonId) loadGrid(); }, [selectedSeasonId]);
  const loadGrid = () => API.getF1Grid(selectedSeasonId!).then(setConstructors);

  const handleAddDriver = async (cId: number) => {
    const code = await showPrompt({
      title: "Añadir Piloto",
      message: "Introduce el acrónimo del piloto (3 letras):",
      placeholder: "Ej: VER"
    });
    if (!code) return;

    const name = await showPrompt({
      title: "Nombre del Piloto",
      message: "Introduce el nombre completo del piloto:",
      placeholder: "Ej: Max Verstappen"
    });

    if (code && name) {
      try {
        setIsUpdating(true);
        await API.createDriver(cId, code.toUpperCase(), name);
        await loadGrid();
        toast("Piloto añadido ✅", "success");
      } catch (e) {
        toast("Error añadiendo piloto", "error");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card title="Nueva Escudería F1" icon={<Flag size={18} />}>
        <div className="flex gap-4 items-end">
          <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Ej: Red Bull" className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg outline-none" />
          <input type="color" value={cColor} onChange={e => setCColor(e.target.value)} className="w-12 h-10 border-none rounded-lg cursor-pointer" />
          <button onClick={async () => {
            try {
              setIsUpdating(true);
              await API.createConstructor(selectedSeasonId!, cName, cColor);
              setCName("");
              await loadGrid();
              toast("Constructor añadido ✅", "success");
            } catch (e) {
              toast("Error añadiendo constructor", "error");
            } finally {
              setIsUpdating(false);
            }
          }} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg">Crear</button>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {constructors.map(c => (
          <div key={c.id} className="bg-white rounded-[2rem] border-2 border-transparent shadow-sm overflow-hidden hover:shadow-md transition-all">
            <div style={{ backgroundColor: c.color }} className="px-6 py-4 flex justify-between items-center text-white"><h4 className="font-black uppercase italic tracking-tighter">{c.name}</h4><button onClick={async () => {
              try {
                setIsUpdating(true);
                await API.deleteConstructor(c.id);
                await loadGrid();
                toast("Constructor eliminado", "info");
              } catch (e) {
                toast("Error eliminando constructor", "error");
              } finally {
                setIsUpdating(false);
              }
            }} className="p-1 hover:bg-black/20 rounded"><Trash2 size={14} /></button></div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {c.drivers.map((d: any) => (
                  <div key={d.id} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-xl">
                    <div className="flex gap-3 items-center"><span className="text-xs font-black text-gray-400">{d.code}</span><span className="text-sm font-bold text-gray-700">{d.name}</span></div>
                    <button onClick={async () => {
                      try {
                        setIsUpdating(true);
                        await API.deleteDriver(d.id);
                        await loadGrid();
                        toast("Piloto eliminado", "info");
                      } catch (e) {
                        toast("Error eliminando piloto", "error");
                      } finally {
                        setIsUpdating(false);
                      }
                    }} className="text-gray-300 hover:text-red-500"><XCircle size={14} /></button>
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

const BingoTab = ({ selectedSeasonId, setIsUpdating, toast, showConfirm, API, seasons, loadSeasons }: any) => {
  const [tiles, setTiles] = useState<any[]>([]);
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (selectedSeasonId) loadTiles();
  }, [selectedSeasonId]);

  const loadTiles = async () => {
    try {
      const data = await API.getBingoBoard(selectedSeasonId || undefined);
      setTiles(data.tiles);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!newDesc.trim() || !selectedSeasonId) return;
    try {
      setIsUpdating(true);
      await API.createBingoTile(newDesc, selectedSeasonId);
      setNewDesc("");
      await loadTiles();
    } catch (e) { toast("Error creando casilla de bingo", "error"); }
    finally { setIsUpdating(false); }
  };

  const toggleComplete = async (tile: any) => {
    try {
      setIsUpdating(true);
      await API.updateBingoTile(tile.id, { is_completed: !tile.is_completed });
      await loadTiles();
    } catch (e) { toast("Error actualizando estado de casilla", "error"); }
    finally { setIsUpdating(false); }
  };
  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({
      title: "Borrar Casilla",
      message: "¿Borrar esta casilla del bingo?",
      danger: true
    });
    if (!confirmed) return;
    try {
      setIsUpdating(true);
      await API.deleteBingoTile(id);
      await loadTiles();
    } catch (e) { toast("Error al borrar la casilla", "error"); }
    finally { setIsUpdating(false); }
  };

  const selectedSeason = seasons.find((s: any) => s.id === selectedSeasonId);

  const handleToggleManualBingo = async () => {
    if (!selectedSeasonId) return;
    try {
      setIsUpdating(true);
      await API.toggleBingoManual(selectedSeasonId);
      await loadSeasons();
      toast("Estado del bingo actualizado ✅", "success");
    } catch (e) { toast("Error al cambiar estado del bingo", "error"); }
    finally { setIsUpdating(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <Card title="Estado del Bingo" icon={<Settings size={18} className="text-purple-500" />}>
          <div className="flex items-center justify-between p-2 bg-purple-50 rounded-2xl border border-purple-100">
            <div className="flex flex-col gap-1 pl-2">
              <span className="text-xs font-black uppercase text-purple-900 tracking-wider">Apertura Manual</span>
              <span className="text-[10px] font-medium text-purple-600 italic">Permitir cambios tras inicio temporada</span>
            </div>
            <button
              onClick={handleToggleManualBingo}
              className={`relative w-16 h-8 rounded-full transition-all duration-300 flex items-center px-1 ${selectedSeason?.bingo_manual_open ? "bg-purple-600" : "bg-gray-300"}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${selectedSeason?.bingo_manual_open ? "translate-x-8" : "translate-x-0"}`} />
            </button>
          </div>
        </Card>

        <Card title="Editor de Casillas" icon={<LayoutGrid size={18} className="text-purple-500" />}>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ej: Un Williams entra en Q3" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-bold text-gray-700" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <button onClick={handleCreate} className="px-6 py-3 bg-purple-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50">Añadir</button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(tile => (
          <div key={tile.id} className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 ${tile.is_completed ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}>
            <div className="flex justify-between items-start gap-2">
              <span className={`text-sm font-bold leading-tight ${tile.is_completed ? "text-green-800" : "text-gray-700"}`}>{tile.description}</span>
              <button onClick={() => handleDelete(tile.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100/50 mt-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase">{tile.selection_count} Selecciones</div>
              <button onClick={() => toggleComplete(tile)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${tile.is_completed ? "bg-green-500 text-white shadow-md shadow-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>{tile.is_completed ? <><CheckCircle size={12} /> Completado</> : "Pendiente"}</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const AvatarsTab = ({ setIsUpdating, toast, showConfirm, API }: any) => {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadAvatars(); }, []);
  const loadAvatars = () => API.getAvatars().then(setAvatars);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setIsUpdating(true);
    try {
      await API.uploadAvatar(uploadFile);
      setUploadFile(null);
      await loadAvatars();
      toast("Avatar subido correctamente", "success");
    } catch (e) { toast("Error al subir imagen a la galería", "error"); }
    finally {
      setUploading(false);
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({
      title: "Borrar Avatar",
      message: "¿Borrar este avatar de la galería?",
      danger: true
    });
    if (!confirmed) return;
    try {
      setIsUpdating(true);
      await API.deleteAvatar(id);
      await loadAvatars();
    } catch (e) { toast("Error al borrar el avatar", "error"); }
    finally { setIsUpdating(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card title="Subir Nuevo Avatar" icon={<Upload size={18} />}>
        <div className="flex items-center gap-4">
          <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
          <button onClick={handleUpload} disabled={!uploadFile || uploading} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold text-xs disabled:opacity-50 transition-all uppercase tracking-wider">{uploading ? "Subiendo..." : "Subir a Galería"}</button>
        </div>
        <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase">* Se recomienda formato PNG/JPG cuadrado (256x256 o 512x512).</p>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {avatars.map((av: any) => (
          <div key={av.id} className="group relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 group-hover:border-purple-100 transition-colors mb-3"><img src={av.url} alt={av.filename} className="w-full h-full object-cover" /></div>
            <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center">{av.filename}</span>
            <button onClick={() => handleDelete(av.id)} className="absolute top-2 right-2 p-1.5 bg-white text-red-400 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"><X size={14} /></button>
          </div>
        ))}
        {avatars.length === 0 && (<div className="col-span-full py-10 text-center text-gray-400 italic font-bold">No hay avatares en la galería. Sube el primero.</div>)}
      </div>
    </motion.div>
  );
};

const PanicTab = ({ setIsUpdating, toast, API }: any) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error", msg: string } | null>(null);

  const handlePanicRebuild = async () => {
    if (confirmText !== "CONFIRMAR") return;

    setIsProcessing(true);
    setShowConfirmModal(false);
    setFeedback(null);
    setIsUpdating(true);

    try {
      await (API as any).rebuildAllAchievements();
      const msg = "✅ Reconstrucción completada correctamente.";
      setFeedback({ type: "success", msg });
      toast(msg, "success");
      setConfirmText("");
    } catch (e: any) {
      const msg = "❌ Error crítico: " + (e.response?.data?.detail || e.message);
      setFeedback({ type: "error", msg });
      toast(msg, "error");
    } finally {
      setIsProcessing(false);
      setIsUpdating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card title="Recalcular Logros y Estadísticas" icon={<AlertTriangle size={18} className="text-red-500" />}>
        <div className="bg-red-50 border border-red-100 rounded-xl p-6">
          <h4 className="text-lg font-black text-red-600 uppercase italic mb-2">⚠️ Zona de Peligro</h4>
          <p className="text-gray-700 font-medium text-sm mb-4">
            Esta acción forzará un re-cálculo completo de <strong>todos los logros y estadísticas</strong> de todos los usuarios desde la primera carrera hasta hoy.
            <br /><br />
            Úsalo solo si detectas inconsistencias graves en los datos. Durante el proceso (que puede tardar varios segundos), la aplicación seguirá operativa pero los datos podrían fluctuar.
          </p>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isProcessing}
            className="px-6 py-3 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Trash2 size={20} />}
            {isProcessing ? "Reconstruyendo..." : "Recalcular TODO"}
          </button>
        </div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-xl border font-bold text-sm ${feedback.type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}
          >
            {feedback.msg}
          </motion.div>
        )}
      </Card>

      {/* MODAL DE CONFIRMACIÓN */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-red-500"
            >
              <div className="bg-red-500 p-6 flex justify-between items-center text-white">
                <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                  <AlertTriangle /> Confirmar Acción
                </h3>
                <button onClick={() => setShowConfirmModal(false)} className="hover:text-red-200"><XCircle size={24} /></button>
              </div>

              <div className="p-8 space-y-6">
                <p className="text-gray-600 text-sm font-medium">
                  Para confirmar, escribe la palabra <span className="font-black text-red-600">CONFIRMAR</span> en el recuadro de abajo.
                </p>

                <input
                  type="text"
                  placeholder="Escribe CONFIRMAR"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-black text-center uppercase tracking-widest focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition-all placeholder:text-gray-300"
                />

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-black rounded-xl hover:bg-gray-200 uppercase text-xs tracking-widest">
                    Cancelar
                  </button>
                  <button
                    onClick={handlePanicRebuild}
                    disabled={confirmText !== "CONFIRMAR"}
                    className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 uppercase text-xs tracking-widest disabled:opacity-50 disabled:grayscale transition-all"
                  >
                    Ejecutar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};