export type UserRole = 'admin' | 'morador' | 'funcionario'

export interface Profile {
  id: string
  nome: string
  email: string
  telefone?: string
  role: UserRole
  condominio_id?: string
  created_at: string
}

export interface Condominio {
  id: string
  nome: string
  morada: string
  nif?: string
  created_at: string
}

export interface Fracao {
  id: string
  condominio_id: string
  numero: string
  andar?: string
  tipo: string
  area?: number
  permilagem: number
  proprietario_id?: string
  created_at: string
  proprietario?: Profile
}

export interface Quota {
  id: string
  condominio_id: string
  fracao_id: string
  descricao: string
  valor: number
  data_vencimento: string
  estado: 'pendente' | 'pago' | 'em_atraso'
  data_pagamento?: string
  created_at: string
  fracao?: Fracao
}

export interface Ocorrencia {
  id: string
  condominio_id: string
  titulo: string
  descricao: string
  tipo: 'reclamacao' | 'avaria' | 'sugestao' | 'outro'
  estado: 'aberta' | 'em_analise' | 'resolvida' | 'fechada'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  autor_id: string
  created_at: string
  autor?: Profile
}

export interface Nota {
  id: string
  texto: string
  autor: string
  created_at: string
  interna: boolean
}

export interface OcorrenciaComNotas extends Ocorrencia {
  notas: Nota[]
}

export interface EspacoComum {
  id: string
  condominio_id: string
  nome: string
  descricao?: string
  capacidade?: number
  ativo: boolean
}

export interface Reserva {
  id: string
  espaco_id: string
  morador_id: string
  data_inicio: string
  data_fim: string
  estado: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada'
  notas?: string
  created_at: string
  espaco?: EspacoComum
  morador?: Profile
}

export interface Comunicado {
  id: string
  condominio_id: string
  titulo: string
  conteudo: string
  autor_id: string
  importante: boolean
  created_at: string
  autor?: Profile
}

export interface Documento {
  id: string
  condominio_id: string
  nome: string
  descricao?: string
  categoria: 'ata' | 'regulamento' | 'contrato' | 'seguro' | 'comprovativo' | 'outro'
  url: string
  tamanho?: number
  autor_id: string
  morador_id?: string
  data_validade?: string
  periodo?: 'mensal' | 'trimestral' | 'semestral' | 'anual'
  created_at: string
}

export interface Orcamento {
  id: string
  condominio_id: string
  ano: number
  rubrica: string
  descricao?: string
  valor_previsto: number
  valor_real?: number
  tipo: 'receita' | 'despesa'
  created_at: string
}

export interface Fornecedor {
  id: string
  condominio_id: string
  nome: string
  servico: string
  contacto?: string
  email?: string
  nif?: string
  ativo: boolean
  created_at: string
}

export interface Manutencao {
  id: string
  condominio_id: string
  fornecedor_id?: string
  titulo: string
  descricao?: string
  estado: 'agendada' | 'em_curso' | 'concluida' | 'cancelada'
  data_agendada?: string
  data_conclusao?: string
  custo?: number
  created_at: string
  fornecedor?: Fornecedor
}
