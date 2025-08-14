import { SupabaseClient } from '@supabase/supabase-js'
import { Parking, ParkingInsert, ParkingUpdate } from './supabaseClient'

export async function getParqueaderos(supabase: SupabaseClient): Promise<Parking[]> {
  const { data, error } = await supabase
    .from('parqueaderos')
    .select('*')
    .order('id', { ascending: false })

  if (error) throw error
  return data
}

export async function getParqueaderoById(id: number, supabase: SupabaseClient): Promise<Parking | null> {
  const { data, error } = await supabase
    .from('parqueaderos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createParqueadero(parqueadero: ParkingInsert, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('parqueaderos')
    .insert(parqueadero)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateParqueadero(id: number, parqueadero: ParkingUpdate, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('parqueaderos')
    .update(parqueadero)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteParqueadero(id: number, supabase: SupabaseClient) {
  const { error } = await supabase
    .from('parqueaderos')
    .delete()
    .eq('id', id)

  if (error) throw error
}
