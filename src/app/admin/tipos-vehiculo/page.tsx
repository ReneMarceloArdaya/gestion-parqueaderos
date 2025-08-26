"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import {
  getTiposVehiculo,
  createTipoVehiculo,
  updateTipoVehiculo,
  deleteTipoVehiculo,
  TipoVehiculo,
  TipoVehiculoInsert,
} from "@/lib/Supabase/tiposVehiculo"
import { TipoVehiculoForm } from "../../Components/tiposVehiculo/TipoVehiculoForm"
import { TipoVehiculoList } from "../../Components/tiposVehiculo/TipoVehiculoList"
import { Button } from "@/components/ui/button"

export default function TiposVehiculoPage() {
  const supabase = createClient()
  const [tipos, setTipos] = useState<TipoVehiculo[]>([])
  const [editing, setEditing] = useState<TipoVehiculo | null>(null)
  const [showForm, setShowForm] = useState(false)

  
  const loadData = async () => {
  try {
    const data = await getTiposVehiculo(supabase)
    setTipos(data)
  } catch (err: any) {
    console.error("Error cargando tipos:", err.message)
  }
}


  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (data: TipoVehiculoInsert) => {
    if (editing) {
      await updateTipoVehiculo(editing.id, data, supabase)
    } else {
      await createTipoVehiculo(data, supabase)
    }
    setEditing(null)
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id: number) => {
    await deleteTipoVehiculo(id, supabase)
    loadData()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Tipos de Vehículo</h1>

      {showForm ? (
        <TipoVehiculoForm
          initialData={editing || undefined}
          onSubmit={handleCreate}
          onCancel={() => {
            setEditing(null)
            setShowForm(false)
          }}
        />
      ) : (
        <Button onClick={() => setShowForm(true)} className="mt-4">
          Nuevo Tipo de Vehículo
        </Button>
      )}

      <TipoVehiculoList data={tipos} onEdit={(t) => {
        setEditing(t)
        setShowForm(true)
      }} onDelete={handleDelete} />
    </div>
  )
}
