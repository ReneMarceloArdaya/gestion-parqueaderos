import { SupabaseClient } from "@supabase/supabase-js"

export type TipoVehiculo = {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  creado_at?: string
}

export type TipoVehiculoInsert = Omit<TipoVehiculo, "id">

export async function getTiposVehiculo(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("tipos_vehiculo").select("*")
  if (error) throw new Error(error.message) // 👈 convertir en string
  return data as TipoVehiculo[]
}

export async function createTipoVehiculo(
  newData: TipoVehiculoInsert,
  supabase: SupabaseClient
) {
  const { error } = await supabase.from("tipos_vehiculo").insert(newData)
  if (error) throw new Error(error.message)
}

export async function updateTipoVehiculo(
  id: number,
  newData: TipoVehiculoInsert,
  supabase: SupabaseClient
) {
  const { error } = await supabase
    .from("tipos_vehiculo")
    .update(newData)
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteTipoVehiculo(
  id: number,
  supabase: SupabaseClient
) {
  const { error } = await supabase
    .from("tipos_vehiculo")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
}