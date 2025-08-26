import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "./database.type"

export type Plano = Database["public"]["Tables"]["planos"]["Row"]
export type PlanoInsert = Database["public"]["Tables"]["planos"]["Insert"]
export type PlanoUpdate = Database["public"]["Tables"]["planos"]["Update"]

// Funciones básicas de CRUD:

export async function getPlanosByNivel(supabase: SupabaseClient, nivelId: number) {
  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .eq("nivel_id", nivelId)
    .order("orden", { ascending: true })

  if (error) throw new Error(error.message)
  return data as Plano[]
}

export async function createPlano(supabase: SupabaseClient, plano: PlanoInsert) {
  const { error } = await supabase.from("planos").insert(plano)
  if (error) throw new Error(error.message)
}

export async function updatePlano(supabase: SupabaseClient, id: number, plano: PlanoUpdate) {
  const { error } = await supabase.from("planos").update(plano).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deletePlano(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.from("planos").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
