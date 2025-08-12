import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.type'

// Cliente para el navegador (client components)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Tipos específicos para nuestro proyecto
export type Parking = Database['public']['Tables']['parqueaderos']['Row']
export type ParkingInsert = Database['public']['Tables']['parqueaderos']['Insert']
export type ParkingUpdate = Database['public']['Tables']['parqueaderos']['Update']

export type Usuario = Database['public']['Tables']['usuarios']['Row']