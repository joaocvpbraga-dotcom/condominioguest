import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Zap, Euro } from 'lucide-react'
import type { Quota } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'

const estadoVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  pago: 'success', pendente: 'warning', em_atraso: 'danger',
}
const estadoLabel: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', em_atraso: 'Em Atraso',
}

export function QuotasPage() {
  const { fracoes: contextFracoes, quotas, setQuotas } = useAppData()
  const FRACOES = contextFracoes.map(f => ({
    id: f.id,
    label: f.numero,
    proprietario: f.proprietario?.nome ?? '—',
  }))

  function fracaoLabel(id: string) {
    if (id.startsWith('manual-')) return id.replace('manual-', '')
    return FRACOES.find(f => f.id === id)?.label ?? id
  }
  function fracaoProprietario(id: string) {
    if (id.startsWith('manual-')) return '—'
    return FRACOES.find(f => f.id === id)?.proprietario ?? '—'
  }

  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')

  // Modal: marcar pago individual
  const [pagoModal, setPagoModal] = useState<{ open: boolean; quotaId: string | null }>({ open: false, quotaId: null })
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])

  // Modal: emitir em massa
  const [massModal, setMassModal] = useState(false)
  const [massForm, setMassForm] = useState({
    descricao: '',
    valor: '85',
    data_vencimento: '',
    selectedFracoes: [] as string[],
  })

  function openMassModal() {
    setMassForm(prev => ({ ...prev, selectedFracoes: FRACOES.map(f => f.id) }))
    setMassModal(true)
  }
  const [massLoading, setMassLoading] = useState(false)
  const [massSuccess, setMassSuccess] = useState(false)

  // Modal: nova quota individual
  const EMPTY_QUOTA_FORM = { fracao: '', descricao: '', valor: '', data_vencimento: '' }
  const [novaModal, setNovaModal] = useState(false)
  const [novaForm, setNovaForm] = useState(EMPTY_QUOTA_FORM)

  function handleNovaQuota(e: React.FormEvent) {
    e.preventDefault()
    if (!novaForm.fracao || !novaForm.descricao || !novaForm.valor || !novaForm.data_vencimento) return
    // Try to match the fraction by numero OR use raw text as identifier
    const matched = contextFracoes.find(f => f.numero.toLowerCase() === novaForm.fracao.toLowerCase())
    const fracaoId = matched ? matched.id : `manual-${novaForm.fracao}`
    setQuotas(prev => [{
      id: `q-${Date.now()}`,
      condominio_id: 'c1',
      fracao_id: fracaoId,
      descricao: novaForm.descricao,
      valor: parseFloat(novaForm.valor),
      data_vencimento: novaForm.data_vencimento,
      estado: 'pendente',
      created_at: new Date().toISOString(),
    }, ...prev])
    setNovaModal(false)
    setNovaForm(EMPTY_QUOTA_FORM)
  }

  // ── derived ──────────────────────────────────────────────────
  const filtered = quotas.filter(q => {
    const matchFilter = filter === 'todos' || q.estado === filter
    const matchSearch = fracaoLabel(q.fracao_id).toLowerCase().includes(search.toLowerCase()) ||
      fracaoProprietario(q.fracao_id).toLowerCase().includes(search.toLowerCase()) ||
      q.descricao.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalPago = quotas.filter(q => q.estado === 'pago').reduce((s, q) => s + q.valor, 0)
  const totalPendente = quotas.filter(q => q.estado === 'pendente').reduce((s, q) => s + q.valor, 0)
  const totalAtraso = quotas.filter(q => q.estado === 'em_atraso').reduce((s, q) => s + q.valor, 0)
  const taxaCobrança = Math.round((quotas.filter(q => q.estado === 'pago').length / quotas.length) * 100)

  // ── actions ──────────────────────────────────────────────────
  function confirmarPagamento() {
    if (!pagoModal.quotaId) return
    setQuotas(prev => prev.map(q =>
      q.id === pagoModal.quotaId
        ? { ...q, estado: 'pago', data_pagamento: dataPagamento }
        : q
    ))
    setPagoModal({ open: false, quotaId: null })
  }

  function emitirEmMassa() {
    setMassLoading(true)
    setTimeout(() => {
      const novas: Quota[] = massForm.selectedFracoes.map((fid, i) => ({
        id: `new-${Date.now()}-${i}`,
        condominio_id: 'c1',
        fracao_id: fid,
        descricao: massForm.descricao,
        valor: parseFloat(massForm.valor),
        data_vencimento: massForm.data_vencimento,
        estado: 'pendente',
        created_at: new Date().toISOString(),
      }))
      setQuotas(prev => [...prev, ...novas])
      setMassLoading(false)
      setMassSuccess(true)
    }, 800)
  }

  function closeMass() {
    setMassModal(false)
    setMassSuccess(false)
    setMassForm({ descricao: '', valor: '85', data_vencimento: '', selectedFracoes: [] })
  }

  function toggleFracao(id: string) {
    setMassForm(prev => ({
      ...prev,
      selectedFracoes: prev.selectedFracoes.includes(id)
        ? prev.selectedFracoes.filter(f => f !== id)
        : [...prev.selectedFracoes, id],
    }))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quotas & Pagamentos</h1>
          <p className="text-slate-500 mt-1 text-sm">Controlo de cobranças e receitas do condomínio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openMassModal}>
            <Zap size={16} /> Emitir em Massa
          </Button>
          <Button onClick={() => { setNovaForm(EMPTY_QUOTA_FORM); setNovaModal(true) }}>
            <Plus size={16} /> Nova Quota
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cobrado', value: formatCurrency(totalPago), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', sub: `${quotas.filter(q => q.estado === 'pago').length} quotas` },
          { label: 'Pendente', value: formatCurrency(totalPendente), icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', sub: `${quotas.filter(q => q.estado === 'pendente').length} quotas` },
          { label: 'Em Atraso', value: formatCurrency(totalAtraso), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', sub: `${quotas.filter(q => q.estado === 'em_atraso').length} quotas` },
          { label: 'Taxa de Cobrança', value: `${taxaCobrança}%`, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'do total emitido' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 ${k.bg} flex items-center gap-3`}>
            <k.icon size={22} className={k.color} />
            <div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-slate-600 font-medium">{k.label}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {['todos', 'pendente', 'pago', 'em_atraso'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'todos' ? 'Todos' : estadoLabel[f]}
              <span className="ml-1.5 text-xs opacity-60">
                {f === 'todos' ? quotas.length : quotas.filter(q => q.estado === f).length}
              </span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Pesquisar fração ou proprietário..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
        />
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fração</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Proprietário</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vencimento</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pago em</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Nenhuma quota encontrada</td></tr>
              ) : filtered.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                      {fracaoLabel(q.fracao_id)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{fracaoProprietario(q.fracao_id)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{q.descricao}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{formatCurrency(q.valor)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(q.data_vencimento)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={estadoVariant[q.estado]}>{estadoLabel[q.estado]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    {q.data_pagamento ? formatDate(q.data_pagamento) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {q.estado !== 'pago' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setPagoModal({ open: true, quotaId: q.id }); setDataPagamento(new Date().toISOString().split('T')[0]) }}
                      >
                        <Euro size={13} /> Registar Pagamento
                      </Button>
                    )}
                    {q.estado === 'pago' && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 size={13} /> Pago
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Modal: Nova Quota ── */}
      <Modal open={novaModal} onClose={() => setNovaModal(false)} title="Nova Quota" size="sm">
        <form className="space-y-4" onSubmit={handleNovaQuota}>
          {contextFracoes.length > 0 ? (
            <Select
              label="Fração"
              value={novaForm.fracao}
              onChange={e => setNovaForm({ ...novaForm, fracao: e.target.value })}
              options={[
                { value: '', label: 'Selecionar fração...' },
                ...contextFracoes
                  .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }))
                  .map(f => ({ value: f.numero, label: `Fração ${f.numero}${f.proprietario ? ` — ${f.proprietario.nome}` : ''}` })),
              ]}
            />
          ) : (
            <Input
              label="Fração"
              value={novaForm.fracao}
              onChange={e => setNovaForm({ ...novaForm, fracao: e.target.value })}
              placeholder="Ex: 1A, 2B, 101..."
              required
            />
          )}
          <Input
            label="Descrição"
            value={novaForm.descricao}
            onChange={e => setNovaForm({ ...novaForm, descricao: e.target.value })}
            placeholder="Ex: Quota Mensal — Maio 2026"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (€)"
              type="number"
              step="0.01"
              value={novaForm.valor}
              onChange={e => setNovaForm({ ...novaForm, valor: e.target.value })}
              placeholder="85.00"
              required
            />
            <Input
              label="Data de Vencimento"
              type="date"
              value={novaForm.data_vencimento}
              onChange={e => setNovaForm({ ...novaForm, data_vencimento: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setNovaModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Registar Pagamento ── */}
      <Modal
        open={pagoModal.open}
        onClose={() => setPagoModal({ open: false, quotaId: null })}
        title="Registar Pagamento"
        size="sm"
      >
        {pagoModal.quotaId && (() => {
          const q = quotas.find(q => q.id === pagoModal.quotaId)!
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-800">{q.descricao}</p>
                <p className="text-xs text-slate-500 mt-1">Fração {fracaoLabel(q.fracao_id)} — {fracaoProprietario(q.fracao_id)}</p>
                <p className="text-xl font-bold text-blue-600 mt-2">{formatCurrency(q.valor)}</p>
              </div>
              <Input
                label="Data do pagamento"
                type="date"
                value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)}
              />
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => setPagoModal({ open: false, quotaId: null })}>Cancelar</Button>
                <Button onClick={confirmarPagamento}>
                  <CheckCircle2 size={15} /> Confirmar Pagamento
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── Modal: Emitir em Massa ── */}
      <Modal open={massModal} onClose={closeMass} title="Emitir Quotas em Massa" size="lg">
        {massSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Quotas emitidas!</h3>
            <p className="text-sm text-slate-500 mt-2">
              {massForm.selectedFracoes.length} quotas criadas com sucesso.
            </p>
            <Button className="mt-6" onClick={closeMass}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Descrição"
                value={massForm.descricao}
                onChange={e => setMassForm({ ...massForm, descricao: e.target.value })}
                placeholder="Ex: Quota Mensal — Maio 2026"
              />
              <Input
                label="Valor por fração (€)"
                type="number"
                step="0.01"
                value={massForm.valor}
                onChange={e => setMassForm({ ...massForm, valor: e.target.value })}
              />
            </div>
            <Input
              label="Data de Vencimento"
              type="date"
              value={massForm.data_vencimento}
              onChange={e => setMassForm({ ...massForm, data_vencimento: e.target.value })}
            />

            {/* Seleção de frações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Frações a incluir</label>
                <div className="flex gap-2">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setMassForm(p => ({ ...p, selectedFracoes: FRACOES.map(f => f.id) }))}
                  >Selecionar todas</button>
                  <span className="text-slate-300">|</span>
                  <button
                    className="text-xs text-slate-500 hover:underline"
                    onClick={() => setMassForm(p => ({ ...p, selectedFracoes: [] }))}
                  >Limpar</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3">
                {FRACOES.map(f => (
                  <label
                    key={f.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${massForm.selectedFracoes.includes(f.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={massForm.selectedFracoes.includes(f.id)}
                      onChange={() => toggleFracao(f.id)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Fração {f.label}</p>
                      <p className="text-xs text-slate-400">{f.proprietario}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            {massForm.selectedFracoes.length > 0 && massForm.valor && (
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Total a emitir</p>
                  <p className="text-xs text-slate-400">{massForm.selectedFracoes.length} frações × {formatCurrency(parseFloat(massForm.valor) || 0)}</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency((parseFloat(massForm.valor) || 0) * massForm.selectedFracoes.length)}
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={closeMass}>Cancelar</Button>
              <Button
                onClick={emitirEmMassa}
                loading={massLoading}
                disabled={!massForm.descricao || !massForm.valor || !massForm.data_vencimento || massForm.selectedFracoes.length === 0}
              >
                <Zap size={15} /> Emitir {massForm.selectedFracoes.length} Quotas
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

