import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { FracaoOnboardingModal } from '@/components/FracaoOnboardingModal'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { AlertTriangle, X } from 'lucide-react'
import type { Comunicado } from '@/types'

export function AppLayout() {
  const { comunicados, ocorrencias } = useAppData()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<string[]>([])
  const isAdmin = profile?.role === 'admin'

  // Comunicados não lidos dirigidos a este utilizador (ou gerais), ordenados por data
  const alertas: Comunicado[] = comunicados.filter(c =>
    c.importante &&
    (!c.destinatario_id || c.destinatario_id === profile?.id) &&
    !dismissed.includes(c.id)
  )

  const alertaOcorrenciaGrave = isAdmin
    ? ocorrencias.find(o =>
      (o.tipo === 'risco' || o.prioridade === 'alta' || o.prioridade === 'urgente') &&
      (o.estado === 'aberta' || o.estado === 'aceite' || o.estado === 'em_analise') &&
      !dismissed.includes(`oc-${o.id}`)
    )
    : null

  const topAlertas = alertas.slice(0, 3)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        {alertaOcorrenciaGrave && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 bg-red-700 text-white text-sm cursor-pointer hover:bg-red-800 transition-colors"
            onClick={() => navigate('/ocorrencias')}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1 font-medium truncate">Ocorrência grave: {alertaOcorrenciaGrave.titulo}</span>
            <button
              onClick={e => {
                e.stopPropagation()
                setDismissed(prev => [...prev, `oc-${alertaOcorrenciaGrave.id}`])
              }}
              className="shrink-0 p-0.5 rounded hover:bg-red-900 transition-colors"
              title="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {topAlertas.map(alerta => (
          <div
            key={alerta.id}
            className="flex items-center gap-3 px-4 py-2.5 bg-red-600 text-white text-sm cursor-pointer hover:bg-red-700 transition-colors border-t border-red-500"
            onClick={() => navigate('/comunicados')}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1 font-medium truncate">{alerta.titulo}</span>
            <button
              onClick={e => {
                e.stopPropagation()
                setDismissed(prev => [...prev, alerta.id])
              }}
              className="shrink-0 p-0.5 rounded hover:bg-red-800 transition-colors"
              title="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {alertas.length > topAlertas.length && (
          <button
            type="button"
            onClick={() => navigate('/comunicados')}
            className="px-4 py-2 text-left text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors border-t border-red-100"
          >
            Ver mais {alertas.length - topAlertas.length} alertas importantes
          </button>
        )}
        <main className="flex-1 pt-14 md:pt-0">
          <Outlet />
        </main>
      </div>
      <FracaoOnboardingModal />
    </div>
  )
}
