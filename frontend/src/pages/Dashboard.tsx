import React, { useEffect, useState } from "react";
import { getEvolution, getRanking } from "../api/api";
import EvolutionChart from "../components/EvolutionChart";
import RankingTable from "../components/RankingTable";

const Dashboard: React.FC = () => {
  const [evolution, setEvolution] = useState<Record<string, { gp_id: number; value: number }[]>>({});
  const [ranking, setRanking] = useState<{ name: string; accumulated: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const evo = await getEvolution(1, "users", ["Fernando","Carlos"], undefined, "total");
      setEvolution(evo);

      const rank = await getRanking(1, "users", "total", 10);
      setRanking(rank.overall);
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Mundial de Porras F1 – Dashboard</h1>
      <h2>Evolución acumulada</h2>
      <EvolutionChart data={evolution} />
      <h2>Ranking general</h2>
      <RankingTable data={ranking} />
    </div>
  );
};

export default Dashboard;
