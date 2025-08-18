'use client'

import { useEffect, useState } from 'react'
import { getOperadores, deleteOperador } from '@/lib/Supabase/operadores'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/Supabase/database.type'

type Operador = Database['public']['Tables']['operadores']['Row'] & {
  parqueaderos_count: number
}

export default function OperadoresPage() {
  const [data, setData] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const operadores = await getOperadores(supabase)
        setData(operadores)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  async function handleDelete(id: number) {
    if (!confirm('¿Seguro que deseas eliminar este operador?')) return
    try {
      await deleteOperador(supabase, id)
      setData(prev => prev.filter(op => op.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <p>Cargando...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Operadores</h1>
        <Link href="/admin/operadores/new">
          <Button>Nuevo Operador</Button>
        </Link>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parqueaderos</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((op, i) => (
              <tr key={op.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-700">{i + 1}</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">{op.nombre}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{op.contacto_email ?? '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{op.contacto_telefono ?? '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{op.parqueaderos_count}</td>
                <td className="px-4 py-2 text-right text-sm font-medium space-x-2">
                  <Link href={`/admin/operadores/update/${op.id}`}>
                    <Button size="sm" variant="outline">Editar</Button>
                  </Link>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(op.id)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
