// supabase/functions/cadastrar-empresa/index.ts
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      empresaId,
      nomeEmpresa,
      nomeUsuario,
      cpf,
      senha,
      emailContato,
      tipoPessoa,
      cpfCnpj,
      responsavel,
      telefone,
      paisId,
      estadoId,
      cidade,
      tipoEmpresa,
      codigoIntegracao,
    } = await req.json();

    const camposObrigatorios = [
      empresaId, nomeEmpresa, nomeUsuario, cpf, senha,
      tipoPessoa, cpfCnpj, responsavel, telefone,
      paisId, estadoId, cidade, tipoEmpresa,
    ];

    if (camposObrigatorios.some((c) => c === undefined || c === null || c === '')) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tipoEmpresa === 'Integrado' && !codigoIntegracao) {
      return new Response(
        JSON.stringify({ error: 'Selecione a empresa de Integração vinculada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');
    const emailSintetico = `${cpfLimpo}-${empresaId}@gestaoavi.com`;

    const { data: empresaExistente } = await supabaseAdmin
      .from('empresas')
      .select('id')
      .eq('id', empresaId)
      .maybeSingle();

    if (empresaExistente) {
      return new Response(
        JSON.stringify({ error: 'Conflito ao gerar identificador da empresa. Tente novamente.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailSintetico,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nomeUsuario, cpf: cpfLimpo },
    });

    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: authError?.message ?? 'Erro ao criar usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    const { error: empresaError } = await supabaseAdmin.from('empresas').insert({
      id: empresaId,
      nome: nomeEmpresa,
      owner_id: userId,
      tipopessoa: tipoPessoa,
      cpf_cnpj: cpfCnpjLimpo,
      responsavel,
      telefone,
      email: emailContato?.trim() || null,
      pais_id: paisId,
      estado_id: estadoId,
      cidade,
      tipo: tipoEmpresa,
      codigo_integracao: tipoEmpresa === 'Integrado' ? codigoIntegracao : null,
    });

    if (empresaError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: empresaError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: perfilError } = await supabaseAdmin.from('perfis').insert({
      id: userId,
      nome: nomeUsuario,
      email: emailSintetico,
      email_contato: emailContato?.trim() || null,
      empresa_id: empresaId,
      papel_id: 1,
      cpf: cpfLimpo,
    });

    if (perfilError) {
      await supabaseAdmin.from('empresas').delete().eq('id', empresaId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: perfilError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: licencaError } = await supabaseAdmin.from('licencas').insert({
      empresa_id: empresaId,
      status: 'trial',
      limite_lotes: 3,
      lotes_gerados: 0,
      trial_inicio: new Date().toISOString().slice(0, 10),
      trial_dias: 14,
    });

    if (licencaError) {
      await supabaseAdmin.from('perfis').delete().eq('id', userId);
      await supabaseAdmin.from('empresas').delete().eq('id', empresaId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: licencaError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, userId, empresaId, email: emailSintetico }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

