"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/Supabase/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ParkingReviews } from "@/components/ParkingReviews";
import { MiniMap } from "@/components/MiniMap";
import { ParkingSchedule, ParkingAmenities } from "@/components/ParkingInfo";
import { ImageGalleryModal } from "@/components/ImageGalleryModal";
import { ParkingStats } from "@/components/ParkingStats";
import { 
  MapPin, 
  Clock, 
  Car, 
  Star, 
  ArrowLeft, 
  Phone, 
  Mail, 
  Globe, 
  Shield, 
  Users, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Navigation,
  Building,
  DollarSign,
  CheckCircle,
  XCircle,
  Info,
  Heart,
  Share2
} from "lucide-react";

interface ParkingImage {
  id: number;
  url: string;
  titulo: string | null;
  descripcion: string | null;
  principal: boolean;
  orden: number;
}

interface ParkingDetails {
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
  latitude: number;
  longitude: number;
  operador?: {
    id: number;
    nombre: string;
    contacto_email: string | null;
    contacto_telefono: string | null;
    website: string | null;
  };
  imagenes: ParkingImage[];
  niveles_count: number;
  plazas_disponibles: number;
  precio_por_hora?: number;
  tarifa_info?: {
    tipo_tarifa: "por_hora" | "por_tramo" | "tarifa_fija";
    precio_por_hora: number | null;
    precio_fijo: number | null;
    tramos: any[] | null;
    nombre: string | null;
  } | null;
}

export default function ParkingDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parkingId = searchParams.get("parking");
  const supabase = createClient();

  const [parking, setParking] = useState<ParkingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // Estados para la galería y detalles de tarifas
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [showRateDetails, setShowRateDetails] = useState(false);

  const fetchParkingDetails = useCallback(async () => {
    if (!parkingId) {
      setError("ID de parqueadero no válido");
      setLoading(false);
      return;
    }

    try {
      // Consulta principal del parqueadero
      const { data: parkingData, error: parkingError } = await supabase
        .from("parqueaderos")
        .select("*")
        .eq("id", parkingId)
        .eq("activo", true)
        .single();

      if (parkingError) throw parkingError;
      if (!parkingData) throw new Error("Parqueadero no encontrado");

      // Convertir a any para evitar problemas de tipos
      const parking = parkingData as any;

      // Obtener información del operador
      let operadorData = null;
      if (parking.operador_id) {
        const { data: operador, error: operadorError } = await supabase
          .from("operadores")
          .select("*")
          .eq("id", parking.operador_id)
          .single();

        if (!operadorError && operador) {
          operadorData = operador;
        }
      }

      // Obtener coordenadas de geometría
      const geomMatch = parking.geom?.match(/POINT\(([^)]+)\)/);
      let latitude = -17.7833; // Fallback Santa Cruz
      let longitude = -63.1711;

      if (geomMatch) {
        const coords = geomMatch[1].split(' ');
        longitude = parseFloat(coords[0]);
        latitude = parseFloat(coords[1]);
      }

      // Obtener imágenes
      const { data: imagenesData, error: imagenesError } = await supabase
        .from("parqueadero_imagenes")
        .select("*")
        .eq("parqueadero_id", parkingId)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (imagenesError) console.error("Error al cargar imágenes:", imagenesError);

      // Obtener niveles para contar
      const { data: nivelesData, error: nivelesError } = await supabase
        .from("niveles")
        .select("id")
        .eq("parqueadero_id", parkingId);

      if (nivelesError) console.error("Error al obtener niveles:", nivelesError);

      const nivelesIds = nivelesData?.map((n: any) => n.id) || [];

      // Contar plazas disponibles
      let plazasDisponibles = 0;
      if (nivelesIds.length > 0) {
        const { count: plazasCount, error: plazasError } = await supabase
          .from("plazas")
          .select("*", { count: "exact" })
          .in("nivel_id", nivelesIds)
          .eq("estado", "libre");

        if (plazasError) console.error("Error al contar plazas:", plazasError);
        plazasDisponibles = plazasCount || 0;
      }

      // Obtener precio real desde tarifas
      let precio_por_hora = parking.tipo === "privado" ? 15 : 10; // Precio por defecto
      let tarifaInfo = null;
      const { data: tarifasData, error: tarifasError } = await (supabase as any)
        .from("tarifas")
        .select("precio_por_hora, precio_fijo, tipo_tarifa, nombre, tramos")
        .eq("parqueadero_id", parkingId)
        .or(`valido_hasta.is.null,valido_hasta.gte.${new Date().toISOString()}`)
        .order("creado_at", { ascending: false })
        .limit(1);

      if (!tarifasError && tarifasData && tarifasData.length > 0) {
        const tarifa = tarifasData[0];
        tarifaInfo = {
          tipo_tarifa: tarifa.tipo_tarifa,
          precio_por_hora: tarifa.precio_por_hora,
          precio_fijo: tarifa.precio_fijo,
          tramos: tarifa.tramos,
          nombre: tarifa.nombre
        };
        
        // Establecer precio según tipo de tarifa
        if (tarifa.precio_por_hora) {
          precio_por_hora = tarifa.precio_por_hora;
        } else if (tarifa.precio_fijo) {
          precio_por_hora = tarifa.precio_fijo;
        }
      }

      const parkingDetails: ParkingDetails = {
        id: parking.id,
        nombre: parking.nombre,
        descripcion: parking.descripcion,
        tipo: parking.tipo,
        capacidad_total: parking.capacidad_total,
        direccion: parking.direccion,
        ciudad: parking.ciudad,
        pais: parking.pais,
        zona: parking.zona,
        activo: parking.activo,
        creado_at: parking.creado_at,
        latitude,
        longitude,
        operador: operadorData || undefined,
        imagenes: imagenesData || [],
        niveles_count: nivelesData?.length || 0,
        plazas_disponibles: plazasDisponibles,
        precio_por_hora,
        tarifa_info: tarifaInfo,
      };

      setParking(parkingDetails);
    } catch (err: any) {
      console.error("Error al cargar detalles del parqueadero:", err);
      setError(err.message || "Error al cargar los detalles");
    } finally {
      setLoading(false);
    }
  }, [parkingId, supabase]);

  useEffect(() => {
    fetchParkingDetails();
  }, [fetchParkingDetails]);

  const handleReservation = useCallback(() => {
    if (!parking) return;
    
    if (parking.tipo === "privado") {
      // Redirigir a página de reservas
      router.push(`/reservations?parking=${parking.id}`);
    } else {
      // Para parqueaderos públicos, mostrar información
      alert("Este es un parqueadero público. Puedes dirigirte directamente sin necesidad de reserva previa.");
    }
  }, [parking, router]);

  const handleViewOnMap = useCallback(() => {
    if (!parking) return;
    router.push(`/?center=${parking.longitude},${parking.latitude}&zoom=16&parking=${parking.id}`);
  }, [parking, router]);

  const handleShare = useCallback(async () => {
    if (!parking) return;
    
    const shareUrl = window.location.href;
    const shareText = `Mira este parqueadero: ${parking.nombre}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: parking.nombre,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // Si falla, copiar al portapapeles
        navigator.clipboard.writeText(shareUrl);
        alert("Enlace copiado al portapapeles");
      }
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(shareUrl);
      alert("Enlace copiado al portapapeles");
    }
  }, [parking]);

  const nextImage = useCallback(() => {
    if (!parking?.imagenes.length) return;
    setCurrentImageIndex((prev) => 
      prev === parking.imagenes.length - 1 ? 0 : prev + 1
    );
  }, [parking?.imagenes.length]);

  const prevImage = useCallback(() => {
    if (!parking?.imagenes.length) return;
    setCurrentImageIndex((prev) => 
      prev === 0 ? parking.imagenes.length - 1 : prev - 1
    );
  }, [parking?.imagenes.length]);

  const getDefaultImage = useCallback((parking: ParkingDetails) => {
    const color = parking.tipo === "publico" ? "3b82f6" : "ef4444";
    const initials = parking.nombre.substring(0, 3).toUpperCase();
    return `https://placehold.co/800x400/${color}/ffffff?text=${encodeURIComponent(initials)}`;
  }, []);

  // Función para formatear el precio según el tipo de tarifa
  const formatPriceDisplay = useCallback((parking: ParkingDetails) => {
    if (!parking.tarifa_info) {
      return {
        price: `Bs. ${parking.precio_por_hora || 0}`,
        unit: "/hora",
        description: "Precio estimado"
      };
    }

    const tarifa = parking.tarifa_info;
    
    switch (tarifa.tipo_tarifa) {
      case "por_hora":
        return {
          price: `Bs. ${tarifa.precio_por_hora || 0}`,
          unit: "/hora",
          description: "Tarifa por hora"
        };
      
      case "tarifa_fija":
        return {
          price: `Bs. ${tarifa.precio_fijo || 0}`,
          unit: "/día",
          description: "Tarifa fija"
        };
      
      case "por_tramo":
        const tramos = tarifa.tramos as any[] || [];
        if (tramos.length > 0) {
          const minPrice = Math.min(...tramos.map(t => t.precio));
          return {
            price: `Desde Bs. ${minPrice}`,
            unit: "",
            description: "Tarifa por tramos"
          };
        }
        return {
          price: "Ver tarifas",
          unit: "",
          description: "Precios por tramos"
        };
      
      default:
        return {
          price: `Bs. ${parking.precio_por_hora || 0}`,
          unit: "/hora",
          description: "Precio estimado"
        };
    }
  }, []);

  const currentImage = useMemo(() => {
    if (!parking?.imagenes.length) return null;
    return parking.imagenes[currentImageIndex];
  }, [parking?.imagenes, currentImageIndex]);

  const displayImage = useMemo(() => {
    if (currentImage) return currentImage.url;
    if (parking) return getDefaultImage(parking);
    return null;
  }, [currentImage, parking, getDefaultImage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="h-96 bg-gray-300 rounded-lg mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
              <div className="h-64 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !parking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {error || "No se pudo cargar la información del parqueadero"}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <span>/</span>
          <span>Parqueaderos</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">{parking.nombre}</span>
        </div>

        {/* Galería de imágenes */}
        <div className="relative mb-8">
          <div className="relative h-96 lg:h-[500px] rounded-xl overflow-hidden bg-gray-200">
            {displayImage && (
              <Image
                src={displayImage}
                alt={currentImage?.titulo || parking.nombre}
                fill
                className="object-cover"
                priority
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            )}
            
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Controles del carrusel */}
            {parking.imagenes.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Indicadores */}
            {parking.imagenes.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {parking.imagenes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Botones de acción en la imagen */}
            <div className="absolute top-4 right-4 flex gap-2">
              {parking.imagenes.length > 0 && (
                <Button
                  onClick={() => setShowFullGallery(true)}
                  size="sm"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {parking.imagenes.length}
                </Button>
              )}
              <Button
                onClick={handleShare}
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsFavorite(!isFavorite)}
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white"
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Miniaturas */}
          {parking.imagenes.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {parking.imagenes.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.titulo || `Imagen ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {parking.nombre}
                  </h1>
                  <div className="flex items-center gap-4 text-gray-600">
                    <Badge variant={parking.tipo === "publico" ? "default" : "secondary"}>
                      {parking.tipo === "publico" ? "Público" : "Privado"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {[parking.zona, parking.ciudad].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-medium">4.5</span>
                  <span className="text-gray-500 text-sm">(120 reseñas)</span>
                </div>
              </div>

              {parking.descripcion && (
                <p className="text-gray-700 leading-relaxed">
                  {parking.descripcion}
                </p>
              )}
            </div>

            <Separator />

            {/* Información de capacidad y disponibilidad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {parking.capacidad_total}
                      </p>
                      <p className="text-sm text-gray-600">Espacios totales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {parking.plazas_disponibles}
                      </p>
                      <p className="text-sm text-gray-600">Disponibles ahora</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Building className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {parking.niveles_count}
                      </p>
                      <p className="text-sm text-gray-600">
                        {parking.niveles_count === 1 ? "Nivel" : "Niveles"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Información de ubicación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    {parking.direccion && (
                      <p className="text-gray-700">
                        <strong>Dirección:</strong> {parking.direccion}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <strong>Zona:</strong> {parking.zona || "No especificada"}
                    </p>
                    <p className="text-gray-700">
                      <strong>Ciudad:</strong> {parking.ciudad || "No especificada"}
                    </p>
                  </div>

                  {/* Mini mapa */}
                  <MiniMap
                    latitude={parking.latitude}
                    longitude={parking.longitude}
                    parkingName={parking.nombre}
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={handleViewOnMap}
                      variant="outline"
                      className="flex-1"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Ver en el mapa
                    </Button>
                    <Button
                      onClick={() => {
                        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}`;
                        window.open(mapsUrl, "_blank");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Cómo llegar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del operador */}
            {parking.operador && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Operador
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-gray-900">
                      {parking.operador.nombre}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {parking.operador.contacto_telefono && (
                        <a
                          href={`tel:${parking.operador.contacto_telefono}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Phone className="h-4 w-4" />
                          {parking.operador.contacto_telefono}
                        </a>
                      )}
                      {parking.operador.contacto_email && (
                        <a
                          href={`mailto:${parking.operador.contacto_email}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Mail className="h-4 w-4" />
                          {parking.operador.contacto_email}
                        </a>
                      )}
                      {parking.operador.website && (
                        <a
                          href={parking.operador.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Globe className="h-4 w-4" />
                          Sitio web
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Horarios de funcionamiento */}
            <ParkingSchedule parkingType={parking.tipo} />

            {/* Servicios y comodidades */}
            <ParkingAmenities parkingType={parking.tipo} />

            {/* Reseñas de usuarios */}
            <ParkingReviews parkingId={parking.id} />
          </div>

          {/* Panel lateral de reserva */}
          <div className="space-y-6">
            {/* Card de precio y reserva */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {parking.tipo === "privado" ? "Reservar" : "Información"}
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">
                      {formatPriceDisplay(parking).price}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatPriceDisplay(parking).unit}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>
                  {parking.tipo === "privado" 
                    ? "Reserva tu espacio con anticipación"
                    : "Parqueadero de acceso público"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parking.tipo === "privado" ? (
                  <>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Parqueadero Privado
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Se requiere reserva previa. El pago se realiza al momento de la reserva.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Disponibilidad:</span>
                        <span className={`font-medium ${
                          parking.plazas_disponibles > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {parking.plazas_disponibles > 0 
                            ? `${parking.plazas_disponibles} espacios disponibles`
                            : "Sin espacios disponibles"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Horario:</span>
                        <span>24/7</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{formatPriceDisplay(parking).description}:</span>
                        <span className="font-medium">
                          {formatPriceDisplay(parking).price}
                          {formatPriceDisplay(parking).unit}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      {parking.plazas_disponibles > 0 ? (
                        <Button 
                          onClick={handleReservation}
                          className="w-full"
                          size="lg"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Reservar ahora
                        </Button>
                      ) : (
                        <Button disabled className="w-full" size="lg">
                          Sin espacios disponibles
                        </Button>
                      )}
                      
                      {parking.tarifa_info?.tipo_tarifa === 'por_tramo' && (
                        <Button 
                          variant="outline"
                          onClick={() => setShowRateDetails(true)}
                          className="w-full"
                          size="lg"
                        >
                          <Info className="h-4 w-4 mr-2" />
                          Ver detalles de tarifas
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Parqueadero Público
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        Acceso libre, sin necesidad de reserva. Pago por tiempo de uso.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Espacios disponibles:</span>
                        <span className="font-medium text-green-600">
                          {parking.plazas_disponibles}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Horario:</span>
                        <span>24/7</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tarifa:</span>
                        <span className="font-medium">
                          {formatPriceDisplay(parking).price}
                          {formatPriceDisplay(parking).unit}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full" size="lg" variant="outline">
                            <Navigation className="h-4 w-4 mr-2" />
                            Ir al parqueadero
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Parqueadero Público</AlertDialogTitle>
                            <AlertDialogDescription>
                              Este es un parqueadero público. Puedes dirigirte directamente sin necesidad de reserva previa. 
                              ¿Te gustaría ver la ubicación en el mapa?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleViewOnMap}>
                              Ver en el mapa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      {parking.tarifa_info?.tipo_tarifa === 'por_tramo' && (
                        <Button 
                          variant="secondary"
                          onClick={() => setShowRateDetails(true)}
                          className="w-full"
                          size="lg"
                        >
                          <Info className="h-4 w-4 mr-2" />
                          Ver detalles de tarifas
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card de estado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado del Parqueadero</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Estado:</span>
                    <Badge variant={parking.activo ? "default" : "destructive"}>
                      {parking.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ocupación:</span>
                    <span className="text-sm font-medium">
                      {Math.round(((parking.capacidad_total - parking.plazas_disponibles) / parking.capacidad_total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${((parking.capacidad_total - parking.plazas_disponibles) / parking.capacidad_total) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas en tiempo real */}
            <ParkingStats
              parkingId={parking.id}
              capacidadTotal={parking.capacidad_total}
              plazasDisponibles={parking.plazas_disponibles}
              tipo={parking.tipo}
            />
          </div>
        </div>
      </div>

      {/* Modal de galería completa */}
      <ImageGalleryModal
        images={parking.imagenes}
        currentIndex={currentImageIndex}
        isOpen={showFullGallery}
        onClose={() => setShowFullGallery(false)}
        onImageChange={setCurrentImageIndex}
        parkingName={parking.nombre}
      />

      {/* Modal de detalles de tarifas por tramos */}
      <AlertDialog open={showRateDetails} onOpenChange={setShowRateDetails}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Tarifas por tramos</AlertDialogTitle>
            <AlertDialogDescription>
              {parking.tarifa_info?.nombre || "Detalles de precios por tiempo"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            {parking.tarifa_info?.tramos && Array.isArray(parking.tarifa_info.tramos) && 
             parking.tarifa_info.tramos.length > 0 ? (
              parking.tarifa_info.tramos.map((tramo: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {tramo.tiempo_inicio} - {tramo.tiempo_fin} min
                  </span>
                  <span className="font-medium text-blue-600">
                    Bs. {tramo.precio}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No hay información de tramos disponible</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
