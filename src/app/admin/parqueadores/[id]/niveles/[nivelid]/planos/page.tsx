import { SupabaseClient, createClient } from "@supabase/supabase-js"
import { PlanoList } from "../../../../../../Components/planos/PlanoList"
import { PlanoForm } from "../../../../../../Components/planos/PlanoForm"

type PageProps = {
  params: { id: string }
}

export default function Page({ params }: PageProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

  const nivelId = Number(params.id)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Planos del Nivel #{nivelId}</h1>
      {/* <PlanoUpload nivelId={nivelId} /> */}
 <PlanoForm nivelId={nivelId}  />

      <PlanoList nivelId={nivelId} />
    </div>
  )
}
