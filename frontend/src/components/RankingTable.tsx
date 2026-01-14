import React from "react";

interface Props {
  data: { name: string; accumulated: number }[];
}

const RankingTable: React.FC<Props> = ({ data }) => {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>#</th>
          <th>Nombre</th>
          <th>Puntos acumulados</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={row.name}>
            <td>{i + 1}</td>
            <td>{row.name}</td>
            <td>{row.accumulated}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RankingTable;
