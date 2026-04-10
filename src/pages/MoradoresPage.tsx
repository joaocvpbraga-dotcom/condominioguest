import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { getInitials, formatDate } from '@/lib/utils'
import { Users, Plus, Search, Phone, Mail, Pencil, Home, Building2, Trash2 } from 'lucide-react'
import type { Profile, Fracao } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const roleLabels: Record<string, string> = { admin: 'Administrador', morador: 'Morador', funcionario: 'Funcionário' }
const roleVariant: Record<string, 'info' | 'success' | 'default'> = { admin: 'info', morador: 'success', funcionario: 'default' }

const EMPTY_MORADOR = { nome: '', email: '', telefone: '', role: 'morador', fracao_id: '' }
const EMPTY_FRACAO = { numero: '', andar: '', tipo: 'apartamento', area: '', permilagem: '', proprietario_id: '' }

export function MoradoresPage() {
  const [tab, setTab] = useState<'moradores' | 'fracoes'>('moradores')

  // Moradores & Frações — persisted in AppDataContext
  const { moradores, setMoradores, fracoes, setFracoes } = useAppData()
  const { profile } = useAuth()

  const [search, setSearch] = useState('')
  const [openMorador, setOpenMorador] = useState(false)
  const [editMorador, setEditMorador] = useState<Profile | null>(null)
  const [formMorador, setFormMorador] = useState(EMPTY_MORADOR)

  // Frações
  const [openFracao, setOpenFracao] = useState(false)
  const [editFracao, setEditFracao] = useState<Fracao | null>(null)
  const [formFracao, setFormFracao] = useState(EMPTY_FRACAO)

  const filteredMoradores = moradores.filter(m =>
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  // ── Moradores ─────────────────────────────────────────────
  function openCreateMorador() {
    setEditMorador(null)
    setFormMorador(EMPTY_MORADOR)
    setOpenMorador(true)
  }

  function openEditMorador(m: Profile) {
    setEditMorador(m)
    const currentFracao = fracoes.find(f => f.proprietario_id === m.id)
    setFormMorador({ nome: m.nome, email: m.email, telefone: m.telefone ?? '', role: m.role, fracao_id: currentFracao?.id ?? '' })
    setOpenMorador(true)
  }

  async function handleMoradorSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formMorador.nome || !formMorador.email) return
    const moradorId = editMorador ? editMorador.id : crypto.randomUUID()
    const moradorData: Profile = editMorador
      ? { ...editMorador, nome: formMorador.nome, email: formMorador.email, telefone: formMorador.telefone || undefined, role: formMorador.role as Profile['role'] }
      : { id: moradorId, nome: formMorador.nome, email: formMorador.email, telefone: formMorador.telefone || undefined, role: formMorador.role as Profile['role'], condominio_id: profile?.condominio_id, created_at: new Date().toISOString() }

    // Persist to Supabase if configured
    if (isSupabaseConfigured && profile?.condominio_id) {
      const { error } = await supabase.from('moradores').upsert({
        id: moradorData.id,
        nome: moradorData.nome,
        email: moradorData.email,
        telefone: moradorData.telefone ?? null,
        role: moradorData.role,
        condominio_id: profile.condominio_id,
        created_at: moradorData.created_at,
      })
      if (error) console.error('Erro ao guardar morador:', error)
    }

    if (editMorador) {
      setMoradores(prev => prev.map(m => m.id === editMorador.id ? moradorData : m))
    } else {
      setMoradores(prev => [moradorData, ...prev])
    }
    // Sync fração assignment
    setFracoes(prev => prev.map(f => {
      if (f.proprietario_id === moradorId && f.id !== formMorador.fracao_id)
        return { ...f, proprietario_id: undefined, proprietario: undefined }
      if (formMorador.fracao_id && f.id === formMorador.fracao_id)
        return { ...f, proprietario_id: moradorId, proprietario: moradorData }
      return f
    }))
    setOpenMorador(false)
    setEditMorador(null)
    setFormMorador(EMPTY_MORADOR)
  }

  async function handleDeleteMorador(m: Profile) {
    if (!window.confirm(`Eliminar "${m.nome}"? Esta ação não pode ser desfeita.`)) return
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('moradores').delete().eq('id', m.id)
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao eliminar morador:', error)
        return
      }
    }
    setMoradores(prev => prev.filter(x => x.id !== m.id))
    // Desassociar frações
    setFracoes(prev => prev.map(f =>
      f.proprietario_id === m.id ? { ...f, proprietario_id: undefined, proprietario: undefined } : f
    ))
  }

  // ── Frações ───────────────────────────────────────────────
  function openCreateFracao() {
    setEditFracao(null)
    setFormFracao(EMPTY_FRACAO)
    setOpenFracao(true)
  }

  function openEditFracao(f: Fracao) {
    setEditFracao(f)
    setFormFracao({
      numero: f.numero,
      andar: f.andar ?? '',
      tipo: f.tipo,
      area: f.area?.toString() ?? '',
      permilagem: f.permilagem.toString(),
      proprietario_id: f.proprietario_id ?? '',
    })
    setOpenFracao(true)
  }

  async function handleFracaoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formFracao.numero) return
    const proprietario = moradores.find(m => m.id === formFracao.proprietario_id)
    const condominioId = profile?.condominio_id ?? 'c1'

    if (editFracao) {
      const updated: Fracao = {
        ...editFracao,
        numero: formFracao.numero,
        andar: formFracao.andar || undefined,
        tipo: formFracao.tipo,
        area: formFracao.area ? parseFloat(formFracao.area) : undefined,
        permilagem: parseFloat(formFracao.permilagem) || 0,
        proprietario_id: formFracao.proprietario_id || undefined,
        proprietario,
      }
      if (isSupabaseConfigured && profile?.condominio_id) {
        const { error } = await supabase.from('fracoes').upsert({
          id: updated.id,
          condominio_id: condominioId,
          numero: updated.numero,
          andar: updated.andar ?? null,
          tipo: updated.tipo,
          area: updated.area ?? null,
          permilagem: updated.permilagem,
          proprietario_id: updated.proprietario_id ?? null,
          created_at: updated.created_at,
        })
        if (error) console.error('Erro ao guardar fração:', error)
      }
      setFracoes(prev => prev.map(f => f.id === editFracao.id ? updated : f))
    } else {
      const newFracao: Fracao = {
        id: crypto.randomUUID(),
        condominio_id: condominioId,
        numero: formFracao.numero,
        andar: formFracao.andar || undefined,
        tipo: formFracao.tipo,
        area: formFracao.area ? parseFloat(formFracao.area) : undefined,
        permilagem: parseFloat(formFracao.permilagem) || 0,
        proprietario_id: formFracao.proprietario_id || undefined,
        proprietario,
        created_at: new Date().toISOString(),
      }
      if (isSupabaseConfigured && profile?.condominio_id) {
        const { error } = await supabase.from('fracoes').upsert({
          id: newFracao.id,
          condominio_id: condominioId,
          numero: newFracao.numero,
          andar: newFracao.andar ?? null,
          tipo: newFracao.tipo,
          area: newFracao.area ?? null,
          permilagem: newFracao.permilagem,
          proprietario_id: newFracao.proprietario_id ?? null,
          created_at: newFracao.created_at,
        })
        if (error) console.error('Erro ao guardar fração:', error)
      }
      setFracoes(prev => [...prev, newFracao])
    }
    setOpenFracao(false)
    setEditFracao(null)
    setFormFracao(EMPTY_FRACAO)
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Moradores & Frações</h1>
          <p className="text-slate-500 mt-1">Gerencie os moradores, proprietários e unidades</p>
        </div>
        <Button onClick={tab === 'moradores' ? openCreateMorador : openCreateFracao}>
          <Plus size={16} /> {tab === 'moradores' ? 'Novo Morador' : 'Nova Fração'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('moradores')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'moradores' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={15} /> Moradores
          <span className="ml-1 text-xs text-slate-400">({moradores.length})</span>
        </button>
        <button
          onClick={() => setTab('fracoes')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'fracoes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Home size={15} /> Frações
          <span className="ml-1 text-xs text-slate-400">({fracoes.length})</span>
        </button>
      </div>

      {/* ── Tab Moradores ── */}
      {tab === 'moradores' && (
        <>
          <div className="relative mb-6 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {filteredMoradores.length === 0 ? (
            <EmptyState icon={<Users size={48} />} title="Nenhum morador encontrado" description="Adicione o primeiro morador ao condomínio." action={<Button onClick={openCreateMorador}><Plus size={16} /> Adicionar</Button>} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMoradores.map(m => (
                <Card key={m.id}>
                  <CardBody className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold text-sm shrink-0">
                      {getInitials(m.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-800 truncate">{m.nome}</p>
                        <Badge variant={roleVariant[m.role]}>{roleLabels[m.role]}</Badge>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail size={12} /> <span className="truncate">{m.email}</span>
                        </div>
                        {m.telefone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone size={12} /> {m.telefone}
                          </div>
                        )}
                        {fracoes.filter(f => f.proprietario_id === m.id).length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600">
                            <Home size={12} />
                            {fracoes.filter(f => f.proprietario_id === m.id).map(f => `Fração ${f.numero}`).join(', ')}
                          </div>
                        )}
                        <p className="text-xs text-slate-400">Desde {formatDate(m.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => openEditMorador(m)} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDeleteMorador(m)} title="Eliminar" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab Frações ── */}
      {tab === 'fracoes' && (
        <>
          {fracoes.length === 0 ? (
            <EmptyState icon={<Building2 size={48} />} title="Nenhuma fração registada" description="Adicione as frações/unidades do condomínio." action={<Button onClick={openCreateFracao}><Plus size={16} /> Adicionar</Button>} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {fracoes.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true })).map(f => (
                <Card key={f.id}>
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                        <Home size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">Fração {f.numero}</p>
                          {f.andar && <span className="text-xs text-slate-400">{f.andar}º andar</span>}
                        </div>
                        <p className="text-xs text-slate-500 capitalize mt-0.5">{f.tipo}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                          {f.area && <span>{f.area} m²</span>}
                          <span>{f.permilagem}‰</span>
                          {f.proprietario
                            ? <span className="flex items-center gap-1 text-blue-600"><Users size={11} />{f.proprietario.nome}</span>
                            : <span className="text-slate-400 italic">Sem proprietário</span>
                          }
                        </div>
                      </div>
                      <button onClick={() => openEditFracao(f)} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
                        <Pencil size={15} />
                      </button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modal Morador ── */}
      <Modal
        open={openMorador}
        onClose={() => { setOpenMorador(false); setEditMorador(null); setFormMorador(EMPTY_MORADOR) }}
        title={editMorador ? 'Editar Morador' : 'Novo Morador'}
      >
        <form className="space-y-4" onSubmit={handleMoradorSubmit}>
          <Input label="Nome completo" value={formMorador.nome} onChange={e => setFormMorador({ ...formMorador, nome: e.target.value })} placeholder="João Silva" required />
          <Input label="Email" type="email" value={formMorador.email} onChange={e => setFormMorador({ ...formMorador, email: e.target.value })} placeholder="joao@email.com" required />
          <Input label="Telefone" value={formMorador.telefone} onChange={e => setFormMorador({ ...formMorador, telefone: e.target.value })} placeholder="9xx xxx xxx" />
          <Select label="Perfil" value={formMorador.role} onChange={e => setFormMorador({ ...formMorador, role: e.target.value })} options={[{ value: 'morador', label: 'Morador' }, { value: 'admin', label: 'Administrador' }, { value: 'funcionario', label: 'Funcionário' }]} />
          <Select
            label="Fração associada"
            value={formMorador.fracao_id}
            onChange={e => setFormMorador({ ...formMorador, fracao_id: e.target.value })}
            options={[
              { value: '', label: 'Sem fração associada' },
              ...fracoes
                .filter(f => !f.proprietario_id || f.proprietario_id === editMorador?.id)
                .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }))
                .map(f => ({ value: f.id, label: `Fração ${f.numero}${f.andar ? ` — ${f.andar}º andar` : ''} (${f.tipo})` })),
            ]}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => { setOpenMorador(false); setEditMorador(null); setFormMorador(EMPTY_MORADOR) }}>Cancelar</Button>
            <Button type="submit">{editMorador ? 'Guardar alterações' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Fração ── */}
      <Modal
        open={openFracao}
        onClose={() => { setOpenFracao(false); setEditFracao(null); setFormFracao(EMPTY_FRACAO) }}
        title={editFracao ? 'Editar Fração' : 'Nova Fração'}
      >
        <form className="space-y-4" onSubmit={handleFracaoSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número / Identificação"
              value={formFracao.numero}
              onChange={e => setFormFracao({ ...formFracao, numero: e.target.value })}
              placeholder="Ex: 1A, 2B, 101..."
              required
            />
            <Input
              label="Andar"
              value={formFracao.andar}
              onChange={e => setFormFracao({ ...formFracao, andar: e.target.value })}
              placeholder="Ex: 1, 2, R/C..."
            />
          </div>
          <Select
            label="Tipo"
            value={formFracao.tipo}
            onChange={e => setFormFracao({ ...formFracao, tipo: e.target.value })}
            options={[
              { value: 'apartamento', label: 'Apartamento' },
              { value: 'loja', label: 'Loja / Comércio' },
              { value: 'garagem', label: 'Garagem / Lugar' },
              { value: 'arrecadacao', label: 'Arrecadação' },
              { value: 'escritorio', label: 'Escritório' },
              { value: 'outro', label: 'Outro' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Área (m²)"
              type="number"
              step="0.01"
              value={formFracao.area}
              onChange={e => setFormFracao({ ...formFracao, area: e.target.value })}
              placeholder="Ex: 85.5"
            />
            <Input
              label="Permilagem (‰)"
              type="number"
              step="0.01"
              value={formFracao.permilagem}
              onChange={e => setFormFracao({ ...formFracao, permilagem: e.target.value })}
              placeholder="Ex: 125.5"
            />
          </div>
          <Select
            label="Proprietário"
            value={formFracao.proprietario_id}
            onChange={e => setFormFracao({ ...formFracao, proprietario_id: e.target.value })}
            options={[
              { value: '', label: 'Sem proprietário' },
              ...moradores.map(m => ({ value: m.id, label: m.nome })),
            ]}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => { setOpenFracao(false); setEditFracao(null); setFormFracao(EMPTY_FRACAO) }}>Cancelar</Button>
            <Button type="submit">{editFracao ? 'Guardar alterações' : 'Criar Fração'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


