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
  BarChart, 
  DollarSign, 
  Car, 
  Users,
  Layers
} from "lucide-react"
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'

interface ParkingWithStats {
  id: number
  nombre: string
  tipo: 'privado'
  reservas_count: number
  ingresos_mes: number
  ocupacion_promedio: number
  capacidad_total: number
  niveles_count: number
}

interface LevelOccupancy {
  parkingName: string
  levelName: string
  ocupacion: number
}

export default function OperatorDashboard() {
  const [parkings, setParkings] = useState<ParkingWithStats[]>([])
  const [levelOccupancy, setLevelOccupancy] = useState<LevelOccupancy[]>([])
  const [loading, setLoading] = useState(true)
  const [operatorId, setOperatorId] = useState<number | null>(null)
  const [stats, setStats] = useState({
    totalParkings: 0,
    totalLevels: 0,
    totalReservations: 0,
    totalIncome: 0,
    avgOccupancy: 0
  })

  const supabase = createClient() as any

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Obtener el operador actual
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Debes estar autenticado')
        }

        const { data: operadorData, error: operadorError } = await supabase
          .from('operadores')
          .select('id')
          .eq('usuario_id', session.user.id)
          .single()

        if (operadorError || !operadorData) {
          throw new Error('No se encontró el operador asociado al usuario')
        }

        setOperatorId(operadorData.id)
        await fetchData(operadorData.id)
      } catch (err: any) {
        console.error('Error initializing dashboard:', err.message)
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [supabase])

  const fetchData = async (operatorId: number) => {
    try {
      // Obtener parqueaderos privados del operador
      const { data: parkingsData, error: parkingsError } = await supabase
        .rpc('get_operator_parkings_with_coordinates', {
          operator_id_param: operatorId,
        })

      if (parkingsError) throw parkingsError

      // Obtener estadísticas por parqueadero
      const parkingsWithStats = await Promise.all(
        (parkingsData || []).map(async (parking: any) => {
          // Contar niveles por parqueadero
          const { data: nivelesData, error: nivelesError } = await supabase
            .from('niveles')
            .select('id, nombre, capacidad')
            .eq('parqueadero_id', parking.id)

          if (nivelesError) throw nivelesError

          // Contar reservas activas/confirmadas del mes actual
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const { data: reservasData, error: reservasError } = await supabase
            .from('reservas')
            .select('id, plaza_id')
            .eq('parqueadero_id', parking.id)
            .in('estado', ['activa', 'confirmada'])
            .gte('creado_at', startOfMonth.toISOString())

          if (reservasError) throw reservasError

          // Calcular ingresos del mes actual
          const { data: transaccionesData, error: transaccionesError } = await supabase
            .from('transacciones')
            .select('importe')
            .eq('estado', 'confirmado')
            .gte('creado_at', startOfMonth.toISOString())
            .in('reserva_id', reservasData?.map((r: any) => r.id) || [])

          if (transaccionesError) throw transaccionesError

          // Calcular ocupación por nivel
          const nivelesOccupancy = await Promise.all(
            (nivelesData || []).map(async (nivel: any) => {
              const { data: plazasData, error: plazasError } = await supabase
                .from('plazas')
                .select('id')
                .eq('nivel_id', nivel.id)
                .in('estado', ['ocupada', 'reservada'])

              if (plazasError) throw plazasError

              const ocupacion = nivel.capacidad
                ? Math.round((plazasData?.length || 0) / nivel.capacidad * 100)
                : 0

              return {
                parkingName: parking.nombre,
                levelName: nivel.nombre || `Nivel ${nivel.id}`,
                ocupacion,
              }
            })
          )

          // Calcular ocupación promedio del parqueadero
          const totalPlazasOcupadas = nivelesOccupancy.reduce((sum, n) => sum + (n.ocupacion * (nivelesData.find(l => l.nombre === n.levelName || `Nivel ${l.id}` === n.levelName)?.capacidad || 0) / 100), 0)
          const ocupacionPromedio = parking.capacidad_total
            ? Math.round(totalPlazasOcupadas / parking.capacidad_total * 100)
            : 0

          return {
            id: parking.id,
            nombre: parking.nombre,
            tipo: parking.tipo,
            reservas_count: reservasData?.length || 0,
            ingresos_mes: transaccionesData?.reduce((sum: number, t: any) => sum + (t.importe || 0), 0) || 0,
            ocupacion_promedio: ocupacionPromedio,
            capacidad_total: parking.capacidad_total || 0,
            niveles_count: nivelesData?.length || 0,
          }
        })
      )

      setParkings(parkingsWithStats)

      // Establecer ocupación por nivel
      const allLevelsOccupancy = parkingsWithStats.flatMap(p => 
        p.niveles_count > 0 
          ? (async () => {
              const { data: nivelesData } = await supabase
                .from('niveles')
                .select('id, nombre, capacidad')
                .eq('parqueadero_id', p.id)

              return Promise.all(
                (nivelesData || []).map(async (nivel: any) => {
                  const { data: plazasData } = await supabase
                    .from('plazas')
                    .select('id')
                    .eq('nivel_id', nivel.id)
                    .in('estado', ['ocupada', 'reservada'])

                  const ocupacion = nivel.capacidad
                    ? Math.round((plazasData?.length || 0) / nivel.capacidad * 100)
                    : 0

                  return {
                    parkingName: p.nombre,
                    levelName: nivel.nombre || `Nivel ${nivel.id}`,
                    ocupacion,
                  }
                })
              )
            })().then(res => res)
          : []
      )

      setLevelOccupancy((await Promise.all(allLevelsOccupancy)).flat())

      // Calcular estadísticas generales
      const totalParkings = parkingsWithStats.length
      const totalLevels = parkingsWithStats.reduce((sum, p) => sum + p.niveles_count, 0)
      const totalReservations = parkingsWithStats.reduce((sum, p) => sum + p.reservas_count, 0)
      const totalIncome = parkingsWithStats.reduce((sum, p) => sum + p.ingresos_mes, 0)
      const avgOccupancy = parkingsWithStats.length
        ? Math.round(parkingsWithStats.reduce((sum, p) => sum + p.ocupacion_promedio, 0) / parkingsWithStats.length)
        : 0

      setStats({
        totalParkings,
        totalLevels,
        totalReservations,
        totalIncome,
        avgOccupancy,
      })
    } catch (err: any) {
      console.error('Error fetching data:', err.message)
    }
  }

  // Datos para gráficos
  const chartData = parkings.map(parking => ({
    name: parking.nombre,
    reservas: parking.reservas_count,
    ingresos: parking.ingresos_mes / 1000, // En miles para mejor visualización
    ocupacion: parking.ocupacion_promedio,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Resumen de tus parqueaderos privados</p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parqueaderos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParkings}</div>
            <p className="text-xs text-muted-foreground">Privados activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Niveles</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLevels}</div>
            <p className="text-xs text-muted-foreground">En todos los parqueaderos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas este mes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReservations}</div>
            <p className="text-xs text-muted-foreground">Total de reservas del mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">COP</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación promedio</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgOccupancy}%
            </div>
            <p className="text-xs text-muted-foreground">de capacidad utilizada</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Reservas por Parqueadero</CardTitle>
            <CardDescription>Comparativa de reservas mensuales</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reservas" fill="#3b82f6" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ocupación por Nivel</CardTitle>
            <CardDescription>Porcentaje de ocupación por nivel en cada parqueadero</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={levelOccupancy}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="levelName" />
                <YAxis />
                <Tooltip formatter={(value, name, props) => [`${value}%`, `${props.payload.parkingName} - ${props.payload.levelName}`]} />
                <Bar dataKey="ocupacion" fill="#10b981" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de parqueaderos */}
      <Card>
        <CardHeader>
          <CardTitle>Tus Parqueaderos Privados</CardTitle>
          <CardDescription>Resumen de rendimiento por instalación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parkings.map((parking) => (
              <Card key={parking.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{parking.nombre}</CardTitle>
                  <CardDescription>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Privado
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Niveles:</span>
                      <span className="font-medium">{parking.niveles_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reservas:</span>
                      <span className="font-medium">{parking.reservas_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ingresos:</span>
                      <span className="font-medium">${parking.ingresos_mes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ocupación:</span>
                      <span className="font-medium">{parking.ocupacion_promedio}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacidad:</span>
                      <span className="font-medium">{parking.capacidad_total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}