'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient, ParkingUpdate } from '@/lib/Supabase/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface FormData {
  id: number
  nombre: string
  descripcion: string
  tipo: 'publico' | 'privado'
  capacidad_total: number
  direccion: string
  ciudad: string
  pais: string
  zona: string
  latitude: number
  longitude: number
}

export default function EditParkingPage() {
  const [formData, setFormData] = useState<FormData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const supabase = createClient() as any
  const router = useRouter()
  const params = useParams()
  const parkingId = parseInt(params.id as string, 10)

  // Validar que parkingId es un número válido
  useEffect(() => {
    if (isNaN(parkingId)) {
      setError('ID de parqueadero inválido')
      setLoading(false)
    }
  }, [parkingId])

  // Cargar datos del parqueadero
  useEffect(() => {
    if (isNaN(parkingId)) return

    const fetchParking = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData.session?.user

        if (!user) {
          throw new Error('Debes estar autenticado para editar')
        }

        // Obtener operador_id del usuario autenticado
        const { data: operador, error: operadorError } = await supabase
          .from('operadores')
          .select('id')
          .eq('usuario_id', user.id)
          .single()

        if (operadorError || !operador) {
          throw new Error('No se encontró el operador asociado al usuario')
        }

        // Llamar a la función SQL para obtener el parqueadero
        const { data, error } = await supabase
          .rpc('get_operator_parkings_with_coordinates', {
            operator_id_param: operador.id,
          })
          .eq('id', parkingId)
          .single()

        if (error) {
          throw new Error('Error al cargar el parqueadero: ' + error.message)
        }

        if (!data) {
          throw new Error('Parqueadero no encontrado')
        }

        setFormData({
          id: data.id,
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          tipo: data.tipo as 'publico' | 'privado',
          capacidad_total: data.capacidad_total,
          direccion: data.direccion || '',
          ciudad: data.ciudad || '',
          pais: data.pais || '',
          zona: data.zona || '',
          latitude: data.latitude,
          longitude: data.longitude,
        })
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }

    fetchParking()
  }, [parkingId, supabase])

  // Inicializar el mapa
  useEffect(() => {
    if (!formData || !mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [formData.longitude, formData.latitude],
      zoom: 12,
    })

    // Añadir marcador arrastrable
    marker.current = new mapboxgl.Marker({ color: 'red', draggable: true })
      .setLngLat([formData.longitude, formData.latitude])
      .addTo(map.current)

    // Actualizar coordenadas al arrastrar el marcador
    marker.current.on('dragend', () => {
      const lngLat = marker.current?.getLngLat()
      if (lngLat) {
        setFormData((prev) =>
          prev ? { ...prev, longitude: lngLat.lng, latitude: lngLat.lat } : prev
        )
      }
    })

    return () => {
      if (map.current) map.current.remove()
    }
  }, [formData])

  // Actualizar el centro del mapa y el marcador cuando cambian las coordenadas
  useEffect(() => {
    if (formData && marker.current && map.current) {
      marker.current.setLngLat([formData.longitude, formData.latitude])
      map.current.setCenter([formData.longitude, formData.latitude])
    }
  }, [formData?.latitude, formData?.longitude])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return

    setLoading(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        throw new Error('Debes estar autenticado para actualizar')
      }

      // Obtener operador_id del usuario autenticado
      const { data: operador, error: operadorError } = await supabase
        .from('operadores')
        .select('id')
        .eq('usuario_id', user.id)
        .single()

      if (operadorError || !operador) {
        throw new Error('No se encontró el operador asociado al usuario')
      }

      const parkingData: ParkingUpdate = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        tipo: formData.tipo,
        capacidad_total: formData.capacidad_total,
        geom: `POINT(${formData.longitude} ${formData.latitude})`,
        direccion: formData.direccion || null,
        ciudad: formData.ciudad || null,
        pais: formData.pais || null,
        zona: formData.zona || null,
        operador_id: operador.id,
        activo: true,
        actualizado_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('parqueaderos')
        .update(parkingData)
        .eq('id', parkingId)
        .eq('operador_id', operador.id)

      if (updateError) {
        throw new Error('Error al actualizar el parqueadero: ' + updateError.message)
      }

      router.push(`/operator/parkings/${parkingId}`)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el parqueadero')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Cargando...</div>
  }

  if (error || !formData) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-red-600">{error || 'Parqueadero no encontrado'}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Editar Parqueadero: {formData.nombre}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  placeholder="Ej. Parqueadero Centro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: 'privado') =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">Público</SelectItem>
                    <SelectItem value="privado">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacidad_total">Capacidad Total</Label>
              <Input
                id="capacidad_total"
                type="number"
                min="1"
                value={formData.capacidad_total}
                onChange={(e) =>
                  setFormData({ ...formData, capacidad_total: parseInt(e.target.value) || 0 })
                }
                required
                placeholder="Ej. 50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Ej. Calle 123 #45-67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  placeholder="Ej. Bogotá"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  placeholder="Ej. Colombia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zona">Zona</Label>
                <Input
                  id="zona"
                  value={formData.zona}
                  onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                  placeholder="Ej. Zona Norte"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Ej. Parqueadero con seguridad 24/7"
              />
            </div>

            <div className="space-y-2">
              <Label>Ubicación en el Mapa (arrastrar el marcador para ajustar)</Label>
              <div
                ref={mapContainer}
                className="w-full h-[400px] rounded-md border"
              />
              <div className="flex gap-4 mt-2">
                <div>
                  <Label>Latitud</Label>
                  <Input
                    value={formData.latitude.toFixed(6)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input
                    value={formData.longitude.toFixed(6)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Actualizando...' : 'Actualizar Parqueadero'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}