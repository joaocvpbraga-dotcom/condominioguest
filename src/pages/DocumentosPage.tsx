import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { FileText, Plus, Download, File } from 'lucide-react'
import type { Documento } from '@/types'
import { useAppData } from '@/contexts/AppDataContext'

const catVariant: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  ata: 'info', regulamento: 'success', contrato: 'warning', outro: 'default',
}
const catLabel: Record<string, string> = {
  ata: 'Ata', regulamento: 'Regulamento', contrato: 'Contrato', outro: 'Outro',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const categories = ['ata', 'regulamento', 'contrato', 'outro']

export function DocumentosPage() {
  const { documentos, setDocumentos } = useAppData()
  const [catFilter, setCatFilter] = useState('todos')
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: 'ata' })

  const filtered = catFilter === 'todos' ? documentos : documentos.filter(d => d.categoria === catFilter)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documentos</h1>
          <p className="text-slate-500 mt-1">Atas, regulamentos e arquivos</p>
        </div>
        <Button onClick={() => setOpenModal(true)}>
          <Plus size={16} /> Novo Documento
        </Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setCatFilter('todos')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${catFilter === 'todos' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Todos</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{catLabel[c]}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="Sem documentos" description="Carregue o primeiro documento." action={<Button onClick={() => setOpenModal(true)}><Plus size={16} /> Carregar</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(d => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <File size={20} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 truncate">{d.nome}</p>
                    <Badge variant={catVariant[d.categoria]}>{catLabel[d.categoria]}</Badge>
                  </div>
                  {d.descricao && <p className="text-xs text-slate-500 mt-0.5 truncate">{d.descricao}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{formatDate(d.created_at)}</span>
                    {d.tamanho && <span>{formatBytes(d.tamanho)}</span>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" title="Descarregar">
                  <Download size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Novo Documento">
        <form className="space-y-4" onSubmit={e => {
            e.preventDefault()
            if (!form.nome) return
            const novo: Documento = {
              id: `d-${Date.now()}`,
              condominio_id: 'c1',
              nome: form.nome,
              descricao: form.descricao || undefined,
              categoria: form.categoria as Documento['categoria'],
              url: '#',
              autor_id: 'demo',
              created_at: new Date().toISOString(),
            }
            setDocumentos(prev => [novo, ...prev])
            setOpenModal(false)
            setForm({ nome: '', descricao: '', categoria: 'ata' })
          }}>
          <Input label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do documento" required />
          <Select label="Categoria" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} options={categories.map(c => ({ value: c, label: catLabel[c] }))} />
          <Textarea label="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} placeholder="Descrição opcional..." />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Ficheiro</label>
            <input type="file" className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100 transition-colors cursor-pointer" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit">Carregar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
