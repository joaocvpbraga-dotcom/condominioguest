import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Profile, Fracao, Quota, OcorrenciaComNotas, Comunicado, Documento, Orcamento, Fornecedor, Manutencao } from '@/types'

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
  const [moradores, setMoradores] = useState<Profile[]>(() => loadLS('cg_moradores', []))
  const [fracoes, setFracoes] = useState<Fracao[]>(() => loadLS('cg_fracoes', []))
  const [quotas, setQuotas] = useState<Quota[]>(() => loadLS('cg_quotas', []))
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComNotas[]>(() => loadLS('cg_ocorrencias', []))
  const [comunicados, setComunicados] = useState<Comunicado[]>(() => loadLS('cg_comunicados', []))
  const [documentos, setDocumentos] = useState<Documento[]>(() => loadLS('cg_documentos', []))
  const [rubricas, setRubricas] = useState<Orcamento[]>(() => loadLS('cg_rubricas', []))
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => loadLS('cg_fornecedores', []))
  const [manutencoes, setManutencoes] = useState<Manutencao[]>(() => loadLS('cg_manutencoes', []))

  useEffect(() => { localStorage.setItem('cg_moradores', JSON.stringify(moradores)) }, [moradores])
  useEffect(() => { localStorage.setItem('cg_fracoes', JSON.stringify(fracoes)) }, [fracoes])
  useEffect(() => { localStorage.setItem('cg_quotas', JSON.stringify(quotas)) }, [quotas])
  useEffect(() => { localStorage.setItem('cg_ocorrencias', JSON.stringify(ocorrencias)) }, [ocorrencias])
  useEffect(() => { localStorage.setItem('cg_comunicados', JSON.stringify(comunicados)) }, [comunicados])
  useEffect(() => { localStorage.setItem('cg_documentos', JSON.stringify(documentos)) }, [documentos])
  useEffect(() => { localStorage.setItem('cg_rubricas', JSON.stringify(rubricas)) }, [rubricas])
  useEffect(() => { localStorage.setItem('cg_fornecedores', JSON.stringify(fornecedores)) }, [fornecedores])
  useEffect(() => { localStorage.setItem('cg_manutencoes', JSON.stringify(manutencoes)) }, [manutencoes])

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
