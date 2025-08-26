import { SupabaseClient, createClient } from "@supabase/supabase-js"
import { NivelList } from "../../../../Components/niveles/nivelList"

type PageProps = {
  params: { id: string }
}

export default function Page({ params }: PageProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

  const parqueaderoId = Number(params.id)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Niveles del Parqueadero #{parqueaderoId}</h1>
      <NivelList parqueaderoId={parqueaderoId} />
    </div>
  )
}
