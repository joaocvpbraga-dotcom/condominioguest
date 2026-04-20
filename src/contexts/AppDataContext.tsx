import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Profile, Fracao, Quota, OcorrenciaComNotas, Comunicado, Documento, Orcamento, Fornecedor, Manutencao, RegistoCaixa, RecebimentoTrimestral, Obra, PermissoesMorador } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface AppDataContextType {
  moradores: Profile[]
  setMoradores: React.Dispatch<React.SetStateAction<Profile[]>>
  fracoes: Fracao[]
  setFracoes: React.Dispatch<React.SetStateAction<Fracao[]>>
  quotas: Quota[]
  setQuotas: React.Dispatch<React.SetStateAction<Quota[]>>
  ocorrencias: OcorrenciaComNotas[]
  setOcorrencias: React.Dispatch<React.SetStateAction<OcorrenciaComNotas[]>>
  comunicados: Comunicado[]
  setComunicados: React.Dispatch<React.SetStateAction<Comunicado[]>>
  documentos: Documento[]
  setDocumentos: React.Dispatch<React.SetStateAction<Documento[]>>
  rubricas: Orcamento[]
  setRubricas: React.Dispatch<React.SetStateAction<Orcamento[]>>
  fornecedores: Fornecedor[]
  setFornecedores: React.Dispatch<React.SetStateAction<Fornecedor[]>>
  manutencoes: Manutencao[]
  setManutencoes: React.Dispatch<React.SetStateAction<Manutencao[]>>
  registosCaixa: RegistoCaixa[]
  setRegistosCaixa: React.Dispatch<React.SetStateAction<RegistoCaixa[]>>
  recebimentos: RecebimentoTrimestral[]
  setRecebimentos: React.Dispatch<React.SetStateAction<RecebimentoTrimestral[]>>
  obras: Obra[]
  setObras: React.Dispatch<React.SetStateAction<Obra[]>>
  permissoes: PermissoesMorador[]
  setPermissoes: React.Dispatch<React.SetStateAction<PermissoesMorador[]>>
}

const AppDataContext = createContext<AppDataContextType | null>(null)

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const [moradores, setMoradores] = useState<Profile[]>(() => loadLS('cg_moradores', []))
  const [fracoes, setFracoes] = useState<Fracao[]>(() => loadLS('cg_fracoes', []))

  // Load moradores & frações from Supabase whenever the condominium changes
  useEffect(() => {
    if (!isSupabaseConfigured || !profile?.condominio_id) return

    const condominioId = profile.condominio_id

    supabase
      .from('profiles')
      .select('*')
      .eq('condominio_id', condominioId)
      .then(({ data, error }) => {
        if (error) { console.error('moradores fetch error:', error); return }
        if (data) setMoradores(data as Profile[])
      })

    supabase
      .from('fracoes')
      .select('*, proprietario:proprietario_id(*)')
      .eq('condominio_id', condominioId)
      .then(({ data, error }) => {
        if (error) { console.error('fracoes fetch error:', error); return }
        if (data) setFracoes(data as Fracao[])
      })
  }, [profile?.condominio_id])

  // Ensure moradores (non-admin) appear in their own list
  useEffect(() => {
    if (!profile || profile.role === 'admin') return
    setMoradores(prev => {
      const exists = prev.some(m => m.id === profile.id)
      if (exists) return prev
      return [profile, ...prev]
    })
  }, [profile])
  const [quotas, setQuotas] = useState<Quota[]>(() => loadLS('cg_quotas', []))
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComNotas[]>(() => loadLS('cg_ocorrencias', []))
  const [comunicados, setComunicados] = useState<Comunicado[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured || !profile?.id) return

    const condominioId = profile.condominio_id
    const query = condominioId
      ? supabase.from('comunicados').select('*').eq('condominio_id', condominioId).order('created_at', { ascending: false })
      : supabase.from('comunicados').select('*').or(`destinatario_id.eq.${profile.id},destinatario_id.is.null`).order('created_at', { ascending: false })

    query.then(({ data, error }) => {
      if (error) { console.error('comunicados fetch error:', error); return }
      if (data) setComunicados(data as Comunicado[])
    })
  }, [profile?.id, profile?.condominio_id])

  // Keep comunicados synced across sessions/devices in real time.
  useEffect(() => {
    if (!isSupabaseConfigured || !profile?.condominio_id) return

    const channel = supabase
      .channel(`realtime-comunicados-${profile.condominio_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comunicados',
        filter: `condominio_id=eq.${profile.condominio_id}`,
      }, payload => {
        const inserted = payload.new as Comunicado
        setComunicados(prev => prev.some(c => c.id === inserted.id) ? prev : [inserted, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'comunicados',
        filter: `condominio_id=eq.${profile.condominio_id}`,
      }, payload => {
        const updated = payload.new as Comunicado
        setComunicados(prev => prev.map(c => c.id === updated.id ? updated : c))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comunicados',
        filter: `condominio_id=eq.${profile.condominio_id}`,
      }, payload => {
        const deletedId = String(payload.old.id)
        setComunicados(prev => prev.filter(c => c.id !== deletedId))
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.condominio_id, setComunicados])

  useEffect(() => {
    if (!isSupabaseConfigured || !profile?.condominio_id) return

    supabase
      .from('ocorrencias')
      .select('*')
      .eq('condominio_id', profile.condominio_id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('ocorrencias fetch error:', error); return }
        if (data) {
          const withNotas = (data as OcorrenciaComNotas[]).map(o => ({ ...o, notas: o.notas ?? [] }))
          setOcorrencias(withNotas)
        }
      })
  }, [profile?.condominio_id])

  // Keep ocorrencias synced across sessions/devices in real time.
  useEffect(() => {
    if (!isSupabaseConfigured || !profile?.condominio_id) return

    const channel = supabase
      .channel(`realtime-ocorrencias-${profile.condominio_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ocorrencias',
        filter: `condominio_id=eq.${profile.condominio_id}`,
      }, payload => {
        const inserted = { ...(payload.new as OcorrenciaComNotas), notas: [] }
        setOcorrencias(prev => prev.some(o => o.id === inserted.id) ? prev : [inserted, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ocorrencias',
        filter: `condominio_id=eq.${profile.condominio_id}`,
      }, payload => {
        const updated = payload.new as OcorrenciaComNotas
        setOcorrencias(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'ocorrencias',
        filter: `condominio_id=eq.${profile.condominio_id}`,
      }, payload => {
        const deletedId = String(payload.old.id)
        setOcorrencias(prev => prev.filter(o => o.id !== deletedId))
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.condominio_id, setOcorrencias])

  const [documentos, setDocumentos] = useState<Documento[]>(() => loadLS('cg_documentos', []))
  useEffect(() => {
    if (!isSupabaseConfigured || !profile?.condominio_id) return

    supabase
      .from('documentos')
      .select('*')
      .eq('condominio_id', profile.condominio_id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('documentos fetch error:', error); return }
        if (data) setDocumentos(data as Documento[])
      })
  }, [profile?.condominio_id])

  const [rubricas, setRubricas] = useState<Orcamento[]>(() => loadLS('cg_rubricas', []))
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => loadLS('cg_fornecedores', []))
  const [manutencoes, setManutencoes] = useState<Manutencao[]>(() => loadLS('cg_manutencoes', []))
  const [registosCaixa, setRegistosCaixa] = useState<RegistoCaixa[]>(() => loadLS('cg_registos_caixa', []))
  const [recebimentos, setRecebimentos] = useState<RecebimentoTrimestral[]>(() => loadLS('cg_recebimentos', []))
  const [obras, setObras] = useState<Obra[]>(() => loadLS('cg_obras', []))
  const [permissoes, setPermissoes] = useState<PermissoesMorador[]>(() => loadLS('cg_permissoes', []))

  useEffect(() => { localStorage.setItem('cg_moradores', JSON.stringify(moradores)) }, [moradores])
  useEffect(() => { localStorage.setItem('cg_fracoes', JSON.stringify(fracoes)) }, [fracoes])
  useEffect(() => { localStorage.setItem('cg_quotas', JSON.stringify(quotas)) }, [quotas])
  useEffect(() => { localStorage.setItem('cg_ocorrencias', JSON.stringify(ocorrencias)) }, [ocorrencias])
  useEffect(() => { localStorage.setItem('cg_documentos', JSON.stringify(documentos)) }, [documentos])
  useEffect(() => { localStorage.setItem('cg_rubricas', JSON.stringify(rubricas)) }, [rubricas])
  useEffect(() => { localStorage.setItem('cg_fornecedores', JSON.stringify(fornecedores)) }, [fornecedores])
  useEffect(() => { localStorage.setItem('cg_manutencoes', JSON.stringify(manutencoes)) }, [manutencoes])
  useEffect(() => { localStorage.setItem('cg_registos_caixa', JSON.stringify(registosCaixa)) }, [registosCaixa])
  useEffect(() => { localStorage.setItem('cg_recebimentos', JSON.stringify(recebimentos)) }, [recebimentos])
  useEffect(() => { localStorage.setItem('cg_obras', JSON.stringify(obras)) }, [obras])
  useEffect(() => { localStorage.setItem('cg_permissoes', JSON.stringify(permissoes)) }, [permissoes])

  return (
    <AppDataContext.Provider value={{
      moradores, setMoradores,
      fracoes, setFracoes,
      quotas, setQuotas,
      ocorrencias, setOcorrencias,
      comunicados, setComunicados,
      documentos, setDocumentos,
      rubricas, setRubricas,
      fornecedores, setFornecedores,
      manutencoes, setManutencoes,
      registosCaixa, setRegistosCaixa,
      recebimentos, setRecebimentos,
      obras, setObras,
      permissoes, setPermissoes,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
