"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "@/lib/Supabase/supabaseClient";
import { Car, MapPin, Loader2 } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { ParkingMarkerContent } from "./parking-marker";
import { MapFilters } from "./map-filters";
// Importa tu token de Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

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
}

export function ParkingMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [parkings, setParkings] = useState<ParkingWithCoordinates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [selectedParking, setSelectedParking] =
    useState<ParkingWithCoordinates | null>(null);

  useEffect(() => {
    const fetchParkings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Usar la función RPC
        const { data, error } = await (supabase as any).rpc(
          "get_parkings_with_coordinates"
        );

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        const validParkings = (data || [])
          .filter(
            (parking: any) =>
              parking.longitude !== null &&
              parking.latitude !== null &&
              !isNaN(parseFloat(parking.longitude)) &&
              !isNaN(parseFloat(parking.latitude))
          )
          .map((parking: any) => ({
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
            longitude: parseFloat(parking.longitude),
            latitude: parseFloat(parking.latitude),
          }));

        console.log("Valid parkings loaded:", validParkings);
        setParkings(validParkings);
      } catch (err: any) {
        console.error("Error fetching parkings:", err);
        setError(err.message || "Error al cargar los parqueaderos");
      } finally {
        setLoading(false);
      }
    };

    fetchParkings();
  }, [supabase]);

  // Crear contenido del popup
  const createPopupContent = (parking: ParkingWithCoordinates) => {
    const container = document.createElement("div");

    // Renderizar el componente React a HTML estático
    const htmlString = renderToStaticMarkup(
      <ParkingMarkerContent
        parking={parking}
        onDetails={(id) => {
          console.log("Ver detalles de:", id);
          // Aquí irá la navegación a detalles
        }}
        onReserve={(id) => {
          console.log("Reservar:", id);
          // Aquí irá la reserva
        }}
      />
    );

    container.innerHTML = htmlString;

    // Agregar eventos manualmente ya que renderToStaticMarkup no incluye handlers
    setTimeout(() => {
      const detailsBtn = container.querySelector("button:nth-child(1)");
      const reserveBtn = container.querySelector("button:nth-child(2)");

      if (detailsBtn) {
        detailsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          console.log("Ver detalles de:", parking.id);
        });
      }

      if (reserveBtn) {
        reserveBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          console.log("Reservar:", parking.id);
        });
      }
    }, 0);

    return container;
  };

  // Función para manejar selección de parqueadero
  const handleSelectParking = (parking: ParkingWithCoordinates | null) => {
    setSelectedParking(parking);

    if (parking && map.current) {
      map.current.setCenter([parking.longitude, parking.latitude]);
      map.current.setZoom(15);

      // Abrir popup del marcador si existe
      const marker = markersRef.current.find((m) => {
        // Aquí necesitarías una forma de identificar el marcador
        // Podrías guardar el ID del parqueadero en el elemento del marcador
        return true;
      });

      if (marker) {
        marker.togglePopup();
      }
    }
  };

  // Inicializar mapa y agregar marcadores
  useEffect(() => {
    if (!mapContainer.current || !parkings.length) {
      if (!parkings.length && !loading) {
        console.log("No parkings to display");
      }
      return;
    }

    // Limpiar marcadores anteriores
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Inicializar mapa si no existe
    if (!map.current) {
      // Usar ubicación del usuario
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLng = position.coords.longitude;
          const userLat = position.coords.latitude;

          console.log("Ubicación del usuario:", userLng, userLat);

          map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [userLng, userLat], // 📍 Aquí empieza centrado en el usuario
            zoom: 15, // Un poco más cerca que 12
            collectResourceTiming: false,
            fadeDuration: 0,
            attributionControl: false,
          });

          // Agregar controles
          map.current.addControl(
            new mapboxgl.NavigationControl({ showCompass: false }),
            "top-right"
          );

          
          addParkingMarkers();
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error);
          // Fallback si no da permisos → Santa Cruz
          map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [-63.1711, -17.7833],
            zoom: 12,
          });
          addParkingMarkers();
        }
      );
    }

    // Función auxiliar para agregar marcadores
    const addParkingMarkers = () => {
      if (!map.current) return;

      parkings.forEach((parking) => {
        try {
          const lng = parking.longitude;
          const lat = parking.latitude;

          if (!lng || !lat || isNaN(lat) || isNaN(lng)) return;

          const el = document.createElement("div");
          el.className = "cursor-pointer";
          el.innerHTML = `
          <div class="relative">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transform transition-all duration-200 hover:scale-110 ${
              parking.tipo === "publico"
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-red-500 hover:bg-red-600"
            }">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16s6-5.686 6-10A6 6 0 002 6c0 4.314 6 10 6 10zm0-7a3 3 0 110-6 3 3 0 010 6z"/>
              </svg>
            </div>
          </div>
        `;

          const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([lng, lat])
            .setPopup(
              new mapboxgl.Popup({
                offset: 25,
                className: "parking-popup",
              }).setDOMContent(createPopupContent(parking))
            )
            .addTo(map.current!);

          markersRef.current.push(marker);
        } catch (error) {
          console.error("Error creando marcador:", parking.nombre, error);
        }
      });
    };

    // Cleanup
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [parkings, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
          <p className="mt-4 text-gray-600 font-medium">
            Cargando parqueaderos...
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Verificando {parkings.length} parqueaderos
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
          <div className="text-red-500 mb-3">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error al cargar
          </h3>
          <p className="text-gray-600 mb-4 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!parkings.length && !loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin parqueaderos disponibles
          </h3>
          <p className="text-gray-600 mb-4">
            No se encontraron parqueaderos activos en la base de datos.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      style={{ height: "calc(100vh - 4rem - 4rem)" }}
    >
      <div
        ref={mapContainer}
        className="absolute inset-0"
        style={{ height: "100%", width: "100%" }}
      />
      <MapFilters
        onSearch={(filters) => {
          console.log("Filtros aplicados:", filters);
          // Aquí irá la lógica de filtrado
        }}
        onReset={() => {
          console.log("Filtros reseteados");
          // Aquí irá la lógica para mostrar todos los parqueaderos
        }}
        parkings={parkings}
        selectedParking={selectedParking}
        onSelectParking={handleSelectParking}
        isOpen={isFiltersOpen}
        onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
      />

      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <h3 className="font-semibold text-sm mb-2">Tipos de Parqueos</h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Público</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Privado</span>
          </div>
        </div>
      </div>

      {/* Contador de parqueaderos */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">
            {parkings.length} Parqueos
          </span>
        </div>
      </div>
    </div>
  );
}
