"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/Supabase/supabaseClient";

type Reserva = {
  id: number;
  usuario_nombre: string;
  parqueadero_nombre: string;
  plaza_codigo: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "confirmada" | "cancelada" | "activa" | "completada" | "expirada";
};

export default function EditReservaPage() {
  const supabase = createClient();
  const router = useRouter();
  const { id } = useParams(); // id de la reserva en la URL

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [estado, setEstado] = useState<Reserva["estado"]>("activa");
  const [loading, setLoading] = useState(true);

  // Cargar la reserva
  useEffect(() => {
    const fetchReserva = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select(`
          id,
          hora_inicio,
          hora_fin,
          estado,
          usuarios (nombre),
          parqueaderos (nombre),
          plazas (codigo)
        `)
        .eq("id", Number(id))
        .single();

      if (error || !data) {
        alert("Error al cargar la reserva: " + (error?.message ?? "No encontrada"));
        router.push("/admin/reservas");
        return;
      }

      setReserva({
        id: data.id,
        usuario_nombre: data.usuarios?.nombre ?? "",
        parqueadero_nombre: data.parqueaderos?.nombre ?? "",
        plaza_codigo: data.plazas?.codigo ?? "",
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        estado: data.estado,
      });

      setHoraInicio(data.hora_inicio);
      setHoraFin(data.hora_fin);
      setEstado(data.estado);
      setLoading(false);
    };

    fetchReserva();
  }, [id, router, supabase]);

const handleGuardar = async () => {
  if (!reserva) return;

  // Actualizar reserva
  const { error: errorReserva } = await supabase
    .from("reservas")
    .update({
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      estado,
    })
    .eq("id", reserva.id);

  if (errorReserva) {
    alert("Error al actualizar la reserva: " + errorReserva.message);
    return;
  }

  // Determinar estado de la transacción según la reserva
  let estadoTransaccion: "pendiente" | "confirmado" | "fallido" = "pendiente";
  if (estado === "confirmada") estadoTransaccion = "confirmado";
  if (estado === "cancelada") estadoTransaccion = "fallido";

  // Actualizar transacciones asociadas a esta reserva
  const { error: errorTransaccion } = await supabase
    .from("transacciones")
    .update({ estado: estadoTransaccion })
    .eq("reserva_id", reserva.id);

  if (errorTransaccion) {
    alert(
      "Reserva actualizada, pero hubo un error al actualizar la transacción: " +
        errorTransaccion.message
    );
    return;
  }

  alert("Reserva y transacción actualizadas correctamente");
  router.push("/admin/Reservas");
};




  if (loading) return <p>Cargando reserva...</p>;

  return (
    <div className="p-6 border rounded shadow-md max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Editar Reserva</h1>

      <p><strong>Usuario:</strong> {reserva?.usuario_nombre}</p>
      <p><strong>Parqueadero:</strong> {reserva?.parqueadero_nombre}</p>
      <p><strong>Plaza:</strong> {reserva?.plaza_codigo}</p>

      <label className="block mt-4">
        Hora inicio:
        <input
          type="datetime-local"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          className="border p-2 w-full rounded mt-1"
        />
      </label>

      <label className="block mt-4">
        Hora fin:
        <input
          type="datetime-local"
          value={horaFin}
          onChange={(e) => setHoraFin(e.target.value)}
          className="border p-2 w-full rounded mt-1"
        />
      </label>

      <label className="block mt-4">
        Estado:
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as Reserva["estado"])}
          className="border p-2 w-full rounded mt-1"
        >
          <option value="activa">Activa</option>
          <option value="confirmada">Confirmada</option>
          <option value="cancelada">Cancelada</option>
          <option value="completada">Completada</option>
          <option value="expirada">Expirada</option>
        </select>
      </label>

      <button
        onClick={handleGuardar}
        className="mt-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Guardar Cambios
      </button>
    </div>
  );
}
