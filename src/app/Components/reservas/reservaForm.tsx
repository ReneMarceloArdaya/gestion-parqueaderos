"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"
import { useRouter } from "next/navigation"

type Usuario = { id: string; nombre: string; rol: "usuario" | "operador" | "admin" }
type Parqueadero = { id: number; nombre: string }
type Nivel = { id: number; nombre: string | null; parqueadero_id: number }
type Plaza = { id: number; codigo: string }
type TipoVehiculo = { id: number; nombre: string }

export function ReservaAdminForm() {
  const supabase = createClient()
  const router = useRouter()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [parqueaderos, setParqueaderos] = useState<Parqueadero[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [plazas, setPlazas] = useState<Plaza[]>([])
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([])

  const [usuarioId, setUsuarioId] = useState<string>("")
  const [parqueaderoId, setParqueaderoId] = useState<number | null>(null)
  const [nivelId, setNivelId] = useState<number | null>(null)
  const [plazaId, setPlazaId] = useState<number | null>(null)
  const [tipoVehiculoId, setTipoVehiculoId] = useState<number | null>(null)
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFin, setHoraFin] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      const { data: usuariosData } = await supabase.from("usuarios").select("id, nombre, rol").eq("rol", "usuario")
      const { data: parqueaderosData } = await supabase.from("parqueaderos").select("id, nombre")
      const { data: tiposData } = await supabase.from("tipos_vehiculo").select("id, nombre")

      setUsuarios((usuariosData || []).map(u => ({ id: u.id, nombre: u.nombre ?? "", rol: u.rol })))
      setParqueaderos(parqueaderosData || [])
      setTiposVehiculo(tiposData || [])
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!parqueaderoId) {
      setNiveles([]); setNivelId(null); return
    }
    const fetchNiveles = async () => {
      const { data, error } = await supabase.from("niveles").select("id, nombre, parqueadero_id").eq("parqueadero_id", parqueaderoId)
      if (error) return alert(error.message)
      setNiveles(data || [])
      setNivelId(null)
      setPlazaId(null)
    }
    fetchNiveles()
  }, [parqueaderoId])

  useEffect(() => {
    if (!nivelId) {
      setPlazas([]); setPlazaId(null); return
    }
    const fetchPlazas = async () => {
      const { data, error } = await supabase.from("plazas").select("id, codigo, estado").eq("nivel_id", nivelId).eq("estado", "libre")
      if (error) return alert(error.message)
      setPlazas((data || []).map(p => ({ id: p.id, codigo: p.codigo ?? "" })))
      setPlazaId(null)
    }
    fetchPlazas()
  }, [nivelId])

  const handleGuardar = async () => {
    if (!usuarioId || !parqueaderoId || !nivelId || !plazaId || !horaInicio || !horaFin || !tipoVehiculoId) {
      return alert("Completa todos los campos");
    }

    try {
      // Crear reserva
      const { data: reserva, error: reservaError } = await supabase
        .from("reservas")
        .insert({
          usuario_id: usuarioId,
          parqueadero_id: parqueaderoId,
          plaza_id: plazaId,
          tipo_vehiculo_id: tipoVehiculoId,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          estado: "activa"
        })
        .select()
        .single();

      if (reservaError) throw reservaError;
      if (!reserva?.id) throw new Error("No se obtuvo el ID de la reserva");

      // Actualizar plaza a ocupada
      await supabase.from("plazas").update({ estado: "ocupada" }).eq("id", plazaId);

      // Calcular importe
      const { data: tarifa, error: tarifaError } = await supabase
        .from("tarifas")
        .select("precio_por_hora")
        .eq("parqueadero_id", parqueaderoId)
        .eq("tipo_vehiculo_id", tipoVehiculoId)
        .single();
      if (tarifaError || !tarifa) throw new Error("No se encontró tarifa");

      const duracionHoras = (new Date(horaFin).getTime() - new Date(horaInicio).getTime()) / 1000 / 3600;
      const importe = (tarifa.precio_por_hora ?? 0) * duracionHoras;

      // Crear transacción
      const { error: transaccionError } = await supabase.from("transacciones").insert({
        reserva_id: reserva.id,
        usuario_id: usuarioId,
        importe,
        moneda: "BOB",
        estado: "pendiente"
      });
      if (transaccionError) throw transaccionError;

      alert("Reserva y transacción creadas exitosamente");
      router.push("/admin/Reservas");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ocurrió un error al crear la reserva o transacción");
    }
  };

  return (
    <div className="border p-4 rounded-md shadow-md">
      <h2 className="font-bold mb-4">Crear Reserva (Admin)</h2>

      <label>Usuario:</label>
      <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)} className="border p-2 mb-2 w-full">
        <option value="">-- Selecciona usuario --</option>
        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
      </select>

      <label>Parqueadero:</label>
      <select value={parqueaderoId || ""} onChange={e => setParqueaderoId(Number(e.target.value))} className="border p-2 mb-2 w-full">
        <option value="">-- Selecciona parqueadero --</option>
        {parqueaderos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>

      <label>Nivel:</label>
      <select value={nivelId || ""} onChange={e => setNivelId(Number(e.target.value))} className="border p-2 mb-2 w-full" disabled={!niveles.length}>
        <option value="">-- Selecciona nivel --</option>
        {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre ?? "Sin nombre"}</option>)}
      </select>

      <label>Plaza:</label>
      <select value={plazaId || ""} onChange={e => setPlazaId(Number(e.target.value))} className="border p-2 mb-2 w-full" disabled={!plazas.length}>
        <option value="">-- Selecciona plaza --</option>
        {plazas.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
      </select>

      <label>Tipo de vehículo:</label>
      <select value={tipoVehiculoId || ""} onChange={e => setTipoVehiculoId(Number(e.target.value))} className="border p-2 mb-2 w-full">
        <option value="">-- Selecciona tipo --</option>
        {tiposVehiculo.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
      </select>

      <label>Hora inicio:</label>
      <input type="datetime-local" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="border p-2 mb-2 w-full" />

      <label>Hora fin:</label>
      <input type="datetime-local" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="border p-2 mb-4 w-full" />

      <button onClick={handleGuardar} className="bg-blue-500 text-white px-4 py-2 rounded">Guardar Reserva</button>
    </div>
  )
}
