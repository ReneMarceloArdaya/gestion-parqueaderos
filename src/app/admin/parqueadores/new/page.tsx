'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createParqueadero } from '@/lib/Supabase/parqueadores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { EditableParkingMap } from "../../../Components/parqueadores/EditableParkingMap"


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
    direccion?: string
    ciudad?: string
    pais?: string
    zona?: string
  }
}

export default function NuevoParqueaderoPage({ initialData }: ParqueaderoFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState(initialData?.nombre || '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '')
  const [tipo, setTipo] = useState<"publico" | "privado" | ''>(initialData?.tipo || '')
  const [capacidadTotal, setCapacidadTotal] = useState<number>(initialData?.capacidad_total || 0)
  const [activo, setActivo] = useState(initialData?.activo ?? true)

  const [lat, setLat] = useState<number | null>(initialData?.lat || null)
  const [lng, setLng] = useState<number | null>(initialData?.lng || null)
  const [direccion, setDireccion] = useState(initialData?.direccion || '')
  const [ciudad, setCiudad] = useState(initialData?.ciudad || '')
  const [pais, setPais] = useState(initialData?.pais || '')
  const [zona, setZona] = useState(initialData?.zona || '')

  const [imagenes, setImagenes] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImagenesChange = (files: FileList | null) => {
    if (files) setImagenes(Array.from(files))
  }

  

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

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
    if (!lat || !lng) {
      setError('Debes seleccionar una ubicación en el mapa')
      return
    }

    setLoading(true)
    try {
      const geomValue = `POINT(${lng} ${lat})`
    
  //     // 1. Crear parqueadero
  //     const { data: parqueaderoData, error: parqueaderoError } = await createParqueadero({
  //       nombre,
  //       descripcion,
  //       tipo,
  //       capacidad_total: capacidadTotal,
  //       activo,
  //       geom: geomValue,
  //       direccion,
  //       ciudad,
  //       pais,
  //       zona
  //     }, supabase)

  //     if (parqueaderoError) throw parqueaderoError

  //     const parqueadero = Array.isArray(parqueaderoData) ? parqueaderoData[0] : parqueaderoData
  //     if (!parqueadero?.id) throw new Error("No se pudo obtener el ID del parqueadero creado")

  //     // 2. Subir imágenes al bucket e insertarlas en la tabla
  //     for (const file of imagenes) {
  //       const filePath = `parqueaderos/${parqueadero.id}/${Date.now()}-${file.name}`

  //       const { error: uploadError } = await supabase.storage
  //         .from("Imagen") 
  //         .upload(filePath, file)

  //       if (uploadError) throw uploadError

  //       const { data: urlData } = supabase.storage
  //         .from("Imagen")
  //         .getPublicUrl(filePath)

  //       await supabase.from("parqueadero_imagenes").insert({
  //         parqueadero_id: parqueadero.id,
  //         url: urlData.publicUrl,
  //       })
  //     }

  //     // 3. Redirigir
  //     router.push('/admin/parqueadores')
  //     router.refresh()
  //   } catch (err: any) {
  //     setError(err.message || 'Error al crear el parqueadero')
  //   } finally {
  //     setLoading(false)
  //   }
  // }
      await createParqueadero({
        nombre,
        descripcion,
        tipo,
        activo,
        capacidad_total: capacidadTotal,
        geom: geomValue,
        direccion,
        ciudad,
        pais,
        zona
      }, supabase)
      
      router.push('/admin/parqueadores')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al crear el parqueadero')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white shadow-lg rounded-2xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Nuevo Parqueadero</h1>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
         
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
                  onChange={(e) => setTipo(e.target.value as "publico" | "privado")}
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

            {/* Mapa */}
         <div className="mt-6 relative w-full h-96 border rounded-xl overflow-hidden shadow-md">
                  <EditableParkingMap
                    lat={lat}
                    lng={lng}
                    onChange={(newLat, newLng, info) => {
                      setLat(newLat)
                      setLng(newLng)
                      if (info) {
                        setDireccion(info.direccion || "")
                        setCiudad(info.ciudad || "")
                        setZona(info.zona || "")
                        setPais(info.pais || "")
                      }
                    }}
                   />
        </div>


          </div>
          {/* imágenes */}
          <div>
            <Label>Imágenes</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImagenesChange(e.target.files)}
              className="mt-2"
            />
            {imagenes.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {imagenes.map((file, i) => (
                  <div key={i} className="border rounded-lg p-2 shadow">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`preview-${i}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <p className="text-xs mt-1 text-center truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="px-6">
              {loading ? 'Guardando...' : 'Crear Parqueadero'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
