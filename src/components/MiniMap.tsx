"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Importa tu token de Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  parkingName: string;
  className?: string;
}

export function MiniMap({ latitude, longitude, parkingName, className = "" }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Inicializar mapa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude, latitude],
      zoom: 15,
      interactive: false, // Hacer el mapa no interactivo para mejor UX
    });

    // Agregar marcador
    const marker = new mapboxgl.Marker({
      color: "#3b82f6", // Azul
    })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="text-center">
              <h3 class="font-semibold">${parkingName}</h3>
              <p class="text-sm text-gray-600">Ubicación del parqueadero</p>
            </div>
          `)
      )
      .addTo(map.current);

    // Añadir controles de navegación
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, parkingName]);

  return (
    <div 
      ref={mapContainer} 
      className={`w-full h-64 rounded-lg overflow-hidden border ${className}`}
    />
  );
}
