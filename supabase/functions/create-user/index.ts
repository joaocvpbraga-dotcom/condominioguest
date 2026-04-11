import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verificar que o caller é um admin autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente anon para verificar o JWT do caller
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    // Verificar que o caller é admin
    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: callerProfile } = await adminClient.from('profiles').select('role, condominio_id').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })

    const { email, password, nome, role } = await req.json()
    if (!email || !password || !nome) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders })

    // Criar utilizador no Auth
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders })

    const userId = created.user!.id

    // Criar perfil
    const { error: profileErr } = await adminClient.from('profiles').upsert({
      id: userId,
      nome,
      email,
      role: role ?? 'morador',
      condominio_id: callerProfile.condominio_id,
      created_at: new Date().toISOString(),
    })
    if (profileErr) {
      // Reverter: apagar utilizador criado
      await adminClient.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ id: userId, nome, email, role: role ?? 'morador', condominio_id: callerProfile.condominio_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
