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

  const top = alertas[0]
  const topTitle = alertaOcorrenciaGrave ? `Ocorrência grave: ${alertaOcorrenciaGrave.titulo}` : top?.titulo
  const topClick = () => navigate(alertaOcorrenciaGrave ? '/ocorrencias' : '/comunicados')
  const topDismissKey = alertaOcorrenciaGrave ? `oc-${alertaOcorrenciaGrave.id}` : top?.id

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        {(top || alertaOcorrenciaGrave) && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 bg-red-600 text-white text-sm cursor-pointer hover:bg-red-700 transition-colors"
            onClick={topClick}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1 font-medium truncate">{topTitle}</span>
            {!alertaOcorrenciaGrave && alertas.length > 1 && (
              <span className="shrink-0 bg-red-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                +{alertas.length - 1}
              </span>
            )}
            <button
              onClick={e => {
                e.stopPropagation()
                if (!topDismissKey) return
                setDismissed(prev => [...prev, topDismissKey])
              }}
              className="shrink-0 p-0.5 rounded hover:bg-red-800 transition-colors"
              title="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <main className="flex-1 pt-14 md:pt-0">
          <Outlet />
        </main>
      </div>
      <FracaoOnboardingModal />
    </div>
  )
}
