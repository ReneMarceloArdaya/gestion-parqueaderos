'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet"
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar"
import { 
  Car, 
  BarChart3, 
  Image, 
  Users, 
  Settings, 
  Menu, 
  LogOut,
  MapPin,
  CreditCard,
  Calendar
} from "lucide-react"
import Link from 'next/link'
import { Operador } from '@/lib/Supabase/supabaseClient'

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [operator, setOperator] = useState<Operador | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const initializeLayout = async () => {
      try {
        // Obtener usuario actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        // Verificar que el usuario sea operador
        const { data, error: userError } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        if (userError || data?.rol == 'usuario') {
          router.push('/')
          return
        }

        // Obtener datos del operador asociado al usuario
        const { data: operatorData, error: operatorError } = await supabase
          .from('operadores')
          .select('*')
          .eq('usuario_id', session.user.id)
          .single()

        if (!operatorError && operatorData) {
          setOperator(operatorData)
        } else {
          // Si no existe operador, crear uno básico
          const { data: newOperator, error: createError } = await supabase
            .from('operadores')
            .insert({
              nombre: session.user.user_metadata?.full_name || 'Operador',
              contacto_email: session.user.email,
              usuario_id: session.user.id
            })
            .select()
            .single()

          if (!createError && newOperator) {
            setOperator(newOperator)
          }
        }

      } catch (err) {
        console.error('Error initializing layout:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeLayout()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navigationItems = [
    {
      title: "Dashboard",
      href: "/operator/dashboard",
      icon: BarChart3,
    },
    {
      title: "Parqueos",
      href: "/operator/parkings",
      icon: Car,
    },
    {
      title: "Imágenes",
      href: "/operator/images",
      icon: Image,
    },
    {
      title: "Reservas",
      href: "/operator/reservations",
      icon: Calendar,
    },
    {
      title: "Ingresos",
      href: "/operator/income",
      icon: CreditCard,
    },
    {
      title: "Usuarios",
      href: "/operator/users",
      icon: Users,
    },
    {
      title: "Configuración",
      href: "/operator/settings",
      icon: Settings,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar para escritorio */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r bg-background">
          <div className="flex items-center h-16 px-4 border-b shrink-0">
            <Car className="h-6 w-6 text-blue-600" />
            <span className="ml-2 text-lg font-semibold">ParkManager</span>
          </div>
          
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center px-4 mb-6">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {operator?.nombre?.charAt(0) || user?.email?.charAt(0) || 'O'}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{operator?.nombre || 'Operador'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <nav className="flex-1 px-2 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.title}
                  </Link>
                )
              })}
            </nav>
            
            <div className="px-2 mt-auto pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar para móvil */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="fixed top-4 left-4 md:hidden z-50"
            size="icon"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center h-16 px-4 border-b shrink-0">
              <Car className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-semibold">ParkManager</span>
            </div>
            
            <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center px-4 mb-6">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {operator?.nombre?.charAt(0) || user?.email?.charAt(0) || 'O'}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium">{operator?.nombre || 'Operador'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <nav className="flex-1 px-2 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-900"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.title}
                    </Link>
                  )
                })}
              </nav>
              
              <div className="px-2 mt-auto pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    handleLogout()
                    setMobileOpen(false)
                  }}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 md:pl-64">
        <header className="sticky top-0 z-40 border-b bg-background md:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <Car className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-semibold">ParkManager</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </div>
        </header>
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}