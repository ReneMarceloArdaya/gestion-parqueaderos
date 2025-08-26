import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/lib/Supabase/database.type"

export type Nivel = Database["public"]["Tables"]["niveles"]["Row"]
export type NivelInsert = Database["public"]["Tables"]["niveles"]["Insert"]
export type NivelUpdate = Database["public"]["Tables"]["niveles"]["Update"]

export async function getNivelesByParqueadero(supabase: SupabaseClient, parqueaderoId: number) {
  const { data, error } = await supabase
    .from("niveles")
    .select("*")
    .eq("parqueadero_id", parqueaderoId)
    .order("orden", { ascending: true })

  if (error) throw new Error(error.message)
  return data as Nivel[]
}

export async function createNivel(supabase: SupabaseClient, nivel: NivelInsert) {
  const { error } = await supabase.from("niveles").insert(nivel)
  if (error) throw new Error(error.message)
}

export async function updateNivel(supabase: SupabaseClient, id: number, nivel: NivelUpdate) {
  const { error } = await supabase.from("niveles").update(nivel).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteNivel(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.from("niveles").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
