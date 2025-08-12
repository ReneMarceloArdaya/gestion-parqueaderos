'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/Supabase/supabaseClient'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resending'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  useEffect(() => {
    const handleConfirmation = async () => {
      if (error) {
        // Manejar errores de confirmación
        setStatus('error')
        if (errorCode === 'otp_expired') {
          setMessage('El enlace de confirmación ha expirado. Solicita uno nuevo.')
        } else {
          setMessage(errorDescription || 'Error al confirmar el email.')
        }
        return
      }

      // Intentar confirmar la sesión
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setStatus('error')
          setMessage('Error al procesar la confirmación.')
          return
        }

        if (data.session) {
          setStatus('success')
          setMessage('¡Email confirmado correctamente! Redirigiendo...')
          
          // Redirigir al home después de 2 segundos
          setTimeout(() => {
            router.push('/')
            router.refresh()
          }, 2000)
        } else {
          setStatus('error')
          setMessage('No se pudo confirmar la sesión. El enlace puede haber expirado.')
        }
      } catch (err) {
        setStatus('error')
        setMessage('Error inesperado al confirmar el email.')
        console.error('Confirmation error:', err)
      }
    }

    handleConfirmation()
  }, [error, errorCode, errorDescription, router, supabase])

  const handleResendEmail = async () => {
    setStatus('resending')
    
    try {
      const email = localStorage.getItem('signup_email') // Guardado durante el signup
      if (!email) {
        throw new Error('No se encontró el email para reenviar')
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (resendError) throw resendError

      setStatus('success')
      setMessage('¡Email de confirmación reenviado! Revisa tu bandeja de entrada.')
    } catch (err) {
      setStatus('error')
      setMessage('Error al reenviar el email de confirmación.')
      console.error('Resend error:', err)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Icons.spinner className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <h1 className="mt-4 text-2xl font-bold">Confirmando Email</h1>
              <p className="mt-2 text-gray-600">Procesando confirmación...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold">¡Confirmado!</h1>
              <p className="mt-2 text-gray-600">{message}</p>
            </>
          )}

          {(status === 'error' || status === 'resending') && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold">Confirmación Fallida</h1>
              <p className="mt-2 text-gray-600">{message}</p>
              
              {errorCode === 'otp_expired' && (
                <div className="mt-6">
                  <Button 
                    onClick={handleResendEmail} 
                    disabled={status === 'resending'}
                    className="w-full"
                  >
                    {status === 'resending' ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Reenviando...
                      </>
                    ) : (
                      'Reenviar Email de Confirmación'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="mt-6">
            <Link 
              href="/login" 
              className="text-blue-600 hover:underline text-sm"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}