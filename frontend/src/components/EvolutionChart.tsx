import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import React from "react";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  data: Record<string, { gp_id: number; value: number }[]>;
}

const EvolutionChart: React.FC<Props> = ({ data }) => {
  const labels = data[Object.keys(data)[0]]?.map(d => `GP ${d.gp_id}`) || [];

  const datasets = Object.keys(data).map((key, i) => ({
    label: key,
    data: data[key].map(d => d.value),
    borderColor: `hsl(${i * 60}, 70%, 50%)`,
    backgroundColor: `hsl(${i * 60}, 70%, 50%, 0.3)`,
  }));

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Line
        data={{ labels, datasets }}
        options={{ responsive: true, plugins: { legend: { position: "bottom" } } }}
      />
    </div>
  );
};

export default EvolutionChart;
