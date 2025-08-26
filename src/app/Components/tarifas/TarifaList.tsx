"use client"

import { Tarifa } from "@/lib/Supabase/tarifas"
import { Button } from "@/components/ui/button"

interface Props {
  data: (Tarifa & { tipos_vehiculo: { nombre: string } })[]
  onEdit: (t: Tarifa) => void
  onDelete: (id: number) => void
}

export function TarifaList({ data, onEdit, onDelete }: Props) {
  return (
    <div className="mt-6">
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Tipo Vehículo</th>
            <th className="p-2 border">Nombre</th>
            <th className="p-2 border">Tipo Tarifa</th>
            <th className="p-2 border">Precio</th>
            <th className="p-2 border">Validez</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={t.id} className="text-center">
              <td className="p-2 border">{t.tipos_vehiculo?.nombre}</td>
              <td className="p-2 border">{t.nombre}</td>
              <td className="p-2 border">{t.tipo_tarifa}</td>
              <td className="p-2 border">
                {t.tipo_tarifa === "por_hora" && `${t.precio_por_hora}/hora`}
                {t.tipo_tarifa === "tarifa_fija" && `${t.precio_fijo}`}
                {t.tipo_tarifa === "por_tramo" && (
                  <pre className="text-xs text-left">{JSON.stringify(t.tramos, null, 2)}</pre>
                )}
              </td>
              <td className="p-2 border">
                {t.valido_desde} → {t.valido_hasta || "Indefinido"}
              </td>
              <td className="p-2 border space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(t)}>
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(t.id)}>
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
