import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: callerProfile } = await adminClient.from('profiles').select('role, condominio_id').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { userId } = await req.json()
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: 'Nao e permitido eliminar o proprio utilizador.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Confirmar que o utilizador a eliminar pertence ao mesmo condomínio
    const { data: targetProfile, error: targetProfileErr } = await adminClient
      .from('profiles')
      .select('condominio_id')
      .eq('id', userId)
      .single()
    if (targetProfileErr || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Perfil do utilizador nao encontrado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (targetProfile?.condominio_id !== callerProfile.condominio_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Remover referencias em fracoes para evitar violacao de FK ao apagar o perfil.
    const { error: fracoesOwnerErr } = await adminClient
      .from('fracoes')
      .update({ proprietario_id: null })
      .eq('condominio_id', callerProfile.condominio_id)
      .eq('proprietario_id', userId)
    if (fracoesOwnerErr) {
      return new Response(JSON.stringify({ error: fracoesOwnerErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: fracoesTenantErr } = await adminClient
      .from('fracoes')
      .update({ inquilino_id: null })
      .eq('condominio_id', callerProfile.condominio_id)
      .eq('inquilino_id', userId)
    if (fracoesTenantErr) {
      const rawTenantErr = (fracoesTenantErr.message || '').toLowerCase()
      // Some databases do not have fracoes.inquilino_id yet; do not block delete in that case.
      if (!rawTenantErr.includes("could not find the 'inquilino_id' column")) {
        return new Response(JSON.stringify({ error: fracoesTenantErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Apagar da BD primeiro, depois do Auth
    const { error: profileDeleteErr } = await adminClient.from('profiles').delete().eq('id', userId)
    if (profileDeleteErr) {
      return new Response(JSON.stringify({ error: profileDeleteErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteErr) {
      const raw = (deleteErr.message || '').toLowerCase()
      if (raw.includes('user not found')) {
        return new Response(JSON.stringify({
          success: true,
          warning: 'Perfil removido. A conta de autenticacao ja nao existia no Auth.',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
