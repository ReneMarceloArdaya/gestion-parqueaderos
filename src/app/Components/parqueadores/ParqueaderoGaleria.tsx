"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"

interface ParqueaderoGaleriaProps {
  parqueaderoId: number
}

export default function ParqueaderoGaleria({ parqueaderoId }: ParqueaderoGaleriaProps) {
  const [imagenes, setImagenes] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchImagenes = async () => {
      const { data, error } = await supabase
        .from("parqueadero_imagenes") // 👈 tu tabla de imágenes
        .select("id, url, titulo")
        .eq("parqueadero_id", parqueaderoId)

      if (!error && data) {
        setImagenes(data)
      }
    }
    fetchImagenes()
  }, [parqueaderoId, supabase])

  if (imagenes.length === 0) {
    return <p className="text-gray-500">Sin imágenes disponibles</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {imagenes.map((img) => (
        <div key={img.id} className="rounded-lg overflow-hidden shadow">
          <img
            src={img.url}
            alt={img.titulo || "Imagen"}
            className="w-full h-48 object-cover"
          />
        </div>
      ))}
    </div>
  )
}
