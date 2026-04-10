import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { PiggyBank, Plus, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Banknote, Users } from 'lucide-react'
import type { Orcamento, RegistoCaixa, RecebimentoTrimestral } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function ContabilidadePage() {
  const { rubricas, setRubricas, registosCaixa, setRegistosCaixa, recebimentos, setRecebimentos } = useAppData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const now = new Date()
  const anoAtual = now.getFullYear()
  const mesAtual = now.getMonth() + 1 // 1-12
  const trimestreAtual = Math.ceil(mesAtual / 3) as 1|2|3|4

  const [tab, setTab] = useState<'rubricas' | 'caixa'>(isAdmin ? 'caixa' : 'rubricas')
  const [tipoFilter, setTipoFilter] = useState(isAdmin ? 'todos' : 'despesa')
  const [openRubricaModal, setOpenRubricaModal] = useState(false)
  const [openCaixaModal, setOpenCaixaModal] = useState(false)
  const [openRecebimentoModal, setOpenRecebimentoModal] = useState(false)
  const [rubricaForm, setRubricaForm] = useState({ rubrica: '', tipo: 'despesa', valor_previsto: '', descricao: '' })
  const [caixaForm, setCaixaForm] = useState({ ano: String(anoAtual), mes: String(mesAtual), valor: '', notas: '' })
  const [recebimentoForm, setRecebimentoForm] = useState({ ano: String(anoAtual), trimestre: String(trimestreAtual), valor: '', notas: '' })

  const filtered = tipoFilter === 'todos' ? rubricas : rubricas.filter(o => o.tipo === tipoFilter)
  const totalReceitas = rubricas.filter(o => o.tipo === 'receita').reduce((s, o) => s + (o.valor_real ?? 0), 0)
  const totalDespesas = rubricas.filter(o => o.tipo === 'despesa').reduce((s, o) => s + (o.valor_real ?? 0), 0)
  const saldo = totalReceitas - totalDespesas

  // Pendentes de registo
  const caixaMesFalta = isAdmin && !registosCaixa.some(r => r.ano === anoAtual && r.mes === mesAtual)
  const recebimentoTrimestreFalta = isAdmin && !recebimentos.some(r => r.ano === anoAtual && r.trimestre === trimestreAtual)

  const caixaOrdenada = [...registosCaixa].sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes)
  const recebimentosOrdenados = [...recebimentos].sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.trimestre - a.trimestre)

  function submitCaixa(e: React.FormEvent) {
    e.preventDefault()
    if (!caixaForm.valor) return
    const novo: RegistoCaixa = {
      id: `rc-${Date.now()}`,
      condominio_id: profile?.condominio_id ?? 'c1',
      ano: parseInt(caixaForm.ano),
      mes: parseInt(caixaForm.mes),
      valor: parseFloat(caixaForm.valor),
      notas: caixaForm.notas || undefined,
      created_at: new Date().toISOString(),
    }
    setRegistosCaixa(prev => [novo, ...prev])
    setOpenCaixaModal(false)
    setCaixaForm({ ano: String(anoAtual), mes: String(mesAtual), valor: '', notas: '' })
  }

  function submitRecebimento(e: React.FormEvent) {
    e.preventDefault()
    if (!recebimentoForm.valor) return
    const novo: RecebimentoTrimestral = {
      id: `rt-${Date.now()}`,
      condominio_id: profile?.condominio_id ?? 'c1',
      ano: parseInt(recebimentoForm.ano),
      trimestre: parseInt(recebimentoForm.trimestre) as 1|2|3|4,
      valor: parseFloat(recebimentoForm.valor),
      notas: recebimentoForm.notas || undefined,
      created_at: new Date().toISOString(),
    }
    setRecebimentos(prev => [novo, ...prev])
    setOpenRecebimentoModal(false)
    setRecebimentoForm({ ano: String(anoAtual), trimestre: String(trimestreAtual), valor: '', notas: '' })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contabilidade</h1>
          <p className="text-slate-500 mt-1">Orçamento e controlo financeiro</p>
        </div>
        {isAdmin && tab === 'rubricas' && (
          <Button onClick={() => setOpenRubricaModal(true)}>
            <Plus size={16} /> Nova Rubrica
          </Button>
        )}
      </div>

      {/* Alertas de pendentes — admin */}
      {isAdmin && (caixaMesFalta || recebimentoTrimestreFalta) && (
        <div className="mb-6 space-y-2">
          {caixaMesFalta && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                <AlertCircle size={16} className="text-amber-500" />
                Falta registar o valor em caixa de {MESES[mesAtual - 1]} {anoAtual}
              </div>
              <Button size="sm" onClick={() => { setTab('caixa'); setOpenCaixaModal(true) }}>Registar agora</Button>
            </div>
          )}
          {recebimentoTrimestreFalta && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
                <AlertCircle size={16} className="text-blue-500" />
                Falta registar o recebimento do {trimestreAtual}.º trimestre de {anoAtual}
              </div>
              <Button size="sm" onClick={() => { setTab('caixa'); setOpenRecebimentoModal(true) }}>Registar agora</Button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {(['caixa', 'rubricas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'caixa' ? 'Caixa & Quotas' : 'Rubricas'}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Caixa & Quotas ── */}
      {tab === 'caixa' && isAdmin && (
        <div className="space-y-8">
          {/* Valor em Caixa — mensal */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-emerald-600" />
                <h2 className="font-semibold text-slate-800">Valor em Caixa — Registo Mensal</h2>
              </div>
              <Button size="sm" onClick={() => setOpenCaixaModal(true)}>
                <Plus size={14} /> Novo registo
              </Button>
            </div>
            {caixaOrdenada.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">Sem registos de caixa ainda.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {caixaOrdenada.map(r => (
                  <div key={r.id} className={`rounded-xl p-4 border ${r.ano === anoAtual && r.mes === mesAtual ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs text-slate-500 mb-1">{MESES[r.mes - 1]} {r.ano}</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(r.valor)}</p>
                    {r.notas && <p className="text-xs text-slate-400 mt-1 truncate">{r.notas}</p>}
                    {r.ano === anoAtual && r.mes === mesAtual && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 mt-1"><CheckCircle2 size={11} /> Mês atual</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recebimentos Trimestrais */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                <h2 className="font-semibold text-slate-800">Recebimentos de Quotas — Trimestral</h2>
              </div>
              <Button size="sm" onClick={() => setOpenRecebimentoModal(true)}>
                <Plus size={14} /> Novo registo
              </Button>
            </div>
            {recebimentosOrdenados.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">Sem recebimentos registados ainda.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {recebimentosOrdenados.map(r => (
                  <div key={r.id} className={`rounded-xl p-4 border ${r.ano === anoAtual && r.trimestre === trimestreAtual ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs text-slate-500 mb-1">{r.trimestre}.º Trim. {r.ano}</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(r.valor)}</p>
                    {r.notas && <p className="text-xs text-slate-400 mt-1 truncate">{r.notas}</p>}
                    {r.ano === anoAtual && r.trimestre === trimestreAtual && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 mt-1"><CheckCircle2 size={11} /> Trimestre atual</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Rubricas ── */}
      {(tab === 'rubricas' || !isAdmin) && (
        <>
          {/* Summary */}
          <div className={`grid grid-cols-1 gap-4 mb-8 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-1 max-w-xs'}`}>
            {isAdmin && (
              <div className="rounded-xl p-5 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-green-600" />
                  <p className="text-sm font-medium text-slate-700">Receitas Realizadas</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
              </div>
            )}
            <div className="rounded-xl p-5 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={18} className="text-red-600" />
                <p className="text-sm font-medium text-slate-700">Total Despesas</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
            </div>
            {isAdmin && (
              <div className={`rounded-xl p-5 ${saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank size={18} className={saldo >= 0 ? 'text-blue-600' : 'text-orange-600'} />
                  <p className="text-sm font-medium text-slate-700">Saldo</p>
                </div>
                <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(saldo)}</p>
              </div>
            )}
          </div>

          {/* Filter — admin only */}
          {isAdmin && (
            <div className="flex gap-2 mb-4">
              {['todos', 'receita', 'despesa'].map(f => (
                <button key={f} onClick={() => setTipoFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${tipoFilter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {f === 'todos' ? 'Todos' : f === 'receita' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Rubrica</th>
                    {isAdmin && <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo</th>}
                    {isAdmin && <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Previsto</th>}
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Realizado</th>
                    {isAdmin && <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Desvio</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(o => {
                    const desvio = (o.valor_real ?? 0) - o.valor_previsto
                    return (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">{o.rubrica}</td>
                        {isAdmin && <td className="px-6 py-4"><Badge variant={o.tipo === 'receita' ? 'success' : 'danger'}>{o.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge></td>}
                        {isAdmin && <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(o.valor_previsto)}</td>}
                        <td className="px-6 py-4 text-right font-medium text-slate-800">{formatCurrency(o.valor_real ?? 0)}</td>
                        {isAdmin && <td className={`px-6 py-4 text-right font-medium ${desvio >= 0 ? 'text-green-600' : 'text-red-600'}`}>{desvio >= 0 ? '+' : ''}{formatCurrency(desvio)}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Modal: Nova Rubrica */}
      <Modal open={openRubricaModal} onClose={() => setOpenRubricaModal(false)} title="Nova Rubrica">
        <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (!rubricaForm.rubrica || !rubricaForm.valor_previsto) return
            const nova: Orcamento = {
              id: `o-${Date.now()}`,
              condominio_id: 'c1',
              ano: new Date().getFullYear(),
              rubrica: rubricaForm.rubrica,
              tipo: rubricaForm.tipo as Orcamento['tipo'],
              valor_previsto: parseFloat(rubricaForm.valor_previsto),
              valor_real: 0,
              created_at: new Date().toISOString(),
            }
            setRubricas(prev => [...prev, nova])
            setOpenRubricaModal(false)
            setRubricaForm({ rubrica: '', tipo: 'despesa', valor_previsto: '', descricao: '' })
          }}>
          <Input label="Rubrica" value={rubricaForm.rubrica} onChange={e => setRubricaForm({ ...rubricaForm, rubrica: e.target.value })} placeholder="Ex: Manutenção jardim" required />
          <Select label="Tipo" value={rubricaForm.tipo} onChange={e => setRubricaForm({ ...rubricaForm, tipo: e.target.value })} options={[{ value: 'receita', label: 'Receita' }, { value: 'despesa', label: 'Despesa' }]} />
          <Input label="Valor Previsto (€)" type="number" step="0.01" value={rubricaForm.valor_previsto} onChange={e => setRubricaForm({ ...rubricaForm, valor_previsto: e.target.value })} placeholder="0.00" required />
          <Textarea label="Descrição" value={rubricaForm.descricao} onChange={e => setRubricaForm({ ...rubricaForm, descricao: e.target.value })} rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenRubricaModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Registo de Caixa */}
      <Modal open={openCaixaModal} onClose={() => setOpenCaixaModal(false)} title="Registar Valor em Caixa">
        <form className="space-y-4" onSubmit={submitCaixa}>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Mês" value={caixaForm.mes} onChange={e => setCaixaForm({ ...caixaForm, mes: e.target.value })}
              options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
            <Input label="Ano" type="number" value={caixaForm.ano} onChange={e => setCaixaForm({ ...caixaForm, ano: e.target.value })} />
          </div>
          <Input label="Valor em Caixa (€)" type="number" step="0.01" value={caixaForm.valor} onChange={e => setCaixaForm({ ...caixaForm, valor: e.target.value })} placeholder="0.00" required />
          <Textarea label="Notas (opcional)" value={caixaForm.notas} onChange={e => setCaixaForm({ ...caixaForm, notas: e.target.value })} rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenCaixaModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Recebimento Trimestral */}
      <Modal open={openRecebimentoModal} onClose={() => setOpenRecebimentoModal(false)} title="Registar Recebimento Trimestral">
        <form className="space-y-4" onSubmit={submitRecebimento}>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Trimestre" value={recebimentoForm.trimestre} onChange={e => setRecebimentoForm({ ...recebimentoForm, trimestre: e.target.value })}
              options={[1,2,3,4].map(t => ({ value: String(t), label: `${t}.º Trimestre` }))} />
            <Input label="Ano" type="number" value={recebimentoForm.ano} onChange={e => setRecebimentoForm({ ...recebimentoForm, ano: e.target.value })} />
          </div>
          <Input label="Total Recebido pelos Moradores (€)" type="number" step="0.01" value={recebimentoForm.valor} onChange={e => setRecebimentoForm({ ...recebimentoForm, valor: e.target.value })} placeholder="0.00" required />
          <Textarea label="Notas (opcional)" value={recebimentoForm.notas} onChange={e => setRecebimentoForm({ ...recebimentoForm, notas: e.target.value })} rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenRecebimentoModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


