"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { Nivel } from "@/lib/Supabase/niveles"
import { NivelForm } from "./nivelForm"
import { useRouter } from "next/navigation"

type NivelListProps = {
 
  parqueaderoId: number
}

export function NivelList({parqueaderoId }: NivelListProps) {
  const supabase = createClient()
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [editingNivel, setEditingNivel] = useState<Nivel | null>(null)
  const router = useRouter()

  const fetchNiveles = async () => {
    const { data, error } = await supabase
      .from("niveles")
      .select("*")
      .eq("parqueadero_id", parqueaderoId)
      .order("orden", { ascending: true })

    if (error) alert(error.message)
    else setNiveles(data as Nivel[])
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este nivel?")) return
    const { error } = await supabase.from("niveles").delete().eq("id", id)
    if (error) alert(error.message)
    else fetchNiveles()
  }

  useEffect(() => {
    fetchNiveles()
  }, [parqueaderoId])

  return (
    <div>
      <NivelForm
        supabase={supabase}
        parqueaderoId={parqueaderoId}
        onSave={() => {
          fetchNiveles()
          setEditingNivel(null) // 👈 limpiar edición
        }}
        nivelToEdit={editingNivel || undefined}
      />

     <table className="min-w-full divide-y divide-gray-200 shadow rounded-lg overflow-hidden mt-4">
  <thead className="bg-gray-100">
    <tr>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Orden</th>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Capacidad</th>
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Geom</th>
      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200 bg-white">
    {niveles.map(n => (
      <tr key={n.id} className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-2 text-sm text-gray-900">{n.nombre}</td>
        <td className="px-4 py-2 text-sm text-gray-600">{n.orden}</td>
        <td className="px-4 py-2 text-sm text-gray-600">{n.capacidad}</td>
        <td className="px-4 py-2 text-sm text-gray-600">{n.geom}</td>
        <td className="px-4 py-2 text-sm text-center space-x-2">
          <button
            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg shadow-sm transition"
            onClick={() => setEditingNivel(n)}
          >
            Editar
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg shadow-sm transition"
            onClick={() => handleDelete(n.id)}
          >
            Eliminar
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg shadow-sm transition"
            onClick={() => router.push(`/admin/parqueadores/${parqueaderoId}/niveles/${n.id}/plaza`)}
          >
            Agregar plaza
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

    </div>
  )
}
