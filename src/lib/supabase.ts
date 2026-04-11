import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Chama uma Edge Function autenticada com o JWT da sessão atual */
export async function callAdminFunction<T = unknown>(
  name: 'create-user' | 'delete-user' | 'update-role',
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Sessão inválida' }

  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error ?? `Erro ${res.status}` }
  return { data: json as T, error: null }
}

/** Cliente isolado para criar utilizadores sem sobrepor a sessão do admin */
export function createIsolatedClient() {
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
