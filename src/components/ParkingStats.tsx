"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";

interface ParkingStatsProps {
  parkingId: number;
  capacidadTotal: number;
  plazasDisponibles: number;
  tipo: "publico" | "privado";
}

interface StatsData {
  ocupacionActual: number;
  tendencia: "up" | "down" | "stable";
  tiempoPromedioEstadia: string;
  horasPico: string[];
  ingresosDiarios: number;
  ultimaActualizacion: string;
}

export function ParkingStats({ parkingId, capacidadTotal, plazasDisponibles, tipo }: ParkingStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular datos estadísticos en tiempo real
    const mockStats: StatsData = {
      ocupacionActual: Math.round(((capacidadTotal - plazasDisponibles) / capacidadTotal) * 100),
      tendencia: Math.random() > 0.5 ? "up" : "down",
      tiempoPromedioEstadia: "2h 30min",
      horasPico: ["08:00 - 10:00", "12:00 - 14:00", "18:00 - 20:00"],
      ingresosDiarios: Math.floor(Math.random() * 150) + 50,
      ultimaActualizacion: new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };

    // Simular tiempo de carga
    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 1000);

    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      setStats(prev => prev ? {
        ...prev,
        ultimaActualizacion: new Date().toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      } : null);
    }, 30000);

    return () => clearInterval(interval);
  }, [parkingId, capacidadTotal, plazasDisponibles]);

  if (loading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estadísticas en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-2 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getOcupacionColor = (porcentaje: number) => {
    if (porcentaje < 50) return "text-green-600";
    if (porcentaje < 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getOcupacionLabel = (porcentaje: number) => {
    if (porcentaje < 30) return "Baja ocupación";
    if (porcentaje < 70) return "Ocupación moderada";
    if (porcentaje < 90) return "Alta ocupación";
    return "Casi lleno";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estadísticas en Tiempo Real
          </span>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {stats.ultimaActualizacion}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ocupación actual */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Ocupación actual</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getOcupacionColor(stats.ocupacionActual)}`}>
                {stats.ocupacionActual}%
              </span>
              {stats.tendencia === "up" ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : stats.tendencia === "down" ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : (
                <Activity className="h-4 w-4 text-blue-500" />
              )}
            </div>
          </div>
          <Progress value={stats.ocupacionActual} className="mb-2" />
          <p className="text-xs text-gray-600">
            {getOcupacionLabel(stats.ocupacionActual)}
          </p>
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Tiempo promedio</p>
            <p className="text-sm font-semibold">{stats.tiempoPromedioEstadia}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Ingresos hoy</p>
            <p className="text-sm font-semibold">{stats.ingresosDiarios} vehículos</p>
          </div>
        </div>

        {/* Horas pico */}
        <div>
          <p className="text-sm font-medium mb-2">Horas de mayor demanda</p>
          <div className="flex flex-wrap gap-2">
            {stats.horasPico.map((hora, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {hora}
              </Badge>
            ))}
          </div>
        </div>

        {/* Recomendación */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800 font-medium mb-1">💡 Recomendación</p>
          <p className="text-xs text-blue-700">
            {stats.ocupacionActual < 50 
              ? "Buen momento para visitar. Hay espacios disponibles."
              : stats.ocupacionActual < 80
              ? "Ocupación moderada. Te recomendamos llegar pronto."
              : "Alta demanda. Considera hacer una reserva o buscar alternativas."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
