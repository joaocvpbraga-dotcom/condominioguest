import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils'
import { CalendarDays, Plus, Clock, Users } from 'lucide-react'
import type { Reserva, EspacoComum } from '@/types'

const espacos: EspacoComum[] = [
  { id: 'e1', condominio_id: 'c1', nome: 'Salão de Festas', descricao: 'Capacidade 50 pessoas', capacidade: 50, ativo: true },
  { id: 'e2', condominio_id: 'c1', nome: 'Piscina', descricao: 'Aberta de Maio a Setembro', ativo: true },
  { id: 'e3', condominio_id: 'c1', nome: 'Sala de Reuniões', descricao: 'Capacidade 12 pessoas', capacidade: 12, ativo: true },
  { id: 'e4', condominio_id: 'c1', nome: 'Campo de Ténis', ativo: false },
]

const mockReservas: Reserva[] = []

const estadoVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  aprovada: 'success', pendente: 'warning', rejeitada: 'danger', cancelada: 'default',
}
const estadoLabel: Record<string, string> = {
  aprovada: 'Aprovada', pendente: 'Pendente', rejeitada: 'Rejeitada', cancelada: 'Cancelada',
}

export function ReservasPage() {
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState({ espaco_id: 'e1', data_inicio: '', data_fim: '', notas: '' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reservas de Espaços</h1>
          <p className="text-slate-500 mt-1">Gerencie as reservas dos espaços comuns</p>
        </div>
        <Button onClick={() => setOpenModal(true)}>
          <Plus size={16} /> Nova Reserva
        </Button>
      </div>

      {/* Espacos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {espacos.map(e => (
          <Card key={e.id} className={!e.ativo ? 'opacity-50' : ''}>
            <CardBody>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${e.ativo ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <CalendarDays size={18} className={e.ativo ? 'text-blue-600' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">{e.nome}</p>
                  {e.capacidade && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Users size={10} /> {e.capacidade} pessoas
                    </div>
                  )}
                </div>
              </div>
              {e.descricao && <p className="text-xs text-slate-500 mt-2">{e.descricao}</p>}
              <Badge className="mt-2" variant={e.ativo ? 'success' : 'default'}>{e.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </CardBody>
          </Card>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-4">Reservas Recentes</h2>
      {mockReservas.length === 0 ? (
        <EmptyState icon={<CalendarDays size={48} />} title="Sem reservas" description="Nenhuma reserva registada." />
      ) : (
        <div className="space-y-3">
          {mockReservas.map(r => (
            <Card key={r.id}>
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <CalendarDays size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800">{r.espaco?.nome}</p>
                    <Badge variant={estadoVariant[r.estado]}>{estadoLabel[r.estado]}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                    <Clock size={12} />
                    {formatDateTime(r.data_inicio)} → {formatDateTime(r.data_fim)}
                  </div>
                  {r.notas && <p className="text-xs text-slate-400 mt-1">{r.notas}</p>}
                </div>
                {r.estado === 'pendente' && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm">Aprovar</Button>
                    <Button size="sm" variant="danger">Rejeitar</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Nova Reserva">
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); setOpenModal(false) }}>
          <Select label="Espaço" value={form.espaco_id} onChange={e => setForm({ ...form, espaco_id: e.target.value })} options={espacos.filter(e => e.ativo).map(e => ({ value: e.id, label: e.nome }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Início" type="datetime-local" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} required />
            <Input label="Fim" type="datetime-local" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} required />
          </div>
          <Textarea label="Notas" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} placeholder="Informação adicional..." />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">Submeter Pedido</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
