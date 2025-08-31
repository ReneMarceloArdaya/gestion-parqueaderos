"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { Plano } from "@/lib/Supabase/planos"

type PlanoListProps = {
  nivelId: number
}

export function PlanoList({ nivelId }: PlanoListProps) {
  const supabase = createClient()
  const [planos, setPlanos] = useState<Plano[]>([])

  const fetchPlanos = async () => {
    const { data, error } = await supabase
      .from("planos")
      .select("*")
      .eq("nivel_id", nivelId)
      .order("orden", { ascending: true })

    if (error) alert(error.message)
    else setPlanos(data as Plano[])
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este plano?")) return
    const { error } = await supabase.from("planos").delete().eq("id", id)
    if (error) alert(error.message)
    else fetchPlanos()
  }

  useEffect(() => {
    fetchPlanos()
  }, [nivelId])

  return (
    <table className="table-auto w-full mt-4 border">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>URL</th>
          <th>Principal</th>
          <th>Activo</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {planos.map(p => (
          <tr key={p.id}>
            <td>{p.nombre}</td>
            <td>{p.tipo}</td>
            <td>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 underline"
              >
                Ver
              </a>
            </td>
            <td>{p.principal ? "Sí" : "No"}</td>
            <td>{p.activo ? "Sí" : "No"}</td>
            <td>
              <button
                className="bg-red-500 text-white px-2 py-1 rounded"
                onClick={() => handleDelete(p.id)}
              >
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
