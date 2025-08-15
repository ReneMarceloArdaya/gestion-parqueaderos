'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icons } from '@/components/ui/icons'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { Usuario } from '@/lib/Supabase/supabaseClient'
import { CountryCodeSelector } from '@/components/ui/country-code-selector'
import { ArrowLeft } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [phoneValue, setPhoneValue] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Obtener usuario autenticado
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        // Obtener perfil de la tabla usuarios
        const { data: profileData, error: profileError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          setError('Error al cargar el perfil')
          console.error('Profile error:', profileError)
        } else {
          setProfile(profileData)
          setPhoneValue(profileData.telefono || '')
        }
      } catch (err) {
        setError('Error inesperado al cargar el perfil')
        console.error('Fetch user data error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [supabase, router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const nombre = formData.get('nombre') as string
      // El teléfono ya está actualizado en phoneValue

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nombre: nombre || null,
          telefono: phoneValue || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Actualizar perfil en estado
      setProfile({
        ...profile,
        nombre: nombre || null,
        telefono: phoneValue || null
      })

      setSuccess('Perfil actualizado correctamente')

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil')
      console.error('Update profile error:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icons.spinner className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className="mt-2 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-6">
          <div className="p-4 text-red-600 bg-red-50 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="mt-1 text-sm">{error}</p>
            <Button 
              onClick={() => router.push('/')} 
              className="mt-4 w-full"
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleGoBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <span className="text-gray-300">|</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleGoHome}
            className="gap-2"
          >
            <Icons.mapPin className="h-4 w-4" />
            Ir al mapa
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Perfil de Usuario</CardTitle>
            <CardDescription>
              Gestiona tu información personal y configuración de cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success && (
              <div className="mb-6 p-3 text-sm text-green-600 bg-green-50 rounded-md">
                {success}
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {/* Información básica */}
            <div className="flex items-center space-x-4 mb-8 p-4 bg-gray-50 rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">
                  {user?.user_metadata?.full_name || 'Usuario'}
                </h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
                {profile?.rol && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                    Rol: {profile.rol}
                  </span>
                )}
              </div>
            </div>

            {/* Formulario de perfil */}
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    El email no se puede modificar
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    defaultValue={profile?.nombre || ''}
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div className="space-y-2">
                  <CountryCodeSelector
                    value={phoneValue?.split(' ')[0] || '+57'}
                    phoneValue={phoneValue?.split(' ').slice(1).join(' ') || ''}
                    onPhoneChange={setPhoneValue}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rol">Rol</Label>
                  <Input
                    id="rol"
                    value={profile?.rol || 'usuario'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creado">Fecha de Registro</Label>
                  <Input
                    id="creado"
                    value={profile?.creado_at ? new Date(profile.creado_at).toLocaleDateString() : ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Perfil'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  className="flex-1"
                >
                  <Icons.logOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}