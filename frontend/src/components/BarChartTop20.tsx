import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: { name: string; accumulated: number }[];
  currentUser: string;
}

const BarChartTop20: React.FC<Props> = ({ data, currentUser }) => {
  // Cogemos top 20
  let displayData = data.slice(0, 20);
  
  // Si el usuario no está en el top 20, lo añadimos al final para comparar
  const userInTop20 = displayData.find(d => d.name === currentUser);
  if (!userInTop20 && currentUser) {
    const userData = data.find(d => d.name === currentUser);
    if (userData) {
        displayData.push(userData);
    }
  }

  const chartData = {
    labels: displayData.map(d => d.name.substring(0, 3).toUpperCase()), // Acrónimos
    datasets: [
      {
        label: "Puntos",
        data: displayData.map(d => d.accumulated),
        backgroundColor: displayData.map(d => 
            d.name === currentUser ? "#e10600" : "rgba(54, 162, 235, 0.6)" // Rojo para mí, Azul resto
        ),
        borderColor: displayData.map(d => 
            d.name === currentUser ? "#b70500" : "rgba(54, 162, 235, 1)"
        ),
        borderWidth: 1,
      },
    ],
  };

  return <div style={{height: 300}}><Bar data={chartData} options={{ maintainAspectRatio: false }} /></div>;
};

export default BarChartTop20;