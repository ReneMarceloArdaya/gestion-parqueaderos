"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/Supabase/supabaseClient"

type Usuario = {
  id: string
  nombre: string
  email: string
  telefono: string | null
  rol: "admin" | "operador" | "cliente"
}

export function UsuarioList() {
  const supabase = createClient()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [rolFiltro, setRolFiltro] = useState<"" | "admin" | "operador" | "usuario">("")


  const fetchUsuarios = async () => {
    let query = supabase.from("usuarios").select("*").order("nombre", { ascending: true })
    if (rolFiltro) query = query.eq("rol", rolFiltro)
    const { data, error } = await query
    if (error) alert(error.message)
    else setUsuarios(data as Usuario[])
  }

  useEffect(() => {
    fetchUsuarios()
  }, [rolFiltro])

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este usuario?")) return
    const { error } = await supabase.from("usuarios").delete().eq("id", id)
    if (error) alert(error.message)
    else fetchUsuarios()
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Usuarios</h2>

      {/* Filtro por rol */}
     <select
  value={rolFiltro}
  onChange={e => setRolFiltro(e.target.value as "" | "admin" | "operador" | "usuario")}
  className="border p-2 mb-4"
>
  <option value="">-- Todos los roles --</option>
  <option value="admin">Admin</option>
  <option value="operador">Operador</option>
  <option value="usuario">Usuario</option>
</select>


      <table className="table-auto w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Nombre</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Teléfono</th>
            <th className="p-2 border">Rol</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td className="p-2 border">{u.nombre}</td>
              <td className="p-2 border">{u.email}</td>
              <td className="p-2 border">{u.telefono || "-"}</td>
              <td className="p-2 border">{u.rol}</td>
              <td className="p-2 border">
                <button
                  onClick={() => window.location.href = `/admin/usuarios/${u.id}`}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
