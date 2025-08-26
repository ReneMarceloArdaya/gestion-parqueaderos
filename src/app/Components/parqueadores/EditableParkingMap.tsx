"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type Props = {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number, info?: {
    direccion?: string
    ciudad?: string
    pais?: string
    zona?: string
  }) => void
}

export function EditableParkingMap({ lat, lng, onChange }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

    // crear solo 1 vez
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [lng || -74.0817, lat || 4.6097], // Bogotá default
        zoom: 13,
      })

      // evento de clic en mapa
      mapRef.current.on("click", async (e) => {
        const { lng, lat } = e.lngLat

        // mover o crear marcador
        if (!markerRef.current) {
          markerRef.current = new mapboxgl.Marker({ color: "#2563eb" })
            .setLngLat([lng, lat])
            .addTo(mapRef.current!)
        } else {
          markerRef.current.setLngLat([lng, lat])
        }

        // llamar a geocoding de mapbox
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
          )
          const data = await res.json()

          let direccion = ""
          let ciudad = ""
          let pais = ""
          let zona = ""

          if (data.features && data.features.length > 0) {
            direccion = data.features[0].place_name || ""

            const ctx = data.features[0].context || []
            ciudad = ctx.find((c: any) => c.id.includes("place"))?.text || ""
            zona = ctx.find((c: any) => c.id.includes("neighborhood"))?.text || ""
            pais = ctx.find((c: any) => c.id.includes("country"))?.text || ""
          }

          // devolver a formulario
          onChange(lat, lng, { direccion, ciudad, pais, zona })
        } catch (err) {
          console.error("Error obteniendo dirección:", err)
          onChange(lat, lng)
        }
      })
    }

    // si ya hay lat/lng iniciales, posicionar marcador
    if (lat && lng) {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#2563eb" })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!)
      } else {
        markerRef.current.setLngLat([lng, lat])
      }
      mapRef.current.setCenter([lng, lat])
    }
  }, [lat, lng, onChange])

  return <div ref={mapContainer} className="w-full h-96 rounded-lg overflow-hidden" />
}
