"use client"

import { useEffect, useState } from "react"
import { getParqueaderos } from "@/lib/Supabase/parqueadores"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SingleParkingMap } from "../../Components/parqueadores/SingleParkingMap"


import ParqueaderoGaleria from "../../Components/parqueadores/ParqueaderoGaleria"

export default function ParqueaderosPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedParqueadero, setSelectedParqueadero] = useState<any | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const fetchParqueaderos = async () => {
    setLoading(true)
    try {
      const res = await getParqueaderos(supabase)
      setData(res)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al cargar los parqueaderos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkUserAndLoad = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }
        await fetchParqueaderos()
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Error al cargar los parqueaderos")
      }
    }
    checkUserAndLoad()
  }, [router, supabase])

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("¿Estás seguro que quieres eliminar este parqueadero?")
    if (!confirmDelete) return
    try {
      const { error } = await supabase.from("parqueaderos").delete().eq("id", id)
      if (error) throw error
      alert("Parqueadero eliminado con éxito")
      await fetchParqueaderos()
      setSelectedParqueadero(null) // si elimino el que estaba seleccionado, lo limpio
    } catch (err: any) {
      alert(err.message || "Error al eliminar el parqueadero")
    }
  }

  if (loading) return <p>Cargando...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Parqueaderos</h1>
        <Link href="/admin/parqueadores/new">
          <Button>Nuevo parqueadero</Button>
        </Link>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacidad</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((p, index) => (
              <tr
                key={p.id}
                className={`hover:bg-gray-100 cursor-pointer transition-colors duration-150 ${
                  selectedParqueadero?.id === p.id ? "bg-blue-50" : ""
                }`}
                onClick={() => setSelectedParqueadero(p)}
              >
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">{p.nombre}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 capitalize">{p.tipo}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{p.capacidad_total}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      p.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {p.activo ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Link href={`/admin/parqueadores/${p.id}/niveles`}>
                    <Button size="sm" variant="outline">Niveles</Button>
                  </Link>       
                   <Link href={`/admin/parqueadores/${p.id}/tarifas`}>
                    <Button size="sm" variant="outline">Tarifas</Button>
                  </Link>
                  <Link href={`/admin/parqueadores/update/${p.id}`}>
                    <Button size="sm" variant="outline">Editar</Button>
                  </Link>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

  {selectedParqueadero && (
  <div className="mt-6 space-y-8">
    
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-xl font-bold mb-4">
        Ubicación de: {selectedParqueadero.nombre}
      </h2>
      <div className="w-full h-96 rounded-lg overflow-hidden border">
      <SingleParkingMap
        geom={selectedParqueadero.geom}
        nombre={selectedParqueadero.nombre}
        direccion={selectedParqueadero.direccion}
        capacidad={selectedParqueadero.capacidad_total}
        tipo={selectedParqueadero.tipo}
      />


    </div>

    </div>

   
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-xl font-bold mb-4">
        Imágenes de: {selectedParqueadero.nombre}
      </h2>
      <div className="w-full">
        <ParqueaderoGaleria parqueaderoId={selectedParqueadero.id} />
      </div>
    </div>
  </div>
)}


    </div>
  )
}
