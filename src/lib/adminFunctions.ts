export async function criarUtilizador({ email, password, nome }: {
  email: string
  password: string
  nome: string
}) {
  const res = await fetch(
    'https://kypvylnyugmiukobsjoi.supabase.co/functions/v1/super-task',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, nome }),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Erro ao criar utilizador')
  }

  return data
}
