import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/lib/Supabase/database.type"

export type Tarifa = Database["public"]["Tables"]["tarifas"]["Row"]
export type TarifaInsert = Database["public"]["Tables"]["tarifas"]["Insert"]
export type TarifaUpdate = Database["public"]["Tables"]["tarifas"]["Update"]

export async function getTarifasByParqueadero(supabase: SupabaseClient, parqueaderoId: number) {
  const { data, error } = await supabase
    .from("tarifas")
    .select("*, tipos_vehiculo(nombre)")
    .eq("parqueadero_id", parqueaderoId)
    .order("id", { ascending: true })

  if (error) throw new Error(error.message)
  return data as (Tarifa & { tipos_vehiculo: { nombre: string } })[]
}

export async function createTarifa(supabase: SupabaseClient, tarifa: TarifaInsert) {
  const { error } = await supabase.from("tarifas").insert(tarifa)
  if (error) throw new Error(error.message)
}

export async function updateTarifa(supabase: SupabaseClient, id: number, tarifa: TarifaUpdate) {
  const { error } = await supabase.from("tarifas").update(tarifa).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteTarifa(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.from("tarifas").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
