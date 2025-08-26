"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, Trash2 } from "lucide-react"

export default function ParqueaderoImagenes({ parqueaderoId }: { parqueaderoId: number }) {
  const [imagenes, setImagenes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchImagenes()
  }, [parqueaderoId])

  async function fetchImagenes() {
    const { data, error } = await supabase
      .from("parqueadero_imagenes")
      .select("*")
      .eq("parqueadero_id", parqueaderoId)
      .order("orden", { ascending: true })

    if (!error && data) setImagenes(data)
  }

  async function uploadImagen() {
    if (!file) return
    setLoading(true)

    const fileName = `${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from("parqueaderos")
      .upload(fileName, file)

    if (uploadError) {
      console.error(uploadError)
      setLoading(false)
      return
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/parqueaderos/${fileName}`

    await supabase.from("parqueadero_imagenes").insert({
      parqueadero_id: parqueaderoId,
      url,
      principal: imagenes.length === 0, // primera imagen como principal
      activo: true,
      orden: imagenes.length + 1,
    })

    setFile(null)
    fetchImagenes()
    setLoading(false)
  }

  async function togglePrincipal(id: number) {
    await supabase.from("parqueadero_imagenes").update({ principal: false }).eq("parqueadero_id", parqueaderoId)
    await supabase.from("parqueadero_imagenes").update({ principal: true }).eq("id", id)
    fetchImagenes()
  }

  async function deleteImagen(id: number) {
    await supabase.from("parqueadero_imagenes").delete().eq("id", id)
    fetchImagenes()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button onClick={uploadImagen} disabled={!file || loading}>
          <Upload className="mr-2 h-4 w-4" /> Subir
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {imagenes.map((img) => (
          <Card key={img.id} className="overflow-hidden relative">
            <img src={img.url} alt={img.titulo ?? "Imagen"} className="w-full h-40 object-cover" />
            <CardContent className="p-2 flex justify-between items-center">
              <Button
                size="sm"
                variant={img.principal ? "default" : "outline"}
                onClick={() => togglePrincipal(img.id)}
              >
                {img.principal ? "Principal" : "Marcar como Principal"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteImagen(img.id)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Eliminar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
