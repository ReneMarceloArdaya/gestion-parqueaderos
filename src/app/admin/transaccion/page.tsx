"use client";

import { useState } from "react";
import TransaccionForm from "../../Components/transacciones/transaccionform";
import TransaccionList from "../../Components/transacciones/transaccionlist";
import TransaccionDetail from "../../Components/transacciones/transaccionDetail";

export default function AdminTransaccionesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestión de Transacciones</h1>

      {/* Formulario para crear transacciones */}
      {/* <TransaccionForm /> */}

      {/* Lista de transacciones */}
      <TransaccionList onSelect={(id: number) => setSelectedId(id)} />

      {/* Detalle de la transacción seleccionada */}
      {selectedId && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <button
            className="mb-2 text-red-500 hover:underline"
            onClick={() => setSelectedId(null)}
          >
            Cerrar detalle
          </button>
          <TransaccionDetail id={selectedId} />
        </div>
      )}
    </div>
  );
}
