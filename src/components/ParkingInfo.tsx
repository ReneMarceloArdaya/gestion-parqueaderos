import { Clock, Calendar, CheckCircle, XCircle, Shield, Car, CreditCard, Wifi, Camera, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScheduleInfo {
  day: string;
  hours: string;
  isOpen: boolean;
}

interface ParkingScheduleProps {
  parkingType: "publico" | "privado";
}

export function ParkingSchedule({ parkingType }: ParkingScheduleProps) {
  // Datos de ejemplo para horarios
  const publicSchedule: ScheduleInfo[] = [
    { day: "Lunes", hours: "24 horas", isOpen: true },
    { day: "Martes", hours: "24 horas", isOpen: true },
    { day: "Miércoles", hours: "24 horas", isOpen: true },
    { day: "Jueves", hours: "24 horas", isOpen: true },
    { day: "Viernes", hours: "24 horas", isOpen: true },
    { day: "Sábado", hours: "24 horas", isOpen: true },
    { day: "Domingo", hours: "24 horas", isOpen: true },
  ];

  const privateSchedule: ScheduleInfo[] = [
    { day: "Lunes", hours: "06:00 - 22:00", isOpen: true },
    { day: "Martes", hours: "06:00 - 22:00", isOpen: true },
    { day: "Miércoles", hours: "06:00 - 22:00", isOpen: true },
    { day: "Jueves", hours: "06:00 - 22:00", isOpen: true },
    { day: "Viernes", hours: "06:00 - 22:00", isOpen: true },
    { day: "Sábado", hours: "08:00 - 20:00", isOpen: true },
    { day: "Domingo", hours: "08:00 - 18:00", isOpen: true },
  ];

  const schedule = parkingType === "publico" ? publicSchedule : privateSchedule;
  const today = new Date().getDay();
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const todayName = dayNames[today];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horarios de funcionamiento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {schedule.map((item, index) => (
            <div 
              key={item.day}
              className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                item.day === todayName ? "bg-blue-50 border border-blue-200" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  item.day === todayName ? "text-blue-900" : "text-gray-700"
                }`}>
                  {item.day}
                </span>
                {item.day === todayName && (
                  <Badge variant="secondary" className="text-xs">
                    Hoy
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${
                  item.day === todayName ? "text-blue-800 font-medium" : "text-gray-600"
                }`}>
                  {item.hours}
                </span>
                {item.isOpen ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ParkingAmenitiesProps {
  parkingType: "publico" | "privado";
}

export function ParkingAmenities({ parkingType }: ParkingAmenitiesProps) {
  const publicAmenities = [
    { icon: Shield, label: "Vigilancia 24/7", available: true },
    { icon: Sun, label: "Techado", available: true },
    { icon: Car, label: "Acceso vehicular amplio", available: true },
    { icon: Camera, label: "Circuito cerrado de TV", available: true },
    { icon: Wifi, label: "WiFi gratuito", available: false },
    { icon: CreditCard, label: "Pago con tarjeta", available: true },
  ];

  const privateAmenities = [
    { icon: Shield, label: "Vigilancia 24/7", available: true },
    { icon: Sun, label: "Techado", available: true },
    { icon: Car, label: "Acceso vehicular amplio", available: true },
    { icon: Camera, label: "Circuito cerrado de TV", available: true },
    { icon: Calendar, label: "Reserva garantizada", available: true },
    { icon: Wifi, label: "WiFi gratuito", available: true },
    { icon: CreditCard, label: "Pago con tarjeta", available: true },
    { icon: Moon, label: "Iluminación nocturna", available: true },
  ];

  const amenities = parkingType === "publico" ? publicAmenities : privateAmenities;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Servicios y Comodidades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {amenities.map((amenity, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                amenity.available ? "bg-green-50" : "bg-gray-50"
              }`}
            >
              <amenity.icon 
                className={`h-4 w-4 ${
                  amenity.available ? "text-green-600" : "text-gray-400"
                }`} 
              />
              <span 
                className={`text-sm ${
                  amenity.available ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {amenity.label}
              </span>
              {amenity.available ? (
                <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />
              ) : (
                <XCircle className="h-3 w-3 text-gray-400 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
