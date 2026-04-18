import { callAdminFunction } from '@/lib/supabase'

export async function criarUtilizador({ email, password, nome, role }: {
  email: string
  password: string
  nome: string
  role?: 'admin' | 'morador' | 'inquilino'
}) {
  const { data, error } = await callAdminFunction<{
    id: string
    nome: string
    email: string
    role: 'admin' | 'morador' | 'inquilino'
    condominio_id?: string
  }>('create-user', { email, password, nome, role })
  if (error || !data) throw new Error(error || 'Erro ao criar utilizador')
  return data
}

export async function eliminarUtilizador(userId: string, accessToken: string) {
  const { data, error } = await callAdminFunction<Record<string, unknown>>('delete-user', { userId }, accessToken)
  if (error || !data) throw new Error(error || 'Erro ao eliminar utilizador')
  return data
}

export async function atualizarRole(userId: string, role: string, accessToken: string) {
  const { data, error } = await callAdminFunction<Record<string, unknown>>('update-role', { userId, role }, accessToken)
  if (error || !data) throw new Error(error || 'Erro ao atualizar perfil')
  return data
}
