"use client"

import { useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { useRouter } from "next/navigation"

type PlanoFormProps = {
  nivelId: number
}

export function PlanoForm({ nivelId }: PlanoFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [nombre, setNombre] = useState("")
  const [orden, setOrden] = useState<number | null>(null)
  const [principal, setPrincipal] = useState(false)
  const [activo, setActivo] = useState(true)
  const [loading, setLoading] = useState(false)


const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "public"

   
  const mapFileType = (mime: string): "imagen" | "pdf" | "dwg" | "svg" => {
    if (mime.startsWith("image/")) return "imagen"
    if (mime === "application/pdf") return "pdf"
    if (mime === "image/svg+xml") return "svg"
    if (mime === "application/acad" || mime === "image/vnd.dwg") return "dwg"
    return "imagen"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert("Selecciona un archivo")
    setLoading(true)

    const filePath = `niveles/${nivelId}/${file.name}`

    // 1. subir al bucket
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert(uploadError.message)
      setLoading(false)
      return
    }

    // 2. obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl

    // 3. determinar tipo
    const tipo = mapFileType(file.type)

    // 4. guardar en la tabla
    const { error: insertError } = await supabase.from("planos").insert({
      nivel_id: nivelId,
      nombre: nombre || file.name,
      url: publicUrl, // ⚡ ahora guardamos la URL pública real
      tipo,
      principal,
      orden,
      activo,
      metadata: {},
    })

    if (insertError) {
      alert(insertError.message)
    } else {
      // limpiar
      setFile(null)
      setNombre("")
      setOrden(null)
      setPrincipal(false)
      setActivo(true)
      // refrescar lista
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded-md space-y-3">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full border p-2"
      />
      <input
        type="text"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-full border p-2"
      />
      <input
        type="number"
        placeholder="Orden"
        value={orden ?? ""}
        onChange={(e) => setOrden(e.target.value ? Number(e.target.value) : null)}
        className="w-full border p-2"
      />
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={principal}
          onChange={(e) => setPrincipal(e.target.checked)}
        />
        <span>Principal</span>
      </label>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
        />
        <span>Activo</span>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? "Subiendo..." : "Agregar Plano"}
      </button>
    </form>
  )
}
