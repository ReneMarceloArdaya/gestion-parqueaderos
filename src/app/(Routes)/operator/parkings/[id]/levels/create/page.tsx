'use client'

import { useState } from "react";
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

export default function CreateLevelPage() {
  const router = useRouter();
  const params = useParams();
  const parkingId = params.id as string;

  const supabase = createClient();

  const [form, setForm] = useState({
    nombre: "",
    orden: "",
    capacidad: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // 👈 preview temporal
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert("Debes subir un plano para crear el nivel.");
      return;
    }

    setLoading(true);

    try {
      // 1. Subir imagen a Cloudinary
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload/cloudinary", {
        method: "POST",
        body: uploadData,
      });

      const result = await res.json();
      if (!result.url) {
        throw new Error("Error al subir plano a Cloudinary");
      }

      const planoUrl = result.url;

      // 2. Crear nivel en Supabase
      const { data: nivel, error: nivelError } = await supabase
        .from("niveles")
        .insert({
          parqueadero_id: parseInt(parkingId),
          nombre: form.nombre,
          orden: parseInt(form.orden),
          capacidad: parseInt(form.capacidad),
        })
        .select("id")
        .single();

      if (nivelError || !nivel) {
        throw new Error(nivelError?.message || "Error al crear nivel");
      }

      // 3. Insertar plano asociado al nivel
      const { error: planoError } = await supabase.from("planos").insert({
        nivel_id: nivel.id,
        url: planoUrl,
        public_id: result.public_id, 
        tipo: "imagen",
        principal: true,
      });

      if (planoError) {
        throw new Error(planoError.message);
      }

      router.push(`/operator/parkings/${parkingId}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error en el proceso de creación");
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
          <CardTitle className="text-xl font-bold">Crear Nivel</CardTitle>
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
                placeholder="Ej: Nivel 1"
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
                placeholder="Ej: 1"
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
                placeholder="Ej: 50"
                required
              />
            </div>

            <div>
              <Label htmlFor="plano">Plano (imagen)</Label>
              <Input
                id="plano"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
              {file && (
                <p className="text-sm text-gray-500 mt-1">
                  Archivo seleccionado: {file.name}
                </p>
              )}
              {previewUrl && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Vista previa del plano"
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
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
