"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/Supabase/supabaseClient"
import {
  getTarifasByParqueadero,
  createTarifa,
  updateTarifa,
  deleteTarifa,
  Tarifa,
  TarifaInsert,
} from "@/lib/Supabase/tarifas"
import { getTiposVehiculo, TipoVehiculo } from "@/lib/Supabase/tiposVehiculo"
import { TarifaForm } from "../../../../Components/tarifas/TarifaForm"
import { TarifaList } from "../../../../Components/tarifas/TarifaList"
import { Button } from "@/components/ui/button"

export default function TarifasPage() {
  const supabase = createClient()
  const params = useParams()
  const parqueaderoId = Number(params.id)

  const [tarifas, setTarifas] = useState<(Tarifa & { tipos_vehiculo: { nombre: string } })[]>([])
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([])
  const [editing, setEditing] = useState<Tarifa | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Carga inicial
  const loadData = async () => {
    try {
      const tipos = await getTiposVehiculo(supabase)
      setTiposVehiculo(tipos)
      const data = await getTarifasByParqueadero(supabase, parqueaderoId)
      setTarifas(data)
    } catch (error) {
      console.error("Error cargando datos:", error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Crear o editar
  const handleSubmit = async (data: TarifaInsert) => {
    try {
      if (editing) {
        await updateTarifa(supabase, editing.id, data)
      } else {
        await createTarifa(supabase, data)
      }
      setEditing(null)
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error("Error guardando tarifa:", error)
    }
  }

  // Eliminar
  const handleDelete = async (id: number) => {
    if (!confirm("¿Deseas eliminar esta tarifa?")) return
    try {
      await deleteTarifa(supabase, id)
      loadData()
    } catch (error) {
      console.error("Error eliminando tarifa:", error)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tarifas del Parqueadero {parqueaderoId}</h1>

      {showForm ? (
        <TarifaForm
          initialData={editing || undefined}
          parqueaderoId={parqueaderoId}
          tiposVehiculo={tiposVehiculo}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null)
            setShowForm(false)
          }}
        />
      ) : (
        <Button onClick={() => setShowForm(true)} className="mb-4">
          Nueva Tarifa
        </Button>
      )}

      <TarifaList
        data={tarifas}
        onEdit={(t) => {
          setEditing(t)
          setShowForm(true)
        }}
        onDelete={handleDelete}
      />
    </div>
  )
}
