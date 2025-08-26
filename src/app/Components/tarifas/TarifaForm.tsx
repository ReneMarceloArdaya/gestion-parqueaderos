"use client"

import { useState } from "react"
import { TarifaInsert, Tarifa } from "@/lib/Supabase/tarifas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  initialData?: Tarifa
  parqueaderoId: number
  tiposVehiculo: { id: number; nombre: string }[]
  onSubmit: (data: TarifaInsert) => void
  onCancel: () => void
}

export function TarifaForm({ initialData, parqueaderoId, tiposVehiculo, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<TarifaInsert>({
    parqueadero_id: parqueaderoId,
    tipo_vehiculo_id: initialData?.tipo_vehiculo_id || tiposVehiculo[0]?.id,
    nombre: initialData?.nombre || "",
    tipo_tarifa: initialData?.tipo_tarifa || "por_hora",
    precio_por_hora: initialData?.precio_por_hora || null,
    precio_fijo: initialData?.precio_fijo || null,
    tramos: initialData?.tramos || null,
    valido_desde: initialData?.valido_desde || new Date().toISOString().split("T")[0],
    valido_hasta: initialData?.valido_hasta || null,
  })

  const handleChange = (key: keyof TarifaInsert, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(form)
      }}
      className="space-y-4 border p-4 rounded"
    >
      <div>
        <Label>Tipo de Vehículo</Label>
        <select
          value={form.tipo_vehiculo_id || ""}
          onChange={(e) => handleChange("tipo_vehiculo_id", Number(e.target.value))}
          className="w-full border rounded p-2"
        >
          {tiposVehiculo.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Nombre</Label>
        <Input value={form.nombre || ""} onChange={(e) => handleChange("nombre", e.target.value)} />
      </div>

      <div>
        <Label>Tipo de Tarifa</Label>
        <select
          value={form.tipo_tarifa || ""}
          onChange={(e) => handleChange("tipo_tarifa", e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="por_hora">Por hora</option>
          <option value="tarifa_fija">Tarifa fija</option>
          <option value="por_tramo">Por tramos</option>
        </select>
      </div>

      {form.tipo_tarifa === "por_hora" && (
        <div>
          <Label>Precio por hora</Label>
          <Input
            type="number"
            value={form.precio_por_hora || ""}
            onChange={(e) => handleChange("precio_por_hora", Number(e.target.value))}
          />
        </div>
      )}

      {form.tipo_tarifa === "tarifa_fija" && (
        <div>
          <Label>Precio fijo</Label>
          <Input
            type="number"
            value={form.precio_fijo || ""}
            onChange={(e) => handleChange("precio_fijo", Number(e.target.value))}
          />
        </div>
      )}

      {form.tipo_tarifa === "por_tramo" && (
        <div>
          <Label>Tramos (JSON)</Label>
          <textarea
            className="w-full border rounded p-2"
            rows={4}
            value={JSON.stringify(form.tramos || [], null, 2)}
            onChange={(e) => {
              try {
                const val = JSON.parse(e.target.value)
                handleChange("tramos", val)
              } catch {
                // no parsea todavía
              }
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Válido desde</Label>
          <Input
            type="date"
            value={form.valido_desde?.split("T")[0] || ""}
            onChange={(e) => handleChange("valido_desde", e.target.value)}
          />
        </div>
        <div>
          <Label>Válido hasta</Label>
          <Input
            type="date"
            value={form.valido_hasta?.split("T")[0] || ""}
            onChange={(e) => handleChange("valido_hasta", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  )
}
