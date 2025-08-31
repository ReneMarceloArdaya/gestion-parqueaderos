import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/lib/Supabase/database.type"

export type Plaza = Database["public"]["Tables"]["plazas"]["Row"]
export type PlazaInsert = Database["public"]["Tables"]["plazas"]["Insert"]
export type PlazaUpdate = Database["public"]["Tables"]["plazas"]["Update"]

// Obtener todas las plazas de un nivel, incluyendo nombre del tipo de vehículo
export async function getPlazasByNivel(supabase: SupabaseClient, nivelId: number) {
  const { data, error } = await supabase
    .from("plazas")
    .select("*, tipos_vehiculo(nombre)")
    .eq("nivel_id", nivelId)
    .order("codigo", { ascending: true })

  if (error) throw new Error(error.message)
  return data as (Plaza & { tipos_vehiculo: { nombre: string } | null })[]
}

// Crear una plaza
// Crear una plaza (con validación de nivel_id)
export async function createPlaza(supabase: SupabaseClient, plaza: PlazaInsert) {
  // Validar que el nivel existe antes de insertar
  const { data: nivel, error: nivelError } = await supabase
    .from("niveles")
    .select("id")
    .eq("id", plaza.nivel_id)
    .maybeSingle();

  if (nivelError) throw new Error(nivelError.message);
  if (!nivel) throw new Error(`El nivel con id ${plaza.nivel_id} no existe`);

  // Insertar la plaza
  const { error } = await supabase.from("plazas").insert(plaza);
  if (error) throw new Error(error.message);
}


// Actualizar una plaza
export async function updatePlaza(supabase: SupabaseClient, id: number, plaza: PlazaUpdate) {
  const { error } = await supabase.from("plazas").update(plaza).eq("id", id)
  if (error) throw new Error(error.message)
}

// Eliminar una plaza
export async function deletePlaza(supabase: SupabaseClient, id: number) {
  const { error } = await supabase.from("plazas").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
