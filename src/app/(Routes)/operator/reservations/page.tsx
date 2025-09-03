"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/Supabase/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays,
  Clock,
  Car,
  MapPin,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
} from "lucide-react";

const supabase = createClient();

interface ReservaDetallada {
  id: number;
  usuario_id: string | null;
  tipo_vehiculo_id: number | null;
  parqueadero_id: number;
  plaza_id: number | null;
  hora_inicio: string;
  hora_fin: string;
  duracion_minutos: number | null;
  estado: string;
  codigo_reserva: string | null;
  creado_at: string;
  actualizado_at: string;
  // Datos relacionados
  usuario_nombre?: string;
  usuario_email?: string;
  usuario_telefono?: string;
  parqueadero_nombre?: string;
  parqueadero_direccion?: string;
  plaza_codigo?: string;
  tipo_vehiculo_nombre?: string;
  nivel_nombre?: string;
}

export default function ReservationsPage() {
  const [reservas, setReservas] = useState<ReservaDetallada[]>([]);
  const [reservasFiltered, setReservasFiltered] = useState<ReservaDetallada[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filtroFecha, setFiltroFecha] = useState<
    "todas" | "hoy" | "proximas24h" | "urgentes"
  >("todas");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);

        // Obtener sesión del usuario
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push("/login");
          return;
        }

        // Obtener ID del operador
        const { data: operatorData, error: operatorError } = await (
          supabase as any
        )
          .from("operadores")
          .select("id")
          .eq("usuario_id", session.user.id)
          .single();

        if (operatorError || !operatorData) {
          console.error("No se encontró el operador asociado a tu cuenta");
          return;
        }

        // Obtener reservas activas de los parqueaderos del operador
        const { data: reservasData, error: reservasError } = await (
          supabase as any
        )
          .from("reservas")
          .select("*")
          .eq("estado", "activa")
          .order("creado_at", { ascending: false });

        if (reservasError) {
          console.error("Error fetching reservas:", reservasError);
          return;
        }

        // Filtrar solo las reservas de parqueaderos del operador y obtener datos relacionados
        const reservasOperador: ReservaDetallada[] = [];

        for (const reserva of (reservasData as any[]) || []) {
          // Verificar si el parqueadero pertenece al operador
          const { data: parqueadero } = await (supabase as any)
            .from("parqueaderos")
            .select("id, nombre, direccion, operador_id")
            .eq("id", reserva.parqueadero_id)
            .eq("operador_id", operatorData.id)
            .single();

          if (!parqueadero) continue; // No es del operador

          // Obtener datos del usuario
          let usuario = null;
          if (reserva.usuario_id) {
            const { data: userData } = await (supabase as any)
              .from("usuarios")
              .select("nombre, email, telefono")
              .eq("id", reserva.usuario_id)
              .single();
            usuario = userData;
          }

          // Obtener datos de la plaza y nivel
          let plaza = null;
          let nivel = null;
          if (reserva.plaza_id) {
            const { data: plazaData } = await (supabase as any)
              .from("plazas")
              .select("codigo, nivel_id")
              .eq("id", reserva.plaza_id)
              .single();

            if (plazaData) {
              plaza = plazaData;
              const { data: nivelData } = await (supabase as any)
                .from("niveles")
                .select("nombre")
                .eq("id", plazaData.nivel_id)
                .single();
              nivel = nivelData;
            }
          }

          // Obtener tipo de vehículo
          let tipoVehiculo = null;
          if (reserva.tipo_vehiculo_id) {
            const { data: tipoData } = await (supabase as any)
              .from("tipos_vehiculo")
              .select("nombre")
              .eq("id", reserva.tipo_vehiculo_id)
              .single();
            tipoVehiculo = tipoData;
          }

          reservasOperador.push({
            ...reserva,
            usuario_nombre: usuario?.nombre,
            usuario_email: usuario?.email,
            usuario_telefono: usuario?.telefono,
            parqueadero_nombre: parqueadero.nombre,
            parqueadero_direccion: parqueadero.direccion,
            plaza_codigo: plaza?.codigo,
            tipo_vehiculo_nombre: tipoVehiculo?.nombre,
            nivel_nombre: nivel?.nombre,
          });
        }

        setReservas(reservasOperador);
        setReservasFiltered(reservasOperador);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [router]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...reservas];

    switch (filtroFecha) {
      case "hoy":
        filtered = reservas.filter(
          (r) =>
            new Date(r.hora_inicio).toDateString() === new Date().toDateString()
        );
        break;
      case "proximas24h":
        filtered = reservas.filter((r) => {
          const inicio = new Date(r.hora_inicio);
          const ahora = new Date();
          const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
          return inicio >= ahora && inicio <= en24h;
        });
        break;
      case "urgentes":
        filtered = reservas.filter((r) => {
          const inicio = new Date(r.hora_inicio);
          return inicio.getTime() - new Date().getTime() < 2 * 60 * 60 * 1000;
        });
        break;
      default:
        filtered = reservas;
    }

    setReservasFiltered(filtered);
  }, [reservas, filtroFecha]);

  // Auto-refresh cada 30 segundos para reservas urgentes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Recargar solo si hay reservas urgentes
        const urgentesCount = reservas.filter((r) => {
          const inicio = new Date(r.hora_inicio);
          return inicio.getTime() - new Date().getTime() < 2 * 60 * 60 * 1000;
        }).length;

        if (urgentesCount > 0) {
          recargarDatos();
        }
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, reservas]);

  // Recargar datos
  const recargarDatos = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: operatorData } = await (supabase as any)
        .from("operadores")
        .select("id")
        .eq("usuario_id", session.user.id)
        .single();

      if (operatorData) {
        // Lógica de recarga similar a initializePage pero más simple
        window.location.reload();
      }
    }
  };

  // Confirmar reserva
  const confirmarReserva = async (reservaId: number) => {
    try {
      setActionLoading(`confirm-${reservaId}`);

      const { error } = await (supabase as any)
        .from("reservas")
        .update({
          estado: "confirmada",
          actualizado_at: new Date().toISOString(),
        })
        .eq("id", reservaId);

      if (error) throw error;

      // Actualizar estado local
      setReservas((prev) => prev.filter((r) => r.id !== reservaId));

      alert("Reserva confirmada exitosamente");
    } catch (error) {
      console.error("Error confirming reservation:", error);
      alert("Error al confirmar la reserva");
    } finally {
      setActionLoading(null);
    }
  };

  // Cancelar reserva
  const cancelarReserva = async (reservaId: number) => {
    try {
      setActionLoading(`cancel-${reservaId}`);

      const { error } = await (supabase as any)
        .from("reservas")
        .update({
          estado: "cancelada",
          actualizado_at: new Date().toISOString(),
        })
        .eq("id", reservaId);

      if (error) throw error;

      // Si había plaza asignada, liberarla
      const reserva = reservas.find((r) => r.id === reservaId);
      if (reserva?.plaza_id) {
        await (supabase as any)
          .from("plazas")
          .update({
            estado: "libre",
            ultimo_actualizado: new Date().toISOString(),
          })
          .eq("id", reserva.plaza_id);
      }

      // Actualizar estado local
      setReservas((prev) => prev.filter((r) => r.id !== reservaId));

      alert("Reserva cancelada exitosamente");
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      alert("Error al cancelar la reserva");
    } finally {
      setActionLoading(null);
    }
  };

  // Contactar usuario por email
  const contactarUsuario = (reserva: ReservaDetallada) => {
    if (!reserva.usuario_email) {
      alert("Este usuario no tiene email registrado");
      return;
    }

    const inicioFormatted = formatDateTime(reserva.hora_inicio);
    const finFormatted = formatDateTime(reserva.hora_fin);

    const subject = `Reserva #${reserva.codigo_reserva || reserva.id} - ${
      reserva.parqueadero_nombre
    }`;
    const body = `Hola ${reserva.usuario_nombre || "Usuario"},

Te contactamos respecto a tu reserva:

🅿️ Parqueadero: ${reserva.parqueadero_nombre}
📍 Ubicación: ${reserva.parqueadero_direccion}
🕐 Fecha: ${inicioFormatted.date}
⏰ Hora: ${inicioFormatted.time} - ${finFormatted.time}
🚗 Plaza: ${reserva.plaza_codigo || "Por asignar"}
🚙 Vehículo: ${reserva.tipo_vehiculo_nombre || "No especificado"}

Saludos,
Equipo de ${reserva.parqueadero_nombre}`;

    const mailtoLink = `mailto:${
      reserva.usuario_email
    }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
  };

  // Calcular tiempo restante hasta el inicio
  const getTimeRemaining = (horaInicio: string) => {
    const inicio = new Date(horaInicio);
    const ahora = new Date();
    const diff = inicio.getTime() - ahora.getTime();

    if (diff < 0) {
      return { text: "Ya comenzó", color: "text-red-600", urgent: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 2) {
      return {
        text: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        color: "text-red-600",
        urgent: true,
      };
    } else if (hours < 6) {
      return {
        text: `${hours}h ${minutes}m`,
        color: "text-yellow-600",
        urgent: false,
      };
    } else {
      return {
        text: `${hours}h ${minutes}m`,
        color: "text-green-600",
        urgent: false,
      };
    }
  };

  // Formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Calcular duración en formato legible
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Reservas
            </h1>
            <p className="text-gray-600 mt-2">
              Administra las reservas pendientes de confirmación
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              <Clock className="h-4 w-4 mr-2" />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </Button>
            <Button
              onClick={recargarDatos}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Recargar
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtroFecha === "todas" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroFecha("todas")}
            >
              Todas ({reservas.length})
            </Button>
            <Button
              variant={filtroFecha === "urgentes" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setFiltroFecha("urgentes")}
            >
              Urgentes (
              {
                reservas.filter((r) => {
                  const inicio = new Date(r.hora_inicio);
                  return (
                    inicio.getTime() - new Date().getTime() < 2 * 60 * 60 * 1000
                  );
                }).length
              }
              )
            </Button>
            <Button
              variant={filtroFecha === "hoy" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroFecha("hoy")}
            >
              Hoy (
              {
                reservas.filter(
                  (r) =>
                    new Date(r.hora_inicio).toDateString() ===
                    new Date().toDateString()
                ).length
              }
              )
            </Button>
            <Button
              variant={filtroFecha === "proximas24h" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroFecha("proximas24h")}
            >
              Próximas 24h (
              {
                reservas.filter((r) => {
                  const inicio = new Date(r.hora_inicio);
                  const ahora = new Date();
                  const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
                  return inicio >= ahora && inicio <= en24h;
                }).length
              }
              )
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservas.length}</div>
            <p className="text-xs text-muted-foreground">
              Reservas esperando confirmación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                reservas.filter(
                  (r) =>
                    new Date(r.hora_inicio).toDateString() ===
                    new Date().toDateString()
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Para hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas 24h</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                reservas.filter((r) => {
                  const inicio = new Date(r.hora_inicio);
                  const ahora = new Date();
                  const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
                  return inicio >= ahora && inicio <= en24h;
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Próximas 24 horas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de reservas */}
      {reservasFiltered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {filtroFecha === "todas" ? "¡Todo al día!" : "Sin resultados"}
            </h3>
            <p className="text-gray-600 text-center">
              {filtroFecha === "todas"
                ? "No hay reservas pendientes de confirmación en este momento."
                : `No hay reservas ${filtroFecha} pendientes de confirmación.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Mostrando {reservasFiltered.length} reserva
              {reservasFiltered.length !== 1 ? "s" : ""}
            </h2>
            {filtroFecha === "urgentes" && reservasFiltered.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                ⚠️ Reservas urgentes detectadas
              </Badge>
            )}
          </div>

          <div className="grid gap-6">
            {reservasFiltered.map((reserva) => {
              const inicioFormatted = formatDateTime(reserva.hora_inicio);
              const finFormatted = formatDateTime(reserva.hora_fin);
              const timeRemaining = getTimeRemaining(reserva.hora_inicio);
              const isUrgent = timeRemaining.urgent;

              return (
                <Card
                  key={reserva.id}
                  className={`${isUrgent ? "border-red-200 bg-red-50" : ""}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span>
                            Reserva #{reserva.codigo_reserva || reserva.id}
                          </span>
                          {isUrgent && (
                            <Badge variant="destructive">Urgente</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Creada el {formatDateTime(reserva.creado_at).date}
                        </CardDescription>
                        <div
                          className={`text-sm font-medium mt-1 ${timeRemaining.color}`}
                        >
                          ⏳ Inicia en: {timeRemaining.text}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800"
                      >
                        Pendiente
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Información del Usuario */}
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Usuario
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">
                            {reserva.usuario_nombre || "Usuario sin nombre"}
                          </p>
                          {reserva.usuario_email && (
                            <p className="flex items-center gap-1 text-gray-600">
                              <Mail className="h-3 w-3" />
                              {reserva.usuario_email}
                            </p>
                          )}
                          {reserva.usuario_telefono && (
                            <p className="flex items-center gap-1 text-gray-600">
                              <Phone className="h-3 w-3" />
                              {reserva.usuario_telefono}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Información del Parqueadero */}
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Ubicación
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">
                            {reserva.parqueadero_nombre}
                          </p>
                          <p className="text-gray-600">
                            {reserva.parqueadero_direccion}
                          </p>
                          {reserva.plaza_codigo && (
                            <p className="text-blue-600 font-medium">
                              Plaza: {reserva.plaza_codigo}
                            </p>
                          )}
                          {reserva.nivel_nombre && (
                            <p className="text-gray-600">
                              Nivel: {reserva.nivel_nombre}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Información de Tiempo y Vehículo */}
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          Detalles
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="font-medium">Inicio:</p>
                            <p className="text-gray-600">
                              {inicioFormatted.date}
                            </p>
                            <p className="text-gray-600">
                              {inicioFormatted.time}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Fin:</p>
                            <p className="text-gray-600">{finFormatted.time}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              Duración:{" "}
                              {formatDuration(reserva.duracion_minutos)}
                            </span>
                          </div>
                          {reserva.tipo_vehiculo_nombre && (
                            <div className="flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              <span>{reserva.tipo_vehiculo_nombre}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-3 mt-6 pt-4 border-t">
                      <Button
                        onClick={() => confirmarReserva(reserva.id)}
                        disabled={actionLoading === `confirm-${reserva.id}`}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {actionLoading === `confirm-${reserva.id}`
                          ? "Confirmando..."
                          : "Confirmar"}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={actionLoading === `cancel-${reserva.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              ¿Cancelar reserva?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción cancelará la reserva #
                              {reserva.codigo_reserva || reserva.id} de{" "}
                              <strong>{reserva.usuario_nombre}</strong> para el{" "}
                              <strong>{inicioFormatted.date}</strong> a las{" "}
                              <strong>{inicioFormatted.time}</strong>.
                              <br />
                              <br />
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Mantener reserva
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelarReserva(reserva.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Sí, cancelar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => contactarUsuario(reserva)}
                        disabled={!reserva.usuario_email}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contactar usuario
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
