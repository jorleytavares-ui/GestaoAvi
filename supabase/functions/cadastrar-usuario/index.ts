import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function gerarEmailSintetico(cpf: string, empresaId: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return `${cpfLimpo}-${empresaId}@gestaoavi.com`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nome, senha, telefone, empresa_id, papel_id, cpf, emailContato } = await req.json();

    if (!senha || !empresa_id || !papel_id || !cpf) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: senha, empresa_id, papel_id, cpf' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cpfLimpo = cpf.replace(/\D/g, '');

    const { data: perfilExistente } = await supabaseAdmin
      .from('perfis')
      .select('id')
      .eq('cpf', cpfLimpo)
      .eq('empresa_id', empresa_id)
      .maybeSingle();

    if (perfilExistente) {
      return new Response(
        JSON.stringify({ error: 'Este CPF já está cadastrado nesta empresa.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailSintetico = gerarEmailSintetico(cpfLimpo, empresa_id);

    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailSintetico,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        telefone: telefone ?? null,
        cpf: cpfLimpo,
      },
    });

    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: authError?.message ?? 'Erro ao criar usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    const { error: perfilError } = await supabaseAdmin.from('perfis').insert({
      id: userId,
      nome,
      email: emailSintetico,
      email_contato: emailContato?.trim() || null,
      telefone,
      empresa_id,
      papel_id,
      cpf: cpfLimpo,
    });

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: perfilError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, userId, email: emailSintetico }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
