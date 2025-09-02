// app/admin/page.tsx
"use client";

import { useEffect, useState,useRef } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { createClient } from '@/lib/Supabase/supabaseClient'
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import autoTable from "jspdf-autotable";


type KPIData = { name: string; value: number };
type PieData = { name: string; value: number };
type OcupacionData = { name: string; ocupadas: number; libres: number };

export default function AdminHomePage() {
  const supabase = createClient();
const dashboardRef = useRef<HTMLDivElement>(null);

  const [totalParqueaderos, setTotalParqueaderos] = useState(0);
  const [totalReservas, setTotalReservas] = useState(0);
  const [ocupacionData, setOcupacionData] = useState<OcupacionData[]>([]);
  const [ocupacionTotal, setOcupacionTotal] = useState(0);
  const [plazasPieData, setPlazasPieData] = useState<PieData[]>([]);
  const [reservasPieData, setReservasPieData] = useState<PieData[]>([]);
  const [reservasLineData, setReservasLineData] = useState<KPIData[]>([]);
  const [recaudacionTotal, setRecaudacionTotal] = useState(0);
  const [recaudacionPorParqueadero, setRecaudacionPorParqueadero] = useState<KPIData[]>([]);
  useEffect(() => {
    async function fetchData() {
      // ---------- Total parqueaderos ----------
      const { count: parqueaderosCount, data: parqueaderos } = await supabase
        .from("parqueaderos")
        .select("id,nombre,capacidad_total", { count: "exact" });
      setTotalParqueaderos(parqueaderosCount || 0);

      // ---------- Total reservas activas ----------
      const { count: reservasCount, data: reservas } = await supabase
        .from("reservas")
        .select("tipo_vehiculo_id", { count: "exact" })
        .eq("estado", "activa");
      setTotalReservas(reservasCount || 0);

      if (!parqueaderos) return;

      // ---------- Ocupación por parqueadero ----------
      let totalOcupadas = 0;
const ocupacion: OcupacionData[] = await Promise.all(
  parqueaderos.map(async (p) => {
    // Contamos plazas ocupadas directamente
    const { count: ocupadasDirectas } = await supabase
      .from("plazas")
      .select("*", { count: "exact" })
      .eq("parqueadero_id", p.id)
      .eq("estado", "ocupada");

    // Contamos plazas que tengan reservas activas o confirmadas
    const { count: reservasActivas } = await supabase
      .from("reservas")
      .select("id", { count: "exact" })
      .eq("parqueadero_id", p.id)
      .in("estado", ["activa", "confirmada"]);

    // Evitamos contar doble si la plaza ya está ocupada y tiene reserva
    const ocupadasNum = Math.max(ocupadasDirectas || 0, reservasActivas || 0);
    totalOcupadas += ocupadasNum;

    return {
      name: p.nombre || `Parqueadero ${p.id}`,
      ocupadas: ocupadasNum,
      libres: (p.capacidad_total || 0) - ocupadasNum,
    };
  })
);

setOcupacionData(ocupacion);
setOcupacionTotal(totalOcupadas);






// ---------- Recaudación por parqueadero ----------
let totalRecaudacion = 0;
const recaudacionParqueaderos: KPIData[] = await Promise.all(
  (parqueaderos || []).map(async (p) => {
    const { data: pagos, error } = await supabase
      .from("transacciones")
      .select("importe, estado, reserva_id, reservas!inner(parqueadero_id)") // join con reservas
      .eq("reservas.parqueadero_id", p.id)
      .eq("estado", "confirmado"); // solo pagos confirmados

    if (error) {
      console.error(error);
      return { name: p.nombre, value: 0 };
    }

    // Filtramos solo importes positivos antes de sumar
    const total = (pagos || [])
      .filter(t => (t.importe || 0) > 0)
      .reduce((acc, t) => acc + (t.importe || 0), 0);

    totalRecaudacion += total;

    return {
      name: p.nombre || `Parqueadero ${p.id}`,
      value: total,
    };
  })
);

setRecaudacionTotal(totalRecaudacion);
setRecaudacionPorParqueadero(recaudacionParqueaderos);



      // ---------- Pastel plazas ocupadas/libres ----------
      const totalPlazas = parqueaderos.reduce((acc, p) => acc + (p.capacidad_total || 0), 0);
      setPlazasPieData([
        { name: "Ocupadas", value: totalOcupadas },
        { name: "Libres", value: totalPlazas - totalOcupadas },
      ]);

      // ---------- Pastel reservas por tipo (contar manualmente) ----------
      const tiposMap: Record<number, number> = {};
      (reservas || []).forEach(r => {
        if (r.tipo_vehiculo_id) tiposMap[r.tipo_vehiculo_id] = (tiposMap[r.tipo_vehiculo_id] || 0) + 1;
      });

      const reservasPie: PieData[] = await Promise.all(
        Object.entries(tiposMap).map(async ([tipoId, count]) => {
          const { data: tipo } = await supabase
            .from("tipos_vehiculo")
            .select("nombre")
            .eq("id", Number(tipoId))
            .single();
          return { name: tipo?.nombre || "Desconocido", value: count };
        })
      );
      setReservasPieData(reservasPie);

      // ---------- Línea reservas últimas 7 días ----------
      const today = new Date();
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - (6 - i));
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
      });

      const lineData: KPIData[] = await Promise.all(
        last7Days.map(async (day) => {
          const { count } = await supabase
            .from("reservas")
            .select("*", { count: "exact" })
            .gte("hora_inicio", `${day}T00:00:00`)
            .lte("hora_inicio", `${day}T23:59:59`);

          return { name: new Date(day).toLocaleDateString("es-ES"), value: count || 0 };
        })
      );
      setReservasLineData(lineData);
    }

    fetchData();
  }, []);

  const COLORS = ["#4f46e5", "#a3a3a3", "#facc15", "#f87171"];
// ---------------- Helper para convertir SVG a PNG ----------------
async function svgToPng(svgElement: SVGElement): Promise<string> {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = url;
  });
}

// ---------------- Generar PDF ----------------
const generarPDF = async () => {
  const doc = new jsPDF("p", "mm", "a4");

  // ---------------- Título ----------------
  doc.setTextColor(0, 0, 0);        // negro
  doc.setFillColor(242, 242, 242);  // gris claro

  doc.setFontSize(18);
  doc.text("Reporte de Parqueos - Urban Park", 105, 15, { align: "center" });

  doc.setFontSize(12);
  doc.text(new Date().toLocaleString("es-ES"), 105, 25, { align: "center" });

  // ---------------- Ocupación por parqueo ----------------
  autoTable(doc, {
    startY: 35,
    head: [["Parqueadero", "Ocupadas", "Libres"]],
    body: ocupacionData.map(o => [o.name, o.ocupadas, o.libres]),
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, halign: "center" },
    bodyStyles: { halign: "center" },
  });

  // ---------------- Recaudación por parqueo ----------------
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [["Parqueadero", "Recaudación"]],
    body: recaudacionPorParqueadero.map(r => [r.name, `$${r.value}`]),
    theme: "grid",
    headStyles: { fillColor: [250, 204, 21], textColor: 0, halign: "center" },
    bodyStyles: { halign: "center" },
  });

  // ---------------- Insertar gráficos filtrados ----------------
  // Solo tomamos los gráficos que tengan data-show="true"
  const charts = document.querySelectorAll<SVGElement>(".recharts-wrapper svg[data-show='true']");
  let y = (doc as any).lastAutoTable.finalY + 20;

  for (let i = 0; i < charts.length; i++) {
    const chartSvg = charts[i];
    if (!chartSvg) continue;

    const imgData = await svgToPng(chartSvg);
    const imgWidth = 180;
    const imgHeight = (chartSvg.clientHeight * imgWidth) / chartSvg.clientWidth;

    if (y + imgHeight > 280) {
      doc.addPage();
      y = 20;
    }

    doc.addImage(imgData, "PNG", 15, y, imgWidth, imgHeight);
    y += imgHeight + 15;
  }

  // Descargar
  doc.save("reporte_parqueaderos.pdf");
};


  // ---------------- Generar Excel ----------------
  const generarExcel = () => {
    if (!ocupacionData.length || !reservasLineData.length) return;

    const wsData = [
      ["Parqueo", "Ocupadas", "Libres"],
      ...ocupacionData.map(o => [o.name, o.ocupadas, o.libres]),
      [],
      ["Reservas últimas 7 días", "Cantidad"],
      ...reservasLineData.map(r => [r.name, r.value]),
      [],
      ["Recaudación por Parqueos", "Monto"],
      ...recaudacionPorParqueadero.map(r => [r.name, r.value])

    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "ReporteUrbanPark");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "dashboard.xlsx");
  };
  return (
    <div className="p-6 space-y-6" ref={dashboardRef}>
      <h1 className="text-3xl font-bold">Panel de Administración</h1>
        {/* Botones de exportación */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={generarPDF}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Exportar PDF
        </button>
        <button
          onClick={generarExcel}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Exportar Excel
        </button>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-gray-500">Parqueaderos</h2>
          <p className="text-2xl font-bold">{totalParqueaderos}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-gray-500">Reservas activas</h2>
          <p className="text-2xl font-bold">{totalReservas}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-gray-500">Ocupación total</h2>
          <p className="text-2xl font-bold">{ocupacionTotal}</p>
        </div>
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-gray-500">Recaudación total</h2>
        <p className="text-2xl font-bold">${recaudacionTotal}</p>
    </div>    

      </div>

      {/* Gráfico barras ocupación por parqueadero */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-gray-700 mb-4 font-semibold">Ocupación por Parqueadero</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ocupacionData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="ocupadas" stackId="a" fill="#4f46e5" />
            <Bar dataKey="libres" stackId="a" fill="#a3a3a3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-gray-700 mb-4 font-semibold">Recaudación por Parqueadero</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recaudacionPorParqueadero}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Bar dataKey="value" fill="#facc15" />
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

      {/* Gráfico líneas reservas últimas 7 días */}
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
