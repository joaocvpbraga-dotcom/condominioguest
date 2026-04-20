import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
}

type UrgentPayload = {
  ocorrenciaId: string
  titulo: string
  tipo: string
  prioridade: string
  autorNome: string
  condominioId: string
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: callerProfile, error: callerProfileErr } = await adminClient
      .from('profiles')
      .select('id, nome, email, condominio_id')
      .eq('id', caller.id)
      .single()

    if (callerProfileErr || !callerProfile?.condominio_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json() as UrgentPayload
    if (!payload?.ocorrenciaId || !payload?.titulo || !payload?.condominioId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (payload.condominioId !== callerProfile.condominio_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: admins, error: adminsErr } = await adminClient
      .from('profiles')
      .select('email')
      .eq('condominio_id', callerProfile.condominio_id)
      .eq('role', 'admin')

    if (adminsErr) {
      return new Response(JSON.stringify({ error: adminsErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipients = (admins ?? [])
      .map(a => (a.email ?? '').trim())
      .filter(Boolean)

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'Sem emails de administradores para envio.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('URGENT_ALERT_FROM_EMAIL') ?? 'CondoGest <onboarding@resend.dev>'

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada no Supabase.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = `[URGENTE] Nova ocorrência: ${payload.titulo}`
    const text = [
      'Foi registada uma ocorrência com prioridade urgente.',
      `Título: ${payload.titulo}`,
      `Tipo: ${payload.tipo}`,
      `Prioridade: ${payload.prioridade}`,
      `Autor: ${payload.autorNome}`,
      `ID: ${payload.ocorrenciaId}`,
    ].join('\n')

    const html = `
      <h2>Nova ocorrência urgente</h2>
      <p>Foi registada uma ocorrência com prioridade <strong>urgente</strong>.</p>
      <ul>
        <li><strong>Título:</strong> ${payload.titulo}</li>
        <li><strong>Tipo:</strong> ${payload.tipo}</li>
        <li><strong>Prioridade:</strong> ${payload.prioridade}</li>
        <li><strong>Autor:</strong> ${payload.autorNome}</li>
        <li><strong>ID:</strong> ${payload.ocorrenciaId}</li>
      </ul>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        html,
        text,
      }),
    })

    if (!emailRes.ok) {
      const raw = await emailRes.text()
      return new Response(JSON.stringify({ error: `Falha no envio de email: ${raw}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, sent: true, recipients: recipients.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
