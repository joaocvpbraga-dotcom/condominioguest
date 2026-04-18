import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Chama uma Edge Function autenticada com o JWT da sessão atual */
export async function callAdminFunction<T = unknown>(
  name: 'create-user' | 'delete-user' | 'update-role',
  body: Record<string, unknown>,
  accessToken?: string
): Promise<{ data: T | null; error: string | null }> {
  let token = accessToken
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  }
  if (!token) return { data: null, error: 'Sessão inválida' }

  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    })

    if (error) return { data: null, error: error.message || 'Erro ao chamar função administrativa' }
    return { data: (data as T) ?? null, error: null }
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Falha de rede ao chamar função administrativa',
    }
  }
}

/** Cliente isolado para criar utilizadores sem sobrepor a sessão do admin */
export function createIsolatedClient() {
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
