"use client"

import { useState } from "react"
import { ReservaList } from "../../Components/reservas/reservalist"
import { ReservaDetail } from "../../Components/reservas/reservaDetails"
import { ReservaAdminForm } from "../../Components/reservas/reservaForm"

export default function ReservasPage() {
  const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestión de Reservas</h1>

      {/* Formulario para que el admin cree reservas */}
      <div className="mb-6">
        <ReservaAdminForm />
      </div>

      {selectedReservaId ? (
        <div className="mb-6">
          <button
            onClick={() => setSelectedReservaId(null)}
            className="mb-2 bg-gray-300 px-2 py-1 rounded"
          >
            Volver a la lista
          </button>
          <ReservaDetail reservaId={selectedReservaId} />
        </div>
      ) : (
        <ReservaList />
      )}
    </div>
  )
}
