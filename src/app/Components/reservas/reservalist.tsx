"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { useRouter } from "next/navigation"

type Reserva = {
  id: number
  usuario_nombre: string
  parqueadero_nombre: string
  plaza_codigo: string
  hora_inicio: string
  hora_fin: string
  estado: "confirmada" | "cancelada" | "activa" | "completada" | "expirada"
}

export function ReservaList() {
  const supabase = createClient()
  const router = useRouter()

  const [reservas, setReservas] = useState<Reserva[]>([])
  const [estadoFiltro, setEstadoFiltro] = useState<
    "" | "pendiente" | "confirmada" | "cancelada" | "activa" | "completada" | "expirada"
  >("")

  const fetchReservas = async () => {
    let query = supabase
      .from("reservas")
      .select(
        `id, usuario:usuarios(nombre), parqueadero:parqueaderos(nombre), plaza:plazas(codigo), hora_inicio, hora_fin, estado`
      )
      .order("hora_inicio", { ascending: false })

    if (estadoFiltro) {
      const estadoDB = estadoFiltro === "pendiente" ? "activa" : estadoFiltro
      query = query.eq("estado", estadoDB)
    }

    const { data, error } = await query
    if (error) return alert(error.message)

    // Ajustamos nombres de usuario, parqueadero, plaza y concatenamos el horario
    const reservasMapeadas = data.map((r: any) => ({
      id: r.id,
      usuario_nombre: r.usuario?.nombre ?? "-",
      parqueadero_nombre: r.parqueadero?.nombre ?? "-",
      plaza_codigo: r.plaza?.codigo ?? "-",
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin,
      estado: r.estado
    }))

    setReservas(reservasMapeadas)
  }

  useEffect(() => {
    fetchReservas()
  }, [estadoFiltro])

  const handleCancelar = async (id: number) => {
    if (!confirm("¿Cancelar esta reserva?")) return
    const { error } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", id)
    if (error) return alert(error.message)
    fetchReservas()
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Reservas</h2>

      {/* Filtro por estado */}
      <select
        value={estadoFiltro}
        onChange={e =>
          setEstadoFiltro(
            e.target.value as
              | ""
              | "pendiente"
              | "confirmada"
              | "cancelada"
              | "activa"
              | "completada"
              | "expirada"
          )
        }
        className="border p-2 mb-4"
      >
        <option value="">-- Todos los estados --</option>
       
        <option value="confirmada">Confirmada</option>
        <option value="cancelada">Cancelada</option>
        <option value="activa">Activa</option>
        <option value="completada">Completada</option>
        <option value="expirada">Expirada</option>
      </select>

      <table className="table-auto w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Usuario</th>
            <th className="p-2 border">Parqueadero</th>
            <th className="p-2 border">Plaza</th>
            <th className="p-2 border">Horario</th>
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map(r => (
            <tr key={r.id}>
              <td className="p-2 border">{r.usuario_nombre}</td>
              <td className="p-2 border">{r.parqueadero_nombre}</td>
              <td className="p-2 border">{r.plaza_codigo}</td>
              <td className="p-2 border">
                {r.hora_inicio} - {r.hora_fin}
              </td>
              <td className="p-2 border">
                {r.estado === "activa" ? "Pendiente" : r.estado}
              </td>
              <td className="p-2 border">
                <button
                  onClick={() => router.push(`/admin/Reservas/${r.id}`)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  Ver/Editar
                </button>
                {r.estado !== "cancelada" && r.estado !== "completada" && (
                  <button
                    onClick={() => handleCancelar(r.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Cancelar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
