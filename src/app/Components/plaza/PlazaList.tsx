"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { Plaza } from "@/lib/Supabase/plaza"

type PlazaListProps = {
  nivelId?: number | null
}

// 👇 función auxiliar para formatear coordenadas
function formatCoordenada(coordenada: any): string {
  if (!coordenada) return "-"

  // Caso: viene como string tipo POINT(lng lat)
  if (typeof coordenada === "string") {
    return coordenada
  }

  // Caso: viene como objeto GeoJSON con coordinates
  if (typeof coordenada === "object" && coordenada.coordinates) {
    // GeoJSON Point -> [lng, lat]
    if (coordenada.type === "Point") {
      const [lng, lat] = coordenada.coordinates
      return `POINT(${lng} ${lat})`
    }

    // GeoJSON Polygon -> mostrar primer punto
    if (coordenada.type === "Polygon") {
      const [first] = coordenada.coordinates[0] || []
      if (first) return `POLYGON(${first[0]} ${first[1]})`
    }
  }

  return JSON.stringify(coordenada)
}

export function PlazaList({ nivelId }: PlazaListProps) {
  const supabase = createClient()
  const [plazas, setPlazas] = useState<Plaza[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPlazas = async () => {
    if (!nivelId) {
      setPlazas([])
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from("plazas")
      .select("*")
      .eq("nivel_id", nivelId)
      .order("codigo", { ascending: true })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      setPlazas(data || [])
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta plaza?")) return
    const { error } = await supabase.from("plazas").delete().eq("id", id)
    if (error) alert(error.message)
    else fetchPlazas()
  }

  useEffect(() => {
    fetchPlazas()
  }, [nivelId])

  if (!nivelId) return <p className="text-gray-500">Selecciona un nivel para ver las plazas.</p>

  return (
    <>
      {loading ? (
        <p>Cargando plazas...</p>
      ) : plazas.length === 0 ? (
        <p>No hay plazas para este nivel.</p>
      ) : (
        <table className="table-auto w-full border mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Código</th>
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Coordenada</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {plazas.map(p => (
              <tr key={p.id}>
                <td className="p-2 border">{p.codigo}</td>
                <td className="p-2 border">{p.tipo_vehiculo_id}</td>
                <td className="p-2 border">{p.estado}</td>
                <td className="p-2 border">{formatCoordenada(p.coordenada)}</td>
                <td className="p-2 border">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
