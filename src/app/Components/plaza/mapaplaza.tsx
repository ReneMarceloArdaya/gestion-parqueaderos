"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type Plaza = {
  id: number
  codigo: string | null
  coordenada: string | null // formato POINT(lng lat)
  estado: "libre" | "ocupada" | "reservada" | "fuera_servicio"
}

function parseCoordenada(coordenada: string | null): { lng: number; lat: number } | null {
  if (!coordenada) return null
  try {
    const inside = coordenada.replace("POINT(", "").replace(")", "").trim()
    const [lngStr, latStr] = inside.split(/\s+/)
    return { lng: parseFloat(lngStr), lat: parseFloat(latStr) }
  } catch {
    return null
  }
}

export default function PlazaMap({ plazas }: { plazas: Plaza[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || plazas.length === 0) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

    const firstCoords = parseCoordenada(plazas[0].coordenada) || { lng: -74.08, lat: 4.60 }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [firstCoords.lng, firstCoords.lat],
      zoom: 17,
    })
    mapRef.current = map

    plazas.forEach(plaza => {
      const coords = parseCoordenada(plaza.coordenada)
      if (!coords) return

      const color =
        plaza.estado === "libre"
          ? "#22c55e"
          : plaza.estado === "ocupada"
          ? "#ef4444"
          : plaza.estado === "reservada"
          ? "#eab308"
          : "#6b7280"

      new mapboxgl.Marker({ color })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(`
            <div style="font-family: sans-serif; font-size: 13px;">
              <p><strong>Código:</strong> ${plaza.codigo || "Sin código"}</p>
              <p><strong>Estado:</strong> ${plaza.estado}</p>
            </div>
          `)
        )
        .addTo(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [plazas])

  return <div ref={mapContainer} className="w-full h-96 rounded-lg overflow-hidden" />
}
