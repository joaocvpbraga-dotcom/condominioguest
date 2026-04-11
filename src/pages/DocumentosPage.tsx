import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { FileText, Plus, Download, File, AlertTriangle, Bell, Send, Pencil, Trash2 } from 'lucide-react'
import type { Documento, Comunicado } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const catVariant: Record<string, 'info' | 'success' | 'warning' | 'default' | 'danger'> = {
  ata: 'info', regulamento: 'success', contrato: 'warning',
  seguro: 'danger', comprovativo: 'default', outro: 'default',
}
const catLabel: Record<string, string> = {
  ata: 'Ata', regulamento: 'Regulamento', contrato: 'Contrato',
  seguro: 'Seguro', comprovativo: 'Comprovativo', outro: 'Outro',
}
const periodoLabel: Record<string, string> = {
  mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const adminCategories = ['ata', 'regulamento', 'contrato', 'seguro', 'comprovativo', 'outro']

export function DocumentosPage() {
  const { documentos, setDocumentos, moradores, setComunicados } = useAppData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [catFilter, setCatFilter] = useState('todos')
  const [openModal, setOpenModal] = useState(false)
  const [editDoc, setEditDoc] = useState<Documento | null>(null)
  const [openAlertModal, setOpenAlertModal] = useState(false)
  const [alertDoc, setAlertDoc] = useState<Documento | null>(null)
  const [alertDest, setAlertDest] = useState('')
  const [form, setForm] = useState({
    nome: '', descricao: '', categoria: isAdmin ? 'ata' : 'comprovativo',
    data_validade: '', periodo: 'mensal' as Documento['periodo'],
  })

  function openEdit(d: Documento) {
    setEditDoc(d)
    setForm({ nome: d.nome, descricao: d.descricao ?? '', categoria: d.categoria, data_validade: d.data_validade ?? '', periodo: d.periodo ?? 'mensal' })
    setOpenModal(true)
  }

  function handleDelete(d: Documento) {
    if (!window.confirm(`Eliminar "${d.nome}"? Esta ação não pode ser desfeita.`)) return
    setDocumentos(prev => prev.filter(x => x.id !== d.id))
  }

  function enviarAlerta() {
    if (!alertDoc) return
    const destinatario = alertDest || undefined
    const days = daysUntil(alertDoc.data_validade!)
    const comunicado: Comunicado = {
      id: `c-${Date.now()}`,
      condominio_id: profile?.condominio_id ?? 'c1',
      titulo: `⚠️ Documento a expirar: ${alertDoc.nome}`,
      conteudo: `O documento "${alertDoc.nome}" ${days <= 0 ? 'expirou' : `expira em ${days} dias`} (${formatDate(alertDoc.data_validade!)}). Por favor tome as medidas necessárias.`,
      importante: true,
      destinatario_id: destinatario,
      autor_id: profile?.id ?? 'admin',
      created_at: new Date().toISOString(),
    }
    if (isSupabaseConfigured) {
      supabase.from('comunicados').insert({
        id: comunicado.id,
        condominio_id: comunicado.condominio_id,
        titulo: comunicado.titulo,
        conteudo: comunicado.conteudo,
        importante: comunicado.importante,
        destinatario_id: comunicado.destinatario_id ?? null,
        autor_id: comunicado.autor_id,
        created_at: comunicado.created_at,
      }).then(({ error }) => {
        if (error) console.error('Erro ao guardar alerta:', error)
      })
    }
    setComunicados(prev => [comunicado, ...prev])
    setOpenAlertModal(false)
    setAlertDoc(null)
    setAlertDest('')
    alert('Alerta enviado com sucesso!')
  }

  // Documentos a expirar (admin alert): data_validade dentro de 60 dias
  const expiring = useMemo(() =>
    documentos.filter(d => d.data_validade && daysUntil(d.data_validade) <= 60)
      .sort((a, b) => new Date(a.data_validade!).getTime() - new Date(b.data_validade!).getTime()),
    [documentos]
  )

  const visibleCategories = isAdmin ? adminCategories : ['ata', 'regulamento', 'contrato', 'seguro', 'comprovativo', 'outro']

  const filtered = useMemo(() => {
    let list = documentos
    if (!isAdmin) list = list.filter(d => d.categoria !== 'comprovativo' || d.morador_id === profile?.id)
    if (catFilter !== 'todos') list = list.filter(d => d.categoria === catFilter)
    return list
  }, [documentos, catFilter, isAdmin, profile?.id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome) return
    if (editDoc) {
      const updated: Documento = {
        ...editDoc,
        nome: form.nome,
        descricao: form.descricao || undefined,
        categoria: form.categoria as Documento['categoria'],
        data_validade: form.data_validade || undefined,
        periodo: form.categoria === 'comprovativo' ? form.periodo : undefined,
      }
      setDocumentos(prev => prev.map(d => d.id === editDoc.id ? updated : d))
    } else {
      const novo: Documento = {
        id: `d-${Date.now()}`,
        condominio_id: 'c1',
        nome: form.nome,
        descricao: form.descricao || undefined,
        categoria: form.categoria as Documento['categoria'],
        url: '#',
        autor_id: profile?.id ?? 'demo',
        morador_id: !isAdmin ? profile?.id : undefined,
        data_validade: form.data_validade || undefined,
        periodo: form.categoria === 'comprovativo' ? form.periodo : undefined,
        created_at: new Date().toISOString(),
      }
      setDocumentos(prev => [novo, ...prev])
    }
    setOpenModal(false)
    setEditDoc(null)
    setForm({ nome: '', descricao: '', categoria: isAdmin ? 'ata' : 'comprovativo', data_validade: '', periodo: 'mensal' })
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documentos</h1>
          <p className="text-slate-500 mt-1">Atas, regulamentos, seguros e comprovativos</p>
        </div>
        <Button onClick={() => { setEditDoc(null); setForm({ nome: '', descricao: '', categoria: isAdmin ? 'ata' : 'comprovativo', data_validade: '', periodo: 'mensal' }); setOpenModal(true) }}>
          <Plus size={16} /> {isAdmin ? 'Novo Documento' : 'Enviar Comprovativo'}
        </Button>
      </div>

      {/* ── Alerta de expiração (admin only) ── */}
      {isAdmin && expiring.length > 0 && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
            <Bell size={16} /> Documentos a expirar em breve
          </div>
          {expiring.map(d => {
            const days = daysUntil(d.data_validade!)
            return (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <AlertTriangle size={14} className={days <= 15 ? 'text-red-500' : 'text-orange-500'} />
                  <span className="font-medium">{d.nome}</span>
                  <Badge variant={catVariant[d.categoria]}>{catLabel[d.categoria]}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold text-xs ${days <= 15 ? 'text-red-600' : 'text-orange-600'}`}>
                    {days <= 0 ? 'Expirado!' : `${days} dias`}
                  </span>
                  <button
                    onClick={() => { setAlertDoc(d); setAlertDest(''); setOpenAlertModal(true) }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Send size={11} /> Enviar Alerta
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setCatFilter('todos')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${catFilter === 'todos' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Todos</button>
        {visibleCategories.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{catLabel[c]}</button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="Sem documentos" description={isAdmin ? 'Carregue o primeiro documento.' : 'Ainda não há documentos disponíveis.'} action={<Button onClick={() => setOpenModal(true)}><Plus size={16} /> {isAdmin ? 'Carregar' : 'Enviar Comprovativo'}</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(d => {
            const expiryDays = d.data_validade ? daysUntil(d.data_validade) : null
            return (
              <Card key={d.id} className={`hover:shadow-md transition-shadow ${expiryDays !== null && expiryDays <= 15 ? 'border-red-200' : expiryDays !== null && expiryDays <= 60 ? 'border-orange-200' : ''}`}>
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <File size={20} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 truncate">{d.nome}</p>
                      <Badge variant={catVariant[d.categoria]}>{catLabel[d.categoria]}</Badge>
                      {d.periodo && <span className="text-xs text-slate-400">{periodoLabel[d.periodo]}</span>}
                    </div>
                    {d.descricao && <p className="text-xs text-slate-500 mt-0.5 truncate">{d.descricao}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      <span>{formatDate(d.created_at)}</span>
                      {d.tamanho && <span>{formatBytes(d.tamanho)}</span>}
                      {d.data_validade && (
                        <span className={`font-medium ${expiryDays! <= 0 ? 'text-red-600' : expiryDays! <= 15 ? 'text-red-500' : expiryDays! <= 60 ? 'text-orange-500' : 'text-slate-400'}`}>
                          Válido até {formatDate(d.data_validade)}{expiryDays !== null && expiryDays <= 60 && ` (${expiryDays <= 0 ? 'Expirado' : expiryDays + ' dias'})`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" title="Descarregar">
                      <Download size={16} />
                    </Button>
                    {(isAdmin || d.morador_id === profile?.id) && (
                      <>
                        <button onClick={() => openEdit(d)} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(d)} title="Eliminar" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de upload */}
      <Modal open={openModal} onClose={() => { setOpenModal(false); setEditDoc(null) }} title={editDoc ? 'Editar Documento' : isAdmin ? 'Novo Documento' : 'Enviar Comprovativo de Pagamento'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder={isAdmin ? 'Nome do documento' : 'Ex: Quota Janeiro 2026'} required />

          {isAdmin ? (
            <Select
              label="Categoria"
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              options={adminCategories.map(c => ({ value: c, label: catLabel[c] }))}
            />
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Tipo de pagamento</label>
                <Select
                  value={form.periodo}
                  onChange={e => setForm({ ...form, periodo: e.target.value as Documento['periodo'] })}
                  options={[
                    { value: 'mensal', label: 'Mensal' },
                    { value: 'trimestral', label: 'Trimestral' },
                    { value: 'semestral', label: 'Semestral' },
                    { value: 'anual', label: 'Anual' },
                  ]}
                />
              </div>
            </>
          )}

          {isAdmin && form.categoria === 'seguro' && (
            <Input
              label="Data de validade"
              type="date"
              value={form.data_validade}
              onChange={e => setForm({ ...form, data_validade: e.target.value })}
            />
          )}

          <Textarea label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} placeholder="Descrição opcional..." />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Ficheiro</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100 transition-colors cursor-pointer" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">{isAdmin ? 'Carregar' : 'Enviar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal de alerta */}
      <Modal open={openAlertModal} onClose={() => setOpenAlertModal(false)} title="Enviar Alerta de Documento">
        <div className="space-y-4">
          {alertDoc && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
              <strong>{alertDoc.nome}</strong> — {daysUntil(alertDoc.data_validade!) <= 0 ? 'Expirado' : `expira em ${daysUntil(alertDoc.data_validade!)} dias`} ({formatDate(alertDoc.data_validade!)})
            </div>
          )}
          <Select
            label="Enviar para"
            value={alertDest}
            onChange={e => setAlertDest(e.target.value)}
            options={[
              { value: '', label: 'Todos os moradores' },
              ...moradores.map(m => ({ value: m.id, label: m.nome })),
            ]}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenAlertModal(false)}>Cancelar</Button>
            <Button onClick={enviarAlerta}><Send size={14} /> Enviar Alerta</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


