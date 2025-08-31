'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Crear cliente sin tipado estricto
const supabase: any = createClient()

interface Parqueadero {
  id: number
  nombre: string
  direccion: string
  capacidad_total: number
  niveles_count: number
  plazas_count: number
  plazas_libres: number
  plazas_ocupadas: number
  estado: string
}

interface Nivel {
  id: number
  orden: number
  nombre: string
  plazas_count: number
  plazas_libres: number
  plazas_ocupadas: number
}

export default function SquaresPage() {
  const router = useRouter()
  const [parqueaderos, setParqueaderos] = useState<Parqueadero[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedParqueadero, setSelectedParqueadero] = useState<Parqueadero | null>(null)
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingNiveles, setLoadingNiveles] = useState(false)

  // Cargar parqueaderos del operador
  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true)
        
        // Obtener sesión del usuario
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        // Obtener ID del operador
        const { data: operatorData, error: operatorError } = await supabase
          .from('operadores')
          .select('id')
          .eq('usuario_id', session.user.id)
          .single()

        if (operatorError || !operatorData) {
          console.error('No se encontró el operador asociado a tu cuenta')
          return
        }

        // Obtener parqueaderos usando la función RPC
        const { data: parqueaderosData, error } = await supabase.rpc('get_operator_parkings_with_coordinates', {
          operator_id_param: operatorData.id
        })

        if (error) {
          console.error('Error fetching parqueaderos:', error)
          return
        }

        // Obtener datos completos incluyendo niveles y plazas para estadísticas
        const parqueaderosConStats = await Promise.all(
          (parqueaderosData || []).map(async (parqueadero: any) => {
            try {
              // Obtener niveles con plazas
              const { data: nivelesData, error: nivelesError } = await supabase
                .from('niveles')
                .select(`
                  id,
                  orden,
                  nombre,
                  plazas:plazas(
                    id,
                    estado
                  )
                `)
                .eq('parqueadero_id', parqueadero.id)
                .order('orden', { ascending: true })

              if (nivelesError) {
                console.error(`Error fetching niveles for parking ${parqueadero.id}:`, {
                  error: nivelesError,
                  message: nivelesError.message,
                  details: nivelesError.details,
                  hint: nivelesError.hint,
                  code: nivelesError.code
                })
                // Continuar sin niveles en lugar de retornar null
                return {
                  id: parqueadero.id,
                  nombre: parqueadero.nombre,
                  direccion: parqueadero.direccion,
                  capacidad_total: parqueadero.capacidad_total,
                  niveles_count: 0,
                  plazas_count: 0,
                  plazas_libres: 0,
                  plazas_ocupadas: 0,
                  estado: parqueadero.activo ? 'activo' : 'inactivo',
                }
              }

              const niveles = nivelesData || []
              const todasLasPlazas = niveles.flatMap((nivel: any) => nivel.plazas || [])
              
              const plazasLibres = todasLasPlazas.filter((plaza: any) => plaza.estado === 'libre').length
              const plazasOcupadas = todasLasPlazas.filter((plaza: any) => plaza.estado === 'ocupada').length
              
              return {
                id: parqueadero.id,
                nombre: parqueadero.nombre,
                direccion: parqueadero.direccion,
                capacidad_total: parqueadero.capacidad_total,
                niveles_count: niveles.length,
                plazas_count: todasLasPlazas.length,
                plazas_libres: plazasLibres,
                plazas_ocupadas: plazasOcupadas,
                estado: parqueadero.activo ? 'activo' : 'inactivo',
              }
            } catch (catchError) {
              console.error(`Unexpected error processing parking ${parqueadero.id}:`, catchError)
              // Retornar parqueadero básico sin estadísticas en caso de error
              return {
                id: parqueadero.id,
                nombre: parqueadero.nombre,
                direccion: parqueadero.direccion,
                capacidad_total: parqueadero.capacidad_total,
                niveles_count: 0,
                plazas_count: 0,
                plazas_libres: 0,
                plazas_ocupadas: 0,
                estado: parqueadero.activo ? 'activo' : 'inactivo',
              }
            }
          })
        )

        const validParqueaderos = parqueaderosConStats as Parqueadero[]
        setParqueaderos(validParqueaderos)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [router])

  // Cargar niveles de un parqueadero específico
  const fetchNiveles = async (parqueaderoId: number) => {
    try {
      setLoadingNiveles(true)
      
      const { data, error } = await supabase
        .from('niveles')
        .select(`
          id,
          orden,
          nombre,
          plazas:plazas(
            id,
            estado
          )
        `)
        .eq('parqueadero_id', parqueaderoId)
        .order('orden', { ascending: true })

      if (error) {
        console.error(`Error fetching niveles for modal (parking ${parqueaderoId}):`, {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setNiveles([]) // Establecer array vacío en caso de error
        return
      }

      // Procesar datos de niveles con estadísticas
      const nivelesConStats = data?.map((nivel: any) => {
        const plazas = nivel.plazas || []
        const plazasLibres = plazas.filter((plaza: any) => plaza.estado === 'libre').length
        const plazasOcupadas = plazas.filter((plaza: any) => plaza.estado === 'ocupada').length
        
        return {
          id: nivel.id,
          orden: nivel.orden,
          nombre: nivel.nombre,
          plazas_count: plazas.length,
          plazas_libres: plazasLibres,
          plazas_ocupadas: plazasOcupadas,
        }
      }) || []

      setNiveles(nivelesConStats)
    } catch (error) {
      console.error(`Unexpected error fetching niveles for parking ${parqueaderoId}:`, error)
      setNiveles([]) // Establecer array vacío en caso de error
    } finally {
      setLoadingNiveles(false)
    }
  }

  const handleParqueaderoClick = async (parqueadero: Parqueadero) => {
    setSelectedParqueadero(parqueadero)
    setIsModalOpen(true)
    await fetchNiveles(parqueadero.id)
  }

  const handleNivelClick = (nivelId: number) => {
    router.push(`/operator/parkings/${selectedParqueadero?.id}/levels/${nivelId}/draw`)
    setIsModalOpen(false)
  }

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'activo':
        return 'bg-green-500'
      case 'inactivo':
        return 'bg-red-500'
      case 'mantenimiento':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getOcupacionColor = (libres: number, total: number) => {
    if (total === 0) return 'bg-gray-200'
    const porcentaje = (libres / total) * 100
    if (porcentaje > 50) return 'bg-green-500'
    if (porcentaje > 20) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gestión de Plazas</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">🚗 Gestión de Plazas</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{parqueaderos.length}</span> parqueaderos
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">
              {parqueaderos.reduce((acc, p) => acc + p.plazas_count, 0)}
            </span> plazas totales
          </div>
        </div>
      </div>

      {/* Grid de tarjetas de parqueaderos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {parqueaderos.map((parqueadero) => (
          <Card 
            key={parqueadero.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-blue-500"
            onClick={() => handleParqueaderoClick(parqueadero)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900 mb-1">
                    🏢 {parqueadero.nombre}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-2">
                    📍 {parqueadero.direccion}
                  </p>
                </div>
                <Badge 
                  className={`${getEstadoBadgeColor(parqueadero.estado)} text-white`}
                >
                  {parqueadero.estado}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Estadísticas principales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {parqueadero.niveles_count}
                  </div>
                  <div className="text-sm text-blue-700">Niveles</div>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {parqueadero.plazas_count}
                  </div>
                  <div className="text-sm text-purple-700">Plazas</div>
                </div>
              </div>

              {/* Barra de ocupación */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ocupación</span>
                  <span className="font-medium">
                    {parqueadero.plazas_count > 0 
                      ? `${Math.round(((parqueadero.plazas_ocupadas / parqueadero.plazas_count) * 100))}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      parqueadero.plazas_count > 0
                        ? getOcupacionColor(parqueadero.plazas_libres, parqueadero.plazas_count)
                        : 'bg-gray-200'
                    }`}
                    style={{ 
                      width: parqueadero.plazas_count > 0 
                        ? `${(parqueadero.plazas_ocupadas / parqueadero.plazas_count) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
              </div>

              {/* Estadísticas detalladas */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>{parqueadero.plazas_libres} libres</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>{parqueadero.plazas_ocupadas} ocupadas</span>
                </div>
              </div>

              {/* Botón de acción */}
              <Button 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  handleParqueaderoClick(parqueadero)
                }}
              >
                <span className="mr-2">🎯</span>
                Gestionar Plazas
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vacío */}
      {!loading && parqueaderos.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay parqueaderos disponibles
          </h3>
          <p className="text-gray-600 mb-6">
            Contacta al administrador para que te asigne parqueaderos
          </p>
        </div>
      )}

      {/* Modal de niveles */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              🏢 {selectedParqueadero?.nombre}
            </DialogTitle>
            <DialogDescription>
              Selecciona un nivel para gestionar sus plazas de estacionamiento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {loadingNiveles ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
                ))}
              </div>
            ) : niveles.length > 0 ? (
              <div className="grid gap-3">
                {niveles.map((nivel) => (
                  <Card 
                    key={nivel.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-gray-50 border-l-4 border-l-green-500"
                    onClick={() => handleNivelClick(nivel.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                              <span className="text-blue-600 font-bold">
                                {nivel.orden}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {nivel.nombre || `Nivel ${nivel.orden}`}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {nivel.plazas_count} plazas totales
                              </p>
                            </div>
                          </div>
                          
                          {/* Mini barra de ocupación */}
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    nivel.plazas_count > 0
                                      ? getOcupacionColor(nivel.plazas_libres, nivel.plazas_count)
                                      : 'bg-gray-200'
                                  }`}
                                  style={{ 
                                    width: nivel.plazas_count > 0 
                                      ? `${(nivel.plazas_ocupadas / nivel.plazas_count) * 100}%`
                                      : '0%'
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 min-w-fit">
                              {nivel.plazas_count > 0 
                                ? `${Math.round((nivel.plazas_ocupadas / nivel.plazas_count) * 100)}%`
                                : '0%'
                              }
                            </div>
                          </div>
                          
                          {/* Estadísticas mini */}
                          <div className="flex gap-4 mt-2 text-xs">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {nivel.plazas_libres} libres
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              {nivel.plazas_ocupadas} ocupadas
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-gray-400">
                          <svg 
                            className="w-5 h-5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 5l7 7-7 7" 
                            />
                          </svg>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay niveles configurados
                </h3>
                <p className="text-gray-600">
                  Este parqueadero aún no tiene niveles creados
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
