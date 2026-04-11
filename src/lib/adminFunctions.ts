const SUPER_TASK_URL = 'https://kypvylnyugmiukobsjoi.supabase.co/functions/v1/super-task'

export async function criarUtilizador({ email, password, nome }: {
  email: string
  password: string
  nome: string
}) {
  const res = await fetch(SUPER_TASK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', email, password, nome }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao criar utilizador')
  return data
}

export async function eliminarUtilizador(userId: string, accessToken: string) {
  const res = await fetch(SUPER_TASK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'delete', userId }),
  })

  const text = await res.text()
  let data: Record<string, unknown> = {}
  try { data = JSON.parse(text) } catch { /* ignore */ }
  if (!res.ok) throw new Error(data.error as string || `HTTP ${res.status}: ${text}`)
  return data
}

export async function atualizarRole(userId: string, role: string, accessToken: string) {
  const res = await fetch(SUPER_TASK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'update-role', userId, role }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao atualizar perfil')
  return data
}
