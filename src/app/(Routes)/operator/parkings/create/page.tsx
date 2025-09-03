'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient, ParkingInsert } from '@/lib/Supabase/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface FormData {
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

export default function CreateParkingPage() {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    tipo: 'publico',
    capacidad_total: 0,
    direccion: '',
    ciudad: '',
    pais: '',
    zona: '',
    latitude: 4.60971, // Default Bogotá
    longitude: -74.08175,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const supabase = createClient()
  const router = useRouter()

  // Obtener ubicación del usuario al cargar la página
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setFormData((prev) => ({ ...prev, latitude, longitude }))
        },
        (err) => {
          console.warn('No se pudo obtener la ubicación:', err.message)
          setError('No se pudo obtener tu ubicación. Usa Bogotá como default.')
        },
        { timeout: 10000 }
      )
    } else {
      setError('La geolocalización no es compatible con este navegador.')
    }
  }, [])

  // Inicializar el mapa
  useEffect(() => {
    if (!mapContainer.current) return

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
        setFormData((prev) => ({
          ...prev,
          longitude: lngLat.lng,
          latitude: lngLat.lat,
        }))
      }
    })

    return () => {
      if (map.current) map.current.remove()
    }
  }, [])

  // Actualizar el centro del mapa y el marcador cuando cambian las coordenadas
  useEffect(() => {
    if (marker.current && map.current) {
      marker.current.setLngLat([formData.longitude, formData.latitude])
      map.current.setCenter([formData.longitude, formData.latitude])
    }
  }, [formData.latitude, formData.longitude])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        throw new Error('Debes estar autenticado para crear un parqueadero')
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

      const parkingData: ParkingInsert = {
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
        creado_at: new Date().toISOString(),
        actualizado_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from('parqueaderos')
        .insert([parkingData])

      if (insertError) {
        throw new Error(insertError.message)
      }

      router.push('/operator/parkings')
    } catch (err: any) {
      setError(err.message || 'Error al crear el parqueadero')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Crear Nuevo Parqueadero</CardTitle>
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
              {loading ? 'Creando...' : 'Crear Parqueadero'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}