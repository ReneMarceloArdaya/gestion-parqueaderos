"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/Supabase/supabaseClient"

type UsuarioFormProps = {
  userId: string // UUID como string
}

export function UsuarioForm({ userId }: UsuarioFormProps) {
  const supabase = createClient()
  const router = useRouter()

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [rol, setRol] = useState<"admin" | "operador" | "cliente">("cliente")

  // Cargar datos del usuario
  useEffect(() => {
    const fetchUsuario = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) alert(error.message)
      else if (data) {
        setNombre(data.nombre || "")
        setEmail(data.email || "")
        setTelefono(data.telefono || "")
        setRol(data.rol === "usuario" ? "cliente" : data.rol)

      }
    }

    fetchUsuario()
  }, [userId])

  const handleSave = async () => {

    const rolDB: "usuario" | "admin" | "operador" = rol === "cliente" ? "usuario" : rol;

const { error } = await supabase
  .from("usuarios")
  .update({ nombre, email, telefono, rol: rolDB })
  .eq("id", userId);


    if (error) alert(error.message)
    else {
      alert("Usuario actualizado")
      router.push("/admin/usuarios")
    }
  }

  return (
    <div className="border p-4 rounded-md shadow-md mb-4">
      <h3 className="font-semibold mb-2">Editar Usuario</h3>

      <input
        placeholder="Nombre"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className="border p-2 mb-2 w-full"
      />

      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border p-2 mb-2 w-full"
      />

      <input
        placeholder="Teléfono"
        value={telefono}
        onChange={e => setTelefono(e.target.value)}
        className="border p-2 mb-2 w-full"
      />

      <select
        value={rol}
        onChange={e => setRol(e.target.value as "admin" | "operador" | "cliente")}
        className="border p-2 mb-2 w-full"
      >
        <option value="admin">Admin</option>
        <option value="operador">Operador</option>
        <option value="cliente">Cliente</option>
      </select>

      <button
        onClick={handleSave}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        Guardar
      </button>
    </div>
  )
}
