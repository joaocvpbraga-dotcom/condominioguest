import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatDateTime } from '@/lib/utils'
import { AlertTriangle, Plus, ChevronRight, MessageSquare, Clock, CheckCircle2, XCircle, Send, ShieldAlert, Wrench } from 'lucide-react'
import type { Ocorrencia, Nota, OcorrenciaComNotas } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'

// ── Configs ───────────────────────────────────────────────────
const PIPELINE: Array<{ estado: string; label: string; color: string; icon: React.ReactNode }> = [
  { estado: 'aberta', label: 'Aberta', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <AlertTriangle size={14} /> },
  { estado: 'em_analise', label: 'Em Análise', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <Clock size={14} /> },
  { estado: 'resolvida', label: 'Resolvida', color: 'text-green-600 bg-green-50 border-green-200', icon: <CheckCircle2 size={14} /> },
  { estado: 'fechada', label: 'Fechada', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: <XCircle size={14} /> },
]

const tipoVariant: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
  avaria: 'danger', reclamacao: 'warning', sugestao: 'info',
  risco: 'danger', intervencao: 'info', outro: 'default',
}
const tipoLabel: Record<string, string> = {
  avaria: 'Avaria', reclamacao: 'Reclamação', sugestao: 'Sugestão',
  risco: 'Situação de Risco', intervencao: 'Intervenção no Apartamento', outro: 'Outro',
}
const prioridadeStyle: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700 border border-red-200',
  alta: 'bg-orange-100 text-orange-700 border border-orange-200',
  media: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  baixa: 'bg-slate-100 text-slate-600 border border-slate-200',
}
const estadoVariant: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  aberta: 'warning', em_analise: 'info', resolvida: 'success', fechada: 'default',
}

export function OcorrenciasPage() {
  const { ocorrencias, setOcorrencias } = useAppData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [filter, setFilter] = useState('todas')
  const [selected, setSelected] = useState<OcorrenciaComNotas | null>(null)
  const [novaNota, setNovaNota] = useState('')
  const [notaInterna, setNotaInterna] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' })

  // Moradores só veem as suas; admin vê todas
  const visibleOcorrencias = isAdmin
    ? ocorrencias
    : ocorrencias.filter(o => o.autor_id === profile?.id)

  const filtered = filter === 'todas'
    ? visibleOcorrencias
    : visibleOcorrencias.filter(o => o.estado === filter)

  // Sync selected when state changes
  function updateOcorrencia(updated: OcorrenciaComNotas) {
    setOcorrencias(prev => prev.map(o => o.id === updated.id ? updated : o))
    setSelected(updated)
  }

  function avancarEstado(o: OcorrenciaComNotas) {
    const idx = PIPELINE.findIndex(p => p.estado === o.estado)
    if (idx >= PIPELINE.length - 1) return
    const novoEstado = PIPELINE[idx + 1].estado as Ocorrencia['estado']
    const nota: Nota = {
      id: `n-${Date.now()}`,
      texto: `Estado alterado para "${PIPELINE[idx + 1].label}".`,
      autor: 'Admin',
      created_at: new Date().toISOString(),
      interna: true,
    }
    updateOcorrencia({ ...o, estado: novoEstado, notas: [...o.notas, nota] })
  }

  function adicionarNota(o: OcorrenciaComNotas) {
    if (!novaNota.trim()) return
    const nota: Nota = {
      id: `n-${Date.now()}`,
      texto: novaNota.trim(),
      autor: 'Admin',
      created_at: new Date().toISOString(),
      interna: notaInterna,
    }
    updateOcorrencia({ ...o, notas: [...o.notas, nota] })
    setNovaNota('')
  }

  function criarOcorrencia() {
    const nova: OcorrenciaComNotas = {
      id: `o-${Date.now()}`,
      condominio_id: 'c1',
      titulo: form.titulo,
      descricao: form.descricao,
      tipo: form.tipo as Ocorrencia['tipo'],
      estado: 'aberta',
      prioridade: form.prioridade as Ocorrencia['prioridade'],
      autor_id: profile?.id ?? 'demo',
      autor_nome: profile?.nome ?? 'Morador',
      created_at: new Date().toISOString(),
      notas: [],
    }
    setOcorrencias(prev => [nova, ...prev])
    setOpenModal(false)
    setForm({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' })
  }

  const pipelineIdx = selected ? PIPELINE.findIndex(p => p.estado === selected.estado) : -1

  return (
    <div className="flex h-full" style={{ minHeight: 'calc(100vh - 0px)' }}>
      {/* ── Lista ── */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${selected ? 'xl:max-w-[55%]' : ''}`}>
        <div className="p-4 pb-4 md:p-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ocorrências</h1>
            <p className="text-slate-500 mt-1 text-sm">Reclamações, avarias e sugestões</p>
          </div>
          <Button onClick={() => setOpenModal(true)}>
            <Plus size={16} /> Nova Ocorrência
          </Button>
        </div>

        {/* Contadores pipeline */}
        <div className="px-8 mb-4 grid grid-cols-4 gap-2">
          {PIPELINE.map(p => {
            const count = visibleOcorrencias.filter(o => o.estado === p.estado).length
            return (
              <button
                key={p.estado}
                onClick={() => setFilter(filter === p.estado ? 'todas' : p.estado)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${filter === p.estado ? p.color + ' shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                {p.icon}
                <span>{p.label}</span>
                <span className="ml-auto font-bold">{count}</span>
              </button>
            )
          })}
        </div>
        {filter !== 'todas' && (
          <div className="px-8 mb-2">
            <button onClick={() => setFilter('todas')} className="text-xs text-blue-600 hover:underline">← Ver todas</button>
          </div>
        )}

        {/* Cards */}
        <div className="px-8 pb-8 space-y-2 overflow-y-auto flex-1">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma ocorrência neste estado</p>
            </div>
          )}
          {filtered.map(o => (
            <Card
              key={o.id}
              className={`cursor-pointer hover:shadow-md transition-all ${selected?.id === o.id ? 'ring-2 ring-blue-500 border-blue-200' : ''}`}
            >
              <div className="px-5 py-4 flex items-start gap-3" onClick={() => setSelected(selected?.id === o.id ? null : o)}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 text-sm">{o.titulo}</h3>
                    <Badge variant={tipoVariant[o.tipo]}>{tipoLabel[o.tipo]}</Badge>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${prioridadeStyle[o.prioridade]}`}>
                      {o.prioridade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{o.descricao}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>{formatDateTime(o.created_at)}</span>
                    {isAdmin && o.autor_nome && <span className="text-blue-500 font-medium">{o.autor_nome}</span>}
                    {o.notas.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} /> {o.notas.length} {o.notas.length === 1 ? 'nota' : 'notas'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={estadoVariant[o.estado]}>
                    {PIPELINE.find(p => p.estado === o.estado)?.label}
                  </Badge>
                  <ChevronRight size={16} className={`text-slate-300 transition-transform ${selected?.id === o.id ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Painel lateral ── */}
      {selected && (
        <div className="hidden xl:flex flex-col w-[45%] min-w-80 border-l border-slate-200 bg-white">
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
            <div className="flex-1 pr-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ocorrência #{selected.id}</p>
              <h2 className="font-bold text-slate-800 leading-snug">{selected.titulo}</h2>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
              <XCircle size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Info badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={tipoVariant[selected.tipo]}>{tipoLabel[selected.tipo]}</Badge>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${prioridadeStyle[selected.prioridade]}`}>
                {selected.prioridade}
              </span>
              <span className="text-xs text-slate-400">{formatDateTime(selected.created_at)}</span>
            </div>

            {/* Descrição */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descrição</p>
              <p className="text-sm text-slate-700 leading-relaxed">{selected.descricao}</p>
            </div>

            {/* Pipeline visual */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estado do Processo</p>
              <div className="flex items-center gap-0">
                {PIPELINE.map((p, i) => {
                  const done = i <= pipelineIdx
                  const current = i === pipelineIdx
                  return (
                    <React.Fragment key={p.estado}>
                      <div className={`flex flex-col items-center`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors text-xs
                          ${current ? 'border-blue-500 bg-blue-500 text-white' :
                            done ? 'border-green-500 bg-green-500 text-white' :
                            'border-slate-200 bg-white text-slate-400'}`}
                        >
                          {done && !current ? <CheckCircle2 size={14} /> : p.icon}
                        </div>
                        <span className={`text-xs mt-1 font-medium whitespace-nowrap ${current ? 'text-blue-600' : done ? 'text-green-600' : 'text-slate-400'}`}>
                          {p.label}
                        </span>
                      </div>
                      {i < PIPELINE.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < pipelineIdx ? 'bg-green-400' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>

              {selected.estado !== 'fechada' && selected.estado !== 'resolvida' && (
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => avancarEstado(selected)}
                >
                  Avançar para "{PIPELINE[pipelineIdx + 1]?.label}"
                </Button>
              )}
              {selected.estado === 'resolvida' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => avancarEstado(selected)}
                >
                  Fechar Ocorrência
                </Button>
              )}
            </div>

            {/* Notas */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Notas & Histórico ({selected.notas.length})
              </p>
              {selected.notas.length === 0 && (
                <p className="text-xs text-slate-400 italic">Sem notas ainda.</p>
              )}
              <div className="space-y-2">
                {selected.notas.map(n => (
                  <div
                    key={n.id}
                    className={`rounded-xl p-3 text-sm ${n.interna ? 'bg-yellow-50 border border-yellow-100' : 'bg-slate-50 border border-slate-100'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-600">{n.autor}</span>
                      <div className="flex items-center gap-1.5">
                        {n.interna && <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 rounded-full">interna</span>}
                        <span className="text-xs text-slate-400">{formatDateTime(n.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-snug">{n.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Adicionar nota */}
          <div className="px-6 py-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs font-semibold text-slate-600">Adicionar nota</p>
              <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={notaInterna}
                  onChange={e => setNotaInterna(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-yellow-500"
                />
                <span className="text-xs text-slate-500">Nota interna</span>
              </label>
            </div>
            <div className="flex gap-2">
              <textarea
                value={novaNota}
                onChange={e => setNovaNota(e.target.value)}
                placeholder="Escreva uma nota..."
                rows={2}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) adicionarNota(selected) }}
              />
              <Button
                size="sm"
                onClick={() => adicionarNota(selected)}
                disabled={!novaNota.trim()}
                className="self-end"
              >
                <Send size={14} />
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Ctrl+Enter para enviar</p>
          </div>
        </div>
      )}

      {/* ── Modal: Nova Ocorrência ── */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Nova Ocorrência">
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); criarOcorrencia() }}>
          <Input
            label="Título"
            value={form.titulo}
            onChange={e => setForm({ ...form, titulo: e.target.value })}
            placeholder="Descreva brevemente"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo"
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
              options={[
                { value: 'avaria', label: 'Avaria' },
                { value: 'risco', label: 'Situação de Risco' },
                { value: 'intervencao', label: 'Intervenção no Apartamento' },
                { value: 'reclamacao', label: 'Reclamação' },
                { value: 'sugestao', label: 'Sugestão' },
                { value: 'outro', label: 'Outro' },
              ]}
            />
            <Select
              label="Prioridade"
              value={form.prioridade}
              onChange={e => setForm({ ...form, prioridade: e.target.value })}
              options={[
                { value: 'baixa', label: 'Baixa' },
                { value: 'media', label: 'Média' },
                { value: 'alta', label: 'Alta' },
                { value: 'urgente', label: 'Urgente' },
              ]}
            />
          </div>
          <Textarea
            label="Descrição"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            rows={4}
            placeholder="Descreva a ocorrência com detalhe..."
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">Submeter</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// Need React in scope for JSX fragments
import React from 'react'


