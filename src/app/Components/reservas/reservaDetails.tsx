"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/Supabase/supabaseClient"

type ReservaDetailProps = {
  reservaId: number
}

type ReservaConRelaciones = {
  id: number
  usuario: { nombre: string | null } | null
  parqueadero: { nombre: string | null } | null
  plaza: { codigo: string | null } | null
  hora_inicio: string
  hora_fin: string
  estado: "activa" | "confirmada" | "completada" | "cancelada" | "expirada"
}

export function ReservaDetail({ reservaId }: ReservaDetailProps) {
  const supabase = createClient()
  const router = useRouter()

  const [usuario, setUsuario] = useState("")
  const [parqueadero, setParqueadero] = useState("")
  const [plaza, setPlaza] = useState("")
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFin, setHoraFin] = useState("")
  const [estado, setEstado] = useState<ReservaConRelaciones["estado"]>("activa")

  useEffect(() => {
    const fetchReserva = async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select(
          `id,
           usuario:usuarios(nombre),
           parqueadero:parqueaderos(nombre),
           plaza:plazas(codigo),
           hora_inicio,
           hora_fin,
           estado`
        )
        .eq("id", reservaId)
        .single()

      if (error) {
        alert(error.message)
        return
      }

      if (data) {
        // 👇 conversion segura con unknown
        const d = data as unknown as ReservaConRelaciones

        setUsuario(d.usuario?.nombre || "-")
        setParqueadero(d.parqueadero?.nombre || "-")
        setPlaza(d.plaza?.codigo || "-")
        setHoraInicio(d.hora_inicio)
        setHoraFin(d.hora_fin)
        setEstado(d.estado)
      }
    }

    fetchReserva()
  }, [reservaId])

  const handleCancelar = async () => {
    const { error } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", reservaId)

    if (error) alert(error.message)
    else {
      alert("Reserva cancelada")
      router.push("/admin/Reservas")
    }
  }

  return (
    <div className="border p-4 rounded-md shadow-md mb-4">
      <h2 className="text-xl font-bold mb-4">Detalle de la Reserva</h2>
      <p><strong>Usuario:</strong> {usuario}</p>
      <p><strong>Parqueadero:</strong> {parqueadero}</p>
      <p><strong>Plaza:</strong> {plaza}</p>
      <p><strong>Hora inicio:</strong> {horaInicio}</p>
      <p><strong>Hora fin:</strong> {horaFin}</p>
      <p><strong>Estado:</strong> {estado}</p>

      {estado !== "cancelada" && (
        <button
          onClick={handleCancelar}
          className="bg-red-500 text-white px-3 py-1 rounded mt-2"
        >
          Cancelar Reserva
        </button>
      )}
    </div>
  )
}
