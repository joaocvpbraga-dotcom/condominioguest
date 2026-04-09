import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { PiggyBank, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import type { Orcamento } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'

export function ContabilidadePage() {
  const { rubricas, setRubricas } = useAppData()
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState({ rubrica: '', tipo: 'despesa', valor_previsto: '', descricao: '' })

  const filtered = tipoFilter === 'todos' ? rubricas : rubricas.filter(o => o.tipo === tipoFilter)

  const totalReceitas = rubricas.filter(o => o.tipo === 'receita').reduce((s, o) => s + (o.valor_real ?? 0), 0)
  const totalDespesas = rubricas.filter(o => o.tipo === 'despesa').reduce((s, o) => s + (o.valor_real ?? 0), 0)
  const saldo = totalReceitas - totalDespesas

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contabilidade</h1>
          <p className="text-slate-500 mt-1">Orçamento e controlo financeiro</p>
        </div>
        <Button onClick={() => setOpenModal(true)}>
          <Plus size={16} /> Nova Rubrica
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-5 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-600" />
            <p className="text-sm font-medium text-slate-700">Receitas Realizadas</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="rounded-xl p-5 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-red-600" />
            <p className="text-sm font-medium text-slate-700">Despesas Realizadas</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className={`rounded-xl p-5 ${saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank size={18} className={saldo >= 0 ? 'text-blue-600' : 'text-orange-600'} />
            <p className="text-sm font-medium text-slate-700">Saldo</p>
          </div>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(saldo)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['todos', 'receita', 'despesa'].map(f => (
          <button key={f} onClick={() => setTipoFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${tipoFilter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f === 'todos' ? 'Todos' : f === 'receita' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Rubrica</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Previsto</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Realizado</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Desvio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(o => {
                const desvio = (o.valor_real ?? 0) - o.valor_previsto
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{o.rubrica}</td>
                    <td className="px-6 py-4">
                      <Badge variant={o.tipo === 'receita' ? 'success' : 'danger'}>{o.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(o.valor_previsto)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">{formatCurrency(o.valor_real ?? 0)}</td>
                    <td className={`px-6 py-4 text-right font-medium ${desvio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {desvio >= 0 ? '+' : ''}{formatCurrency(desvio)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Nova Rubrica">
        <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (!form.rubrica || !form.valor_previsto) return
            const nova: Orcamento = {
              id: `o-${Date.now()}`,
              condominio_id: 'c1',
              ano: new Date().getFullYear(),
              rubrica: form.rubrica,
              tipo: form.tipo as Orcamento['tipo'],
              valor_previsto: parseFloat(form.valor_previsto),
              valor_real: 0,
              created_at: new Date().toISOString(),
            }
            setRubricas(prev => [...prev, nova])
            setOpenModal(false)
            setForm({ rubrica: '', tipo: 'despesa', valor_previsto: '', descricao: '' })
          }}>
          <Input label="Rubrica" value={form.rubrica} onChange={e => setForm({ ...form, rubrica: e.target.value })} placeholder="Ex: Manutenção jardim" required />
          <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} options={[{ value: 'receita', label: 'Receita' }, { value: 'despesa', label: 'Despesa' }]} />
          <Input label="Valor Previsto (€)" type="number" step="0.01" value={form.valor_previsto} onChange={e => setForm({ ...form, valor_previsto: e.target.value })} placeholder="0.00" required />
          <Textarea label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

