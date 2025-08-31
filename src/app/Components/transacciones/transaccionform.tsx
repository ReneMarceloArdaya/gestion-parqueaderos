"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/Supabase/supabaseClient";
import type { Database } from "@/lib/Supabase/database.type";

type Reserva = Database["public"]["Tables"]["reservas"]["Row"];
type Usuario = Database["public"]["Tables"]["usuarios"]["Row"];

export default function TransaccionForm() {
  const supabase = createClient();

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [reservaId, setReservaId] = useState<number | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [importe, setImporte] = useState<number>(0);
  const [moneda, setMoneda] = useState("USD");
  const [estado, setEstado] = useState<"pendiente" | "confirmado" | "fallido" | "reembolsado">("pendiente");
  const [mensaje, setMensaje] = useState("");

  // Cargar reservas y usuarios
  useEffect(() => {
    async function fetchData() {
      const { data: reservasData } = await supabase.from("reservas").select("*");
      const { data: usuariosData } = await supabase.from("usuarios").select("*");
      setReservas(reservasData || []);
      setUsuarios(usuariosData || []);
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservaId || !usuarioId) {
      setMensaje("Selecciona reserva y usuario");
      return;
    }

    const { data, error } = await supabase.from("transacciones").insert({
      reserva_id: reservaId,
      usuario_id: usuarioId,
      importe,
      moneda,
      estado,
      creado_at: new Date().toISOString(),
    });

    if (error) {
      setMensaje("Error: " + error.message);
    } else {
      setMensaje("Transacción creada correctamente");
      setReservaId(null);
      setUsuarioId(null);
      setImporte(0);
      setEstado("pendiente");
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Crear Transacción</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label>
          Reserva:
          <select value={reservaId || ""} onChange={e => setReservaId(Number(e.target.value))} className="border px-2 py-1 rounded w-full">
            <option value="">Selecciona reserva</option>
            {reservas.map(r => (
              <option key={r.id} value={r.id}>
                {r.id} - {r.codigo_reserva || r.id}
              </option>
            ))}
          </select>
        </label>

        <label>
          Usuario:
          <select value={usuarioId || ""} onChange={e => setUsuarioId(e.target.value)} className="border px-2 py-1 rounded w-full">
            <option value="">Selecciona usuario</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nombre || u.id}
              </option>
            ))}
          </select>
        </label>

        <label>
          Importe:
          <input type="number" value={importe} onChange={e => setImporte(Number(e.target.value))} className="border px-2 py-1 rounded w-full" />
        </label>

        <label>
          Moneda:
          <input type="text" value={moneda} onChange={e => setMoneda(e.target.value)} className="border px-2 py-1 rounded w-full" />
        </label>

        <label>
          Estado:
          <select value={estado} onChange={e => setEstado(e.target.value as any)} className="border px-2 py-1 rounded w-full">
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="fallido">Fallido</option>
            <option value="reembolsado">Reembolsado</option>
          </select>
        </label>

        <button type="submit" className="bg-blue-500 text-white px-3 py-2 rounded">
          Crear transacción
        </button>
      </form>
      {mensaje && <p className="mt-2 text-sm">{mensaje}</p>}
    </div>
  );
}
