// src/app/Components/parqueadores/SingleParkingMap.tsx
"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type Props = {
  geom: string
  nombre: string
  direccion?: string
  capacidad?: number
  tipo?: string
  
}


function parseGeom(geom: string): { lng: number; lat: number } | null {
  if (!geom) return null
  const g = geom.trim()

  if (g.startsWith("POINT")) {
    try {
      const inside = g.slice(g.indexOf("(") + 1, g.indexOf(")")).trim()
      const [lngStr, latStr] = inside.split(/\s+/)
      return { lng: parseFloat(lngStr), lat: parseFloat(latStr) }
    } catch {
      return null
    }
  }

  try {
    const hex = g.startsWith("0x") ? g.slice(2) : g
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    const dv = new DataView(bytes.buffer)
    const little = dv.getUint8(0) === 1

    const type = dv.getUint32(1, little)
    let offset = 5
    const EWKB_SRID_FLAG = 0x20000000
    if ((type & EWKB_SRID_FLAG) !== 0) {
      offset += 4
    }

    const lng = dv.getFloat64(offset, little)
    const lat = dv.getFloat64(offset + 8, little)
    return { lng, lat }
  } catch {
    return null
  }
}

export function SingleParkingMap({ geom, nombre, direccion, capacidad, tipo }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    const coords = parseGeom(geom)
    if (!mapContainer.current || !coords) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [coords.lng, coords.lat],
      zoom: 15,
      attributionControl: false,
    })
    mapRef.current = map

    // Popup con info del parqueadero
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div style="font-family: sans-serif; font-size: 14px;">
        <h3 style="font-weight: bold; margin-bottom: 4px;">${nombre}</h3>
        ${direccion ? `<p>${direccion}</p>` : ""}
        ${capacidad ? `<p><strong>Capacidad:</strong> ${capacidad} espacios</p>` : ""}
        ${tipo ? `<span style="background:#3b82f6;color:white;padding:2px 6px;border-radius:6px;">${tipo}</span>` : ""}
      </div>
    `)

    // Marcador con popup
    const marker = new mapboxgl.Marker({ color: "#2563eb" })
      .setLngLat([coords.lng, coords.lat])
      .setPopup(popup) // popup aparece al hacer clic
      .addTo(map)

    return () => {
      marker.remove()
      map.remove()
      mapRef.current = null
    }
  }, [geom, nombre, direccion, capacidad, tipo])

  return <div ref={mapContainer} className="w-full h-96 rounded-lg overflow-hidden" />
}
