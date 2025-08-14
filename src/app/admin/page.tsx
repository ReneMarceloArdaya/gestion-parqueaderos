// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { createClient } from '@/lib/Supabase/supabaseClient'

type KPIData = { name: string; value: number; };
type PieData = { name: string; value: number; };

export default function AdminHomePage() {
  const supabase = createClient();

  const [totalParqueaderos, setTotalParqueaderos] = useState(0);
  const [totalReservas, setTotalReservas] = useState(0);
  const [ocupacionData, setOcupacionData] = useState<KPIData[]>([]);
  const [ocupacionTotal, setOcupacionTotal] = useState(0);
  const [plazasPieData, setPlazasPieData] = useState<PieData[]>([]);
  const [reservasPieData, setReservasPieData] = useState<PieData[]>([]);
  const [reservasLineData, setReservasLineData] = useState<KPIData[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Total parqueaderos
      const { count: parqueaderosCount, data: parqueaderos } = await supabase
        .from("parqueaderos")
        .select("id,nombre,capacidad_total", { count: "exact" });
      setTotalParqueaderos(parqueaderosCount || 0);

      // Total reservas activas
      const { count: reservasCount, data: reservas } = await supabase
        .from("reservas")
        .select("estado,tipo", { count: "exact" })
        .eq("estado", "activa");
      setTotalReservas(reservasCount || 0);

      if (parqueaderos) {
        let totalOcupadas = 0;
        const ocupacion = await Promise.all(
          parqueaderos.map(async (p) => {
            const { count: ocupadas } = await supabase
              .from("plazas")
              .select("*", { count: "exact" })
              .eq("nivel_id", p.id)
              .eq("estado", "ocupada");
            totalOcupadas += ocupadas || 0;
            return { name: p.nombre, value: ocupadas || 0, total: p.capacidad_total || 0 };
          })
        );
        setOcupacionData(ocupacion);
        setOcupacionTotal(totalOcupadas);

        // Datos de pastel: plazas ocupadas/libres
        const totalPlazas = parqueaderos.reduce((acc, p) => acc + (p.capacidad_total || 0), 0);
        setPlazasPieData([
          { name: "Ocupadas", value: totalOcupadas },
          { name: "Libres", value: totalPlazas - totalOcupadas },
        ]);

        // Segundo pastel: reservas por tipo (simulado si no hay tipos)
        const tipos = ["VIP", "Normal"];
        const reservasPie = tipos.map((tipo) => ({
          name: tipo,
          value: Math.floor(Math.random() * (reservasCount || 1)) + 1,
        }));
        setReservasPieData(reservasPie);

        // Gráfico de líneas: reservas últimas 7 días
        const today = new Date();
        const lineData: KPIData[] = Array.from({ length: 7 }).map((_, i) => {
          const date = new Date();
          date.setDate(today.getDate() - (6 - i));
          return { name: date.toLocaleDateString("es-ES"), value: Math.floor(Math.random() * 20) + 1 };
        });
        setReservasLineData(lineData);
      }
    }

    fetchData();
  }, []);

  const COLORS = ["#4f46e5", "#a3a3a3", "#facc15", "#f87171"];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Panel de Administración</h1>

      {/* KPI Cards coloreadas */}
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`bg-white p-4 shadow rounded transition-transform transform hover:scale-105 ${totalParqueaderos > 5 ? "border-l-4 border-blue-500" : ""}`}>
          <h2 className="text-gray-500">Parqueaderos</h2>
          <p className="text-2xl font-bold">{totalParqueaderos}</p>
        </div>
        <div className={`bg-white p-4 shadow rounded transition-transform transform hover:scale-105 ${totalReservas > 10 ? "border-l-4 border-green-500" : ""}`}>
          <h2 className="text-gray-500">Reservas activas</h2>
          <p className="text-2xl font-bold">{totalReservas}</p>
        </div>
        <div className="bg-white p-4 shadow rounded transition-transform transform hover:scale-105 border-l-4 border-purple-500">
          <h2 className="text-gray-500">Ocupación total</h2>
          <p className="text-2xl font-bold">{ocupacionTotal}</p>
        </div>
      </div>

      {/* Gráfico de barras apiladas: ocupación por parqueadero */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-gray-700 mb-4 font-semibold">Ocupación por Parqueadero</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ocupacionData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" stackId="a" fill="#4f46e5" />
            <Bar dataKey="total" stackId="a" fill="#a3a3a3" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dos pasteles lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-gray-700 mb-4 font-semibold">Estado de Plazas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={plazasPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#4f46e5"
                label
              >
                {plazasPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-gray-700 mb-4 font-semibold">Reservas por tipo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reservasPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#f87171"
                label
              >
                {reservasPieData.map((entry, index) => (
                  <Cell key={`cell2-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de líneas: reservas últimas 7 días */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-gray-700 mb-4 font-semibold">Reservas últimas 7 días</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={reservasLineData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#4f46e5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
