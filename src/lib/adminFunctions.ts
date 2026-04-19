import { callAdminFunction, supabase } from '@/lib/supabase'

type AdminDeleteResult = {
  success: boolean
  warning?: string
}

function isNetworkLikeAdminError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('failed to send a request')
  )
}

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

export async function eliminarUtilizador(userId: string) {
  const { data, error } = await callAdminFunction<AdminDeleteResult>('delete-user', { userId })
  if (!error && data) return data

  const message = error || 'Erro ao eliminar utilizador'

  // Fallback: keep the app usable even if Edge Functions are unreachable on the client.
  if (isNetworkLikeAdminError(message)) {
    const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', userId)
    if (profileDeleteError) {
      throw new Error(`Falha ao eliminar utilizador: ${message}. Erro adicional ao eliminar perfil: ${profileDeleteError.message}`)
    }
    return {
      success: true,
      warning: 'Perfil eliminado com sucesso, mas a conta de autenticacao pode nao ter sido removida. Verifique se a Edge Function "delete-user" esta ativa no Supabase.',
    }
  }

  throw new Error(message)
}

export async function atualizarRole(userId: string, role: string) {
  const { data, error } = await callAdminFunction<Record<string, unknown>>('update-role', { userId, role })
  if (error || !data) throw new Error(error || 'Erro ao atualizar perfil')
  return data
}
