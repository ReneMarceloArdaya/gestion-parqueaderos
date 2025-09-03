"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/Supabase/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Edit, Trash } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ParkingDetail {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: "publico" | "privado";
  capacidad_total: number;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  zona: string | null;
  activo: boolean;
  creado_at: string;
  longitude: number;
  latitude: number;
}

export default function ParkingDetailPage() {
  const [parking, setParking] = useState<ParkingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const supabase = createClient() as any;
  const router = useRouter();
  const params = useParams();
  const parkingId = parseInt(params.id as string, 10);

  // Validar que parkingId es un número válido
  useEffect(() => {
    if (isNaN(parkingId)) {
      setError("ID de parqueadero inválido");
      setLoading(false);
    }
  }, [parkingId]);

  // Cargar datos del parqueadero usando la función SQL
  useEffect(() => {
    if (isNaN(parkingId)) return;

    const fetchParking = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          throw new Error("Debes estar autenticado para ver los detalles");
        }

        // Obtener operador_id del usuario autenticado
        const { data: operador, error: operadorError } = await supabase
          .from("operadores")
          .select("id")
          .eq("usuario_id", user.id)
          .single();

        if (operadorError || !operador) {
          throw new Error("No se encontró el operador asociado al usuario");
        }

        // Llamar a la función SQL para obtener el parqueadero
        const { data, error } = await supabase
          .rpc("get_operator_parkings_with_coordinates", {
            operator_id_param: operador.id,
          })
          .eq("id", parkingId)
          .single();

        if (error) {
          throw new Error("Error al cargar el parqueadero: " + error.message);
        }

        if (!data) {
          throw new Error("Parqueadero no encontrado");
        }

        setParking(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchParking();
  }, [parkingId, supabase]);

  // Inicializar el mapa con la ubicación del parqueadero
  useEffect(() => {
    if (!parking || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [parking.longitude, parking.latitude],
      zoom: 12,
    });

    // Añadir marcador
    marker.current = new mapboxgl.Marker({ color: "red" })
      .setLngLat([parking.longitude, parking.latitude])
      .addTo(map.current);

    return () => {
      if (map.current) map.current.remove();
    };
  }, [parking]);

  // Manejar eliminación del parqueadero
  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar este parqueadero?"))
      return;

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        throw new Error("Debes estar autenticado para eliminar");
      }

      const { data: operador, error: operadorError } = await supabase
        .from("operadores")
        .select("id")
        .eq("usuario_id", user.id)
        .single();

      if (operadorError || !operador) {
        throw new Error("No se encontró el operador asociado al usuario");
      }

      const { error: deleteError } = await supabase
        .from("parqueaderos")
        .delete()
        .eq("id", parkingId)
        .eq("operador_id", operador.id);

      if (deleteError) {
        throw new Error(
          "Error al eliminar el parqueadero: " + deleteError.message
        );
      }

      router.push("/operator/parkings");
    } catch (err: any) {
      setError(err.message || "Error al eliminar el parqueadero");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8">Cargando...</div>;
  }

  if (error || !parking) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-red-600">{error || "Parqueadero no encontrado"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/operator/parkings">Operadores</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Parqueo</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Card>
        <CardHeader>
          <CardTitle>{parking.nombre}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Tipo:</p>
                <p>{parking.tipo === "publico" ? "Público" : "Privado"}</p>
              </div>
              <div>
                <p className="font-semibold">Capacidad Total:</p>
                <p>{parking.capacidad_total} plazas</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Dirección:</p>
                <p>{parking.direccion || "No especificada"}</p>
              </div>
              <div>
                <p className="font-semibold">Ciudad:</p>
                <p>{parking.ciudad || "No especificada"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">País:</p>
                <p>{parking.pais || "No especificado"}</p>
              </div>
              <div>
                <p className="font-semibold">Zona:</p>
                <p>{parking.zona || "No especificada"}</p>
              </div>
            </div>

            <div>
              <p className="font-semibold">Descripción:</p>
              <p>{parking.descripcion || "No hay descripción"}</p>
            </div>

            <div>
              <p className="font-semibold">Ubicación:</p>
              <div
                ref={mapContainer}
                className="w-full h-[400px] rounded-md border"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() =>
                  router.push(`/operator/parkings/${parking.id}/edit`)
                }
                variant="outline"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={loading}
              >
                <Trash className="w-4 h-4 mr-2" />
                {loading ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
