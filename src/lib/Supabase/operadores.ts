import { createClient } from "./supabaseClient"
import { Database } from "@/lib/Supabase/database.type"

// Tipo de operador según la BD
type Operador = Database["public"]["Tables"]["operadores"]["Row"]

// Relación operador con sus parqueaderos
type OperadorConParqueaderos = Operador & {
  parqueaderos: { id: number }[]
  parqueaderos_count: number
}

export async function getOperadores(supabase: ReturnType<typeof createClient>): Promise<OperadorConParqueaderos[]> {
  const { data, error } = await supabase
    .from("operadores")
    .select(`
      *,
      parqueaderos ( id )
    `)

  if (error) throw error

  return (data ?? []).map((op) => ({
    ...op,
    parqueaderos: op.parqueaderos ?? [],
    parqueaderos_count: op.parqueaderos ? op.parqueaderos.length : 0,
  }))
}

export async function getOperadorById(supabase: ReturnType<typeof createClient>, id: number): Promise<Operador> {
  const { data, error } = await supabase
    .from("operadores")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createOperador(
  supabase: ReturnType<typeof createClient>,
  operador: Omit<Operador, "id">
): Promise<Operador> {
  const { data, error } = await supabase
    .from("operadores")
    .insert([operador])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateOperador(
  supabase: ReturnType<typeof createClient>,
  id: number,
  operador: Partial<Operador>
): Promise<Operador> {
  const { data, error } = await supabase
    .from("operadores")
    .update(operador)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteOperador(supabase: ReturnType<typeof createClient>, id: number): Promise<void> {
  const { error } = await supabase.from("operadores").delete().eq("id", id)
  if (error) throw error
}
