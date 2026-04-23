import { useState, useEffect } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { getInitials, formatDate } from '@/lib/utils'
import { Users, Plus, Search, Phone, Mail, Pencil, Home, Building2, Trash2, UserCheck, RefreshCw, ShieldCheck, Save } from 'lucide-react'
import type { Profile, Fracao, PermissoesMorador } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { criarUtilizador, eliminarUtilizador, atualizarRole } from '@/lib/adminFunctions'
import {
  EMPTY_FRACAO,
  EMPTY_MORADOR,
  PERM_KEYS,
  PERM_LABELS,
  ROLE_LABELS,
  ROLE_VARIANT,
  type FracaoFormState,
  type MoradorFormState,
} from '@/pages/moradores/constants'
import { buildPermissoesDefault, getNovoUtilizadorErrorMessage } from '@/pages/moradores/helpers'

export function MoradoresPage() {
  const [tab, setTab] = useState<'moradores' | 'fracoes' | 'utilizadores' | 'permissoes'>('moradores')

  function getPermissoes(moradorId: string): PermissoesMorador {
    return permissoes.find(p => p.morador_id === moradorId) ?? buildPermissoesDefault(moradorId)
  }

  function togglePermissao(moradorId: string, key: keyof Omit<PermissoesMorador, 'morador_id'>) {
    setPermissoes(prev => {
      const existing = prev.find(p => p.morador_id === moradorId)
      if (existing) {
        return prev.map(p => p.morador_id === moradorId ? { ...p, [key]: !p[key] } : p)
      }
      const newPerm: PermissoesMorador = { ...buildPermissoesDefault(moradorId), [key]: true }
      return [...prev, newPerm]
    })
  }

  // Moradores & Frações — persisted in AppDataContext
  const { moradores, setMoradores, fracoes, setFracoes, permissoes, setPermissoes } = useAppData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  // Utilizadores registados no Supabase
  const [utilizadores, setUtilizadores] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  async function fetchUtilizadores() {
    if (!isSupabaseConfigured) { setUtilizadores(moradores); return }
    setLoadingUsers(true)
    const query = profile?.condominio_id
      ? supabase.from('profiles').select('*').eq('condominio_id', profile.condominio_id)
      : supabase.from('profiles').select('*')

    const { data, error } = await query.order('created_at', { ascending: false })
    if (!error && data) {
      const profiles = data as Profile[]
      setUtilizadores(profiles)
      setMoradores(profiles)
    }
    setLoadingUsers(false)
  }

  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [pendingRoles, setPendingRoles] = useState<Record<string, Profile['role']>>({})
  const [openNovoUser, setOpenNovoUser] = useState(false)
  const [novoUserForm, setNovoUserForm] = useState({ nome: '', email: '', senha: '', role: 'morador' as Profile['role'] })
  const [savingNovoUser, setSavingNovoUser] = useState(false)

  async function handleNovoUtilizador(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) {
      alert('Apenas administradores podem criar utilizadores.')
      return
    }
    const nome = novoUserForm.nome.trim()
    const email = novoUserForm.email.trim().toLowerCase()
    const senha = novoUserForm.senha
    if (!nome || !email || !senha) return

    const emailJaExiste = [...utilizadores, ...moradores].some(u => u.email?.trim().toLowerCase() === email)
    if (emailJaExiste) {
      alert('Este email ja esta registado. Escolha outro email ou recupere a palavra-passe.')
      return
    }

    if (novoUserForm.role === 'inquilino' && !isAdmin) {
      alert('Apenas administradores podem criar login de inquilino.')
      return
    }
    setSavingNovoUser(true)

    if (isSupabaseConfigured) {
      try {
        const data = await criarUtilizador({ email, password: senha, nome, role: novoUserForm.role })
        const newProfile: Profile = {
          id: data.id ?? crypto.randomUUID(),
          nome: data.nome ?? nome,
          email: data.email ?? email,
          role: data.role ?? novoUserForm.role,
          condominio_id: data.condominio_id ?? profile?.condominio_id,
          created_at: new Date().toISOString(),
        }
        setUtilizadores(prev => [newProfile, ...prev])
        setMoradores(prev => [newProfile, ...prev])
      } catch (e: unknown) {
        alert(`Erro ao criar utilizador: ${getNovoUtilizadorErrorMessage(e)}`)
        setSavingNovoUser(false)
        return
      }
    } else {
      const newProfile: Profile = { id: crypto.randomUUID(), nome, email, role: novoUserForm.role, condominio_id: profile?.condominio_id, created_at: new Date().toISOString() }
      setUtilizadores(prev => [newProfile, ...prev])
      setMoradores(prev => [newProfile, ...prev])
    }

    setNovoUserForm({ nome: '', email: '', senha: '', role: 'morador' })
    setOpenNovoUser(false)
    setSavingNovoUser(false)
    await fetchUtilizadores()
  }

  async function handleDeleteUtilizador(u: Profile) {
    if (!window.confirm(`Eliminar "${u.nome}" (${u.email})? Esta ação não pode ser desfeita.`)) return
    setDeletingUser(u.id)
    if (isSupabaseConfigured) {
      try {
        const result = await eliminarUtilizador(u.id)
        if (result.warning) alert(result.warning)
      } catch (e: unknown) {
        alert(`Erro ao eliminar: ${e instanceof Error ? e.message : e}`)
        setDeletingUser(null)
        return
      }
    }
    setUtilizadores(prev => prev.filter(x => x.id !== u.id))
    setMoradores(prev => prev.filter(x => x.id !== u.id))
    setFracoes(prev => prev.map(f => f.proprietario_id === u.id ? { ...f, proprietario_id: undefined, proprietario: undefined } : f))
    setDeletingUser(null)
  }

  async function handleRoleChange(u: Profile, newRole: Profile['role']) {
    setChangingRole(u.id)
    if (isSupabaseConfigured) {
      try {
        await atualizarRole(u.id, newRole)
      } catch (e: unknown) {
        alert(`Erro ao alterar perfil: ${e instanceof Error ? e.message : e}`)
        setChangingRole(null)
        return
      }
    }
    setUtilizadores(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    setMoradores(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    setPendingRoles(prev => { const next = { ...prev }; delete next[u.id]; return next })
    setChangingRole(null)
  }

  useEffect(() => {
    if (tab === 'utilizadores' || tab === 'moradores') {
      fetchUtilizadores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const [search, setSearch] = useState('')
  const [openMorador, setOpenMorador] = useState(false)
  const [editMorador, setEditMorador] = useState<Profile | null>(null)
  const [formMorador, setFormMorador] = useState<MoradorFormState>(EMPTY_MORADOR)

  // Frações
  const [openFracao, setOpenFracao] = useState(false)
  const [editFracao, setEditFracao] = useState<Fracao | null>(null)
  const [formFracao, setFormFracao] = useState<FracaoFormState>(EMPTY_FRACAO)

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
    setFormMorador({ nome: m.nome, email: m.email, telefone: m.telefone ?? '', role: m.role, fracao_id: currentFracao?.id ?? '', senha: '' })
    setOpenMorador(true)
  }

  async function handleMoradorSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formMorador.nome || !formMorador.email) return
    if (formMorador.role === 'inquilino' && !isAdmin) {
      alert('Apenas administradores podem criar login de inquilino.')
      return
    }
    const moradorId = editMorador ? editMorador.id : crypto.randomUUID()
    const moradorData: Profile = editMorador
      ? { ...editMorador, nome: formMorador.nome, email: formMorador.email, telefone: formMorador.telefone || undefined, role: formMorador.role as Profile['role'] }
      : { id: moradorId, nome: formMorador.nome, email: formMorador.email, telefone: formMorador.telefone || undefined, role: formMorador.role as Profile['role'], condominio_id: profile?.condominio_id, created_at: new Date().toISOString() }

    // Persist to Supabase if configured
    if (isSupabaseConfigured && profile?.condominio_id) {
      // Create Supabase Auth user when creating new morador with password
      let authUserId = moradorData.id
      if (!editMorador && formMorador.senha) {
        try {
          const created = await criarUtilizador({ email: formMorador.email, password: formMorador.senha, nome: formMorador.nome })
          if (created?.id) authUserId = created.id
        } catch (e: unknown) {
          alert(`Erro ao criar login: ${e instanceof Error ? e.message : e}`)
          return
        }
      }
      const { error } = await supabase.from('profiles').upsert({
        id: authUserId,
        nome: moradorData.nome,
        email: moradorData.email,
        telefone: moradorData.telefone ?? null,
        role: moradorData.role,
        condominio_id: profile.condominio_id,
        created_at: moradorData.created_at,
      })
      if (error) console.error('Erro ao guardar morador:', error)
      moradorData.id = authUserId
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
      try {
        const result = await eliminarUtilizador(m.id)
        if (result.warning) alert(result.warning)
      } catch (e: unknown) {
        alert(`Erro ao eliminar: ${e instanceof Error ? e.message : e}`)
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

    // Validação: impedir mais do que um proprietário por fração
    if (formFracao.proprietario_id) {
      const fracaoComMesmoProprietario = fracoes.find(f =>
        f.numero === formFracao.numero &&
        f.proprietario_id &&
        (!editFracao || f.id !== editFracao.id)
      )
      if (fracaoComMesmoProprietario) {
        alert('Já existe um proprietário atribuído a esta fração. Remova primeiro o proprietário atual para poder atribuir outro.')
        return
      }
    }

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
        if (error) {
          alert('Erro ao guardar fração: ' + error.message)
          return
        }
        // Refetch após gravar
        const { data, error: fetchError } = await supabase
          .from('fracoes')
          .select('*, proprietario:proprietario_id(*)')
          .eq('condominio_id', condominioId)
        if (!fetchError && data) setFracoes(data as Fracao[])
      } else {
        setFracoes(prev => prev.map(f => f.id === editFracao.id ? updated : f))
      }
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
        if (error) {
          alert('Erro ao guardar fração: ' + error.message)
          return
        }
        // Refetch após gravar
        const { data, error: fetchError } = await supabase
          .from('fracoes')
          .select('*, proprietario:proprietario_id(*)')
          .eq('condominio_id', condominioId)
        if (!fetchError && data) setFracoes(data as Fracao[])
      } else {
        setFracoes(prev => [...prev, newFracao])
      }
    }
    setOpenFracao(false)
    setEditFracao(null)
    setFormFracao(EMPTY_FRACAO)
  }

  return (
    <div className="p-2 sm:p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Moradores & Frações</h1>
          <p className="text-slate-500 mt-1">Gerencie os moradores, proprietários e unidades</p>
        </div>
        <Button onClick={tab === 'moradores' ? openCreateMorador : tab === 'fracoes' ? openCreateFracao : undefined}
          className={tab === 'utilizadores' || tab === 'permissoes' ? 'invisible' : ''}>
          <Plus size={16} /> {tab === 'moradores' ? 'Novo Morador' : 'Nova Fração'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
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
        <button
          onClick={() => setTab('utilizadores')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'utilizadores' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UserCheck size={15} /> Utilizadores
        </button>
        <button
          onClick={() => setTab('permissoes')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'permissoes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ShieldCheck size={15} /> Permissões
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMoradores.map(m => (
                <Card key={m.id}>
                  <CardBody className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold text-sm shrink-0">
                      {getInitials(m.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-800 truncate">{m.nome}</p>
                        <Badge variant={ROLE_VARIANT[m.role]}>{ROLE_LABELS[m.role]}</Badge>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

      {/* ── Tab Utilizadores ── */}
      {tab === 'utilizadores' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <p className="text-sm text-slate-500">{utilizadores.length} utilizador(es) registado(s)</p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={fetchUtilizadores} disabled={loadingUsers}>
                <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} /> Atualizar
              </Button>
              {isAdmin && (
                <Button size="sm" onClick={() => setOpenNovoUser(true)}>
                  <Plus size={14} /> Novo Utilizador
                </Button>
              )}
            </div>
          </div>
          {utilizadores.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {loadingUsers ? 'A carregar...' : 'Nenhum utilizador encontrado.'}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Utilizador</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Perfil</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Registado em</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {utilizadores.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                              {getInitials(u.nome)}
                            </div>
                            <span className="font-medium text-slate-800">{u.nome}</span>
                            {u.id === profile?.id && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Eu</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-600">{u.email}</td>
                        <td className="px-6 py-3">
                          <Badge variant={ROLE_VARIANT[u.role] ?? 'default'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-400">{formatDate(u.created_at)}</td>
                        <td className="px-6 py-3 text-right">
                          {u.id !== profile?.id && (
                            <div className="flex items-center gap-2 justify-end">
                              <select
                                title="Alterar perfil do utilizador"
                                aria-label="Alterar perfil do utilizador"
                                value={pendingRoles[u.id] ?? u.role}
                                disabled={changingRole === u.id}
                                onChange={e => {
                                  const newRole = e.target.value as Profile['role']
                                  if (newRole === u.role) {
                                    setPendingRoles(prev => { const next = { ...prev }; delete next[u.id]; return next })
                                  } else {
                                    setPendingRoles(prev => ({ ...prev, [u.id]: newRole }))
                                  }
                                }}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:opacity-50 cursor-pointer"
                              >
                                <option value="morador">Proprietário</option>
                                <option value="admin">Administrador</option>
                                <option value="inquilino">Inquilino</option>
                              </select>
                              {pendingRoles[u.id] && (
                                <button
                                  onClick={() => handleRoleChange(u, pendingRoles[u.id])}
                                  disabled={changingRole === u.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  {changingRole === u.id
                                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <Save size={12} />}
                                  Guardar
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUtilizador(u)}
                                disabled={deletingUser === u.id}
                                title="Eliminar utilizador"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                {deletingUser === u.id
                                  ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                                  : <Trash2 size={14} />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab Permissões ── */}
      {tab === 'permissoes' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-4">Gerencie o acesso de cada morador/inquilino aos espaços comuns.</p>
          {moradores.filter(m => m.role !== 'admin').length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Nenhum morador registado.</div>
          ) : (
            moradores.filter(m => m.role !== 'admin').map(m => {
              const perm = getPermissoes(m.id)
              const fracao = fracoes.find(f => f.proprietario_id === m.id)
              return (
                <Card key={m.id}>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                        {m.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{m.nome}</p>
                        <p className="text-xs text-slate-400">{fracao ? `Fração ${fracao.numero}` : 'Sem fração'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PERM_KEYS.map(key => {
                        const allowed = perm[key]
                        return (
                          <button
                            key={key}
                            onClick={() => togglePermissao(m.id, key)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${allowed ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                          >
                            <span>{PERM_LABELS[key]}</span>
                            <span className="text-base">{allowed ? '✓' : '✗'}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ── Modal Novo Utilizador ── */}
      <Modal open={openNovoUser} onClose={() => setOpenNovoUser(false)} title="Novo Utilizador" size="sm">
        <form className="space-y-4" onSubmit={handleNovoUtilizador}>
          <Input
            label="Nome completo"
            value={novoUserForm.nome}
            onChange={e => setNovoUserForm({ ...novoUserForm, nome: e.target.value })}
            placeholder="Ex: Ana Silva"
            required
          />
          <Input
            label="Email"
            type="email"
            value={novoUserForm.email}
            onChange={e => setNovoUserForm({ ...novoUserForm, email: e.target.value })}
            placeholder="ana@email.com"
            required
          />
          <Input
            label="Senha de acesso"
            type="password"
            value={novoUserForm.senha}
            onChange={e => setNovoUserForm({ ...novoUserForm, senha: e.target.value })}
            placeholder="Mínimo 6 caracteres"
            required
          />
          <Select
            label="Perfil"
            value={novoUserForm.role}
            onChange={e => setNovoUserForm({ ...novoUserForm, role: e.target.value as Profile['role'] })}
            options={[
              { value: 'morador', label: 'Proprietário' },
              { value: 'admin', label: 'Administrador' },
              ...(isAdmin ? [{ value: 'inquilino', label: 'Inquilino' }] : []),
            ]}
          />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpenNovoUser(false)}>Cancelar</Button>
            <Button type="submit" loading={savingNovoUser}>
              <Plus size={15} /> Criar Utilizador
            </Button>
          </div>
        </form>
      </Modal>

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
          {!editMorador && (
            <Input
              label="Senha de acesso"
              type="password"
              value={formMorador.senha}
              onChange={e => setFormMorador({ ...formMorador, senha: e.target.value })}
              placeholder="Mínimo 6 caracteres"
            />
          )}
          <Select
            label="Perfil"
            value={formMorador.role}
            onChange={e => setFormMorador({ ...formMorador, role: e.target.value as Profile['role'] })}
            options={[
              { value: 'morador', label: 'Proprietário' },
              { value: 'admin', label: 'Administrador' },
              ...(isAdmin ? [{ value: 'inquilino', label: 'Inquilino' }] : []),
            ]}
          />
          {editMorador && (
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
          )}
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
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Identificação rápida</p>
            <div className="flex gap-2 flex-wrap">
              {['A', 'B', 'C', 'D'].map(letra => (
                <button
                  key={letra}
                  type="button"
                  onClick={() => setFormFracao({ ...formFracao, numero: letra })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${formFracao.numero.toUpperCase() === letra ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  Fração {letra}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número / Identificação"
              value={formFracao.numero}
              onChange={e => setFormFracao({ ...formFracao, numero: e.target.value })}
              placeholder="Ex: A, B, C, D, 1A..."
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


