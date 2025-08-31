"use client"

import { useState } from "react"
import { UsuarioList } from "../../Components/usuarios/usuarioList"
import { UsuarioForm } from "../../Components/usuarios/usuarioForm"

export default function UsuariosPage() {
  // Estado para manejar el usuario seleccionado para editar
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>

      {/* Si hay un usuario seleccionado, mostrar el formulario de edición */}
      {selectedUserId ? (
        <div className="mb-6">
          <button
            onClick={() => setSelectedUserId(null)}
            className="mb-2 bg-gray-300 px-2 py-1 rounded"
          >
            Volver a la lista
          </button>
          <UsuarioForm userId={selectedUserId} />
        </div>
      ) : (
        <UsuarioList />
      )}
    </div>
  )
}
