'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Search, X, ChevronLeft, MapPin, Car } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ParkingWithCoordinates {
  id: number
  nombre: string
  descripcion: string | null
  tipo: "publico" | "privado"
  capacidad_total: number
  direccion: string | null
  ciudad: string | null
  pais: string | null
  zona: string | null
  activo: boolean
  longitude: number
  latitude: number
  precio_por_hora?: number | null
  imagen_url?: string | null
}

interface MapFiltersProps {
  onSearch: (filters: {
    searchTerm: string
    tipo: string | null
    precioMax: number | null
    vehiculo: string | null
  }) => void
  onReset: () => void
  parkings: ParkingWithCoordinates[]
  selectedParking: ParkingWithCoordinates | null
  onSelectParking: (parking: ParkingWithCoordinates | null) => void
  isOpen: boolean
  onToggle: () => void
}

export function MapFilters({ 
  onSearch, 
  onReset, 
  parkings, 
  selectedParking,
  onSelectParking,
  isOpen,
  onToggle
}: MapFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [tipo, setTipo] = useState<string | null>(null)
  const [precioMax, setPrecioMax] = useState<number | null>(null)
  const [vehiculo, setVehiculo] = useState<string | null>(null)

  const handleSearch = () => {
    onSearch({
      searchTerm,
      tipo: tipo === 'all' ? null : tipo,
      precioMax,
      vehiculo: vehiculo === 'all' ? null : vehiculo
    })
  }

  const handleReset = () => {
    setSearchTerm('')
    setTipo(null)
    setPrecioMax(null)
    setVehiculo(null)
    onReset()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Función para obtener imagen por defecto
  const getDefaultImage = (parking: ParkingWithCoordinates) => {
    return `https://placehold.co/300x200/3b82f6/ffffff?text=${encodeURIComponent(parking.nombre.substring(0, 3))}`
  }

  return (
    <>
      {/* Botón para abrir/cerrar panel */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 left-4 z-20 bg-white shadow-lg"
        onClick={onToggle}
      >
        <ChevronLeft className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <div 
        className={`absolute top-4 left-4 bg-white rounded-lg shadow-lg z-10 transition-all duration-300 ${
          isOpen ? 'w-96' : 'w-12'
        }`}
        style={{ 
          maxHeight: 'calc(100vh - 2rem - 8rem)', 
          maxWidth: 'min(400px, calc(100vw - 2rem))' 
        }}
      >
        {isOpen ? (
          <div className="h-150 flex flex-col ">
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
                  <label className="text-xs font-medium text-gray-700">Nombre</label>
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

                {/* Filtros en grid para ahorrar espacio */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Tipo</label>
                    <Select value={tipo || 'all'} onValueChange={(value) => setTipo(value === 'all' ? null : value)}>
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

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Vehículo</label>
                    <Select value={vehiculo || 'all'} onValueChange={(value) => setVehiculo(value === 'all' ? null : value)}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="coche">Auto</SelectItem>
                        <SelectItem value="moto">Moto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Slider de precio */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Precio: {precioMax ? `$${precioMax.toLocaleString()}` : 'Sin límite'}
                  </label>
                  <Slider
                    min={0}
                    max={10000}
                    step={500}
                    value={[precioMax || 0]}
                    onValueChange={(value) => setPrecioMax(value[0] || null)}
                    className="py-1"
                  />
                </div>

                {/* Botones */}
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
              </div>
            </div>

            {/* Lista de parqueaderos con scroll */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b">
                <h4 className="text-xs font-medium text-gray-700">
                  Resultados ({parkings.length})
                </h4>
              </div>
              
              {/* ÁREA DE SCROLL CONTROLADA */}
              <div 
                className="flex-1 overflow-y-auto p-3"
                style={{ 
                  maxHeight: 'calc(100vh - 380px)', 
                }}
              >
                <div className="space-y-2">
                  {parkings.map((parking) => (
                    <Card 
                      key={parking.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow text-xs ${
                        selectedParking?.id === parking.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => onSelectParking(parking)}
                    >
                      <CardContent className="p-2">
                        <div className="flex gap-2">
                          {/* Imagen más pequeña */}
                          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={parking.imagen_url || getDefaultImage(parking)}
                              alt={parking.nombre}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = getDefaultImage(parking)
                              }}
                            />
                          </div>
                          
                          {/* Información compacta */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-xs truncate">{parking.nombre}</h3>
                            <p className="text-xs text-gray-500 truncate">{parking.direccion?.substring(0, 30)}</p>
                            
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs font-medium text-blue-600">
                                {parking.precio_por_hora ? `$${parking.precio_por_hora}/hr` : 'N/A'}
                              </span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                parking.tipo === 'publico' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {parking.tipo === 'publico' ? 'Público' : 'Privado'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {parkings.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <MapPin className="h-6 w-6 mx-auto mb-1 text-gray-300" />
                      <p className="text-xs">No hay parqueos</p>
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
  )
}