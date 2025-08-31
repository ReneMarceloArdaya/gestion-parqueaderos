"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type TipoVehiculo = {
  id: number
  nombre: string
}

type PlazaFormProps = {
  nivelId: number
}

export function PlazaForm({ nivelId }: PlazaFormProps) {
  const supabase = createClient()

  const [codigo, setCodigo] = useState("")
  const [tipo, setTipo] = useState<number | null>(null)
  const [estado, setEstado] = useState<"libre" | "ocupada" | "fuera_servicio">("libre")
  const [coordenada, setCoordenada] = useState("") // se guardará en formato POINT(lng lat)
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([])

  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  // Traer tipos de vehículo
  useEffect(() => {
    const fetchTipos = async () => {
      const { data, error } = await supabase
        .from("tipos_vehiculo")
        .select("*")
        .order("nombre", { ascending: true })

      if (error) alert(error.message)
      else setTiposVehiculo(data as TipoVehiculo[])
    }

    fetchTipos()
  }, [])

  // Inicializar mapa
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""
    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-74.08, 4.60], // coordenadas por defecto
      zoom: 17
    })

    mapRef.current = map

    // Agregar click para seleccionar coordenada
    map.on("click", e => {
      const { lng, lat } = e.lngLat
      setCoordenada(`POINT(${lng} ${lat})`)

      // Mover marcador al lugar seleccionado
      if (markerRef.current) markerRef.current.setLngLat([lng, lat])
      else {
        markerRef.current = new mapboxgl.Marker({ color: "#FF0000" })
          .setLngLat([lng, lat])
          .addTo(map)
      }
    })

    return () => map.remove()
  }, [])

  const handleSave = async () => {
    if (!tipo) {
      alert("Selecciona un tipo de vehículo")
      return
    }

    if (!coordenada) {
      alert("Selecciona la ubicación de la plaza en el mapa")
      return
    }

    const { error } = await supabase.from("plazas").insert({
      nivel_id: nivelId,
      codigo,
      tipo_vehiculo_id: tipo,
      estado,
      coordenada
    })

    if (error) alert(error.message)
    else {
      alert("Plaza guardada correctamente")
      setCodigo("")
      setTipo(null)
      setEstado("libre")
      setCoordenada("")
      // Reset marcador
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = null
    }
  }

  return (
    <div className="border p-4 rounded-md shadow-md mb-4">
      <h3 className="font-semibold mb-2">Nueva Plaza</h3>

      <input
        placeholder="Código"
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        className="border p-2 mb-2 w-full"
      />

      <select
        value={tipo || ""}
        onChange={e => setTipo(Number(e.target.value))}
        className="border p-2 mb-2 w-full"
      >
        <option value="">-- Selecciona un tipo --</option>
        {tiposVehiculo.map(tv => (
          <option key={tv.id} value={tv.id}>
            {tv.nombre}
          </option>
        ))}
      </select>

      <select
        value={estado}
        onChange={e => setEstado(e.target.value as any)}
        className="border p-2 mb-2 w-full"
      >
        <option value="libre">Libre</option>
        <option value="ocupada">Ocupada</option>
        <option value="fuera_servicio">Fuera de servicio</option>
      </select>

      <div className="mb-2">
        <label className="block mb-1 font-semibold">Selecciona ubicación en el mapa:</label>
        <div ref={mapContainer} className="w-full h-64 rounded-lg border" />
      </div>

      <input
        placeholder="Coordenada seleccionada"
        value={coordenada}
        readOnly
        className="border p-2 mb-2 w-full bg-gray-100"
      />

      <button
        onClick={handleSave}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        Guardar
      </button>
    </div>
  )
}
