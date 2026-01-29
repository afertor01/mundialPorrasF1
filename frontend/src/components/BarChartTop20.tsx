import React from "react";
import { Bar } from "react-chartjs-2";
import { 
  Chart, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  // Añadimos 'acronym' opcional para que TypeScript no se queje
  data: { name: string; accumulated: number; acronym?: string }[]; 
  currentUser: string;
}

const BarChartTop20: React.FC<Props> = ({ data, currentUser }) => {
  // 1. Lógica para asegurar Top 20 + Usuario actual
  let displayData = data.slice(0, 20);
  
  const userInTop20 = displayData.find(d => d.name === currentUser);
  if (!userInTop20 && currentUser) {
    const userData = data.find(d => d.name === currentUser);
    if (userData) {
        displayData.push(userData);
    }
  }

  const chartData = {
    // REQUISITO 1: Si hay acrónimo (piloto) úsalo, si no (escudería) usa el nombre completo
    labels: displayData.map(d => d.acronym || d.name), 
    datasets: [
      {
        label: "Puntos", // Etiqueta interna para el tooltip
        data: displayData.map(d => d.accumulated),
        backgroundColor: displayData.map(d => 
            d.name === currentUser ? "#e10600" : "rgba(54, 162, 235, 0.6)"
        ),
        borderColor: displayData.map(d => 
            d.name === currentUser ? "#b70500" : "rgba(54, 162, 235, 1)"
        ),
        borderWidth: 1,
        borderRadius: 4, // Un toque estético: bordes redondeados en las barras
      },
    ],
  };

  const options: any = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        display: false, // REQUISITO 2: Ocultar leyenda
      },
      tooltip: {
        callbacks: {
           // Aseguramos que en el tooltip siempre salga el nombre completo
           title: (context: any) => displayData[context[0].dataIndex].name
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
            color: '#f3f4f6' // Rejilla suave
        },
        title: {
            display: true,
            text: 'Puntos', // REQUISITO 3: Título del eje Y
            font: {
                weight: 'bold',
                size: 12
            },
            color: '#9ca3af'
        }
      },
      x: {
        grid: {
            display: false // Eje X más limpio sin rejilla vertical
        },
        ticks: {
            font: {
                weight: 'bold',
                size: 10
            },
            autoSkip: false, // Intentar mostrar todos
            maxRotation: 45, // Rotar si los nombres de equipo son muy largos
            minRotation: 0
        }
      }
    }
  };

  return (
    <div style={{ height: "100%", minHeight: 300 }}>
        <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChartTop20;