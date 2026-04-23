export type UserRole = 'admin' | 'morador' | 'inquilino'

export interface Profile {
  id: string
  nome: string
  email: string
  telefone?: string
  role: UserRole
  condominio_id?: string
  created_at: string
  precisa_alt?: boolean
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
  inquilino_id?: string
  created_at: string
  proprietario?: Profile
  inquilino?: Profile
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
  tipo: 'reclamacao' | 'avaria' | 'sugestao' | 'risco' | 'intervencao' | 'outro'
  estado: 'aberta' | 'aceite' | 'em_analise' | 'resolvida' | 'fechada'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  autor_id: string
  autor_nome?: string
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
  destinatario_id?: string
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
  fracao_id?: string
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

export interface Obra {
  id: string
  condominio_id: string
  titulo: string
  descricao?: string
  estado: 'necessaria' | 'aprovada' | 'em_curso' | 'concluida' | 'cancelada'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  custo_estimado?: number
  custo_real?: number
  data_prevista?: string
  data_conclusao?: string
  created_at: string
}

export interface PermissoesMorador {
  morador_id: string
  piscina: boolean
  ginasio: boolean
  estacionamento: boolean
  sala_condominio: boolean
  lavandaria: boolean
  terracos: boolean
}

export interface RegistoCaixa {
  id: string
  condominio_id: string
  ano: number
  mes: number // 1-12
  valor: number
  notas?: string
  created_at: string
}

export interface RecebimentoTrimestral {
  id: string
  condominio_id: string
  ano: number
  trimestre: 1 | 2 | 3 | 4
  valor: number
  notas?: string
  created_at: string
}
