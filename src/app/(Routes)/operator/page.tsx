'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, BarChart3, Image, Calendar } from "lucide-react"
import Link from 'next/link'

export default function OperatorHome() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Verificar si el usuario está autenticado
        const {  data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        // Verificar que el usuario sea operador
        const { data, error } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        if (error || data?.rol == 'usuario') {
          router.push('/')
          return
        }

      } catch (err) {
        console.error('Error checking user:', err)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Bienvenido al Panel de Operadores</h1>
        <p className="text-xl text-gray-600 mb-2">
          Hola, {user?.user_metadata?.full_name || user?.email}
        </p>
        <p className="text-gray-500">
          Gestiona tus parqueaderos y monitorea el rendimiento de tu negocio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Car className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle>Parqueaderos</CardTitle>
            <CardDescription>Gestiona tus instalaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/operator/parkings">
              <Button className="w-full">Ver Parqueaderos</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <BarChart3 className="h-8 w-8 text-green-500 mb-2" />
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Estadísticas y métricas</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/operator/dashboard">
              <Button className="w-full">Ver Dashboard</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Image className="h-8 w-8 text-purple-500 mb-2" />
            <CardTitle>Imágenes</CardTitle>
            <CardDescription>Gestiona las fotos</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/operator/images">
              <Button className="w-full">Ver Imágenes</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Calendar className="h-8 w-8 text-orange-500 mb-2" />
            <CardTitle>Reservas</CardTitle>
            <CardDescription>Administra las reservas</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/operator/reservations">
              <Button className="w-full">Ver Reservas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Link href="/operator/dashboard">
          <Button size="lg">
            Ir al Dashboard Principal
          </Button>
        </Link>
      </div>
    </div>
  )
}