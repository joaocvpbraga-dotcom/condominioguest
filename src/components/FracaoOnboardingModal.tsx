import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Home } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppData } from '@/contexts/AppDataContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export function FracaoOnboardingModal() {
  const { profile } = useAuth()
  const { fracoes, setFracoes } = useAppData()
  const [selectedFracao, setSelectedFracao] = useState('')
  const [loading, setLoading] = useState(false)

  // Only show for moradores with no assigned fraction
  if (!profile || profile.role !== 'morador') return null
  const hasFracao = fracoes.some(f => f.proprietario_id === profile.id)
  if (hasFracao) return null

  const availableFracoes = fracoes.filter(f => !f.proprietario_id)

  async function handleConfirm() {
    if (!selectedFracao || !profile) return
    setLoading(true)
    const fracao = fracoes.find(f => f.id === selectedFracao)
    if (!fracao) { setLoading(false); return }

    const updated = { ...fracao, proprietario_id: profile.id, proprietario: profile }

    if (isSupabaseConfigured) {
      await supabase.from('fracoes').update({ proprietario_id: profile.id }).eq('id', selectedFracao)
    }

    setFracoes(prev => prev.map(f => f.id === selectedFracao ? updated : f))
    setLoading(false)
  }

  return (
    <Modal open={true} onClose={() => {}} title="Bem-vindo ao CondoGest!" size="sm">
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
            <Home size={28} className="text-blue-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">Qual é a sua fração?</p>
            <p className="text-sm text-slate-500 mt-1">
              Selecione a unidade que pretende associar à sua conta para aceder às informações do seu apartamento.
            </p>
          </div>
        </div>

        {availableFracoes.length === 0 ? (
          <div className="bg-amber-50 text-amber-700 text-sm rounded-xl p-4 text-center">
            Não existem frações disponíveis para associar.<br />
            Contacte o administrador do condomínio.
          </div>
        ) : (
          <>
            <Select
              label="Fração"
              value={selectedFracao}
              onChange={e => setSelectedFracao(e.target.value)}
              options={[
                { value: '', label: 'Selecionar fração...' },
                ...availableFracoes
                  .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }))
                  .map(f => ({ value: f.id, label: `Fração ${f.numero}${f.andar ? ` — ${f.andar}º andar` : ''} (${f.tipo})` })),
              ]}
            />
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={!selectedFracao}
              loading={loading}
            >
              Confirmar
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
