'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Mail, Phone, Globe, Save, Loader2 } from 'lucide-react'

interface OperatorData {
  id: number
  nombre: string
  contacto_email: string | null
  contacto_telefono: string | null
  website: string | null
  usuario_id: string | null
  creado_at: string
  actualizado_at: string
}

interface UserData {
  id: string
  nombre: string | null
  email: string | null
  telefono: string | null
}

export default function ConfigurationPage() {
  const [operatorData, setOperatorData] = useState<OperatorData | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    // Datos del operador
    nombreOperador: '',
    contactoEmail: '',
    contactoTelefono: '',
    website: '',
    // Datos del usuario
    nombreUsuario: '',
    emailUsuario: '',
    telefonoUsuario: ''
  })

  const supabase = createClient()

  const loadOperatorData = async () => {
    try {
      setLoading(true)
      
      // Obtener el usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('No se pudo obtener el usuario autenticado')
      }

      // Obtener datos del operador
      const { data: operatorData, error: operatorError } = await supabase
        .from('operadores')
        .select('*')
        .eq('usuario_id', user.id)
        .single()

      if (operatorError) {
        throw new Error('No se pudieron cargar los datos del operador')
      }

      // Obtener datos del usuario desde la tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      if (usuarioError) {
        throw new Error('No se pudieron cargar los datos del usuario')
      }

      setOperatorData(operatorData as any)
      setUserData(usuarioData as any)
      
      // Rellenar el formulario con los datos actuales
      setFormData({
        nombreOperador: (operatorData as any)?.nombre || '',
        contactoEmail: (operatorData as any)?.contacto_email || '',
        contactoTelefono: (operatorData as any)?.contacto_telefono || '',
        website: (operatorData as any)?.website || '',
        nombreUsuario: (usuarioData as any)?.nombre || '',
        emailUsuario: (usuarioData as any)?.email || '',
        telefonoUsuario: (usuarioData as any)?.telefono || ''
      })

    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({
        type: 'error',
        text: 'Error al cargar los datos. Por favor, intenta nuevamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('No se pudo obtener el usuario autenticado')
      }

      // Actualizar datos del operador
      if (operatorData) {
        const { error: operatorError } = await (supabase as any)
          .from('operadores')
          .update({
            nombre: formData.nombreOperador,
            contacto_email: formData.contactoEmail,
            contacto_telefono: formData.contactoTelefono,
            website: formData.website,
            actualizado_at: new Date().toISOString()
          })
          .eq('id', operatorData.id)

        if (operatorError) {
          throw new Error('Error al actualizar los datos del operador')
        }
      }

      // Actualizar datos del usuario
      if (userData) {
        const { error: usuarioError } = await (supabase as any)
          .from('usuarios')
          .update({
            nombre: formData.nombreUsuario,
            email: formData.emailUsuario,
            telefono: formData.telefonoUsuario
          })
          .eq('id', userData.id)

        if (usuarioError) {
          throw new Error('Error al actualizar los datos del usuario')
        }
      }

      setMessage({
        type: 'success',
        text: 'Datos actualizados correctamente'
      })

      // Recargar los datos para reflejar los cambios
      await loadOperatorData()

    } catch (error) {
      console.error('Error saving data:', error)
      setMessage({
        type: 'error',
        text: 'Error al guardar los datos. Por favor, intenta nuevamente.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  useEffect(() => {
    loadOperatorData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando configuración...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configuración del Operador
        </h1>
        <p className="text-gray-600">
          Gestiona y actualiza la información de tu perfil y empresa
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Información Personal del Usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Información Personal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nombreUsuario" className="text-sm font-medium">
                Nombre Completo
              </Label>
              <Input
                id="nombreUsuario"
                value={formData.nombreUsuario}
                onChange={(e) => handleInputChange('nombreUsuario', e.target.value)}
                placeholder="Ingresa tu nombre completo"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="emailUsuario" className="text-sm font-medium">
                Correo Electrónico
              </Label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="emailUsuario"
                  type="email"
                  value={formData.emailUsuario}
                  onChange={(e) => handleInputChange('emailUsuario', e.target.value)}
                  placeholder="tu@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="telefonoUsuario" className="text-sm font-medium">
                Teléfono Personal
              </Label>
              <div className="relative mt-1">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="telefonoUsuario"
                  value={formData.telefonoUsuario}
                  onChange={(e) => handleInputChange('telefonoUsuario', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Operador/Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Información de la Empresa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nombreOperador" className="text-sm font-medium">
                Nombre de la Empresa
              </Label>
              <Input
                id="nombreOperador"
                value={formData.nombreOperador}
                onChange={(e) => handleInputChange('nombreOperador', e.target.value)}
                placeholder="Nombre de tu empresa"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contactoEmail" className="text-sm font-medium">
                Email de Contacto Empresarial
              </Label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="contactoEmail"
                  type="email"
                  value={formData.contactoEmail}
                  onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contactoTelefono" className="text-sm font-medium">
                Teléfono de Contacto Empresarial
              </Label>
              <div className="relative mt-1">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="contactoTelefono"
                  value={formData.contactoTelefono}
                  onChange={(e) => handleInputChange('contactoTelefono', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website" className="text-sm font-medium">
                Sitio Web (Opcional)
              </Label>
              <div className="relative mt-1">
                <Globe className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.miempresa.com"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información Adicional (Card completa en el ancho) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium text-gray-500">ID de Operador</Label>
              <p className="text-lg font-mono">{operatorData?.id || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Cuenta creada</Label>
              <p className="text-lg">
                {(operatorData as any)?.creado_at 
                  ? new Date((operatorData as any).creado_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Última actualización</Label>
              <p className="text-lg">
                {(operatorData as any)?.actualizado_at 
                  ? new Date((operatorData as any).actualizado_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Estado de la cuenta</Label>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-lg text-green-600 font-medium">Activa</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex justify-end space-x-4 mt-8">
        <Button 
          variant="outline" 
          onClick={() => {
            // Restaurar datos originales
            if (operatorData && userData) {
              setFormData({
                nombreOperador: (operatorData as any)?.nombre || '',
                contactoEmail: (operatorData as any)?.contacto_email || '',
                contactoTelefono: (operatorData as any)?.contacto_telefono || '',
                website: (operatorData as any)?.website || '',
                nombreUsuario: (userData as any)?.nombre || '',
                emailUsuario: (userData as any)?.email || '',
                telefonoUsuario: (userData as any)?.telefono || ''
              })
            }
            setMessage(null)
          }}
          disabled={saving}
        >
          Cancelar Cambios
        </Button>
        
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* Información de Ayuda */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                Información sobre la configuración
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Los cambios se guardan inmediatamente en la base de datos</li>
                <li>• La información personal se usa para la identificación en el sistema</li>
                <li>• Los datos de contacto empresarial son visibles para los usuarios</li>
                <li>• El sitio web es opcional y debe incluir https://</li>
                <li>• Todos los campos son opcionales excepto el nombre de la empresa</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}