'use client'

import { useState, useEffect } from 'react'
import { createClient, LevelInsert, LevelUpdate } from '@/lib/Supabase/supabaseClient'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Badge 
} from "@/components/ui/badge"
import { 
  Button 
} from "@/components/ui/button"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { 
  MoreHorizontal, 
  Edit, 
  Plus,
  Trash2,
  Layers
} from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Parking {
  id: number
  nombre: string
  descripcion: string | null
  tipo: 'privado'
  capacidad_total: number
  direccion: string | null
  ciudad: string | null
  zona: string | null
  activo: boolean
  creado_at: string
  longitude: number
  latitude: number
  niveles: Level[]
}

interface Level {
  id: number
  parqueadero_id: number
  nombre: string | null
  orden: number | null
  capacidad: number | null
  creado_at: string
}

export default function ParkingsPage() {
  const [parkings, setParkings] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [parkingToDelete, setParkingToDelete] = useState<Parking | null>(null)
  const [operatorId, setOperatorId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [levelDeleteDialogOpen, setLevelDeleteDialogOpen] = useState(false)
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null)

  const supabase = createClient() as any
  const router = useRouter()

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        const { data, error: operatorError } = await supabase
          .from('operadores')
          .select('id')
          .eq('usuario_id', session.user.id)
          .single()

        if (operatorError || !data) {
          setError('No se encontró el operador asociado a tu cuenta')
          setLoading(false)
          return
        }

        setOperatorId(data.id)
        await fetchParkings(data.id)
      } catch (err) {
        console.error('Error initializing page:', err)
        setError('Error al cargar los parqueos')
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [supabase, router])

  const fetchParkings = async (operatorId: number) => {
    try {
      setError(null)
      
      const { data, error } = await supabase.rpc('get_operator_parkings_with_coordinates', {
        operator_id_param: operatorId
      })

      if (error) {
        throw new Error(error.message)
      }

      const validParkings = await Promise.all(
        (data || []).map(async (parking: any) => {
          const { data: nivelesData, error: nivelesError } = await supabase
            .from('niveles')
            .select('id, parqueadero_id, nombre, orden, capacidad, creado_at')
            .eq('parqueadero_id', parking.id)
            .order('orden')

          if (nivelesError) {
            console.error('Error fetching levels for parking', parking.id, nivelesError)
            return null
          }

          return {
            id: parking.id,
            nombre: parking.nombre,
            descripcion: parking.descripcion,
            tipo: parking.tipo as 'privado',
            capacidad_total: parking.capacidad_total,
            direccion: parking.direccion,
            ciudad: parking.ciudad,
            zona: parking.zona,
            activo: parking.activo,
            creado_at: parking.creado_at,
            longitude: parseFloat(parking.longitude),
            latitude: parseFloat(parking.latitude),
            niveles: nivelesData || []
          }
        })
      )

      setParkings(validParkings.filter(Boolean) as Parking[])
    } catch (err: any) {
      console.error('Error fetching parkings:', err)
      setError(err.message || 'Error al cargar los parqueaderos')
    }
  }

  const handleDeleteParking = async () => {
    if (!parkingToDelete || !operatorId) return

    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('parqueaderos')
        .delete()
        .eq('id', parkingToDelete.id)
        .eq('operador_id', operatorId)
      
      if (error) throw new Error(error.message)
      
      await fetchParkings(operatorId)
      setDeleteDialogOpen(false)
      setParkingToDelete(null)
      
    } catch (err: any) {
      console.error('Error deleting parking:', err)
      setError(err.message || 'Error al eliminar el parqueadero')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLevel = async () => {
    if (!levelToDelete) return

    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('niveles')
        .delete()
        .eq('id', levelToDelete.id)
        .eq('parqueadero_id', levelToDelete.parqueadero_id)
      
      if (error) throw new Error(error.message)
      
      await fetchParkings(operatorId!)
      setLevelDeleteDialogOpen(false)
      setLevelToDelete(null)
      
    } catch (err: any) {
      console.error('Error deleting level:', err)
      setError(err.message || 'Error al eliminar el nivel')
    } finally {
      setLoading(false)
    }
  }

  if (loading && parkings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Parqueaderos Privados</h1>
          <p className="text-gray-600">Gestiona tus instalaciones de estacionamiento privadas</p>
        </div>
        <Button asChild>
          <Link href="/operator/parkings/create">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Parqueadero
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => operatorId && fetchParkings(operatorId)}
          >
            Reintentar
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado de Parqueaderos</CardTitle>
          <CardDescription>
            Administra tus parqueaderos y sus niveles desde aquí
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parkings.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay Parqueaderos</h3>
              <p className="text-gray-500 mb-4">
                Comienza creando tu primer Parqueadero
              </p>
              <Button asChild>
                <Link href="/operator/parkings/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Parqueadero
                </Link>
              </Button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {parkings.map((parking) => (
                <AccordionItem value={parking.id.toString()} key={parking.id}>
                  <AccordionTrigger>
                    <div className="flex w-full justify-between">
                      <span>{parking.nombre}</span>
                      <span className="text-sm text-muted-foreground">
                        {parking.niveles.length} niveles
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {parking.niveles.length > 0 ? (
                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Orden</TableHead>
                              <TableHead>Capacidad</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parking.niveles.map((level) => (
                              <TableRow key={level.id}>
                                <TableCell>{level.nombre || 'Sin nombre'}</TableCell>
                                <TableCell>{level.orden || 'N/A'}</TableCell>
                                <TableCell>{level.capacidad || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/operator/parkings/${parking.id}/levels/${level.id}/edit`}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Editar
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => {
                                          setLevelToDelete(level)
                                          setLevelDeleteDialogOpen(true)
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem asChild>
                                        <Link href={`/operator/parkings/${parking.id}/levels/${level.id}/draw`}>
                                          <Layers className="h-4 w-4 mr-2" />
                                          Dibujar Plazas
                                        </Link>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          asChild
                        >
                          <Link href={`/operator/parkings/${parking.id}/levels/create`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Nivel
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground mb-2">No hay niveles para este parqueadero</p>
                        <Button 
                          variant="outline" 
                          asChild
                        >
                          <Link href={`/operator/parkings/${parking.id}/levels/create`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Nivel
                          </Link>
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación de parqueadero */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el parqueadero <strong>{parkingToDelete?.nombre}</strong>. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteParking}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación de eliminación de nivel */}
      <AlertDialog open={levelDeleteDialogOpen} onOpenChange={setLevelDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el nivel <strong>{levelToDelete?.nombre || 'Sin nombre'}</strong>. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLevel}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}