"use client"

import { useState } from "react"
import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/lib/Supabase/database.type"
import { Json } from "@/lib/Supabase/database.type"

export type Plano = Database["public"]["Tables"]["planos"]["Row"]
export type PlanoInsert = Database["public"]["Tables"]["planos"]["Insert"]

type PlanoUploadProps = {
  supabase: SupabaseClient
  nivelId: number
  onUpload: () => void
}

export function PlanoUpload({ supabase, nivelId, onUpload }: PlanoUploadProps) {
  const [nombre, setNombre] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipo, setTipo] = useState<"imagen" | "pdf" | "dwg" | "svg">("imagen")
  const [principal, setPrincipal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivo) return alert("Selecciona un archivo")

    // Subir archivo a Supabase Storage
    const fileExt = archivo.name.split(".").pop()
    const filePath = `${nivelId}/${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from("planos")
      .upload(filePath, archivo)

    if (uploadError) return alert(uploadError.message)

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/planos/${filePath}`

    const planoData: PlanoInsert = {
      nivel_id: nivelId,
      nombre: nombre || archivo.name,
      url,
      tipo,
      principal,
      activo: true,
    }

    const { error } = await supabase.from("planos").insert(planoData)
    if (error) alert(error.message)
    else {
      setNombre("")
      setArchivo(null)
      setTipo("imagen")
      setPrincipal(false)
      onUpload()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded-md space-y-3">
      <input
        type="text"
        placeholder="Nombre del plano"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className="border p-2 w-full"
      />
      <input
        type="file"
        onChange={e => setArchivo(e.target.files?.[0] || null)}
        className="border p-2 w-full"
        required
      />
      <select
        value={tipo}
        onChange={e => setTipo(e.target.value as any)}
        className="border p-2 w-full"
      >
        <option value="imagen">Imagen</option>
        <option value="pdf">PDF</option>
        <option value="dwg">DWG</option>
        <option value="svg">SVG</option>
      </select>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={principal}
          onChange={e => setPrincipal(e.target.checked)}
        />
        <span>Principal</span>
      </label>
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Subir plano
      </button>
    </form>
  )
}
