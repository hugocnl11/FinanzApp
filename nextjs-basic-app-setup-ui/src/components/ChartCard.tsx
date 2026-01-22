"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Ene", Ingresos: 4000, Gastos: 2400 },
  { name: "Feb", Ingresos: 3000, Gastos: 1398 },
  { name: "Mar", Ingresos: 2000, Gastos: 9800 },
  { name: "Abr", Ingresos: 2780, Gastos: 3908 },
  { name: "May", Ingresos: 1890, Gastos: 4800 },
  { name: "Jun", Ingresos: 2390, Gastos: 3800 },
];

export function ChartCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Ingresos vs Gastos (2024)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="Ingresos" fill="#8b5cf6" />
          <Bar dataKey="Gastos" fill="#f472b6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 