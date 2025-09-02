"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/Supabase/supabaseClient";
import type { Database } from "@/lib/Supabase/database.type";
import TransaccionDetail from "./transaccionDetail";

type Transaccion = Database["public"]["Tables"]["transacciones"]["Row"];

export default function TransaccionList( {onSelect }: { onSelect: (id: number) => void }) {
  const supabase = createClient();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<"" | "pendiente" | "confirmado" | "fallido" | "reembolsado">("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Fetch transacciones con filtro
useEffect(() => {
  async function fetchData() {
    try {
      let query = supabase
        .from("transacciones")
        .select("*, usuarios(*)")
        .order("creado_at", { ascending: false });

      // Filtro por estado si aplica
      if (estadoFiltro) query = query.eq("estado", estadoFiltro);

      const { data, error } = await query;

      if (error) {
        console.error("Error al cargar transacciones:", error.message);
        return;
      }

      // Filtrar importes mayores a 0 en el frontend
      const transaccionesFiltradas = (data || []).filter(
        (t) => t.importe !== null && t.importe > 0
      );

      setTransacciones(transaccionesFiltradas);
    } catch (err) {
      console.error("Error inesperado:", err);
    }
  }

  fetchData();
}, [estadoFiltro]);


  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Transacciones</h2>

      {/* Filtro por estado */}
      <div className="mb-4">
        <label className="mr-2 font-semibold">Filtrar por estado:</label>
        <select
          value={estadoFiltro}
          onChange={e => setEstadoFiltro(e.target.value as any)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmado">Confirmado</option>
          <option value="fallido">Fallido</option>
          <option value="reembolsado">Reembolsado</option>
        </select>
      </div>

      {/* Tabla de transacciones */}
   <table className="w-full border-collapse">
  <thead>
    <tr className="bg-gray-100">
      <th className="border px-2 py-1">#</th>
      <th className="border px-2 py-1">Usuario</th>
      <th className="border px-2 py-1">Importe</th>
      <th className="border px-2 py-1">Estado</th>
      <th className="border px-2 py-1">Fecha</th>
      <th className="border px-2 py-1">Acción</th>
    </tr>
  </thead>
  <tbody>
    {transacciones.map((t, index) => (
      <tr key={t.id} className="hover:bg-gray-50">
        {/* Contador en lugar de ID */}
        <td className="border px-2 py-1">{index + 1}</td>
        <td className="border px-2 py-1">{t.usuario_id}</td>
        <td className="border px-2 py-1">{t.importe} {t.moneda}</td>
        <td className="border px-2 py-1">{t.estado}</td>
        <td className="border px-2 py-1">{new Date(t.creado_at).toLocaleString()}</td>
        <td className="border px-2 py-1">
          <button
            className="text-blue-500 hover:underline"
            onClick={() => setSelectedId(t.id)}
          >
            Ver detalle
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>


      {/* Modal o sección detalle */}
      {selectedId && (
        <div className="mt-4">
          <button className="mb-2 text-red-500" onClick={() => setSelectedId(null)}>Cerrar detalle</button>
          <TransaccionDetail id={selectedId} />
        </div>
      )}
    </div>
  );
}
