'use client'

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/Supabase/supabaseClient";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function EditLevelPage() {
  const router = useRouter();
  const params = useParams();
  const parkingId = params.id as string;
  const levelId = params.levelId as string;

  const supabase = createClient();

  const [form, setForm] = useState({
    nombre: "",
    orden: "",
    capacidad: "",
  });

  const [currentPlano, setCurrentPlano] = useState<{ url: string; public_id: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLevel = async () => {
      // Traer nivel
      const { data: level } = await supabase
        .from("niveles")
        .select("id, nombre, orden, capacidad")
        .eq("id", parseInt(levelId))
        .single();

      if (level) {
        setForm({
          nombre: level.nombre ?? "",
          orden: String(level.orden ?? ""),
          capacidad: String(level.capacidad ?? ""),
        });
      }

      // Traer plano actual
      const { data: plano } = await supabase
        .from("planos")
        .select("url, public_id")
        .eq("nivel_id", parseInt(levelId))
        .eq("principal", true)
        .single();

      if (plano) {
        setCurrentPlano(plano);
      }
    };

    fetchLevel();
  }, [levelId, supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let planoUrl = currentPlano?.url;
      let newPublicId = currentPlano?.public_id;

      // Si se sube nueva imagen
      if (file) {
        const uploadData = new FormData();
        uploadData.append("file", file);

        const res = await fetch("/api/upload/cloudinary", {
          method: "POST",
          body: uploadData,
        });

        const result = await res.json();
        if (!result.url || !result.public_id) {
          throw new Error("Error al subir nuevo plano a Cloudinary");
        }

        planoUrl = result.url;
        newPublicId = result.public_id;

        // Eliminar imagen anterior en Cloudinary
        if (currentPlano?.public_id) {
          await fetch("/api/upload/cloudinary/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_id: currentPlano.public_id }),
          });
        }

        // Actualizar plano en Supabase
        await supabase
          .from("planos")
          .update({ url: planoUrl ?? "", public_id: newPublicId ?? "" })
          .eq("nivel_id", parseInt(levelId))
          .eq("principal", true);
      }

      // Actualizar nivel
      const { error: nivelError } = await supabase
        .from("niveles")
        .update({
          nombre: form.nombre,
          orden: parseInt(form.orden),
          capacidad: parseInt(form.capacidad),
        })
        .eq("id", parseInt(levelId));

      if (nivelError) throw nivelError;

      router.push(`/operator/parkings/${parkingId}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al actualizar nivel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/operator/levels">Gestión de Niveles</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink className="font-semibold">Crear Nivel</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Formulario */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Editar Nivel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="orden">Orden</Label>
              <Input
                id="orden"
                name="orden"
                type="number"
                value={form.orden}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="capacidad">Capacidad</Label>
              <Input
                id="capacidad"
                name="capacidad"
                type="number"
                value={form.capacidad}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>Plano actual</Label>
              {currentPlano?.url && (
                <div className="mt-2">
                  <img
                    src={currentPlano.url}
                    alt="Plano actual"
                    className="w-full rounded-md border shadow-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="plano">Subir nuevo plano (opcional)</Label>
              <Input
                id="plano"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Vista previa del nuevo plano"
                    className="w-full rounded-md border shadow-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/operator/levels`)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
