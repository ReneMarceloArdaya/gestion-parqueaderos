"use client"

import { useState } from "react"
import { TipoVehiculo, TipoVehiculoInsert } from "@/lib/Supabase/tiposVehiculo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  initialData?: TipoVehiculo
  onSubmit: (data: TipoVehiculoInsert) => Promise<void>
  onCancel: () => void
}

export function TipoVehiculoForm({ initialData, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<TipoVehiculoInsert>({
    codigo: initialData?.codigo || "",
    nombre: initialData?.nombre || "",
    descripcion: initialData?.descripcion || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <Input
        name="codigo"
        placeholder="Código"
        value={form.codigo}
        onChange={handleChange}
        required
      />
      <Input
        name="nombre"
        placeholder="Nombre"
        value={form.nombre}
        onChange={handleChange}
        required
      />
      <Input
        name="descripcion"
        placeholder="Descripción"
        value={form.descripcion || ""}
        onChange={handleChange}
      />

      <div className="flex gap-2">
        <Button type="submit">Guardar</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
