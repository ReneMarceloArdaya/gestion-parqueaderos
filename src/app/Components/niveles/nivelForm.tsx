"use client"

import { useState, useEffect } from "react"
import { Nivel, NivelInsert } from "@/lib/Supabase/niveles"
import { SupabaseClient } from "@supabase/supabase-js"

type NivelFormProps = {
  supabase: SupabaseClient
  parqueaderoId: number
  onSave: () => void
  nivelToEdit?: Nivel
}

export function NivelForm({ supabase, parqueaderoId, onSave, nivelToEdit }: NivelFormProps) {
  const [nombre, setNombre] = useState("")
  const [orden, setOrden] = useState<number | null>(null)
  const [capacidad, setCapacidad] = useState<number | null>(null)
  const [geom, setGeom] = useState("")

  // cada vez que cambia nivelToEdit → llenar formulario
  useEffect(() => {
    if (nivelToEdit) {
      setNombre(nivelToEdit.nombre || "")
      setOrden(nivelToEdit.orden ?? null)
      setCapacidad(nivelToEdit.capacidad ?? null)
      setGeom(nivelToEdit.geom || "")
    } else {
      setNombre("")
      setOrden(null)
      setCapacidad(null)
      setGeom("")
    }
  }, [nivelToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nivelData: NivelInsert = {
      parqueadero_id: parqueaderoId,
      nombre: nombre || null,
      orden,
      capacidad,
      geom: geom || null,
    }

    try {
      if (nivelToEdit) {
        const { error } = await supabase.from("niveles").update(nivelData).eq("id", nivelToEdit.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("niveles").insert(nivelData)
        if (error) throw error
      }

      onSave()
      // limpiar formulario
      setNombre("")
      setOrden(null)
      setCapacidad(null)
      setGeom("")
    } catch (error: any) {
      alert(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded-md space-y-3">
      <input
        type="text"
        placeholder="Nombre"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className="border p-2 w-full"
        required
      />
      <input
        type="number"
        placeholder="Orden"
        value={orden ?? ""}
        onChange={e => setOrden(e.target.value ? Number(e.target.value) : null)}
        className="border p-2 w-full"
      />
      <input
        type="number"
        placeholder="Capacidad"
        value={capacidad ?? ""}
        onChange={e => setCapacidad(e.target.value ? Number(e.target.value) : null)}
        className="border p-2 w-full"
      />
      <input
        type="text"
        placeholder="Geom"
        value={geom}
        onChange={e => setGeom(e.target.value)}
        className="border p-2 w-full"
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        {nivelToEdit ? "Actualizar" : "Agregar"} Nivel
      </button>
    </form>
  )
}
