import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

interface Season {
  id: number;
  year: number;
  name: string;
  is_active: boolean;
}

const Admin: React.FC = () => {
  const { token } = useContext(AuthContext);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : undefined;

  // ✅ Traer temporadas existentes
  const fetchSeasons = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/seasons`, { headers });
      setSeasons(res.data);
    } catch (err) {
      console.error(err);
      alert("Error cargando temporadas");
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  // ✅ Crear nueva temporada
  const createSeason = async () => {
    try {
      const res = await axios.post(
        `${BASE_URL}/admin/seasons`,
        { year, name, is_active: isActive },
        { headers }
      );
      alert("Temporada creada ✅");
      setName("");
      setIsActive(false);
      fetchSeasons();
    } catch (err: any) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        const messages = detail
          .map((d: any) => `• ${d.loc.join(".")}: ${d.msg}`)
          .join("\n");
        alert(messages);
      } else {
        alert(detail || "Error creando temporada");
      }
}

  };

  // ✅ Cambiar estado de activación
  const toggleActive = async (id: number) => {
    try {
      await axios.patch(
        `${BASE_URL}/admin/seasons/${id}/toggle`,
        {},
        { headers }
      );
      fetchSeasons();
    } catch (err) {
      alert("Error cambiando estado");
    }
  };

  // ✅ Borrar temporada
  const deleteSeason = async (id: number) => {
    if (!confirm("¿Seguro que quieres borrar esta temporada?")) return;
    try {
      await axios.delete(`${BASE_URL}/admin/seasons/${id}`, { headers });
      fetchSeasons();
    } catch (err) {
      alert("Error borrando temporada");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Panel de administración</h1>

      <section style={{ marginBottom: "40px" }}>
        <h2>Crear nueva temporada</h2>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          placeholder="Año"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
        />
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />{" "}
          Activar temporada
        </label>
        <button onClick={createSeason}>Crear</button>
      </section>

      <section>
        <h2>Temporadas existentes</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Año</th>
              <th>Nombre</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.year}</td>
                <td>{s.name}</td>
                <td>{s.is_active ? "✅" : "❌"}</td>
                <td>
                  <button onClick={() => toggleActive(s.id)}>Cambiar</button>
                  <button onClick={() => deleteSeason(s.id)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Admin;
