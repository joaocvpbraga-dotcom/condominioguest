import type { PermissoesMorador, Profile } from '@/types'

export interface MoradorFormState {
  nome: string
  email: string
  telefone: string
  role: Profile['role']
  fracao_id: string
  senha: string
}

export interface FracaoFormState {
  numero: string
  andar: string
  tipo: string
  area: string
  permilagem: string
  proprietario_id: string
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  morador: 'Proprietário',
  inquilino: 'Inquilino',
  funcionario: 'Inquilino',
}

export const ROLE_VARIANT: Record<string, 'info' | 'success' | 'default'> = {
  admin: 'info',
  morador: 'success',
  inquilino: 'default',
  funcionario: 'default',
}

export const EMPTY_MORADOR: MoradorFormState = {
  nome: '',
  email: '',
  telefone: '',
  role: 'morador',
  fracao_id: '',
  senha: '',
}

export const EMPTY_FRACAO: FracaoFormState = {
  numero: '',
  andar: '',
  tipo: 'apartamento',
  area: '',
  permilagem: '',
  proprietario_id: '',
}

export const PERM_KEYS: (keyof Omit<PermissoesMorador, 'morador_id'>)[] = [
  'piscina',
  'ginasio',
  'estacionamento',
  'sala_condominio',
  'lavandaria',
  'terracos',
]

export const PERM_LABELS: Record<string, string> = {
  piscina: 'Piscina',
  ginasio: 'Ginásio',
  estacionamento: 'Estacionamento',
  sala_condominio: 'Sala Condomínio',
  lavandaria: 'Lavandaria',
  terracos: 'Terraços',
}
