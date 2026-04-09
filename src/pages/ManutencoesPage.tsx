import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Wrench, Plus, Building2, Phone, Mail } from 'lucide-react'
import type { Fornecedor, Manutencao } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'


const mEstadoVariant: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  concluida: 'success', em_curso: 'info', agendada: 'warning', cancelada: 'default',
}
const mEstadoLabel: Record<string, string> = {
  concluida: 'Concluída', em_curso: 'Em Curso', agendada: 'Agendada', cancelada: 'Cancelada',
}

export function ManutencoesPage() {
  const [tab, setTab] = useState<'manutencoes' | 'fornecedores'>('manutencoes')
  const { fornecedores, setFornecedores, manutencoes, setManutencoes } = useAppData()
  const [openModal, setOpenModal] = useState(false)
  const [openFornModal, setOpenFornModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', estado: 'agendada', fornecedor_id: '', data_agendada: '', custo: '', descricao: '' })
  const [fornForm, setFornForm] = useState({ nome: '', servico: '', contacto: '', email: '', nif: '' })

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manutenções & Fornecedores</h1>
          <p className="text-slate-500 mt-1">Gestão de serviços e manutenções</p>
        </div>
        <Button onClick={() => tab === 'manutencoes' ? setOpenModal(true) : setOpenFornModal(true)}>
          <Plus size={16} /> {tab === 'manutencoes' ? 'Nova Manutenção' : 'Novo Fornecedor'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {(['manutencoes', 'fornecedores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'manutencoes' ? 'Manutenções' : 'Fornecedores'}
          </button>
        ))}
      </div>

      {tab === 'manutencoes' && (
        <div className="space-y-3">
          {manutencoes.map(m => (
            <Card key={m.id}>
              <div className="px-5 py-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <Wrench size={18} className="text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800">{m.titulo}</p>
                    <Badge variant={mEstadoVariant[m.estado]}>{mEstadoLabel[m.estado]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-500">
                    {m.fornecedor && <span className="flex items-center gap-1"><Building2 size={11} />{m.fornecedor.nome}</span>}
                    {m.data_agendada && <span>Agendado: {formatDate(m.data_agendada)}</span>}
                    {m.custo !== undefined && <span className="font-medium text-slate-700">{formatCurrency(m.custo)}</span>}
                  </div>
                </div>
                {m.estado === 'em_curso' && <Button size="sm">Concluir</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'fornecedores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fornecedores.map(f => (
            <Card key={f.id} className={!f.ativo ? 'opacity-60' : ''}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{f.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{f.servico}</p>
                  </div>
                  <Badge variant={f.ativo ? 'success' : 'default'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <div className="mt-3 space-y-1">
                  {f.contacto && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11} />{f.contacto}</div>}
                  {f.email && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={11} />{f.email}</div>}
                  {f.nif && <div className="text-xs text-slate-400">NIF: {f.nif}</div>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Manutencao Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Nova Manutenção">
        <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (!form.titulo) return
            const fornecedor = fornecedores.find(f => f.id === form.fornecedor_id)
            const nova: Manutencao = {
              id: `m-${Date.now()}`,
              condominio_id: 'c1',
              titulo: form.titulo,
              estado: form.estado as Manutencao['estado'],
              fornecedor_id: form.fornecedor_id || undefined,
              fornecedor,
              data_agendada: form.data_agendada || undefined,
              custo: form.custo ? parseFloat(form.custo) : undefined,
              created_at: new Date().toISOString(),
            }
            setManutencoes(prev => [nova, ...prev])
            setOpenModal(false)
            setForm({ titulo: '', estado: 'agendada', fornecedor_id: '', data_agendada: '', custo: '', descricao: '' })
          }}>
          <Input label="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Descrição do serviço" required />
          <Select label="Estado" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} options={[{ value: 'agendada', label: 'Agendada' }, { value: 'em_curso', label: 'Em Curso' }, { value: 'concluida', label: 'Concluída' }, { value: 'cancelada', label: 'Cancelada' }]} />
          <Select label="Fornecedor" value={form.fornecedor_id} onChange={e => setForm({ ...form, fornecedor_id: e.target.value })} options={[{ value: '', label: 'Sem fornecedor' }, ...fornecedores.filter(f => f.ativo).map(f => ({ value: f.id, label: f.nome }))]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data Agendada" type="date" value={form.data_agendada} onChange={e => setForm({ ...form, data_agendada: e.target.value })} />
            <Input label="Custo (€)" type="number" step="0.01" value={form.custo} onChange={e => setForm({ ...form, custo: e.target.value })} placeholder="0.00" />
          </div>
          <Textarea label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Fornecedor Modal */}
      <Modal open={openFornModal} onClose={() => setOpenFornModal(false)} title="Novo Fornecedor">
        <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (!fornForm.nome) return
            const novo: Fornecedor = {
              id: `f-${Date.now()}`,
              condominio_id: 'c1',
              nome: fornForm.nome,
              servico: fornForm.servico,
              contacto: fornForm.contacto || undefined,
              email: fornForm.email || undefined,
              nif: fornForm.nif || undefined,
              ativo: true,
              created_at: new Date().toISOString(),
            }
            setFornecedores(prev => [novo, ...prev])
            setOpenFornModal(false)
            setFornForm({ nome: '', servico: '', contacto: '', email: '', nif: '' })
          }}>
          <Input label="Nome" value={fornForm.nome} onChange={e => setFornForm({ ...fornForm, nome: e.target.value })} placeholder="Nome da empresa" required />
          <Input label="Serviço" value={fornForm.servico} onChange={e => setFornForm({ ...fornForm, servico: e.target.value })} placeholder="Ex: Limpeza, Elevadores..." required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contacto" value={fornForm.contacto} onChange={e => setFornForm({ ...fornForm, contacto: e.target.value })} placeholder="21 xxx xxxx" />
            <Input label="NIF" value={fornForm.nif} onChange={e => setFornForm({ ...fornForm, nif: e.target.value })} placeholder="123456789" />
          </div>
          <Input label="Email" type="email" value={fornForm.email} onChange={e => setFornForm({ ...fornForm, email: e.target.value })} placeholder="geral@empresa.pt" />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenFornModal(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

