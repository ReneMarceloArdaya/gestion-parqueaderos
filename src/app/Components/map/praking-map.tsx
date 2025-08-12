'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Parking } from '@/lib/Supabase/supabaseClient'
import { Car, MapPin } from 'lucide-react'

export function ParkingMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [parkings, setParkings] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)

  // Configurar Mapbox solo en el cliente
  useEffect(() => {
    // Configurar token y plugin solo en el cliente
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    
    // Solo configurar plugin si no está ya configurado
    if (mapboxgl.getRTLTextPluginStatus() === 'unavailable') {
      mapboxgl.setRTLTextPlugin(
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
        null,
        true
      )
    }
  }, [])

  // Cargar datos de parqueaderos (temporalmente mock)
  useEffect(() => {
    // Datos de ejemplo mientras conectamos con Supabase
    const mockParkings: Parking[] = [
      {
        id: 1,
        operador_id: 1,
        nombre: "Parqueadero Central",
        descripcion: "Parqueadero público con 100 espacios",
        tipo: "publico",
        capacidad_total: 100,
        geom: "POINT(-74.08175 4.60971)",
        direccion: "Calle 100 #13-21",
        ciudad: "Bogotá",
        pais: "Colombia",
        zona: "Chapinero",
        activo: true,
        creado_at: new Date().toISOString(),
        actualizado_at: new Date().toISOString()
      },
      {
        id: 2,
        operador_id: 1,
        nombre: "Parking Mall",
        descripcion: "Parqueadero privado del centro comercial",
        tipo: "privado",
        capacidad_total: 200,
        geom: "POINT(-74.0721 4.6102)",
        direccion: "Calle 93 #15-25",
        ciudad: "Bogotá",
        pais: "Colombia",
        zona: "Usaquén",
        activo: true,
        creado_at: new Date().toISOString(),
        actualizado_at: new Date().toISOString()
      }
    ]

    setParkings(mockParkings)
    setLoading(false)
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !parkings.length) return

    // Configurar token nuevamente por si acaso
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-74.08175, 4.60971],
      zoom: 13,
      // Desactivar telemetría
      collectResourceTiming: false,
      fadeDuration: 0,
      attributionControl: false
    })

    // Agregar controles mínimos
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    // Agregar marcadores cuando el mapa esté cargado
    map.current.on('load', () => {
      parkings.forEach(parking => {
        try {
          // Parsear coordenadas del POINT de PostGIS
          const coords = parking.geom
            .replace('POINT(', '')
            .replace(')', '')
            .split(' ')
            .map(Number)
          
          const [lng, lat] = coords

          // Validar coordenadas
          if (isNaN(lat) || isNaN(lng)) {
            console.warn('Coordenadas inválidas para parqueadero:', parking.nombre)
            return
          }

          // Crear marcador
          const marker = new mapboxgl.Marker({
            color: parking.tipo === 'publico' ? '#3b82f6' : '#ef4444'
          })
            .setLngLat([lng, lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2 max-w-xs">
                  <h3 class="font-bold text-gray-800 text-sm">${parking.nombre}</h3>
                  <p class="text-xs text-gray-600 mt-1">${parking.direccion}</p>
                  <p class="text-xs text-gray-500 mt-1">Capacidad: ${parking.capacidad_total} espacios</p>
                  <div class="mt-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      parking.tipo === 'publico' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-red-100 text-red-800'
                    }">
                      ${parking.tipo === 'publico' ? 'Público' : 'Privado'}
                    </span>
                  </div>
                </div>
              `)
            )
            .addTo(map.current!)
        } catch (error) {
          console.error('Error al crear marcador para:', parking.nombre, error)
        }
      })
    })

    // Manejar errores del mapa
    map.current.on('error', (e) => {
      console.error('Error en Mapbox:', e.error)
    })

    // Limpiar mapa al desmontar
    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [parkings])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Car className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className="mt-2 text-gray-500">Cargando parqueaderos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div 
        ref={mapContainer} 
        className="absolute inset-0"
        style={{ minHeight: '100%' }}
      />
      
    </div>
  )
}