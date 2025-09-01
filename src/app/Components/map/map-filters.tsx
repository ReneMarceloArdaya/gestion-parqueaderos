"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, X, ChevronLeft, MapPin, Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ParkingWithCoordinates {
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

interface MapFiltersProps {
  onSearch: (filters: {
    searchTerm: string;
    tipo: string | null;
  }) => void;
  onReset: () => void;
  parkings: ParkingWithCoordinates[];
  selectedParking: ParkingWithCoordinates | null;
  onSelectParking: (parking: ParkingWithCoordinates | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function MapFilters({
  onSearch,
  onReset,
  parkings,
  selectedParking,
  onSelectParking,
  isOpen,
  onToggle,
}: MapFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipo, setTipo] = useState<string | null>(null);

  const handleSearch = () => {
    onSearch({
      searchTerm,
      tipo: tipo === "all" ? null : tipo,
    });
  };

  const handleReset = () => {
    setSearchTerm("");
    setTipo(null);
    onReset();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Función para obtener imagen por defecto mejorada
  const getDefaultImage = (parking: ParkingWithCoordinates) => {
    const color = parking.tipo === "publico" ? "3b82f6" : "ef4444";
    return `https://placehold.co/300x200/${color}/ffffff?text=${encodeURIComponent(
      parking.nombre.substring(0, 3)
    )}`;
  };

  // Auto-buscar cuando cambian los filtros
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, tipo]);

  const parkingCount = {
    total: parkings.length,
    publicos: parkings.filter((p) => p.tipo === "publico").length,
    privados: parkings.filter((p) => p.tipo === "privado").length,
  };

  return (
    <>
      {/* Botón para abrir/cerrar panel */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 left-4 z-20 bg-white shadow-lg"
        onClick={onToggle}
      >
        <ChevronLeft
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      <div
        className={`absolute top-4 left-4 bg-white rounded-lg shadow-lg z-10 transition-all duration-300 ${
          isOpen ? "w-96" : "w-12"
        }`}
        style={{
          maxHeight: "calc(100vh - 2rem - 8rem)",
          maxWidth: "min(400px, calc(100vw - 2rem))",
        }}
      >
        {isOpen ? (
          <div className="h-175 flex flex-col ">
            {/* Header fijo */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Buscar Parqueaderos</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Filtros */}
              <div className="space-y-3">
                {/* Buscador por nombre */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Nombre
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar parqueadero..."
                      className="pl-8 text-sm h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                  </div>
                </div>

                {/* Filtro por tipo */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Tipo
                  </label>
                  <Select
                    value={tipo || "all"}
                    onValueChange={(value) =>
                      setTipo(value === "all" ? null : value)
                    }
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="publico">Público</SelectItem>
                      <SelectItem value="privado">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botones de búsqueda y reset */}
                <div className="flex gap-1">
                  <Button
                    onClick={handleSearch}
                    className="flex-1 text-xs h-8"
                    size="sm"
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Buscar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="text-xs h-8"
                    size="sm"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Estadísticas rápidas */}
                {parkingCount.total > 0 && (
                  <div className="bg-gray-50 rounded p-2 text-xs">
                    <div className="flex justify-between">
                      <span>Total: {parkingCount.total}</span>
                      <div className="flex gap-2">
                        <span className="text-blue-600">
                          {parkingCount.publicos} Públicos
                        </span>
                        <span className="text-red-600">
                          {parkingCount.privados} Privados
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de parqueaderos con scroll */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-medium text-gray-700">
                    Resultados ({parkings.length})
                  </h4>
                  {parkingCount.total > 0 && (
                    <div className="flex gap-1 text-xs">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {parkingCount.publicos}P
                      </span>
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                        {parkingCount.privados}Pr
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ÁREA DE SCROLL CONTROLADA */}
              <div
                className="flex-1 overflow-y-auto p-3"
                style={{
                  maxHeight: "calc(100vh - 380px)",
                }}
              >
                <div className="space-y-2">
                  {parkings.map((parking) => (
                    <Card
                      key={parking.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow text-xs ${
                        selectedParking?.id === parking.id
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={() => onSelectParking(parking)}
                    >
                      <CardContent className="p-2">
                        <div className="flex gap-2">
                          {/* Imagen más pequeña */}
                          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={
                                parking.imagen_url || getDefaultImage(parking)
                              }
                              alt={parking.nombre}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getDefaultImage(parking);
                              }}
                            />
                          </div>

                          {/* Información compacta */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-xs truncate">
                              {parking.nombre}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                              {parking.direccion?.substring(0, 30)}
                            </p>

                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  <Car className="inline h-3 w-3 mr-1" />
                                  {parking.capacidad_total}
                                </span>
                                {parking.precio_por_hora && (
                                  <span className="text-xs font-medium text-green-600">
                                    ${parking.precio_por_hora}/hr
                                  </span>
                                )}
                              </div>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                  parking.tipo === "publico"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {parking.tipo === "publico"
                                  ? "Público"
                                  : "Privado"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {parkings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium">
                        No se encontraron parqueos
                      </p>
                      <p className="text-xs">Intenta ajustar los filtros</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Panel minimizado
          <div className="p-2 flex items-center justify-center h-full">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
        )}
      </div>
    </>
  );
}
