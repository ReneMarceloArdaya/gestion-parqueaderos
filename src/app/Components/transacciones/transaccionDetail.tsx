"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/Supabase/supabaseClient";
import type { Database } from "@/lib/Supabase/database.type"; // <<— aquí importas tu tipo

type Transaccion = Database["public"]["Tables"]["transacciones"]["Row"];

export default function TransaccionDetail({ id }: { id: number }) {
  const supabase = createClient();
  const [transaccion, setTransaccion] = useState<Transaccion | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("transacciones")
        .select(`*, reservas(*), usuarios(*)`)
        .eq("id", id)
        .single();

      setTransaccion(data);
    }
    fetchData();
  }, [id]);

  if (!transaccion) return <p>Cargando...</p>;

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-2">Detalle Transacción</h2>
      <p><strong>Reserva:</strong> {transaccion.reserva_id}</p>
      <p><strong>Usuario:</strong> {transaccion.usuario_id}</p>
      <p><strong>Importe:</strong> {transaccion.importe} {transaccion.moneda}</p>
      <p><strong>Estado:</strong> {transaccion.estado}</p>
      <p><strong>Proveedor:</strong> {transaccion.proveedor_pago}</p>
      <p><strong>Referencia:</strong> {transaccion.referencia}</p>
      <p><strong>Fecha:</strong> {new Date(transaccion.creado_at).toLocaleString()}</p>
    </div>
  );
}
