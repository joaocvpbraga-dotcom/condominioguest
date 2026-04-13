import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils'
import { Megaphone, Plus, Pin, User } from 'lucide-react'
import type { Comunicado } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export function ComunicadosPage() {
  const { comunicados, setComunicados, moradores } = useAppData()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const destinatarios = moradores.filter(m => m.role !== 'admin')

  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', conteudo: '', importante: false, destinatario_id: '' })

  // Moradores veem: comunicados gerais + os seus individuais
  const visibleComunicados = isAdmin
    ? comunicados
    : comunicados.filter(c => !c.destinatario_id || c.destinatario_id === profile?.id)

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Comunicados</h1>
          <p className="text-slate-500 mt-1">Avisos e informações para moradores e inquilinos</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpenModal(true)}>
            <Plus size={16} /> Novo Comunicado
          </Button>
        )}
      </div>

      {visibleComunicados.length === 0 ? (
        <EmptyState icon={<Megaphone size={48} />} title="Sem comunicados" description={isAdmin ? 'Publique o primeiro comunicado.' : 'Sem comunicados por enquanto.'} action={isAdmin ? <Button onClick={() => setOpenModal(true)}><Plus size={16} /> Publicar</Button> : undefined} />
      ) : (
        <div className="space-y-4">
          {visibleComunicados.map(c => {
            const destinatario = c.destinatario_id ? moradores.find(m => m.id === c.destinatario_id) : null
            return (
              <Card key={c.id} className={c.importante ? 'border-l-4 border-l-blue-500' : ''}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.importante ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        {destinatario ? <User size={16} className="text-orange-500" /> : c.importante ? <Pin size={16} className="text-blue-600" /> : <Megaphone size={16} className="text-slate-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-800">{c.titulo}</h3>
                          {c.importante && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Importante</span>}
                          {destinatario && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">Para: {destinatario.nome}</span>}
                        </div>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{c.conteudo}</p>
                        <p className="text-xs text-slate-400 mt-3">{formatDateTime(c.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Novo Comunicado" size="lg">
        <form className="space-y-4" onSubmit={async e => {
            e.preventDefault()
            if (!form.titulo || !form.conteudo) return
            const novo: Comunicado = {
              id: `c-${Date.now()}`,
              condominio_id: profile?.condominio_id ?? 'c1',
              titulo: form.titulo,
              conteudo: form.conteudo,
              importante: form.importante,
              destinatario_id: form.destinatario_id || undefined,
              autor_id: profile?.id ?? 'demo',
              created_at: new Date().toISOString(),
            }
            if (isSupabaseConfigured) {
              const { error } = await supabase.from('comunicados').insert({
                id: novo.id,
                condominio_id: novo.condominio_id,
                titulo: novo.titulo,
                conteudo: novo.conteudo,
                importante: novo.importante,
                destinatario_id: novo.destinatario_id ?? null,
                autor_id: novo.autor_id,
                created_at: novo.created_at,
              })
              if (error) { console.error('Erro ao guardar comunicado:', error); return }
            }
            setComunicados(prev => [novo, ...prev])
            setOpenModal(false)
            setForm({ titulo: '', conteudo: '', importante: false, destinatario_id: '' })
          }}>
          <Input label="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título do comunicado" required />
          <Select
            label="Destinatário"
            value={form.destinatario_id}
            onChange={e => setForm({ ...form, destinatario_id: e.target.value })}
            options={[
              { value: '', label: 'Todos os moradores e inquilinos' },
              ...destinatarios.map(m => ({ value: m.id, label: m.nome })),
            ]}
          />
          <Textarea label="Conteúdo" value={form.conteudo} onChange={e => setForm({ ...form, conteudo: e.target.value })} rows={6} placeholder="Escreva o comunicado..." required />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.importante} onChange={e => setForm({ ...form, importante: e.target.checked })} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm text-slate-700 font-medium">Marcar como importante</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">Publicar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


