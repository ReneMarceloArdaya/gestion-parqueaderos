"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, type TarifaInsert, type TarifaUpdate } from "@/lib/Supabase/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Clock, 
  Car,
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface Tarifa {
  id: number;
  parqueadero_id: number;
  tipo_vehiculo_id: number;
  nombre: string | null;
  tipo_tarifa: "por_hora" | "por_tramo" | "tarifa_fija";
  precio_por_hora: number | null;
  precio_fijo: number | null;
  tramos: any | null;
  valido_desde: string;
  valido_hasta: string | null;
  creado_at: string;
  // Relaciones
  parqueaderos?: {
    id: number;
    nombre: string;
    operador_id: number | null;
  };
  tipos_vehiculo?: {
    id: number;
    nombre: string;
    codigo: string;
  };
}

interface TipoVehiculo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

interface Parqueadero {
  id: number;
  nombre: string;
  tipo: "publico" | "privado";
}

interface FormTarifa {
  parqueadero_id: number | null;
  tipo_vehiculo_id: number | null;
  nombre: string;
  tipo_tarifa: "por_hora" | "por_tramo" | "tarifa_fija";
  precio_por_hora: string;
  precio_fijo: string;
  valido_desde: string;
  valido_hasta: string;
  // Para tarifas por tramo
  tramos: {
    desde_minutos: number;
    hasta_minutos: number;
    precio: number;
  }[];
}

export default function RatesPage() {
  const supabase = createClient();
  
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [parqueaderos, setParqueaderos] = useState<Parqueadero[]>([]);
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Estados para el formulario
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState<Tarifa | null>(null);
  const [form, setForm] = useState<FormTarifa>({
    parqueadero_id: null,
    tipo_vehiculo_id: null,
    nombre: "",
    tipo_tarifa: "por_hora",
    precio_por_hora: "",
    precio_fijo: "",
    valido_desde: new Date().toISOString().split('T')[0],
    valido_hasta: "",
    tramos: []
  });

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    try {
      // Primero obtener el operador actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast.error("Sesión no válida");
        return;
      }

      // Obtener información del operador
      const { data: operadorData, error: operadorError } = await (supabase as any)
        .from("operadores")
        .select("id")
        .eq("usuario_id", session.user.id)
        .single();

      if (operadorError || !operadorData) {
        toast.error("No se encontró información del operador");
        return;
      }

      // Cargar tarifas solo de los parqueaderos del operador
      const { data: tarifasData, error: tarifasError } = await (supabase as any)
        .from("tarifas")
        .select(`
          *,
          parqueaderos!inner(id, nombre, operador_id),
          tipos_vehiculo(id, nombre, codigo)
        `)
        .eq("parqueaderos.operador_id", operadorData.id);

      if (tarifasError) throw tarifasError;

      // Cargar solo parqueaderos del operador
      const { data: parqueaderosData, error: parqueaderosError } = await (supabase as any)
        .from("parqueaderos")
        .select("id, nombre, tipo")
        .eq("operador_id", operadorData.id)
        .eq("activo", true);

      if (parqueaderosError) throw parqueaderosError;

      // Cargar tipos de vehículo
      const { data: tiposData, error: tiposError } = await (supabase as any)
        .from("tipos_vehiculo")
        .select("*");

      if (tiposError) throw tiposError;

      setTarifas(tarifasData || []);
      setParqueaderos(parqueaderosData || []);
      setTiposVehiculo(tiposData || []);

    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setForm({
      parqueadero_id: null,
      tipo_vehiculo_id: null,
      nombre: "",
      tipo_tarifa: "por_hora",
      precio_por_hora: "",
      precio_fijo: "",
      valido_desde: new Date().toISOString().split('T')[0],
      valido_hasta: "",
      tramos: []
    });
    setEditingTarifa(null);
  }, []);

  // Manejar envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validaciones
      if (!form.parqueadero_id || !form.tipo_vehiculo_id) {
        toast.error("Selecciona un parqueadero y tipo de vehículo");
        return;
      }

      // Verificar que el parqueadero pertenece al operador
      const selectedParking = parqueaderos.find(p => p.id === form.parqueadero_id);
      if (!selectedParking) {
        toast.error("Parqueadero no válido");
        return;
      }

      if (form.tipo_tarifa === "por_hora" && !form.precio_por_hora) {
        toast.error("Ingresa el precio por hora");
        return;
      }

      if (form.tipo_tarifa === "tarifa_fija" && !form.precio_fijo) {
        toast.error("Ingresa el precio fijo");
        return;
      }

      if (form.tipo_tarifa === "por_tramo" && form.tramos.length === 0) {
        toast.error("Agrega al menos un tramo para la tarifa");
        return;
      }

      const tarifaData: TarifaInsert = {
        parqueadero_id: form.parqueadero_id!,
        tipo_vehiculo_id: form.tipo_vehiculo_id!,
        nombre: form.nombre || null,
        tipo_tarifa: form.tipo_tarifa,
        precio_por_hora: form.tipo_tarifa === "por_hora" ? parseFloat(form.precio_por_hora) : null,
        precio_fijo: form.tipo_tarifa === "tarifa_fija" ? parseFloat(form.precio_fijo) : null,
        tramos: form.tipo_tarifa === "por_tramo" ? form.tramos : null,
        valido_desde: form.valido_desde,
        valido_hasta: form.valido_hasta || null,
      };

      if (editingTarifa) {
        // Actualizar tarifa existente
        const { error } = await (supabase as any)
          .from("tarifas")
          .update(tarifaData)
          .eq("id", editingTarifa.id);

        if (error) throw error;
        toast.success("Tarifa actualizada correctamente");
      } else {
        // Crear nueva tarifa
        const { error } = await (supabase as any)
          .from("tarifas")
          .insert(tarifaData);

        if (error) throw error;
        toast.success("Tarifa creada correctamente");
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();

    } catch (error: any) {
      console.error("Error guardando tarifa:", error);
      toast.error("Error al guardar la tarifa");
    } finally {
      setSubmitting(false);
    }
  }, [form, editingTarifa, supabase, loadData, resetForm]);

  // Manejar edición
  const handleEdit = useCallback((tarifa: Tarifa) => {
    setEditingTarifa(tarifa);
    setForm({
      parqueadero_id: tarifa.parqueadero_id,
      tipo_vehiculo_id: tarifa.tipo_vehiculo_id,
      nombre: tarifa.nombre || "",
      tipo_tarifa: tarifa.tipo_tarifa,
      precio_por_hora: tarifa.precio_por_hora?.toString() || "",
      precio_fijo: tarifa.precio_fijo?.toString() || "",
      valido_desde: tarifa.valido_desde.split('T')[0],
      valido_hasta: tarifa.valido_hasta?.split('T')[0] || "",
      tramos: tarifa.tramos || []
    });
    setIsDialogOpen(true);
  }, []);

  // Manejar eliminación
  const handleDelete = useCallback(async (id: number) => {
    try {
      const { error } = await (supabase as any)
        .from("tarifas")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Tarifa eliminada correctamente");
      loadData();
    } catch (error: any) {
      console.error("Error eliminando tarifa:", error);
      toast.error("Error al eliminar la tarifa");
    }
  }, [supabase, loadData]);

  // Agregar tramo para tarifas por tramo
  const addTramo = useCallback(() => {
    setForm(prev => ({
      ...prev,
      tramos: [...prev.tramos, { desde_minutos: 0, hasta_minutos: 60, precio: 0 }]
    }));
  }, []);

  // Remover tramo
  const removeTramo = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      tramos: prev.tramos.filter((_, i) => i !== index)
    }));
  }, []);

  // Actualizar tramo
  const updateTramo = useCallback((index: number, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      tramos: prev.tramos.map((tramo, i) => 
        i === index ? { ...tramo, [field]: value } : tramo
      )
    }));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(amount);
  };

  const getTipoTarifaLabel = (tipo: string) => {
    switch (tipo) {
      case "por_hora": return "Por Hora";
      case "por_tramo": return "Por Tramo";
      case "tarifa_fija": return "Tarifa Fija";
      default: return tipo;
    }
  };

  const getTipoTarifaColor = (tipo: string) => {
    switch (tipo) {
      case "por_hora": return "bg-blue-100 text-blue-800";
      case "por_tramo": return "bg-green-100 text-green-800";
      case "tarifa_fija": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Tarifas</h1>
            <p className="text-gray-600">Configura las tarifas para tus parqueaderos</p>
          </div>
        </div>
        
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Gestión de Tarifas
          </h1>
          <p className="text-gray-600">Configura las tarifas para tus parqueaderos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Tarifa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTarifa ? "Editar Tarifa" : "Nueva Tarifa"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parqueadero">Parqueadero *</Label>
                  <Select
                    value={form.parqueadero_id?.toString() || ""}
                    onValueChange={(value) => setForm(prev => ({...prev, parqueadero_id: parseInt(value)}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un parqueadero" />
                    </SelectTrigger>
                    <SelectContent>
                      {parqueaderos.map((parking) => (
                        <SelectItem key={parking.id} value={parking.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Badge variant={parking.tipo === "privado" ? "default" : "secondary"}>
                              {parking.tipo}
                            </Badge>
                            {parking.nombre}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipo_vehiculo">Tipo de Vehículo *</Label>
                  <Select
                    value={form.tipo_vehiculo_id?.toString() || ""}
                    onValueChange={(value) => setForm(prev => ({...prev, tipo_vehiculo_id: parseInt(value)}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo de vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposVehiculo.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            {tipo.nombre} ({tipo.codigo})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="nombre">Nombre de la Tarifa</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({...prev, nombre: e.target.value}))}
                  placeholder="Ej: Tarifa Regular, Tarifa Fin de Semana"
                />
              </div>

              <div>
                <Label htmlFor="tipo_tarifa">Tipo de Tarifa *</Label>
                <Select
                  value={form.tipo_tarifa}
                  onValueChange={(value: any) => setForm(prev => ({...prev, tipo_tarifa: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="por_hora">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Por Hora
                      </div>
                    </SelectItem>
                    <SelectItem value="tarifa_fija">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Tarifa Fija
                      </div>
                    </SelectItem>
                    <SelectItem value="por_tramo">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Por Tramo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Configuración de precios según tipo */}
              {form.tipo_tarifa === "por_hora" && (
                <div>
                  <Label htmlFor="precio_por_hora">Precio por Hora (Bs.) *</Label>
                  <Input
                    id="precio_por_hora"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio_por_hora}
                    onChange={(e) => setForm(prev => ({...prev, precio_por_hora: e.target.value}))}
                    placeholder="Ej: 15.00"
                  />
                </div>
              )}

              {form.tipo_tarifa === "tarifa_fija" && (
                <div>
                  <Label htmlFor="precio_fijo">Precio Fijo (Bs.) *</Label>
                  <Input
                    id="precio_fijo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio_fijo}
                    onChange={(e) => setForm(prev => ({...prev, precio_fijo: e.target.value}))}
                    placeholder="Ej: 50.00"
                  />
                </div>
              )}

              {form.tipo_tarifa === "por_tramo" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Configuración de Tramos</Label>
                    <Button type="button" onClick={addTramo} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Tramo
                    </Button>
                  </div>
                  
                  {form.tramos.map((tramo, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div>
                          <Label className="text-xs">Desde (minutos)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={tramo.desde_minutos}
                            onChange={(e) => updateTramo(index, "desde_minutos", parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Hasta (minutos)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tramo.hasta_minutos}
                            onChange={(e) => updateTramo(index, "hasta_minutos", parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Precio (Bs.)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tramo.precio}
                              onChange={(e) => updateTramo(index, "precio", parseFloat(e.target.value))}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeTramo(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {form.tramos.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay tramos configurados</p>
                      <p className="text-sm">Agrega tramos para definir precios por tiempo</p>
                    </div>
                  )}
                </div>
              )}

              {/* Fechas de validez */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valido_desde">Válido Desde *</Label>
                  <Input
                    id="valido_desde"
                    type="date"
                    value={form.valido_desde}
                    onChange={(e) => setForm(prev => ({...prev, valido_desde: e.target.value}))}
                  />
                </div>

                <div>
                  <Label htmlFor="valido_hasta">Válido Hasta</Label>
                  <Input
                    id="valido_hasta"
                    type="date"
                    value={form.valido_hasta}
                    onChange={(e) => setForm(prev => ({...prev, valido_hasta: e.target.value}))}
                    placeholder="Opcional - sin fecha límite"
                  />
                </div>
              </div>

              {/* Botones del formulario */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Guardando..." : editingTarifa ? "Actualizar" : "Crear Tarifa"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tarifas</p>
                <p className="text-xl font-bold">{tarifas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarifas Activas</p>
                <p className="text-xl font-bold">
                  {tarifas.filter(t => !t.valido_hasta || new Date(t.valido_hasta) > new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Por Hora</p>
                <p className="text-xl font-bold">
                  {tarifas.filter(t => t.tipo_tarifa === "por_hora").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Por Tramo</p>
                <p className="text-xl font-bold">
                  {tarifas.filter(t => t.tipo_tarifa === "por_tramo").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de tarifas */}
      <div className="space-y-4">
        {parqueaderos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Car className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes parqueaderos registrados
              </h3>
              <p className="text-gray-600 mb-6">
                Para crear tarifas, primero necesitas tener parqueaderos registrados en tu cuenta
              </p>
              <Button onClick={() => window.location.href = '/operator/parkings'}>
                <Plus className="h-4 w-4 mr-2" />
                Ir a Parqueaderos
              </Button>
            </CardContent>
          </Card>
        ) : tarifas.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes tarifas configuradas
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primera tarifa para comenzar a gestionar los precios de tus parqueaderos
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Tarifa
              </Button>
            </CardContent>
          </Card>
        ) : (
          tarifas.map((tarifa) => (
            <Card key={tarifa.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5" />
                      {tarifa.nombre || `Tarifa ${tarifa.tipos_vehiculo?.nombre}`}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {tarifa.parqueaderos?.nombre}
                      </Badge>
                      <Badge className={getTipoTarifaColor(tarifa.tipo_tarifa)}>
                        {getTipoTarifaLabel(tarifa.tipo_tarifa)}
                      </Badge>
                      <Badge variant="secondary">
                        <Car className="h-3 w-3 mr-1" />
                        {tarifa.tipos_vehiculo?.nombre}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tarifa)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar tarifa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la tarifa
                            "{tarifa.nombre || `Tarifa ${tarifa.tipos_vehiculo?.nombre}`}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(tarifa.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Precio */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">Precio</p>
                      <p className="font-semibold">
                        {tarifa.tipo_tarifa === "por_hora" && tarifa.precio_por_hora 
                          ? `${formatCurrency(tarifa.precio_por_hora)}/hora`
                          : tarifa.tipo_tarifa === "tarifa_fija" && tarifa.precio_fijo
                          ? formatCurrency(tarifa.precio_fijo)
                          : "Por tramos"
                        }
                      </p>
                    </div>
                  </div>

                  {/* Vigencia */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Válido desde</p>
                      <p className="font-semibold">
                        {new Date(tarifa.valido_desde).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  {/* Fecha fin */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-500">Válido hasta</p>
                      <p className="font-semibold">
                        {tarifa.valido_hasta 
                          ? new Date(tarifa.valido_hasta).toLocaleDateString('es-ES')
                          : "Sin límite"
                        }
                      </p>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center gap-2">
                    {(!tarifa.valido_hasta || new Date(tarifa.valido_hasta) > new Date()) ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Estado</p>
                          <p className="font-semibold text-green-600">Activa</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="text-xs text-gray-500">Estado</p>
                          <p className="font-semibold text-red-600">Expirada</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mostrar tramos si es tarifa por tramo */}
                {tarifa.tipo_tarifa === "por_tramo" && tarifa.tramos && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Configuración de Tramos:</h4>
                    <div className="space-y-1">
                      {(tarifa.tramos as any[]).map((tramo, index) => (
                        <div key={index} className="text-xs text-gray-600 flex justify-between">
                          <span>
                            {tramo.desde_minutos} - {tramo.hasta_minutos} min
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(tramo.precio)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
