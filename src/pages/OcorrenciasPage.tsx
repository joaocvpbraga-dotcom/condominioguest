import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatDateTime } from '@/lib/utils'
import { AlertTriangle, Plus, ChevronRight, MessageSquare, Clock, CheckCircle2, XCircle, Send, Pencil, Trash2 } from 'lucide-react'
import type { Ocorrencia, Nota, OcorrenciaComNotas, Comunicado } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured, callAdminFunction } from '@/lib/supabase'

// ── Configs ───────────────────────────────────────────────────
const PIPELINE: Array<{ estado: string; label: string; color: string; icon: React.ReactNode }> = [
  { estado: 'aberta', label: 'Aberta', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <AlertTriangle size={14} /> },
  { estado: 'aceite', label: 'Aceite', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: <ChevronRight size={14} /> },
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
  aberta: 'warning', aceite: 'default', em_analise: 'info', resolvida: 'success', fechada: 'default',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type UrgentEmailResponse = {
  success: boolean
  sent: boolean
  recipients?: number
}

export function OcorrenciasPage() {
  const { ocorrencias, setOcorrencias, setComunicados, moradores } = useAppData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [filter, setFilter] = useState('todas')
  const [adminTab, setAdminTab] = useState<'ativas' | 'fechadas'>('ativas')
  const [selected, setSelected] = useState<OcorrenciaComNotas | null>(null)
  const [novaNota, setNovaNota] = useState('')
  const [notaInterna, setNotaInterna] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  // Modal de detalhe para moradores
  const [openDetail, setOpenDetail] = useState(false)
  const [detailOcorrencia, setDetailOcorrencia] = useState<OcorrenciaComNotas | null>(null)
  const [moradorResposta, setMoradorResposta] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' })
  const [editingOcorrencia, setEditingOcorrencia] = useState<OcorrenciaComNotas | null>(null)

  // Moradores só veem as suas; admin vê todas
  const visibleOcorrencias = isAdmin
    ? ocorrencias
    : ocorrencias.filter(o => o.autor_id === profile?.id)

  const tabOcorrencias = isAdmin
    ? adminTab === 'fechadas'
      ? visibleOcorrencias.filter(o => o.estado === 'fechada')
      : visibleOcorrencias.filter(o => o.estado !== 'fechada')
    : visibleOcorrencias

  const pipelineVisivel = isAdmin
    ? adminTab === 'fechadas'
      ? PIPELINE.filter(p => p.estado === 'fechada')
      : PIPELINE.filter(p => p.estado !== 'fechada')
    : PIPELINE

  const filtered = filter === 'todas'
    ? tabOcorrencias
    : tabOcorrencias.filter(o => o.estado === filter)

  const canEditOcorrencia = (o: OcorrenciaComNotas) => isAdmin || o.autor_id === profile?.id
  const canDeleteOcorrencia = (o: OcorrenciaComNotas) => isAdmin || o.autor_id === profile?.id

  async function handleDeleteOcorrencia(o: OcorrenciaComNotas) {
    if (!canDeleteOcorrencia(o)) return
    if (!window.confirm(`Eliminar ocorrência "${o.titulo}"?`)) return

    const hasUuidId = UUID_RE.test(o.id)
    if (isSupabaseConfigured && hasUuidId) {
      const { error } = await supabase.from('ocorrencias').delete().eq('id', o.id)
      if (error) {
        console.error('Erro ao eliminar ocorrência:', error)
        return
      }
    }

    setOcorrencias(prev => prev.filter(x => x.id !== o.id))
    if (selected?.id === o.id) setSelected(null)
    if (detailOcorrencia?.id === o.id) {
      setDetailOcorrencia(null)
      setOpenDetail(false)
    }
  }

  function openNovaOcorrencia() {
    setEditingOcorrencia(null)
    setForm({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' })
    setOpenModal(true)
  }

  function openEditarOcorrencia(o: OcorrenciaComNotas) {
    if (!canEditOcorrencia(o)) return
    setEditingOcorrencia(o)
    setForm({
      titulo: o.titulo,
      descricao: o.descricao,
      tipo: o.tipo,
      prioridade: o.prioridade,
    })
    setOpenModal(true)
  }

  function openMoradorDetail(o: OcorrenciaComNotas) {
    setDetailOcorrencia(o)
    setMoradorResposta('')
    setOpenDetail(true)
  }

  async function enviarRespostaMorador() {
    if (!moradorResposta.trim() || !detailOcorrencia) return
    const nota: Nota = {
      id: `n-${Date.now()}`,
      texto: moradorResposta.trim(),
      autor: profile?.nome ?? 'Morador',
      created_at: new Date().toISOString(),
      interna: false,
    }
    const updated = { ...detailOcorrencia, notas: [...detailOcorrencia.notas, nota] }
    setOcorrencias(prev => prev.map(o => o.id === updated.id ? updated : o))
    setDetailOcorrencia(updated)

    const admins = moradores.filter(m => m.role === 'admin')
    const comunicadosAdmin: Comunicado[] = admins.map(a => ({
      id: `fb-admin-ocorrencia-${Date.now()}-${a.id.slice(0, 8)}`,
      condominio_id: detailOcorrencia.condominio_id,
      titulo: `Novo comentário na ocorrência: ${detailOcorrencia.titulo}`,
      conteudo: `${profile?.nome ?? 'Morador'} comentou: "${nota.texto}"`,
      autor_id: profile?.id ?? 'demo',
      importante: false,
      destinatario_id: a.id,
      created_at: new Date().toISOString(),
    }))

    if (isSupabaseConfigured && comunicadosAdmin.length > 0) {
      const { error } = await supabase.from('comunicados').insert(
        comunicadosAdmin.map(c => ({
          id: c.id,
          condominio_id: c.condominio_id,
          titulo: c.titulo,
          conteudo: c.conteudo,
          autor_id: c.autor_id,
          importante: c.importante,
          destinatario_id: c.destinatario_id,
          created_at: c.created_at,
        }))
      )
      if (error) console.error('Erro ao notificar administrador sobre comentário:', error)
    }

    setComunicados(prev => [...comunicadosAdmin, ...prev])
    setMoradorResposta('')
  }

  // Sync selected when state changes
  function updateOcorrencia(updated: OcorrenciaComNotas) {
    setOcorrencias(prev => prev.map(o => o.id === updated.id ? updated : o))
    setSelected(updated)
  }

  async function avancarEstado(o: OcorrenciaComNotas) {
    const idx = PIPELINE.findIndex(p => p.estado === o.estado)
    if (idx >= PIPELINE.length - 1) return
    const novoEstado = PIPELINE[idx + 1].estado as Ocorrencia['estado']
    const novoEstadoLabel = PIPELINE[idx + 1].label
    const nota: Nota = {
      id: `n-${Date.now()}`,
      texto: `Estado alterado para "${novoEstadoLabel}".`,
      autor: 'Admin',
      created_at: new Date().toISOString(),
      interna: true,
    }
    let updated = { ...o, estado: novoEstado, notas: [...o.notas, nota] }

    if (isSupabaseConfigured) {
      const hasUuidId = UUID_RE.test(o.id)

      if (hasUuidId) {
        const { data, error } = await supabase
          .from('ocorrencias')
          .update({ estado: novoEstado })
          .eq('id', o.id)
          .select('id')
          .maybeSingle()

        if (error) {
          console.error('Erro ao atualizar estado da ocorrência:', error)
          return
        }

        // Se não encontrou a ocorrência por id, cria no Supabase para sincronizar.
        if (!data) {
          const { error: insertError } = await supabase.from('ocorrencias').insert({
            id: o.id,
            condominio_id: o.condominio_id,
            titulo: o.titulo,
            descricao: o.descricao,
            tipo: o.tipo,
            estado: novoEstado,
            prioridade: o.prioridade,
            autor_id: o.autor_id,
            created_at: o.created_at,
          })
          if (insertError) {
            console.error('Erro ao sincronizar ocorrência no Supabase:', insertError)
            return
          }
        }
      } else {
        // Migração automática de ocorrência local antiga para o Supabase.
        const migratedId = crypto.randomUUID()
        const { error: insertError } = await supabase.from('ocorrencias').insert({
          id: migratedId,
          condominio_id: o.condominio_id,
          titulo: o.titulo,
          descricao: o.descricao,
          tipo: o.tipo,
          estado: novoEstado,
          prioridade: o.prioridade,
          autor_id: o.autor_id,
          created_at: o.created_at,
        })
        if (insertError) {
          console.error('Erro ao migrar ocorrência local para Supabase:', insertError)
          return
        }
        updated = { ...updated, id: migratedId }
      }
    }

    if (updated.id === o.id) {
      updateOcorrencia(updated)
    } else {
      setOcorrencias(prev => prev.map(x => x.id === o.id ? updated : x))
      setSelected(updated)
      if (detailOcorrencia?.id === o.id) setDetailOcorrencia(updated)
    }

    // Feedback direto ao autor quando o estado muda (visível em Comunicados)
    const feedback: Comunicado = {
      id: `fb-ocorrencia-${Date.now()}`,
      condominio_id: o.condominio_id,
      titulo: `Atualização da ocorrência: ${o.titulo}`,
      conteudo: `A sua ocorrência foi atualizada para o estado "${novoEstadoLabel}".`,
      autor_id: profile?.id ?? 'admin',
      importante: false,
      destinatario_id: o.autor_id,
      created_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('comunicados').insert({
        id: feedback.id,
        condominio_id: feedback.condominio_id,
        titulo: feedback.titulo,
        conteudo: feedback.conteudo,
        autor_id: feedback.autor_id,
        importante: feedback.importante,
        destinatario_id: feedback.destinatario_id,
        created_at: feedback.created_at,
      })
      if (error) {
        console.error('Erro ao enviar feedback de estado ao utilizador:', error)
        return
      }
    }

    setComunicados(prev => [feedback, ...prev])
  }

  function adicionarNota(o: OcorrenciaComNotas) {
    if (!novaNota.trim()) return
    const nota: Nota = {
      id: `n-${Date.now()}`,
      texto: novaNota.trim(),
      autor: profile?.nome ?? 'Admin',
      created_at: new Date().toISOString(),
      interna: notaInterna,
    }
    updateOcorrencia({ ...o, notas: [...o.notas, nota] })
    setNovaNota('')
  }

  async function criarOcorrencia() {
    if (editingOcorrencia) {
      const atualizada: OcorrenciaComNotas = {
        ...editingOcorrencia,
        titulo: form.titulo,
        descricao: form.descricao,
        tipo: form.tipo as Ocorrencia['tipo'],
        prioridade: form.prioridade as Ocorrencia['prioridade'],
      }

      const hasUuidId = UUID_RE.test(atualizada.id)
      if (isSupabaseConfigured && hasUuidId) {
        const { error } = await supabase.from('ocorrencias').update({
          titulo: atualizada.titulo,
          descricao: atualizada.descricao,
          tipo: atualizada.tipo,
          prioridade: atualizada.prioridade,
        }).eq('id', atualizada.id)
        if (error) { console.error('Erro ao atualizar ocorrência:', error); return }
      }

      setOcorrencias(prev => prev.map(o => o.id === atualizada.id ? atualizada : o))
      if (selected?.id === atualizada.id) setSelected(atualizada)
      if (detailOcorrencia?.id === atualizada.id) setDetailOcorrencia(atualizada)

      setOpenModal(false)
      setEditingOcorrencia(null)
      setForm({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' })
      return
    }

    const nova: OcorrenciaComNotas = {
      id: crypto.randomUUID(),
      condominio_id: profile?.condominio_id ?? 'c1',
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

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('ocorrencias').insert({
        id: nova.id,
        condominio_id: nova.condominio_id,
        titulo: nova.titulo,
        descricao: nova.descricao,
        tipo: nova.tipo,
        estado: nova.estado,
        prioridade: nova.prioridade,
        autor_id: nova.autor_id,
        created_at: nova.created_at,
      })
      if (error) {
        console.error('Erro ao guardar ocorrência:', error)
      }
    }

    setOcorrencias(prev => [nova, ...prev])

    if (nova.prioridade === 'urgente' && isSupabaseConfigured) {
      const { data, error } = await callAdminFunction<UrgentEmailResponse>('send-urgent-occurrence-email', {
        ocorrenciaId: nova.id,
        titulo: nova.titulo,
        tipo: nova.tipo,
        prioridade: nova.prioridade,
        autorNome: nova.autor_nome ?? 'Morador',
        condominioId: nova.condominio_id,
      })
      if (error) {
        console.error('Erro ao enviar email de ocorrência urgente:', error)
        alert(`Ocorrência urgente criada, mas o email não foi enviado: ${error}`)
      } else if (data?.sent) {
        alert(`Email urgente enviado para ${data.recipients ?? 0} administrador(es).`)
      }
    }

    // Notify all condominium admins immediately about new occurrences.
    const adminsToNotify = moradores.filter(m => m.role === 'admin' && m.id !== (profile?.id ?? ''))
    if (adminsToNotify.length > 0) {
      const adminAlerts: Comunicado[] = adminsToNotify.map(admin => ({
        id: `oc-admin-${nova.id}-${admin.id.slice(0, 8)}`,
        condominio_id: nova.condominio_id,
        titulo: `Nova ocorrência: ${nova.titulo}`,
        conteudo: `${nova.autor_nome} registou uma ocorrência (${tipoLabel[nova.tipo]}, prioridade ${nova.prioridade}).`,
        autor_id: profile?.id ?? 'demo',
        importante: true,
        destinatario_id: admin.id,
        created_at: new Date().toISOString(),
      }))

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('comunicados').insert(
          adminAlerts.map(c => ({
            id: c.id,
            condominio_id: c.condominio_id,
            titulo: c.titulo,
            conteudo: c.conteudo,
            autor_id: c.autor_id,
            importante: c.importante,
            destinatario_id: c.destinatario_id,
            created_at: c.created_at,
          }))
        )
        if (error) {
          console.error('Erro ao notificar administradores sobre nova ocorrência:', error)
        }
      }

      // Immediate local feedback in current session; realtime keeps other sessions in sync.
      setComunicados(prev => {
        const existing = new Set(prev.map(c => c.id))
        const toAdd = adminAlerts.filter(c => !existing.has(c.id))
        return toAdd.length > 0 ? [...toAdd, ...prev] : prev
      })
    }

    const isGrave = nova.tipo === 'risco' || nova.prioridade === 'alta' || nova.prioridade === 'urgente'
    if (isGrave) {
      const alerta: Comunicado = {
        id: `alerta-ocorrencia-${Date.now()}`,
        condominio_id: nova.condominio_id,
        titulo: `Alerta: ocorrência grave - ${nova.titulo}`,
        conteudo: `Foi registada uma ocorrência grave (${tipoLabel[nova.tipo]}, prioridade ${nova.prioridade}) por ${nova.autor_nome}.`,
        autor_id: profile?.id ?? 'demo',
        importante: true,
        destinatario_id: undefined,
        created_at: new Date().toISOString(),
      }

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('comunicados').insert({
          id: alerta.id,
          condominio_id: alerta.condominio_id,
          titulo: alerta.titulo,
          conteudo: alerta.conteudo,
          autor_id: alerta.autor_id,
          importante: alerta.importante,
          destinatario_id: null,
          created_at: alerta.created_at,
        })
        if (!error) setComunicados(prev => [alerta, ...prev])
      } else {
        setComunicados(prev => [alerta, ...prev])
      }
    }

    setOpenModal(false)
    setEditingOcorrencia(null)
    setForm({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' })
  }

  const pipelineIdx = selected ? PIPELINE.findIndex(p => p.estado === selected.estado) : -1

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Lista ── */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${selected ? 'xl:max-w-[55%]' : ''}`}>
        <div className="p-4 pb-4 md:p-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ocorrências</h1>
            <p className="text-slate-500 mt-1 text-sm">Reclamações, avarias e sugestões</p>
          </div>
          <Button onClick={openNovaOcorrencia}>
            <Plus size={16} /> Nova Ocorrência
          </Button>
        </div>

        {isAdmin && (
          <div className="px-4 md:px-8 mb-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => { setAdminTab('ativas'); setFilter('todas') }}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${adminTab === 'ativas' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Ativas {visibleOcorrencias.filter(o => o.estado !== 'fechada').length}
              </button>
              <button
                type="button"
                onClick={() => { setAdminTab('fechadas'); setFilter('todas') }}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${adminTab === 'fechadas' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Fechadas {visibleOcorrencias.filter(o => o.estado === 'fechada').length}
              </button>
            </div>
          </div>
        )}

        {/* Contadores pipeline */}
        <div className="px-4 md:px-8 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {pipelineVisivel.map(p => {
            const count = tabOcorrencias.filter(o => o.estado === p.estado).length
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
          <div className="px-4 md:px-8 mb-2">
            <button onClick={() => setFilter('todas')} className="text-xs text-blue-600 hover:underline">← Ver todas</button>
          </div>
        )}

        {/* Cards */}
        <div className="px-4 md:px-8 pb-8 space-y-2 overflow-y-auto flex-1">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma ocorrência neste estado</p>
            </div>
          )}
          {filtered.map(o => {
            const publicNotes = o.notas.filter(n => !n.interna)
            const foiAtualizadaPeloAdmin = o.estado !== 'aberta' || o.notas.some(n => n.autor === 'Admin')
            return (
            <Card
              key={o.id}
              className={`cursor-pointer hover:shadow-md transition-all ${selected?.id === o.id ? 'ring-2 ring-blue-500 border-blue-200' : ''}`}
            >
              <div className="px-5 py-4 flex items-start gap-3" onClick={() => isAdmin ? setSelected(selected?.id === o.id ? null : o) : openMoradorDetail(o)}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 text-sm">{o.titulo}</h3>
                    <Badge variant={tipoVariant[o.tipo]}>{tipoLabel[o.tipo]}</Badge>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${prioridadeStyle[o.prioridade]}`}>
                      {o.prioridade}
                    </span>
                    {!isAdmin && foiAtualizadaPeloAdmin && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        Atualizada pelo administrador
                      </span>
                    )}
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
                    {!isAdmin && publicNotes.length > 0 && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle2 size={11} /> {publicNotes.length} resposta{publicNotes.length > 1 ? 's' : ''} do admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canEditOcorrencia(o) && (
                    <button
                      title="Editar ocorrência"
                      aria-label="Editar ocorrência"
                      onClick={e => { e.stopPropagation(); openEditarOcorrencia(o) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canDeleteOcorrencia(o) && (
                    <button
                      title="Eliminar ocorrência"
                      aria-label="Eliminar ocorrência"
                      onClick={e => { e.stopPropagation(); handleDeleteOcorrencia(o) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <Badge variant={estadoVariant[o.estado]}>
                    {PIPELINE.find(p => p.estado === o.estado)?.label}
                  </Badge>
                  <ChevronRight size={16} className={`text-slate-300 transition-transform ${selected?.id === o.id ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </Card>
            )
          })}
        </div>
      </div>

      {/* ── Painel lateral / drawer responsivo ── */}
      {selected && (
        <>
          <button
            type="button"
            className="xl:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setSelected(null)}
            aria-label="Fechar detalhe da ocorrência"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[560px] flex-col border-l border-slate-200 bg-white xl:static xl:z-auto xl:flex xl:w-[45%] xl:min-w-80">
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
            <div className="flex-1 pr-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ocorrência #{selected.id}</p>
              <h2 className="font-bold text-slate-800 leading-snug">{selected.titulo}</h2>
            </div>
            <button title="Fechar painel" aria-label="Fechar painel" onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
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

              {isAdmin && selected.estado !== 'fechada' && selected.estado !== 'resolvida' && (
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => avancarEstado(selected)}
                >
                  Avançar para "{PIPELINE[pipelineIdx + 1]?.label}"
                </Button>
              )}
              {isAdmin && selected.estado === 'resolvida' && (
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
              <p className="text-xs font-semibold text-slate-600">
                {isAdmin ? 'Adicionar nota' : 'Enviar resposta ao morador'}
              </p>
              {isAdmin && (
                <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notaInterna}
                    onChange={e => setNotaInterna(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-yellow-500"
                  />
                  <span className="text-xs text-slate-500">Nota interna</span>
                </label>
              )}
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
        </>
      )}

      {/* ── Modal: Detalhe Morador ── */}
      {detailOcorrencia && (
        <Modal open={openDetail} onClose={() => setOpenDetail(false)} title={detailOcorrencia.titulo}>
          <div className="space-y-5">
            {/* Badges tipo + prioridade */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${tipoVariant[detailOcorrencia.tipo] === 'danger' ? 'bg-red-100 text-red-700' : tipoVariant[detailOcorrencia.tipo] === 'warning' ? 'bg-orange-100 text-orange-700' : tipoVariant[detailOcorrencia.tipo] === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                {tipoLabel[detailOcorrencia.tipo]}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${prioridadeStyle[detailOcorrencia.prioridade]}`}>
                {detailOcorrencia.prioridade}
              </span>
            </div>

            {/* Pipeline de estado (read-only) */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Estado atual</p>
              <div className="flex items-center gap-1 flex-wrap">
                {PIPELINE.map((step, i) => {
                  const currentIdx = PIPELINE.findIndex(s => s.estado === detailOcorrencia.estado)
                  const isPast = i < currentIdx
                  const isCurrent = i === currentIdx
                  return (
                    <React.Fragment key={step.estado}>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        isCurrent ? 'bg-blue-600 text-white' :
                        isPast ? 'bg-slate-200 text-slate-500 line-through' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                      {i < PIPELINE.length - 1 && (
                        <span className={`text-xs ${isPast ? 'text-slate-400' : 'text-slate-200'}`}>›</span>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            {/* Atualizações públicas do administrador */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Atualizações ({detailOcorrencia.notas.filter(n => !n.interna).length})
              </p>
              {detailOcorrencia.notas.filter(n => !n.interna).length === 0 ? (
                <p className="text-sm text-slate-400 italic">Ainda sem atualizações.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {detailOcorrencia.notas.filter(n => !n.interna).map(n => {
                    const isMine = n.autor === profile?.nome
                    return (
                      <div key={n.id} className={`rounded-xl p-3 text-sm ${isMine ? 'bg-slate-50 border border-slate-200' : 'bg-blue-50 border border-blue-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${isMine ? 'text-slate-600' : 'text-blue-700'}`}>{n.autor}</span>
                          <span className="text-xs text-slate-400">{formatDateTime(n.created_at)}</span>
                        </div>
                        <p className="text-slate-700 leading-snug">{n.texto}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Resposta do morador */}
            {detailOcorrencia.estado !== 'fechada' && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Adicionar comentário</p>
                <div className="flex gap-2">
                  <textarea
                    value={moradorResposta}
                    onChange={e => setMoradorResposta(e.target.value)}
                    placeholder="Escreva um comentário ou pergunta..."
                    rows={2}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) enviarRespostaMorador() }}
                  />
                  <Button
                    size="sm"
                    onClick={enviarRespostaMorador}
                    disabled={!moradorResposta.trim()}
                    className="self-end"
                  >
                    <Send size={14} />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Ctrl+Enter para enviar</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: Nova Ocorrência ── */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editingOcorrencia ? 'Editar Ocorrência' : 'Nova Ocorrência'}>
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
            <Button type="submit">{editingOcorrencia ? 'Guardar alterações' : 'Submeter'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// Need React in scope for JSX fragments
import React from 'react'


