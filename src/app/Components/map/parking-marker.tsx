"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Car } from "lucide-react";
import React from "react";

interface ParkingData {
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
  longitude: number;
  latitude: number;
  precio_por_hora?: number | null;
  imagen_url?: string | null;
}

interface ParkingMarkerProps {
  parking: ParkingData;
  onDetails?: (id: number) => void;
  onReserve?: (id: number) => void;
  getDefaultImage?: (parking: ParkingData) => string;
}

export function ParkingMarkerContent({
  parking,
  onDetails,
  onReserve,
  getDefaultImage,
}: ParkingMarkerProps) {
  // Función para obtener imagen por defecto (fallback si no se pasa como prop)
  const defaultImageFallback = (parking: ParkingData) => {
    const color = parking.tipo === "publico" ? "3b82f6" : "ef4444";
    const initials = parking.nombre.substring(0, 3).toUpperCase();
    return `https://placehold.co/200x120/${color}/ffffff?text=${encodeURIComponent(initials)}`;
  };

  const imageUrl = parking.imagen_url || (getDefaultImage ? getDefaultImage(parking) : defaultImageFallback(parking));

  return (
    <div className="p-3 max-w-xs bg-white rounded-lg">
      {/* Imagen del parqueadero */}
      <div className="w-full h-20 rounded-md overflow-hidden mb-3">
        <img
          src={imageUrl}
          alt={parking.nombre}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = defaultImageFallback(parking);
          }}
        />
      </div>

      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-800 text-sm px-0.5">
          {parking.nombre}
        </h3>
        <Badge
          variant={parking.tipo === "publico" ? "default" : "destructive"}
          className="text-xs"
        >
          {parking.tipo === "publico" ? "Público" : "Privado"}
        </Badge>
      </div>

      {parking.direccion && (
        <p className="text-xs text-gray-600 mb-2 flex items-start gap-1">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-500" />
          <span>{parking.direccion}</span>
        </p>
      )}

      {parking.zona && (
        <p className="text-xs text-gray-500 mb-2">
          <span className="font-medium">Zona:</span> {parking.zona}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <Car className="h-3 w-3 text-gray-500" />
        <span>
          {parking.capacidad_total} espacio{parking.capacidad_total !== 1 ? 's' : ''} 
          {parking.tipo === "publico" ? " disponibles" : " totales"}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="text-xs h-7 px-2"
          data-action="details"
          onClick={(e) => {
            e.stopPropagation();
            onDetails?.(parking.id);
          }}
        >
          Ver detalles
        </Button>
        {parking.tipo === "privado" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            data-action="reserve"
            onClick={(e) => {
              e.stopPropagation();
              onReserve?.(parking.id);
            }}
          >
            Reservar
          </Button>
        )}
      </div>
    </div>
  );
}
