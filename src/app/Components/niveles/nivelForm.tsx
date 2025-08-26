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
  const [nombre, setNombre] = useState(nivelToEdit?.nombre || "")
  const [orden, setOrden] = useState(nivelToEdit?.orden || 0)
  const [capacidad, setCapacidad] = useState(nivelToEdit?.capacidad || 0)
  const [geom, setGeom] = useState(nivelToEdit?.geom || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nivelData: NivelInsert = {
      parqueadero_id: parqueaderoId,
      nombre,
      orden,
      capacidad,
      geom,
    }

    try {
      if (nivelToEdit) {
        await supabase.from("niveles").update(nivelData).eq("id", nivelToEdit.id)
      } else {
        await supabase.from("niveles").insert(nivelData)
      }
      onSave()
      setNombre(""); setOrden(0); setCapacidad(0); setGeom("")
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
        value={orden}
        onChange={e => setOrden(Number(e.target.value))}
        className="border p-2 w-full"
      />
      <input
        type="number"
        placeholder="Capacidad"
        value={capacidad}
        onChange={e => setCapacidad(Number(e.target.value))}
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
