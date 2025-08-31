"use client"

import { useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"

type PlanoUploadProps = {
  nivelId: number
}

export function PlanoUpload({ nivelId }: PlanoUploadProps) {
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const mapFileType = (mime: string): "imagen" | "pdf" | "dwg" | "svg" => {
    if (mime.startsWith("image/")) return "imagen"
    if (mime === "application/pdf") return "pdf"
    if (mime === "image/svg+xml") return "svg"
    if (mime === "application/acad" || mime === "image/vnd.dwg") return "dwg"
    return "imagen"
  }

  const handleUpload = async () => {
    if (!file) return alert("Selecciona un archivo")
    setLoading(true)

    const filePath = `niveles/${nivelId}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("planos")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert(uploadError.message)
      setLoading(false)
      return
    }

    const tipo = mapFileType(file.type)

    const { error: insertError } = await supabase
      .from("planos")
      .insert({
        nivel_id: nivelId,
        nombre: file.name,
        url: filePath,
        tipo,
        principal: false,
        metadata: {}
      })

    if (insertError) {
      alert(insertError.message)
    } else {
      setFile(null)
      // ⚡ aquí puedes emitir un evento o un reload
      window.location.reload()
    }

    setLoading(false)
  }

  return (
    <div className="border p-4 rounded-md shadow-md">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-2"
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        {loading ? "Subiendo..." : "Subir Plano"}
      </button>
    </div>
  )
}
