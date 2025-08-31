import { PlazaList } from "../../../../../../Components/plaza/PlazaList"
import { PlazaForm } from "../../../../../../Components/plaza/PlazaForm"

export default function PlazasPage({ params }: { params: { id: string, nivelid: string } }) {
  const parqueoId = parseInt(params.id)
  const nivelId = parseInt(params.nivelid) // ahora coincide con la carpeta

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Plazas del Nivel {nivelId}</h2>
      <PlazaForm nivelId={nivelId} />
      <PlazaList nivelId={nivelId} />
    </div>
  )
}


