import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Wrench, Plus, Building2, Phone, Mail, CheckCircle2, HardHat, Trash2 } from 'lucide-react'
import type { Fornecedor, Manutencao, Obra } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'


const mEstadoVariant: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  concluida: 'success', em_curso: 'info', agendada: 'warning', cancelada: 'default',
}
const mEstadoLabel: Record<string, string> = {
  concluida: 'Concluída', em_curso: 'Em Curso', agendada: 'Agendada', cancelada: 'Cancelada',
}

export function ManutencoesPage() {
  const [tab, setTab] = useState<'manutencoes' | 'fornecedores' | 'obras'>('manutencoes')
  const { fornecedores, setFornecedores, manutencoes, setManutencoes, obras, setObras } = useAppData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  // Manutenção modal
  const [openModal, setOpenModal] = useState(false)
  const [openFornModal, setOpenFornModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', estado: 'agendada', fornecedor_id: '', data_agendada: '', custo: '', descricao: '' })
  const [fornForm, setFornForm] = useState({ nome: '', servico: '', contacto: '', email: '', nif: '' })

  // Obras modal
  const EMPTY_OBRA = { titulo: '', descricao: '', estado: 'necessaria' as Obra['estado'], prioridade: 'media' as Obra['prioridade'], custo_estimado: '', custo_real: '', data_prevista: '', data_conclusao: '' }
  const [openObra, setOpenObra] = useState(false)
  const [editObra, setEditObra] = useState<Obra | null>(null)
  const [obraForm, setObraForm] = useState(EMPTY_OBRA)
  const [obraFilter, setObraFilter] = useState<Obra['estado'] | 'todas'>('todas')

  function handleObraSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!obraForm.titulo) return
    if (editObra) {
      setObras(prev => prev.map(o => o.id === editObra.id ? {
        ...o,
        titulo: obraForm.titulo, descricao: obraForm.descricao || undefined,
        estado: obraForm.estado, prioridade: obraForm.prioridade,
        custo_estimado: obraForm.custo_estimado ? parseFloat(obraForm.custo_estimado) : undefined,
        custo_real: obraForm.custo_real ? parseFloat(obraForm.custo_real) : undefined,
        data_prevista: obraForm.data_prevista || undefined,
        data_conclusao: obraForm.data_conclusao || undefined,
      } : o))
    } else {
      setObras(prev => [{
        id: `obra-${Date.now()}`,
        condominio_id: 'c1',
        titulo: obraForm.titulo, descricao: obraForm.descricao || undefined,
        estado: obraForm.estado, prioridade: obraForm.prioridade,
        custo_estimado: obraForm.custo_estimado ? parseFloat(obraForm.custo_estimado) : undefined,
        custo_real: obraForm.custo_real ? parseFloat(obraForm.custo_real) : undefined,
        data_prevista: obraForm.data_prevista || undefined,
        data_conclusao: obraForm.data_conclusao || undefined,
        created_at: new Date().toISOString(),
      }, ...prev])
    }
    setOpenObra(false)
    setEditObra(null)
    setObraForm(EMPTY_OBRA)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manutenções{isAdmin ? ' & Fornecedores' : ''}</h1>
          <p className="text-slate-500 mt-1">{isAdmin ? 'Gestão de serviços e manutenções' : 'Manutenções realizadas no condomínio'}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => {
            if (tab === 'manutencoes') setOpenModal(true)
            else if (tab === 'fornecedores') setOpenFornModal(true)
            else { setEditObra(null); setObraForm(EMPTY_OBRA); setOpenObra(true) }
          }}>
            <Plus size={16} /> {tab === 'manutencoes' ? 'Nova Manutenção' : tab === 'fornecedores' ? 'Novo Fornecedor' : 'Nova Obra'}
          </Button>
        )}
      </div>

      {/* Tabs — admin only */}
      {isAdmin && (
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {(['manutencoes', 'fornecedores', 'obras'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'manutencoes' ? 'Manutenções' : t === 'fornecedores' ? 'Fornecedores' : 'Obras'}
            </button>
          ))}
        </div>
      )}

      {(tab === 'manutencoes' || !isAdmin) && (
        <div className="space-y-3">
          {(isAdmin ? manutencoes : manutencoes.filter(m => m.estado === 'concluida')).map(m => (
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
                {m.estado === 'em_curso' && isAdmin && <Button size="sm">Concluir</Button>}
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

      {/* Obras Tab */}
      {tab === 'obras' && (() => {
        const obraEstadoLabel: Record<Obra['estado'], string> = {
          necessaria: 'Necessária', aprovada: 'Aprovada', em_curso: 'Em Curso', concluida: 'Concluída', cancelada: 'Cancelada',
        }
        const obraEstadoVariant: Record<Obra['estado'], 'danger' | 'warning' | 'info' | 'success' | 'default'> = {
          necessaria: 'danger', aprovada: 'warning', em_curso: 'info', concluida: 'success', cancelada: 'default',
        }
        const prioridadeColor: Record<Obra['prioridade'], string> = {
          baixa: 'text-green-600 bg-green-50', media: 'text-yellow-600 bg-yellow-50',
          alta: 'text-orange-600 bg-orange-50', urgente: 'text-red-600 bg-red-50',
        }
        const prioridadeLabel: Record<Obra['prioridade'], string> = {
          baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
        }
        const filtered = obras.filter(o => obraFilter === 'todas' || o.estado === obraFilter)
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['todas', 'necessaria', 'aprovada', 'em_curso', 'concluida', 'cancelada'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setObraFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${obraFilter === f ? 'bg-blue-600 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {f === 'todas' ? 'Todas' : obraEstadoLabel[f]}
                  <span className="ml-1 opacity-60">{f === 'todas' ? obras.length : obras.filter(o => o.estado === f).length}</span>
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <HardHat size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma obra registada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(o => (
                  <Card key={o.id}>
                    <div className="px-5 py-4 flex items-start gap-4">
                      <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center shrink-0">
                        <HardHat size={18} className="text-yellow-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-800">{o.titulo}</p>
                          <Badge variant={obraEstadoVariant[o.estado]}>{obraEstadoLabel[o.estado]}</Badge>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${prioridadeColor[o.prioridade]}`}>
                            {prioridadeLabel[o.prioridade]}
                          </span>
                        </div>
                        {o.descricao && <p className="text-sm text-slate-500 mt-1">{o.descricao}</p>}
                        <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-slate-400">
                          {o.custo_estimado !== undefined && <span>Est.: {formatCurrency(o.custo_estimado)}</span>}
                          {o.custo_real !== undefined && <span>Real: {formatCurrency(o.custo_real)}</span>}
                          {o.data_prevista && <span>Prevista: {formatDate(o.data_prevista)}</span>}
                          {o.data_conclusao && <span>Concluída: {formatDate(o.data_conclusao)}</span>}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditObra(o); setObraForm({ titulo: o.titulo, descricao: o.descricao ?? '', estado: o.estado, prioridade: o.prioridade, custo_estimado: o.custo_estimado?.toString() ?? '', custo_real: o.custo_real?.toString() ?? '', data_prevista: o.data_prevista ?? '', data_conclusao: o.data_conclusao ?? '' }); setOpenObra(true) }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => setObras(prev => prev.filter(x => x.id !== o.id))}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Obra Modal */}
      <Modal open={openObra} onClose={() => { setOpenObra(false); setEditObra(null) }} title={editObra ? 'Editar Obra' : 'Nova Obra'}>
        <form className="space-y-4" onSubmit={handleObraSubmit}>
          <Input label="Título" value={obraForm.titulo} onChange={e => setObraForm({ ...obraForm, titulo: e.target.value })} placeholder="Ex: Impermeabilização da cobertura" required />
          <Textarea label="Descrição" value={obraForm.descricao} onChange={e => setObraForm({ ...obraForm, descricao: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Estado" value={obraForm.estado} onChange={e => setObraForm({ ...obraForm, estado: e.target.value as Obra['estado'] })} options={[
              { value: 'necessaria', label: 'Necessária' }, { value: 'aprovada', label: 'Aprovada' },
              { value: 'em_curso', label: 'Em Curso' }, { value: 'concluida', label: 'Concluída' }, { value: 'cancelada', label: 'Cancelada' },
            ]} />
            <Select label="Prioridade" value={obraForm.prioridade} onChange={e => setObraForm({ ...obraForm, prioridade: e.target.value as Obra['prioridade'] })} options={[
              { value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' },
              { value: 'alta', label: 'Alta' }, { value: 'urgente', label: 'Urgente' },
            ]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Custo Estimado (€)" type="number" step="0.01" value={obraForm.custo_estimado} onChange={e => setObraForm({ ...obraForm, custo_estimado: e.target.value })} placeholder="0.00" />
            <Input label="Custo Real (€)" type="number" step="0.01" value={obraForm.custo_real} onChange={e => setObraForm({ ...obraForm, custo_real: e.target.value })} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data Prevista" type="date" value={obraForm.data_prevista} onChange={e => setObraForm({ ...obraForm, data_prevista: e.target.value })} />
            <Input label="Data Conclusão" type="date" value={obraForm.data_conclusao} onChange={e => setObraForm({ ...obraForm, data_conclusao: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => { setOpenObra(false); setEditObra(null) }}>Cancelar</Button>
            <Button type="submit">{editObra ? 'Guardar Alterações' : 'Criar Obra'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

