'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/Supabase/supabaseClient'
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
  MoreHorizontal, 
  Eye, 
  Edit, 
  Plus,
  Trash2,
  MapPin,
  Car
} from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Parking {
  id: number
  nombre: string
  descripcion: string | null
  tipo: "publico" | "privado"
  capacidad_total: number
  direccion: string | null
  ciudad: string | null
  zona: string | null
  activo: boolean
  creado_at: string
  longitude: number
  latitude: number
}

export default function ParkingsPage() {
  const [parkings, setParkings] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [parkingToDelete, setParkingToDelete] = useState<Parking | null>(null)
  const [operatorId, setOperatorId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient() as any
  const router = useRouter()

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Obtener el operador actual
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
      
      // Usar la función RPC específica para operadores
      const { data, error } = await supabase.rpc('get_operator_parkings_with_coordinates', {
        operator_id_param: operatorId
      })

      if (error) {
        throw new Error(error.message)
      }

      // Filtrar parqueaderos con coordenadas válidas
      const validParkings = (data || [])
        .filter(
          (parking: any) =>
            parking.longitude !== null &&
            parking.latitude !== null &&
            !isNaN(parseFloat(parking.longitude)) &&
            !isNaN(parseFloat(parking.latitude))
        )
        .map((parking: any) => ({
          id: parking.id,
          nombre: parking.nombre,
          descripcion: parking.descripcion,
          tipo: parking.tipo as "publico" | "privado",
          capacidad_total: parking.capacidad_total,
          direccion: parking.direccion,
          ciudad: parking.ciudad,
          zona: parking.zona,
          activo: parking.activo,
          creado_at: parking.creado_at,
          longitude: parseFloat(parking.longitude),
          latitude: parseFloat(parking.latitude),
        }))

      setParkings(validParkings)
    } catch (err: any) {
      console.error('Error fetching parkings:', err)
      setError(err.message || 'Error al cargar los parqueaderos')
    }
  }

  const handleDeleteParking = async () => {
    if (!parkingToDelete || !operatorId) return

    try {
      setLoading(true)
      
      // Eliminar parqueadero (solo si pertenece al operador)
      const { error } = await supabase
        .from('parqueaderos')
        .delete()
        .eq('id', parkingToDelete.id)
        .eq('operador_id', operatorId)
      
      if (error) throw new Error(error.message)
      
      // Actualizar la lista
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

  const handleViewOnMap = (parking: Parking) => {
    if (parking.longitude && parking.latitude) {
      // Abrir en una nueva pestaña con coordenadas
      window.open(`https://www.google.com/maps?q=${parking.latitude},${parking.longitude}`, '_blank')
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
          <h1 className="text-3xl font-bold">Parqueo</h1>
          <p className="text-gray-600">Gestiona tus instalaciones de estacionamiento</p>
        </div>
        <Button asChild>
          <Link href="/operator/parkings/create">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Parqueo
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
          <CardTitle>Listado de Parqueo</CardTitle>
          <CardDescription>
            Administra todos tus Parqueo desde aquí
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parkings.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay Parqueo</h3>
              <p className="text-gray-500 mb-4">
                Comienza creando tu primer Parqueo
              </p>
              <Button asChild>
                <Link href="/operator/parkings/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Parqueo
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parkings.map((parking) => (
                  <TableRow key={parking.id}>
                    <TableCell className="font-medium">{parking.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={parking.tipo === 'publico' ? 'default' : 'destructive'}>
                        {parking.tipo === 'publico' ? 'Público' : 'Privado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{parking.zona || 'Sin zona'}</div>
                        <div className="text-sm text-muted-foreground">
                          {parking.ciudad || 'Sin ciudad'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{parking.capacidad_total} espacios</TableCell>
                    <TableCell>
                      <Badge variant={parking.activo ? 'default' : 'secondary'}>
                        {parking.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleViewOnMap(parking)}>
                            <MapPin className="h-4 w-4 mr-2" />
                            Ver en mapa
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/operator/parkings/${parking.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/operator/parkings/${parking.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setParkingToDelete(parking)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) setParkingToDelete(null)
      }}>
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
    </div>
  )
}