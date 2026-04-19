import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

async function extractFunctionErrorMessage(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response })?.context
  if (!context) return null

  try {
    const payload = await context.clone().json() as { error?: string; message?: string }
    return payload.error ?? payload.message ?? null
  } catch {
    try {
      const text = await context.clone().text()
      return text || null
    } catch {
      return null
    }
  }
}

/** Chama uma Edge Function autenticada com o JWT da sessão atual */
export async function callAdminFunction<T = unknown>(
  name: 'create-user' | 'delete-user' | 'update-role' | 'send-urgent-occurrence-email',
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  const buildAdminFnUnavailableMessage = () =>
    `Nao foi possivel contactar a funcao administrativa "${name}". Verifique se a Edge Function foi deployada no projeto Supabase e se CORS esta configurado.`

  let token: string | undefined
  const { data: sessionData } = await supabase.auth.getSession()
  token = sessionData.session?.access_token

  if (!token) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      return { data: null, error: 'Sessao invalida ou expirada. Inicie sessao novamente.' }
    }
    token = refreshed.session?.access_token
  }

  if (!token) {
    return { data: null, error: 'Sessao invalida ou expirada. Inicie sessao novamente.' }
  }

  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    })

    if (error) {
      const detailedError = await extractFunctionErrorMessage(error)
      const raw = (error.message || '').toLowerCase()
      if (raw.includes('401') || raw.includes('unauthorized')) {
        return { data: null, error: 'Sessao invalida ou expirada. Inicie sessao novamente.' }
      }
      if (raw.includes('403') || raw.includes('forbidden')) {
        return { data: null, error: 'Sem permissao para esta acao. Apenas administradores podem executar esta operacao.' }
      }
      if (
        raw.includes('failed to fetch') ||
        raw.includes('failed to send a request') ||
        raw.includes('networkerror')
      ) {
        return { data: null, error: buildAdminFnUnavailableMessage() }
      }
      return { data: null, error: detailedError || error.message || 'Erro ao chamar função administrativa' }
    }
    return { data: (data as T) ?? null, error: null }
  } catch (error: unknown) {
    const raw = error instanceof Error ? error.message.toLowerCase() : ''
    if (
      raw.includes('failed to fetch') ||
      raw.includes('failed to send a request') ||
      raw.includes('networkerror')
    ) {
      return {
        data: null,
        error: buildAdminFnUnavailableMessage(),
      }
    }
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
