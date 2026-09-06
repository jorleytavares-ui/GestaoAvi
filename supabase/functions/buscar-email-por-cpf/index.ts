// supabase/functions/buscar-email-por-cpf/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { cpf } = await req.json();

  if (!cpf) {
    return new Response(JSON.stringify({ error: 'CPF é obrigatório.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const cpfLimpo = cpf.replace(/\D/g, '');

  const { data: perfis, error } = await supabaseAdmin
    .from('perfis')
    .select('id, empresa_id, empresas(nome)')
    .eq('cpf', cpfLimpo);

  if (error || !perfis || perfis.length === 0) {
    return new Response(JSON.stringify({ error: 'CPF não encontrado.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const opcoes = [];
  for (const perfil of perfis) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(perfil.id);
    if (userData?.user?.email) {
      opcoes.push({
        email: userData.user.email,
        empresaId: perfil.empresa_id,
        empresaNome: (perfil as any).empresas?.nome ?? 'Empresa',
      });
    }
  }

  if (opcoes.length === 0) {
    return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (opcoes.length === 1) {
    return new Response(JSON.stringify({ email: opcoes[0].email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ opcoes }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
