"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "@/lib/Supabase/supabaseClient";
import { Car, MapPin, Loader2, Navigation } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { ParkingMarkerContent } from "./parking-marker";
import { MapFilters } from "./map-filters";
import { Button } from "@/components/ui/button";

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
  precio_por_hora?: number | null;
  imagen_url?: string | null;
}

interface FilterState {
  searchTerm: string;
  tipo: string | null;
}

export function ParkingMap() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [parkings, setParkings] = useState<ParkingWithCoordinates[]>([]);
  const [filteredParkings, setFilteredParkings] = useState<ParkingWithCoordinates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const supabase = createClient();
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Función para obtener imagen por defecto con las primeras 3 letras
  const getDefaultImage = useCallback((parking: ParkingWithCoordinates) => {
    const color = parking.tipo === "publico" ? "3b82f6" : "ef4444";
    const initials = parking.nombre.substring(0, 3).toUpperCase();
    return `https://placehold.co/200x120/${color}/ffffff?text=${encodeURIComponent(initials)}`;
  }, []);

  // Función para calcular distancia entre dos coordenadas (fórmula de Haversine)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en kilómetros
  }, []);
  const [selectedParking, setSelectedParking] = useState<ParkingWithCoordinates | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    searchTerm: '',
    tipo: null,
  });

  // Función para aplicar filtros
  const applyFilters = useCallback((filters: FilterState) => {
    let filtered = [...parkings];

    // Filtro por término de búsqueda
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(parking => 
        parking.nombre.toLowerCase().includes(term) ||
        parking.direccion?.toLowerCase().includes(term) ||
        parking.zona?.toLowerCase().includes(term) ||
        parking.ciudad?.toLowerCase().includes(term)
      );
    }

    // Filtro por tipo
    if (filters.tipo) {
      filtered = filtered.filter(parking => parking.tipo === filters.tipo);
    }

    // Filtro por proximidad al usuario (15km fijo)
    if (userLocation) {
      filtered = filtered.filter(parking => {
        if (!parking.latitude || !parking.longitude) return false;
        const distance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          parking.latitude, 
          parking.longitude
        );
        return distance <= 15; // Distancia fija de 15km
      });
    }

    setFilteredParkings(filtered);
    setCurrentFilters(filters);
    
    // Actualizar marcadores cuando cambien los parqueaderos filtrados
    if (map.current && !loading && mapInitialized) {
      setTimeout(() => {
        addParkingMarkers();
      }, 100);
    }
  }, [parkings, loading, mapInitialized, userLocation, calculateDistance]);

  // Función para obtener ubicación del usuario
  const getUserLocation = useCallback(() => {
    return new Promise<{lat: number, lng: number}>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          // Aplicar filtros con la nueva ubicación para mostrar parqueaderos cercanos
          if (parkings.length > 0) {
            setTimeout(() => {
              applyFilters(currentFilters);
            }, 100);
          }
          
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutos
        }
      );
    });
  }, [parkings, currentFilters, applyFilters]);

  // Función para agregar marcador de usuario
  const addUserMarker = useCallback((lat: number, lng: number) => {
    if (!map.current) return;

    // Remover marcador anterior si existe
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Crear elemento personalizado para el marcador del usuario
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = `
      <div class="relative">
        <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-200 rounded-full opacity-30 animate-ping"></div>
      </div>
    `;

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 15 })
          .setHTML('<div class="text-sm font-medium">Tu ubicación</div>')
      )
      .addTo(map.current);
  }, []);

  // Función para manejar detalles del parqueadero
  const handleViewDetails = useCallback((id: number) => {
    router.push(`/parkings?parking=${id}`);
  }, [router]);

  // Función para manejar reserva
  const handleReserve = useCallback((id: number) => {
    router.push(`/reservations?parking=${id}`);
  }, [router]);

  // Crear contenido del popup
  const createPopupContent = useCallback((parking: ParkingWithCoordinates) => {
    const container = document.createElement("div");

    // Renderizar el componente React a HTML estático
    const htmlString = renderToStaticMarkup(
      <ParkingMarkerContent
        parking={parking}
        onDetails={handleViewDetails}
        onReserve={handleReserve}
        getDefaultImage={getDefaultImage}
      />
    );

    container.innerHTML = htmlString;

    // Agregar eventos manualmente ya que renderToStaticMarkup no incluye handlers
    setTimeout(() => {
      const detailsBtn = container.querySelector("[data-action='details']");
      const reserveBtn = container.querySelector("[data-action='reserve']");

      if (detailsBtn) {
        detailsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleViewDetails(parking.id);
        });
      }

      if (reserveBtn) {
        reserveBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleReserve(parking.id);
        });
      }
    }, 0);

    return container;
  }, [handleViewDetails, handleReserve, getDefaultImage]);

  // Función mejorada para manejar selección de parqueadero
  const handleSelectParking = useCallback((parking: ParkingWithCoordinates | null) => {
    setSelectedParking(parking);

    if (parking && map.current) {
      // Centrar mapa en el parqueadero seleccionado
      map.current.flyTo({
        center: [parking.longitude, parking.latitude],
        zoom: 16,
        duration: 1000
      });

      // Encontrar y abrir popup del marcador correspondiente
      const marker = markersRef.current.find((m) => {
        const element = m.getElement();
        return element.dataset.parkingId === parking.id.toString();
      });

      if (marker) {
        // Cerrar otros popups
        markersRef.current.forEach(m => {
          const popup = m.getPopup();
          if (m !== marker && popup && popup.isOpen()) {
            m.togglePopup();
          }
        });
        
        // Abrir popup del marcador seleccionado
        const selectedPopup = marker.getPopup();
        if (selectedPopup && !selectedPopup.isOpen()) {
          marker.togglePopup();
        }
      }
    }
  }, []);

  // Función para centrar mapa en ubicación del usuario
  const centerOnUser = useCallback(() => {
    if (userLocation && map.current) {
      // Zoom fijo apropiado para 15km de radio
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 13,
        duration: 1000
      });
    } else {
      // Intentar obtener ubicación nuevamente
      getUserLocation().then((location) => {
        if (map.current) {
          map.current.flyTo({
            center: [location.lng, location.lat],
            zoom: 13,
            duration: 1000
          });
        }
      }).catch((error) => {
        // Error silencioso, simplemente no se centra
      });
    }
  }, [userLocation, getUserLocation]);

  // Función auxiliar para agregar marcadores de parqueaderos
  const addParkingMarkers = useCallback(() => {
    if (!map.current) return;

    // Limpiar marcadores anteriores
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filteredParkings.forEach((parking) => {
      try {
        const lng = parking.longitude;
        const lat = parking.latitude;

        if (!lng || !lat || isNaN(lat) || isNaN(lng)) return;

        // Crear elemento personalizado para el marcador
        const el = document.createElement("div");
        el.className = "parking-marker cursor-pointer";
        el.dataset.parkingId = parking.id.toString();
        
        // Determinar si está seleccionado
        const isSelected = selectedParking?.id === parking.id;
        
        el.innerHTML = `
          <div class="relative transform transition-all duration-200 hover:scale-110 ${isSelected ? 'scale-125' : ''}">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
              parking.tipo === "publico"
                ? `${isSelected ? 'bg-blue-600' : 'bg-blue-500'} hover:bg-blue-600`
                : `${isSelected ? 'bg-red-600' : 'bg-red-500'} hover:bg-red-600`
            }">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16s6-5.686 6-10A6 6 0 002 6c0 4.314 6 10 6 10zm0-7a3 3 0 110-6 3 3 0 010 6z"/>
              </svg>
            </div>
            ${isSelected ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>' : ''}
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent ${
              parking.tipo === "publico" ? "border-t-blue-500" : "border-t-red-500"
            }"></div>
          </div>
        `;

        // Crear marcador con popup
        const marker = new mapboxgl.Marker({ 
          element: el, 
          anchor: "bottom" 
        })
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.Popup({
              offset: 25,
              className: "parking-popup",
              closeButton: true,
              closeOnClick: false,
            }).setDOMContent(createPopupContent(parking))
          )
          .addTo(map.current!);

        // Agregar evento click al marcador
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          handleSelectParking(parking);
        });

        markersRef.current.push(marker);
      } catch (error) {
        console.error("Error creando marcador:", parking.nombre, error);
      }
    });

    // Ajustar vista para mostrar todos los marcadores si hay parqueaderos
    if (filteredParkings.length > 0 && !selectedParking) {
      const bounds = new mapboxgl.LngLatBounds();
      
      // Incluir ubicación del usuario si está disponible
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }
      
      // Incluir todos los parqueaderos filtrados
      filteredParkings.forEach(parking => {
        bounds.extend([parking.longitude, parking.latitude]);
      });

      // Ajustar vista con una pequeña demora para asegurar que el mapa esté listo
      setTimeout(() => {
        if (map.current && filteredParkings.length > 1) {
          map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
            duration: 1000
          });
        }
      }, 100);
    }
  }, [filteredParkings, selectedParking, userLocation, createPopupContent, handleSelectParking]);

  // Efecto para cargar datos de parqueaderos
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
            precio_por_hora: parking.precio_por_hora,
            imagen_url: parking.imagen_url,
          }));

        setParkings(validParkings);
        setFilteredParkings(validParkings); // Inicializar parqueaderos filtrados
      } catch (err: any) {
        setError(err.message || "Error al cargar los parqueaderos");
      } finally {
        setLoading(false);
      }
    };

    fetchParkings();
  }, [supabase]);

  // Inicializar mapa cuando los datos estén listos
  useEffect(() => {
    // Solo inicializar si tenemos el contenedor, no hay mapa aún, y ya cargaron los datos
    if (!mapContainer.current || map.current || loading || mapInitialized) {
      return;
    }

    setMapInitialized(true);
    
    // Función para crear el mapa
    const createMap = (center: [number, number], zoom: number) => {
      try {
        if (!mapContainer.current) {
          return;
        }

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v11",
          center: center,
          zoom: zoom,
          collectResourceTiming: false,
          fadeDuration: 0,
          attributionControl: false,
        });

        // Agregar event listeners
        map.current.on('load', () => {
          // Agregar marcadores cuando el mapa esté listo
          setTimeout(() => {
            addParkingMarkers();
          }, 100);
        });

        map.current.on('error', (e) => {
          setError("Error de Mapbox: " + e.error);
        });

        // Agregar controles de navegación
        map.current.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right"
        );

        return map.current;
      } catch (mapError: any) {
        setError("Error al inicializar el mapa: " + mapError.message);
        return null;
      }
    };

    // Intentar obtener ubicación del usuario
    getUserLocation()
      .then((location) => {
        // Zoom fijo de 13 para mostrar área de 15km
        const mapInstance = createMap([location.lng, location.lat], 13);
        if (mapInstance) {
          addUserMarker(location.lat, location.lng);
        }
      })
      .catch((error) => {
        // Fallback a Santa Cruz, Bolivia
        createMap([-63.1711, -17.7833], 12);
      });

    // Cleanup
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapInitialized(false);
    };
  }, [loading, parkings.length]); // Depende de que no esté cargando y tengamos datos

  // Effect para aplicar filtros cuando cambian los parqueaderos
  useEffect(() => {
    if (parkings.length > 0) {
      applyFilters(currentFilters);
    }
  }, [parkings, applyFilters, currentFilters]);

  // Effect para re-aplicar filtros cuando cambie la ubicación del usuario o preferencias de proximidad
  useEffect(() => {
    if (parkings.length > 0 && userLocation) {
      applyFilters(currentFilters);
    }
  }, [userLocation, parkings, applyFilters, currentFilters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
          <p className="mt-4 text-gray-600 font-medium">
            Cargando parqueaderos...
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Verificando ubicaciones disponibles
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
      
      {/* Componente de filtros mejorado */}
      <MapFilters
        onSearch={(filters) => {
          applyFilters(filters);
        }}
        onReset={() => {
          const resetFilters = {
            searchTerm: '',
            tipo: null,
          };
          applyFilters(resetFilters);
          setSelectedParking(null);
        }}
        parkings={filteredParkings}
        selectedParking={selectedParking}
        onSelectParking={handleSelectParking}
        isOpen={isFiltersOpen}
        onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
      />

      {/* Botón para centrar en ubicación del usuario */}
      {userLocation && (
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-20 right-4 bg-white shadow-lg z-10 p-2"
          onClick={centerOnUser}
          title="Centrar en mi ubicación"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      )}

      {/* Leyenda de tipos de parqueos */}
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

      {/* Contador de parqueaderos mejorado */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <div className="text-sm">
            <div className="font-medium">
              {filteredParkings.length} de {parkings.length} Parqueos
            </div>
            {currentFilters.searchTerm || currentFilters.tipo ? (
              <div className="text-xs text-gray-500">Filtrados</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Información del parqueadero seleccionado */}
      {selectedParking && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-sm">{selectedParking.nombre}</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSelectedParking(null)}
            >
              ×
            </Button>
          </div>
          {selectedParking.direccion && (
            <p className="text-xs text-gray-600 mb-2">{selectedParking.direccion}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={() => handleViewDetails(selectedParking.id)}
            >
              Ver detalles
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => handleReserve(selectedParking.id)}
            >
              Reservar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
