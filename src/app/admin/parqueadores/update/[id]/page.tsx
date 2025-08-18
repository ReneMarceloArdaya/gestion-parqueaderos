'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { updateParqueadero } from '@/lib/Supabase/parqueadores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ParkingMap } from '../../../../Components/map/praking-map'

export default function EditarParqueaderoPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const id = Number(params.id)
  if (isNaN(id)) {
    return <p>ID inválido</p>
  }

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState<'publico' | 'privado' | ''>('')
  const [capacidadTotal, setCapacidadTotal] = useState<number>(0)
  const [activo, setActivo] = useState(true)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [pais, setPais] = useState('')
  const [zona, setZona] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Fetch inicial con ST_X y ST_Y
useEffect(() => {
  async function fetchData() {
    const { data, error } = await supabase
      .from('parqueaderos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error(error)
      setError('No se pudo cargar el parqueadero')
      return
    }

    if (!data) return

    setNombre(data.nombre || '')
    setDescripcion(data.descripcion || '')
    setTipo(data.tipo || '')
    setCapacidadTotal(data.capacidad_total || 0)
    setActivo(data.activo ?? true)
    setDireccion(data.direccion || '')
    setCiudad(data.ciudad || '')
    setPais(data.pais || '')
    setZona(data.zona || '')

    // Manejo de geom (POINT(lng lat))
   if (data.geom) {
  // geom = "POINT(lng lat)"
  const match = data.geom.match(/POINT\(([-\d.]+) ([-\d.]+)\)/)
  if (match) {
    setLng(parseFloat(match[1])) // primero es lng
    setLat(parseFloat(match[2])) // segundo es lat
  } else {
    setLng(null)
    setLat(null)
  }
} else {
  setLng(null)
  setLat(null)
} }

  fetchData()
}, [id, supabase])


  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newLat = 4.6097 + (y / rect.height) * 0.01
    const newLng = -74.0817 + (x / rect.width) * 0.01

    setLat(newLat)
    setLng(newLng)

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${newLng},${newLat}.json?access_token=${MAPBOX_TOKEN}`
      )
      const data = await res.json()

      if (data.features && data.features.length > 0) {
        setDireccion(data.features[0].place_name || '')
        const ctx = data.features[0].context || []
        setCiudad(ctx.find((c: any) => c.id.includes('place'))?.text || '')
        setZona(ctx.find((c: any) => c.id.includes('neighborhood'))?.text || '')
        setPais(ctx.find((c: any) => c.id.includes('country'))?.text || '')
      }
    } catch (err) {
      console.error('Error obteniendo dirección:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!tipo) {
      setError('Debes seleccionar un tipo')
      return
    }
    if (lat === null || lng === null) {
      setError('Debes seleccionar una ubicación en el mapa')
      return
    }

    setLoading(true)
    try {
      const geomValue = `POINT(${lng} ${lat})`

      await updateParqueadero(
        id,
        {
          nombre,
          descripcion,
          tipo,
          capacidad_total: capacidadTotal,
          activo,
          geom: geomValue,
          direccion,
          ciudad,
          pais,
          zona,
        },
        supabase
      )

      router.push('/admin/parqueadores')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el parqueadero')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white shadow-lg rounded-2xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Editar Parqueadero</h1>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos generales */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Datos Generales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
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

              <div className="flex items-center space-x-2 mt-6">
                <input
                  id="activo"
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>

              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Ubicación</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Dirección</Label>
                <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              </div>
              <div>
                <Label>Ciudad</Label>
                <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
              </div>
              <div>
                <Label>Zona</Label>
                <Input value={zona} onChange={(e) => setZona(e.target.value)} />
              </div>
              <div>
                <Label>País</Label>
                <Input value={pais} onChange={(e) => setPais(e.target.value)} />
              </div>
              <div>
                <Label>Latitud</Label>
                <Input value={lat ?? ''} readOnly />
              </div>
              <div>
                <Label>Longitud</Label>
                <Input value={lng ?? ''} readOnly />
              </div>
            </div>

           <div className="mt-6 relative w-full h-96 border rounded-xl overflow-hidden shadow-md">
              <ParkingMap />
              <div
                className="absolute inset-0 cursor-crosshair"
                onClick={handleMapClick}
              />
            </div>
          </div>
          

          <div className="flex justify-between mt-6">
  <Button
    type="submit"
    disabled={loading}
    className="px-6 bg-blue-600 hover:bg-blue-700"
  >
    {loading ? 'Actualizando...' : 'Actualizar Parqueadero'}
  </Button>

  <Button
    type="button"
    disabled={loading}
    className="px-6 bg-red-600 hover:bg-red-700"
    onClick={async () => {
      const confirmDelete = window.confirm(
        '¿Estás seguro que quieres eliminar este parqueadero? Esta acción no se puede deshacer.'
      )
      if (!confirmDelete) return

      setLoading(true)
      try {
        const { error } = await supabase
          .from('parqueaderos')
          .delete()
          .eq('id', id)

        if (error) throw error

        router.push('/admin/parqueadores')
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Error al eliminar el parqueadero')
      } finally {
        setLoading(false)
      }
    }}
  >
    Eliminar Parqueadero
  </Button>
</div>

        </form>
      </div>
    </div>
  )
}
