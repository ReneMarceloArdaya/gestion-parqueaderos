'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Car, 
  BarChart3, 
  Image, 
  Calendar, 
  Hotel,
  SquareParking,
  CreditCard,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  Activity,
  AlertCircle,
  ArrowRight
} from "lucide-react"
import Link from 'next/link'

interface DashboardStats {
  totalParqueaderos: number
  totalPlazas: number
  reservasPendientes: number
  reservasHoy: number
  reservasUrgentes: number
  ingresosMes: number
}

export default function OperatorHome() {
  const [user, setUser] = useState<any>(null)
  const [operator, setOperator] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalParqueaderos: 0,
    totalPlazas: 0,
    reservasPendientes: 0,
    reservasHoy: 0,
    reservasUrgentes: 0,
    ingresosMes: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true)
        
        // Verificar si el usuario está autenticado
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        // Verificar que el usuario sea operador
        const { data: userData, error: userError } = await (supabase as any)
          .from('usuarios')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        if (userError || userData?.rol === 'usuario') {
          router.push('/')
          return
        }

        // Obtener datos del operador
        const { data: operatorData, error: operatorError } = await (supabase as any)
          .from('operadores')
          .select('*')
          .eq('usuario_id', session.user.id)
          .single()

        if (operatorData) {
          setOperator(operatorData)
          await loadDashboardStats(operatorData.id)
        }

      } catch (err) {
        console.error('Error initializing page:', err)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [router])

  const loadDashboardStats = async (operatorId: number) => {
    try {
      // Total de parqueaderos
      const { data: parqueaderos } = await (supabase as any)
        .from('parqueaderos')
        .select('id')
        .eq('operador_id', operatorId)
        .eq('activo', true)

      // Total de plazas
      const { data: plazas } = await (supabase as any)
        .from('plazas')
        .select('id, niveles!inner(parqueadero_id)')
        .eq('niveles.parqueadero_id', operatorId)

      // Reservas pendientes
      const { data: reservasPendientes } = await (supabase as any)
        .from('reservas')
        .select('id, parqueaderos!inner(operador_id)')
        .eq('parqueaderos.operador_id', operatorId)
        .eq('estado', 'activa')

      // Reservas de hoy
      const hoy = new Date().toISOString().split('T')[0]
      const { data: reservasHoy } = await (supabase as any)
        .from('reservas')
        .select('id, hora_inicio, parqueaderos!inner(operador_id)')
        .eq('parqueaderos.operador_id', operatorId)
        .gte('hora_inicio', `${hoy}T00:00:00`)
        .lt('hora_inicio', `${hoy}T23:59:59`)

      // Reservas urgentes (próximas 2 horas)
      const ahora = new Date()
      const en2h = new Date(ahora.getTime() + 2 * 60 * 60 * 1000)
      const { data: reservasUrgentes } = await (supabase as any)
        .from('reservas')
        .select('id, hora_inicio, parqueaderos!inner(operador_id)')
        .eq('parqueaderos.operador_id', operatorId)
        .eq('estado', 'activa')
        .gte('hora_inicio', ahora.toISOString())
        .lte('hora_inicio', en2h.toISOString())

      setStats({
        totalParqueaderos: parqueaderos?.length || 0,
        totalPlazas: plazas?.length || 0,
        reservasPendientes: reservasPendientes?.length || 0,
        reservasHoy: reservasHoy?.length || 0,
        reservasUrgentes: reservasUrgentes?.length || 0,
        ingresosMes: 0 // Esto se puede calcular más adelante con las transacciones
      })

    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Cargando panel de control...</p>
        </div>
      </div>
    )
  }

  const navigationCards = [
    {
      title: "Dashboard",
      description: "Estadísticas y métricas detalladas",
      href: "/operator/dashboard",
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      stats: `${stats.totalParqueaderos} parqueaderos`
    },
    {
      title: "Parqueaderos",
      description: "Gestiona tus instalaciones",
      href: "/operator/parkings",
      icon: Car,
      color: "text-green-500",
      bgColor: "bg-green-50",
      stats: `${stats.totalPlazas} plazas totales`
    },
    {
      title: "Niveles",
      description: "Administra niveles y plantas",
      href: "/operator/levels",
      icon: Hotel,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      stats: "Organizar espacios"
    },
    {
      title: "Plazas",
      description: "Vista general de espacios",
      href: "/operator/squares",
      icon: SquareParking,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
      stats: "Diseñar layout"
    },
    {
      title: "Imágenes",
      description: "Gestiona las fotos de parqueaderos",
      href: "/operator/images",
      icon: Image,
      color: "text-pink-500",
      bgColor: "bg-pink-50",
      stats: "Media management"
    },
    {
      title: "Reservas",
      description: "Administra las reservas pendientes",
      href: "/operator/reservations",
      icon: Calendar,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      stats: `${stats.reservasPendientes} pendientes`,
      urgent: stats.reservasUrgentes > 0,
      urgentCount: stats.reservasUrgentes
    },
    {
      title: "Ingresos",
      description: "Control financiero y reportes",
      href: "/operator/income",
      icon: CreditCard,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
      stats: "Próximamente"
    }
  ]

  return (
    <div className="container mx-auto p-6">
      {/* Header de bienvenida */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ¡Bienvenido, {operator?.nombre || user?.user_metadata?.full_name || 'Operador'}!
            </h1>
            <p className="text-gray-600 mt-2">
              Panel de control para gestión de parqueaderos
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Operador activo
              </Badge>
              <Badge variant="outline">
                {user?.email}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parqueaderos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParqueaderos}</div>
            <p className="text-xs text-muted-foreground">
              Instalaciones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plazas Totales</CardTitle>
            <SquareParking className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlazas}</div>
            <p className="text-xs text-muted-foreground">
              Espacios disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reservasHoy}</div>
            <p className="text-xs text-muted-foreground">
              Programadas para hoy
            </p>
          </CardContent>
        </Card>

        <Card className={stats.reservasUrgentes > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.reservasUrgentes > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.reservasUrgentes > 0 ? 'text-red-600' : ''}`}>
              {stats.reservasUrgentes}
            </div>
            <p className="text-xs text-muted-foreground">
              Próximas 2 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas importantes */}
      {stats.reservasUrgentes > 0 && (
        <Card className="border-red-200 bg-red-50 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    ¡Atención! Reservas urgentes detectadas
                  </h3>
                  <p className="text-red-700 text-sm">
                    Tienes {stats.reservasUrgentes} reserva{stats.reservasUrgentes !== 1 ? 's' : ''} que comienzan en menos de 2 horas
                  </p>
                </div>
              </div>
              <Link href="/operator/reservations">
                <Button variant="destructive" size="sm">
                  Ver reservas
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de navegación principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {navigationCards.map((item) => {
          const Icon = item.icon
          
          return (
            <Card key={item.href} className="hover:shadow-lg transition-all duration-200 group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  {item.urgent && (
                    <Badge variant="destructive" className="animate-pulse">
                      {item.urgentCount} urgente{item.urgentCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <CardTitle className="group-hover:text-blue-600 transition-colors">
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.stats}</span>
                  <Link href={item.href}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="group-hover:bg-blue-100 group-hover:text-blue-700"
                    >
                      Acceder
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Accesos Rápidos
          </CardTitle>
          <CardDescription>
            Funciones más utilizadas para agilizar tu trabajo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/operator/parkings/create">
              <Button variant="outline" className="w-full h-auto flex flex-col items-center gap-2 py-4">
                <Car className="h-6 w-6" />
                <span>Nuevo Parqueadero</span>
              </Button>
            </Link>
            
            <Link href="/operator/squares">
              <Button variant="outline" className="w-full h-auto flex flex-col items-center gap-2 py-4">
                <SquareParking className="h-6 w-6" />
                <span>Diseñar Plazas</span>
              </Button>
            </Link>
            
            <Link href="/operator/reservations">
              <Button 
                variant={stats.reservasPendientes > 0 ? "default" : "outline"} 
                className="w-full h-auto flex flex-col items-center gap-2 py-4"
              >
                <Calendar className="h-6 w-6" />
                <span>
                  Reservas
                  {stats.reservasPendientes > 0 && (
                    <Badge className="ml-2" variant="secondary">
                      {stats.reservasPendientes}
                    </Badge>
                  )}
                </span>
              </Button>
            </Link>
            
            <Link href="/operator/images">
              <Button variant="outline" className="w-full h-auto flex flex-col items-center gap-2 py-4">
                <Image className="h-6 w-6" />
                <span>Gestionar Imágenes</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Información del operador */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Información del Operador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Nombre</label>
              <p className="text-lg">{operator?.nombre || 'No especificado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email de contacto</label>
              <p>{operator?.contacto_email || user?.email || 'No especificado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Teléfono</label>
              <p>{operator?.contacto_telefono || 'No especificado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Website</label>
              <p>{operator?.website || 'No especificado'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Resumen de Actividad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Parqueaderos activos</span>
              </div>
              <span className="font-semibold">{stats.totalParqueaderos}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Plazas configuradas</span>
              </div>
              <span className="font-semibold">{stats.totalPlazas}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${stats.reservasPendientes > 0 ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                <span>Reservas pendientes</span>
              </div>
              <span className="font-semibold">{stats.reservasPendientes}</span>
            </div>
            
            {stats.reservasUrgentes > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-700">Reservas urgentes</span>
                </div>
                <span className="font-semibold text-red-600">{stats.reservasUrgentes}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}