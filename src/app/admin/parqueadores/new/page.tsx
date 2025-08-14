'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createParqueadero, updateParqueadero } from '@/lib/Supabase/parqueadores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/Supabase/supabaseClient'

interface ParqueaderoFormProps {
  initialData?: {
    id?: number
    nombre?: string
    descripcion?: string
    tipo?: 'publico' | 'privado'
    capacidad_total?: number
    activo?: boolean
    lat?: number
    lng?: number
  }
}

export default function ParqueaderoForm({ initialData }: ParqueaderoFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState(initialData?.nombre || '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '')
  const [tipo, setTipo] = useState<'publico' | 'privado' | ''>(initialData?.tipo || '')
  const [capacidadTotal, setCapacidadTotal] = useState<number>(initialData?.capacidad_total || 0)
  const [activo, setActivo] = useState(initialData?.activo ?? true)
  const [lat, setLat] = useState<number>(initialData?.lat || 0)
  const [lng, setLng] = useState<number>(initialData?.lng || 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!tipo) {
      setError('Debes seleccionar un tipo')
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Coordenadas inválidas')
      return
    }

    setLoading(true)
    try {
      const geomValue = `POINT(${lng} ${lat})`

      if (initialData?.id) {
        // Actualizar parqueadero existente
        await updateParqueadero(initialData.id, {
          nombre,
          descripcion,
          tipo,
          capacidad_total: capacidadTotal,
          activo,
          geom: geomValue
        }, supabase)
      } else {
        // Crear nuevo parqueadero
        await createParqueadero({
          nombre,
          descripcion,
          tipo,
          capacidad_total: capacidadTotal,
          activo,
          geom: geomValue
        }, supabase)
      }

      router.push('/admin/parqueadores')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al guardar el parqueadero')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">
        {initialData?.id ? 'Editar Parqueadero' : 'Nuevo Parqueadero'}
      </h1>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Información general */}
        <div>
          <Label>Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>

        <div>
          <Label>Descripción</Label>
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        <div>
          <Label>Tipo</Label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'publico' | 'privado')}
            required
            className="border rounded p-2 w-full"
          >
            <option value="">Seleccione un tipo</option>
            <option value="publico">Público</option>
            <option value="privado">Privado</option>
          </select>
        </div>

        <div>
          <Label>Capacidad Total</Label>
          <Input
            type="number"
            value={capacidadTotal}
            onChange={(e) => setCapacidadTotal(Number(e.target.value))}
            min={0}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="activo"
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <Label htmlFor="activo">Activo</Label>
        </div>

        {/* Ubicación */}
        <div className="mt-4">
          <Label>Latitud</Label>
          <Input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <Label>Longitud</Label>
          <Input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(Number(e.target.value))}
            required
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : initialData?.id ? 'Actualizar Parqueadero' : 'Crear Parqueadero'}
        </Button>
      </form>
    </div>
  )
}
