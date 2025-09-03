"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/Supabase/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, Car, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Interfaces
interface ReservationForm {
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  nombreCompleto: string;
  telefono: string;
  email: string;
  placa: string;
  tipo_vehiculo_id: number;
}

interface Plaza {
  id: number;
  codigo: string;
  x: number;
  y: number;
  width: number;
  height: number;
  estado: 'libre' | 'ocupada' | 'reservada' | 'fuera_servicio';
  tipo_vehiculo: {
    id: number;
    nombre: string;
  };
  nivel_id: number;
}

interface Nivel {
  id: number;
  nombre: string;
  orden: number;
  plano_url: string | null;
}

interface ParkingInfo {
  id: number;
  nombre: string;
  direccion: string | null;
  tipo: string;
  niveles: Nivel[];
  tarifa_info?: {
    tipo_tarifa: 'por_hora' | 'tarifa_fija' | 'por_tramo';
    precio_por_hora: number | null;
    precio_fijo: number | null;
    tramos: any[] | null;
    nombre: string;
  };
}

interface SelectedPlazaInfo {
  plaza: Plaza;
  nivel: Nivel;
  precio: number;
  tipoTarifa: string;
}

export default function ReservationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parkingId = searchParams.get("parking");
  const supabase = createClient();

  // Estados principales
  const [parking, setParking] = useState<ParkingInfo | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [selectedPlaza, setSelectedPlaza] = useState<SelectedPlazaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estados para Konva
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const imageLayerRef = useRef<any>(null);
  const [konvaLoaded, setKonvaLoaded] = useState(false);
  const [Konva, setKonva] = useState<any>(null);
  const [hoveredPlaza, setHoveredPlaza] = useState<Plaza | null>(null);
  const [tiposVehiculo, setTiposVehiculo] = useState<{id: number, nombre: string}[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estado del formulario
  const [form, setForm] = useState<ReservationForm>({
    fecha: new Date(),
    horaInicio: "08:00",
    horaFin: "18:00",
    nombreCompleto: "",
    telefono: "",
    email: "",
    placa: "",
    tipo_vehiculo_id: 1, // Valor por defecto para auto
  });

  // Verificar que estamos en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Obtener usuario logueado
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          return;
        }
        setCurrentUser(user);
      } catch (error) {
        // Error silencioso
      }
    };

    if (isClient) {
      getCurrentUser();
    }
  }, [isClient, supabase]);

  // Función para generar código de reserva único
  const generateReservaCode = useCallback(() => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `RES-${timestamp}-${random}`.toUpperCase();
  }, []);

  // Cargar Konva dinámicamente solo en el cliente
  useEffect(() => {
    if (typeof window === 'undefined' || !isClient) return;
    
    const loadKonva = async () => {
      try {
        const KonvaModule = await import('konva');
        setKonva(KonvaModule.default);
        setKonvaLoaded(true);
      } catch (error) {
        setKonvaLoaded(false);
      }
    };
    
    loadKonva();
  }, [isClient]);

  // Cargar información del parqueadero
  const fetchParkingInfo = useCallback(async () => {
    if (!parkingId) {
      setError("ID de parqueadero no válido");
      setLoading(false);
      return;
    }

    try {
      // Obtener información del parqueadero con planos
      const { data: parkingData, error: parkingError } = await (supabase as any)
        .from("parqueaderos")
        .select(`
          id, nombre, direccion, tipo,
          niveles (
            id, nombre, orden
          )
        `)
        .eq("id", parkingId)
        .eq("activo", true)
        .single();

      if (parkingError) throw parkingError;
      if (!parkingData) throw new Error("Parqueadero no encontrado");

      // Obtener planos para cada nivel por separado
      const nivelesConPlanos = await Promise.all(
        parkingData.niveles.map(async (nivel: any) => {
          const { data: planoData } = await (supabase as any)
            .from("planos")
            .select("url")
            .eq("nivel_id", nivel.id)
            .eq("principal", true)
            .single();
          
          return {
            ...nivel,
            plano_url: planoData?.url || null
          };
        })
      );

      // Obtener información de tarifas (simplificado)
      const { data: tarifasData, error: tarifaError } = await (supabase as any)
        .from("tarifas")
        .select("precio_por_hora, precio_fijo, tipo_tarifa, nombre, tramos, valido_desde, valido_hasta")
        .eq("parqueadero_id", parkingId);

      let tarifaData = null;
      if (tarifaError) {
        // Error silencioso para tarifas
      } else if (tarifasData && tarifasData.length > 0) {
        // Filtrar tarifas válidas por fecha
        const now = new Date();
        const tarifasValidas = tarifasData.filter((tarifa: any) => {
          const validoDesde = new Date(tarifa.valido_desde);
          const validoHasta = tarifa.valido_hasta ? new Date(tarifa.valido_hasta) : null;
          return validoDesde <= now && (!validoHasta || validoHasta >= now);
        });
        
        // Usar la primera tarifa válida
        tarifaData = tarifasValidas.length > 0 ? tarifasValidas[0] : tarifasData[0];
      }

      const parkingInfo: ParkingInfo = {
        ...parkingData,
        niveles: nivelesConPlanos.sort((a: any, b: any) => a.orden - b.orden),
        tarifa_info: tarifaData ? {
          tipo_tarifa: tarifaData.tipo_tarifa,
          precio_por_hora: tarifaData.precio_por_hora,
          precio_fijo: tarifaData.precio_fijo,
          tramos: tarifaData.tramos,
          nombre: tarifaData.nombre
        } : undefined
      };

      setParking(parkingInfo);
      
      // Seleccionar el primer nivel por defecto
      if (parkingInfo.niveles.length > 0) {
        setSelectedLevel(parkingInfo.niveles[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [parkingId, supabase]);

  // Cargar plazas del nivel seleccionado
  const fetchPlazas = useCallback(async () => {
    if (!selectedLevel) return;

    try {
      const { data, error } = await (supabase as any)
        .from('plazas')
        .select(`
          id, codigo, coordenada, estado,
          tipos_vehiculo (
            id, nombre
          )
        `)
        .eq('nivel_id', selectedLevel)
        .in('estado', ['libre']); // Solo plazas libres para reservar

      if (error) throw error;

      const parsedPlazas: Plaza[] = data?.map((plaza: any) => {
        if (!plaza.coordenada) return null;
        
        try {
          // Manejar diferentes formatos de coordenadas
          let coordStr = '';
          
          if (typeof plaza.coordenada === 'string') {
            // Si es string, usar directamente
            coordStr = plaza.coordenada;
          } else if (plaza.coordenada && typeof plaza.coordenada === 'object') {
            // Si es objeto, podría ser GeoJSON o formato de Supabase
            if (plaza.coordenada.coordinates) {
              // Formato GeoJSON
              const coords = plaza.coordenada.coordinates[0]; // Primer ring del polígono
              coordStr = coords.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(',');
            } else if (Array.isArray(plaza.coordenada)) {
              // Formato array de coordenadas
              coordStr = plaza.coordenada.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(',');
            } else {
              return null;
            }
          } else {
            return null;
          }

          // Parsear coordenadas del formato POLYGON((x1 y1, x2 y2, ...))
          const match = coordStr.match(/POLYGON\(\(([^)]+)\)\)/);
          if (!match) {
            // Si no es formato POLYGON, intentar parsear directamente
            const coordPairs = coordStr.split(',').map(pair => {
              const [x, y] = pair.trim().split(/\s+/).map(Number);
              return { x, y };
            }).filter(coord => !isNaN(coord.x) && !isNaN(coord.y));
            
            if (coordPairs.length >= 4) {
              const coords = coordPairs;
              const x = Math.min(...coords.map(c => c.x));
              const y = Math.min(...coords.map(c => c.y));
              const maxX = Math.max(...coords.map(c => c.x));
              const maxY = Math.max(...coords.map(c => c.y));

              return {
                id: plaza.id,
                codigo: plaza.codigo || `Plaza-${plaza.id}`,
                x,
                y,
                width: maxX - x,
                height: maxY - y,
                estado: plaza.estado,
                tipo_vehiculo: plaza.tipos_vehiculo || { id: 1, nombre: 'Auto' },
                nivel_id: selectedLevel
              };
            }
            return null;
          }

          const coordsStr = match[1];
          const coords = coordsStr.split(',').map(pair => {
            const [x, y] = pair.trim().split(/\s+/).map(Number);
            return { x, y };
          }).filter(coord => !isNaN(coord.x) && !isNaN(coord.y));

          if (coords.length >= 4 && coords.every(c => !isNaN(c.x) && !isNaN(c.y))) {
            const x = Math.min(...coords.map((c: any) => c.x));
            const y = Math.min(...coords.map((c: any) => c.y));
            const maxX = Math.max(...coords.map((c: any) => c.x));
            const maxY = Math.max(...coords.map((c: any) => c.y));

            return {
              id: plaza.id,
              codigo: plaza.codigo || `Plaza-${plaza.id}`,
              x,
              y,
              width: maxX - x,
              height: maxY - y,
              estado: plaza.estado,
              tipo_vehiculo: plaza.tipos_vehiculo || { id: 1, nombre: 'Auto' },
              nivel_id: selectedLevel
            };
          }
        } catch (e) {
          // Error silencioso en parsing de coordenadas
        }
        return null;
      }).filter(Boolean) || [];

      setPlazas(parsedPlazas);
    } catch (err: any) {
      toast.error('Error al cargar las plazas');
    }
  }, [selectedLevel, supabase]);

  // Calcular precio según tipo de tarifa CORREGIDO
  const calculatePrice = useCallback((duracion: number) => {
    if (!parking?.tarifa_info) return 15 * duracion; // Precio por defecto

    const tarifa = parking.tarifa_info;

    switch (tarifa.tipo_tarifa) {
      case 'por_hora':
        return (tarifa.precio_por_hora || 15) * duracion;
      
      case 'tarifa_fija':
        return tarifa.precio_fijo || 50;
      
      case 'por_tramo':
        if (tarifa.tramos && Array.isArray(tarifa.tramos) && tarifa.tramos.length > 0) {
          const durationMinutes = duracion * 60;
          
          // Buscar el tramo que corresponde a la duración
          for (const tramo of tarifa.tramos) {
            const tiempoInicio = tramo.tiempo_inicio || 0;
            const tiempoFin = tramo.tiempo_fin || Infinity;
            
            if (durationMinutes >= tiempoInicio && durationMinutes <= tiempoFin) {
              return tramo.precio || 0;
            }
          }
          
          // Si no encuentra tramo exacto, usar el último tramo válido
          const sortedTramos = tarifa.tramos.sort((a, b) => (a.tiempo_inicio || 0) - (b.tiempo_inicio || 0));
          const lastTramo = sortedTramos[sortedTramos.length - 1];
          return lastTramo?.precio || 15 * duracion;
        }
        return 15 * duracion;
      
      default:
        return 15 * duracion;
    }
  }, [parking]);

  // Calcular duración en horas con validación
  const calculateDuration = useCallback(() => {
    if (!form.horaInicio || !form.horaFin) return 0;
    
    const inicio = new Date(`2024-01-01T${form.horaInicio}:00`);
    const fin = new Date(`2024-01-01T${form.horaFin}:00`);
    
    // Manejar el caso donde la hora fin es menor que la inicio (cruzando medianoche)
    if (fin <= inicio) {
      fin.setDate(fin.getDate() + 1);
    }
    
    const diffMs = fin.getTime() - inicio.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0.5, Math.round(diffHours * 2) / 2); // Mínimo 30 minutos, redondear a medias horas
  }, [form.horaInicio, form.horaFin]);

  // Validar horarios
  const validateTimeRange = useCallback(() => {
    if (!form.horaInicio || !form.horaFin) return true;
    
    const duration = calculateDuration();
    if (duration > 24) {
      return 'La reserva no puede exceder 24 horas';
    }
    if (duration < 0.5) {
      return 'La reserva mínima es de 30 minutos';
    }
    
    return true;
  }, [form.horaInicio, form.horaFin, calculateDuration]);

  // Manejar selección de plaza
  const handlePlazaSelect = useCallback((plaza: Plaza) => {
    if (!parking) return;

    const nivel = parking.niveles.find(n => n.id === plaza.nivel_id);
    if (!nivel) return;

    const duracion = calculateDuration();
    const precio = calculatePrice(duracion);

    setSelectedPlaza({
      plaza,
      nivel,
      precio,
      tipoTarifa: parking.tarifa_info?.tipo_tarifa || 'por_hora'
    });

    toast.success(`Plaza ${plaza.codigo} seleccionada`);
  }, [parking, calculateDuration, calculatePrice]);

  // Manejar envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaza) {
      toast.error("Debes seleccionar una plaza primero");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Validaciones
      if (!form.nombreCompleto || !form.telefono || !form.email || !form.placa) {
        throw new Error("Todos los campos son obligatorios");
      }

      if (!currentUser?.id) {
        throw new Error("Debes estar logueado para crear una reserva");
      }

      if (calculateDuration() <= 0) {
        throw new Error("La hora de fin debe ser posterior a la hora de inicio");
      }

      // Validar que la duración sea válida
      const duracionHoras = calculateDuration();
      if (isNaN(duracionHoras) || duracionHoras <= 0) {
        throw new Error('Duración inválida. Por favor revisa los horarios.');
      }

      // Generar código de reserva único
      const codigoReserva = generateReservaCode();

      // Crear reserva en la base de datos - NO incluir duracion_minutos ya que es una columna generada
      const reservaPayload = {
        usuario_id: currentUser.id,
        parqueadero_id: parseInt(parkingId!),
        plaza_id: selectedPlaza.plaza.id,
        tipo_vehiculo_id: form.tipo_vehiculo_id,
        hora_inicio: `${format(form.fecha, "yyyy-MM-dd")} ${form.horaInicio}:00+00`,
        hora_fin: `${format(form.fecha, "yyyy-MM-dd")} ${form.horaFin}:00+00`,
        estado: 'activa' as const,
        codigo_reserva: codigoReserva
      };

      const { data: reservaData, error: reservaError } = await (supabase as any)
        .from('reservas')
        .insert(reservaPayload)
        .select()
        .single();

      if (reservaError) {
        // Mensaje de error más específico para el usuario
        let userErrorMessage = 'Error al crear reserva';
        const errorMessage = reservaError.message || '';
        
        if (errorMessage.includes('duracion_minutos') || errorMessage.includes('generated column')) {
          userErrorMessage = 'Error interno de la base de datos. La duración se calcula automáticamente.';
        } else if (errorMessage.includes('foreign key')) {
          userErrorMessage = 'Error de validación de datos. Verifica que todos los campos estén correctos.';
        } else if (errorMessage.includes('not null') || errorMessage.includes('NOT NULL')) {
          userErrorMessage = 'Faltan datos requeridos. Por favor completa todos los campos.';
        } else if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
          userErrorMessage = 'Ya existe una reserva con estos datos.';
        } else if (errorMessage.includes('check constraint') || errorMessage.includes('violates')) {
          userErrorMessage = 'Los datos ingresados no son válidos. Revisa los horarios y fechas.';
        } else if (errorMessage) {
          userErrorMessage = `Error de base de datos: ${errorMessage}`;
        }
        
        throw new Error(userErrorMessage);
      }

      // Actualizar estado de la plaza a reservada
      const { error: plazaError } = await (supabase as any)
        .from('plazas')
        .update({ estado: 'reservada' })
        .eq('id', selectedPlaza.plaza.id);

      if (plazaError) {
        throw new Error(`Error al actualizar el estado de la plaza: ${plazaError.message || 'Error desconocido'}`);
      }

      setSuccess(true);
      toast.success(`¡Reserva creada exitosamente! Código: ${codigoReserva}`);

    } catch (err: any) {
      const errorMessage = err.message || 'Error desconocido al procesar la reserva';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [form, selectedPlaza, parkingId, calculateDuration, currentUser, generateReservaCode, supabase]);

  // Inicializar Konva Stage y Layer
  useEffect(() => {
    if (!konvaLoaded || !Konva) return;

    // Añadir un pequeño delay para asegurar que el DOM esté listo
    const initializeKonva = () => {
      if (!containerRef.current) {
        setTimeout(initializeKonva, 100);
        return;
      }

      const stage = new Konva.Stage({
        container: containerRef.current,
        width: 1500,
        height: 600,
      });

      const imageLayer = new Konva.Layer();
      const layer = new Konva.Layer();

      stage.add(imageLayer);
      stage.add(layer);

      stageRef.current = stage;
      layerRef.current = layer;
      imageLayerRef.current = imageLayer;
      
      // Zoom con rueda del mouse
      stage.on('wheel', (e: any) => {
        e.evt.preventDefault();
        
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition()!;
        
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };
        
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const factor = 0.05;
        const newScale = direction > 0 ? oldScale * (1 + factor) : oldScale * (1 - factor);
        
        // Limitar zoom
        const clampedScale = Math.max(0.1, Math.min(5, newScale));
        
        stage.scale({ x: clampedScale, y: clampedScale });
        
        const newPos = {
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        };
        stage.position(newPos);
        stage.batchDraw();
      });

      // Pan con arrastrar y Ctrl+Click
      let isPanning = false;
      let lastPointerPosition: any;

      stage.on('mousedown', (e: any) => {
        // Pan con Ctrl+Click en cualquier elemento
        if (e.evt.ctrlKey) {
          isPanning = true;
          stage.draggable(true);
          return;
        }
        
        // Pan con click en area vacía del stage
        if (e.target === stage) {
          isPanning = true;
          stage.draggable(true);
          return;
        }
        
        stage.draggable(false);
      });

      stage.on('mouseup', () => {
        isPanning = false;
        stage.draggable(false);
      });
    };

    initializeKonva();

    return () => {
      if (stageRef.current) {
        stageRef.current.destroy();
      }
    };
  }, [konvaLoaded, Konva]);

  // Cargar imagen de fondo cuando cambie el nivel
  useEffect(() => {
    if (!imageLayerRef.current || !selectedLevel || !parking || !Konva) return;

    const nivel = parking.niveles.find(n => n.id === selectedLevel);
    if (!nivel) {
      return;
    }

    if (!nivel.plano_url) {
      return;
    }

    const imageObj = new Image();
    imageObj.crossOrigin = 'anonymous';
    
    imageObj.onload = () => {
      const konvaImage = new Konva.Image({
        x: 0,
        y: 0,
        image: imageObj,
        width: 900,
        height: 600,
      });
      
      // Ajustar escala para mantener proporción
      const scaleX = 900 / imageObj.width;
      const scaleY = 600 / imageObj.height;
      const scale = Math.min(scaleX, scaleY);
      
      konvaImage.scale({ x: scale, y: scale });
      
      imageLayerRef.current.removeChildren();
      imageLayerRef.current.add(konvaImage);
      imageLayerRef.current.batchDraw();
    };
    
    imageObj.onerror = (error) => {
      // Error silencioso en carga de imagen
    };
    
    imageObj.src = nivel.plano_url;
  }, [selectedLevel, parking, Konva]);

  // Dibujar plazas como rectángulos de Konva
  useEffect(() => {
    if (!layerRef.current || !Konva || plazas.length === 0) return;

    // Limpiar plazas anteriores
    layerRef.current.destroyChildren();

    // Agregar plazas como rectángulos interactivos
    plazas.forEach((plaza) => {
      // Color según estado
      let fillColor = '#10b981'; // Verde para libre
      let strokeColor = '#065f46';

      if (plaza.estado === 'ocupada') {
        fillColor = '#ef4444'; // Rojo para ocupada
        strokeColor = '#991b1b';
      } else if (plaza.estado === 'reservada') {
        fillColor = '#f59e0b'; // Amarillo para reservada
        strokeColor = '#92400e';
      } else if (plaza.estado === 'fuera_servicio') {
        fillColor = '#6b7280'; // Gris para fuera de servicio
        strokeColor = '#374151';
      }

      // Usar las coordenadas originales sin escalar
      const rect = new Konva.Rect({
        x: plaza.x,
        y: plaza.y,
        width: plaza.width,
        height: plaza.height,
        fill: fillColor + '80', // Transparencia
        stroke: strokeColor,
        strokeWidth: 2,
        perfectDrawEnabled: false,
      });

      // Texto del código de plaza
      const text = new Konva.Text({
        x: plaza.x,
        y: plaza.y,
        width: plaza.width,
        height: plaza.height,
        text: plaza.codigo,
        fontSize: Math.max(8, Math.min(plaza.width / 6, plaza.height / 2)), // Tamaño de fuente proporcional
        fontFamily: 'Arial',
        fill: '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
      });

      // Solo permitir click en plazas libres
      if (plaza.estado === 'libre') {
        // Eventos para el rectángulo
        rect.on('click', () => handlePlazaSelect(plaza));
        rect.on('mouseenter', () => {
          setHoveredPlaza(plaza);
          if (stageRef.current) {
            stageRef.current.container().style.cursor = 'pointer';
          }
        });
        rect.on('mouseleave', () => {
          setHoveredPlaza(null);
          if (stageRef.current) {
            stageRef.current.container().style.cursor = 'default';
          }
        });
        
        // Eventos para el texto también
        text.on('click', () => handlePlazaSelect(plaza));
        text.on('mouseenter', () => {
          setHoveredPlaza(plaza);
          if (stageRef.current) {
            stageRef.current.container().style.cursor = 'pointer';
          }
        });
        text.on('mouseleave', () => {
          setHoveredPlaza(null);
          if (stageRef.current) {
            stageRef.current.container().style.cursor = 'default';
          }
        });
      }

      // Resaltar plaza seleccionada
      if (selectedPlaza?.plaza.id === plaza.id) {
        rect.stroke('#3b82f6');
        rect.strokeWidth(4);
      }

      layerRef.current.add(rect);
      layerRef.current.add(text);
    });
    
    layerRef.current.batchDraw();
  }, [plazas, selectedPlaza, Konva, handlePlazaSelect]);

  // Efectos principales
  useEffect(() => {
    fetchParkingInfo();
    // Cargar tipos de vehículo
    const fetchTiposVehiculo = async () => {
      const { data } = await (supabase as any)
        .from('tipos_vehiculo')
        .select('id, nombre')
        .order('id');
      
      if (data) setTiposVehiculo(data);
    };
    
    fetchTiposVehiculo();
  }, [fetchParkingInfo]);

  useEffect(() => {
    if (selectedLevel) {
      fetchPlazas();
    }
  }, [selectedLevel, fetchPlazas]);

  // Cambio de nivel
  const handleLevelChange = useCallback((levelId: string) => {
    setSelectedLevel(parseInt(levelId));
    setSelectedPlaza(null);
    setHoveredPlaza(null);
  }, []);

  // Mostrar loading mientras no estemos en el cliente
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Inicializando...</p>
        </div>
      </div>
    );
  }

  // Mostrar loading mientras Konva se carga
  if (!konvaLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema de visualización...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del parqueadero...</p>
        </div>
      </div>
    );
  }

  if (error && !parking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => router.back()} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser && isClient && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <User className="w-6 h-6" />
              Acceso Requerido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">Debes iniciar sesión para crear una reserva</p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/login')} className="flex-1">
                Iniciar Sesión
              </Button>
              <Button variant="outline" onClick={() => router.push('/parkings')} className="flex-1">
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              ¡Reserva Exitosa!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p><strong>Parqueadero:</strong> {parking?.nombre}</p>
              <p><strong>Plaza:</strong> {selectedPlaza?.plaza.codigo}</p>
              <p><strong>Nivel:</strong> {selectedPlaza?.nivel.nombre}</p>
              <p><strong>Fecha:</strong> {format(form.fecha, "dd/MM/yyyy", { locale: es })}</p>
              <p><strong>Horario:</strong> {form.horaInicio} - {form.horaFin}</p>
              <p><strong>Precio Total:</strong> ${selectedPlaza?.precio.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/parkings')} className="flex-1">
                Ver Parqueaderos
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                Nueva Reserva
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            Reservar Plaza - {parking?.nombre}
          </h1>
          <p className="text-gray-600 mt-2">{parking?.direccion}</p>
        </div>

        {/* Selector de nivel */}
        {parking && parking.niveles.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Seleccionar Nivel</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedLevel?.toString()} onValueChange={handleLevelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  {parking.niveles.map((nivel) => (
                    <SelectItem key={nivel.id} value={nivel.id.toString()}>
                      {nivel.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Mapa de plazas - Arriba */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selecciona una Plaza</CardTitle>
            <p className="text-sm text-gray-600">
              Haz clic en una plaza libre (verde) para seleccionarla
            </p>
          </CardHeader>
          <CardContent>
            {/* Leyenda */}
            <div className="flex gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Libre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Ocupada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Reservada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Seleccionada</span>
              </div>
            </div>

            {/* Canvas de Konva - Más grande */}
            <div className="border rounded-lg overflow-hidden bg-white relative" style={{ width: '1500px', height: '600px', maxWidth: '100%' }}>
              <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Información de plaza en hover */}
            {hoveredPlaza && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm">
                  <strong>Plaza:</strong> {hoveredPlaza.codigo} | 
                  <strong> Tipo:</strong> {hoveredPlaza.tipo_vehiculo.nombre} | 
                  <strong> Estado:</strong> {hoveredPlaza.estado}
                </p>
              </div>
            )}

            {/* Información de plazas disponibles */}
            <div className="mt-4 text-sm text-gray-600">
              <p>Total de plazas libres: {plazas.length}</p>
              <p className="text-xs mt-1">
                Usa la rueda del mouse para hacer zoom y arrastra para moverte por el mapa
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo - Información de la plaza seleccionada */}
          <div className="space-y-6">
            {/* Información de la plaza seleccionada */}
            {selectedPlaza ? (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    Plaza Seleccionada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Código</Label>
                      <p className="text-2xl font-bold text-green-700 mt-1">{selectedPlaza.plaza.codigo}</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nivel</Label>
                      <p className="text-xl font-semibold text-gray-700 mt-1">{selectedPlaza.nivel.nombre}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo de Vehículo</Label>
                      <p className="text-lg font-semibold text-gray-700 mt-1">{selectedPlaza.plaza.tipo_vehiculo.nombre}</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border shadow-sm">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</Label>
                      <Badge variant="outline" className="text-green-600 border-green-600 mt-1">
                        {selectedPlaza.plaza.estado}
                      </Badge>
                    </div>
                  </div>
                  
                  {form.horaInicio && form.horaFin && selectedPlaza && (
                    <div className="p-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg text-center shadow-lg">
                      <p className="text-sm opacity-90">Precio Total Estimado</p>
                      <p className="text-3xl font-bold">Bs. {selectedPlaza.precio.toFixed(2)}</p>
                      <p className="text-sm opacity-90">{calculateDuration()} hora{calculateDuration() !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Car className="w-5 h-5" />
                    Selecciona una Plaza
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <div className="text-6xl mb-4">🚗</div>
                  <p className="text-gray-600 mb-2 font-medium">Haz click en una plaza libre del mapa</p>
                  <p className="text-sm text-gray-500">
                    Las plazas libres aparecen en <span className="text-blue-600 font-semibold">azul</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-3">
                    Total de plazas disponibles: {plazas.length}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel derecho - Formulario de reserva */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Datos de Reserva
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Fecha */}
                  <div>
                    <Label htmlFor="fecha" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Fecha de Reserva
                    </Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={form.fecha ? format(form.fecha, "yyyy-MM-dd") : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDate = new Date(e.target.value + 'T00:00:00');
                          setForm(prev => ({ ...prev, fecha: newDate }));
                        }
                      }}
                      min={format(new Date(), "yyyy-MM-dd")}
                      required
                      className="mt-1"
                    />
                  </div>

                  {/* Horarios */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="horaInicio" className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Hora Inicio
                        </Label>
                        <Input
                          id="horaInicio"
                          type="time"
                          value={form.horaInicio}
                          onChange={(e) => setForm(prev => ({ ...prev, horaInicio: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="horaFin" className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Hora Fin
                        </Label>
                        <Input
                          id="horaFin"
                          type="time"
                          value={form.horaFin}
                          onChange={(e) => setForm(prev => ({ ...prev, horaFin: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    {/* Resumen de duración y precio */}
                    {form.horaInicio && form.horaFin && (() => {
                      const timeValidation = validateTimeRange();
                      const duration = calculateDuration();
                      const price = selectedPlaza ? calculatePrice(duration) : 0;
                      
                      return (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          {typeof timeValidation === 'string' ? (
                            <p className="text-red-600 text-sm flex items-center gap-2">
                              <span>⚠️</span>
                              {timeValidation}
                            </p>
                          ) : (
                            <div className="text-sm space-y-1">
                              <p className="font-medium text-blue-800">
                                Duración: {duration} hora{duration !== 1 ? 's' : ''}
                              </p>
                              {selectedPlaza && (
                                <p className="text-blue-700">
                                  Precio estimado: <span className="font-bold">Bs. {price.toFixed(2)}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Datos personales */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Datos Personales
                    </h4>
                    
                    <div>
                      <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                      <Input
                        id="nombreCompleto"
                        placeholder="Ingresa tu nombre completo"
                        value={form.nombreCompleto}
                        onChange={(e) => setForm(prev => ({ ...prev, nombreCompleto: e.target.value }))}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="telefono" className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Teléfono
                        </Label>
                        <Input
                          id="telefono"
                          placeholder="Tu número de teléfono"
                          value={form.telefono}
                          onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={form.email}
                          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Datos del vehículo */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Datos del Vehículo
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="placa">Placa del Vehículo</Label>
                        <Input
                          id="placa"
                          placeholder="ABC-1234"
                          value={form.placa}
                          onChange={(e) => setForm(prev => ({ ...prev, placa: e.target.value.toUpperCase() }))}
                          required
                          className="mt-1 font-mono"
                          maxLength={8}
                        />
                      </div>
                      <div>
                        <Label htmlFor="tipoVehiculo">Tipo de Vehículo</Label>
                        <Select 
                          value={form.tipo_vehiculo_id.toString()} 
                          onValueChange={(value) => setForm(prev => ({ ...prev, tipo_vehiculo_id: parseInt(value) }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecciona tipo" />
                          </SelectTrigger>
                          <SelectContent>
                          {tiposVehiculo.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id.toString()}>
                              {tipo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600 text-sm flex items-center gap-2">
                        <span>⚠️</span>
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2" 
                      disabled={!selectedPlaza || submitting || typeof validateTimeRange() === 'string'}
                      size="lg"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creando Reserva...
                        </>
                      ) : !selectedPlaza ? (
                        <>
                          <Car className="w-4 h-4" />
                          Selecciona una plaza primero
                        </>
                      ) : typeof validateTimeRange() === 'string' ? (
                        <>
                          <Clock className="w-4 h-4" />
                          Revisa los horarios
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Reserva
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Controles del canvas */}
          <div className="text-sm text-gray-600 mt-2">
            <p><strong>Controles del mapa:</strong> Rueda del mouse = Zoom | Ctrl+Click = Mover mapa | Click en plaza = Seleccionar</p>
          </div>

        </div>
      </div>
    </div>
  );
}
