"use client"

import { useState } from "react"
import { TipoVehiculo } from "@/lib/Supabase/tiposVehiculo"
import { Button } from "@/components/ui/button"

type Props = {
  data: TipoVehiculo[]
  onEdit: (tipo: TipoVehiculo) => void
  onDelete: (id: number) => Promise<void>
}

export function TipoVehiculoList({ data, onEdit, onDelete }: Props) {
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este tipo de vehículo?")) return
    setLoadingId(id)
    await onDelete(id)
    setLoadingId(null)
  }

  return (
    <table className="w-full border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border">ID</th>
          <th className="p-2 border">Código</th>
          <th className="p-2 border">Nombre</th>
          <th className="p-2 border">Descripción</th>
          <th className="p-2 border">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {data.map((tipo) => (
          <tr key={tipo.id} className="hover:bg-gray-50">
            <td className="p-2 border">{tipo.id}</td>
            <td className="p-2 border">{tipo.codigo}</td>
            <td className="p-2 border">{tipo.nombre}</td>
            <td className="p-2 border">{tipo.descripcion}</td>
            <td className="p-2 border flex gap-2">
              <Button size="sm" onClick={() => onEdit(tipo)}>Editar</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(tipo.id)}
                disabled={loadingId === tipo.id}
              >
                {loadingId === tipo.id ? "Eliminando..." : "Eliminar"}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
