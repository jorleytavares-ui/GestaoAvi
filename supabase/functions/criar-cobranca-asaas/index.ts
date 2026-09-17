import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!;
const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const DIAS_JANELA_RENOVACAO = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { empresaId, planoId, usuarioId, cicloCobranca, forcar } = await req.json();

    if (!empresaId || !planoId || !usuarioId) {
      return new Response(
        JSON.stringify({ error: 'empresaId, planoId e usuarioId são obrigatórios' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Empresa
    const { data: empresa, error: erroEmpresa } = await supabase
      .from('empresas')
      .select('id, nome, cpf_cnpj, email, telefone, tipopessoa')
      .eq('id', empresaId)
      .single();

    if (erroEmpresa || !empresa) {
      return new Response(
        JSON.stringify({ error: 'Empresa não encontrada' }),
        { status: 404, headers: corsHeaders }
      );
    }

    const cpfCnpjLimpo = (empresa.cpf_cnpj ?? '').replace(/\D/g, '');
    if (cpfCnpjLimpo.length !== 11 && cpfCnpjLimpo.length !== 14) {
      return new Response(
        JSON.stringify({
          error: 'CPF/CNPJ da empresa está ausente ou inválido no cadastro. Atualize o cadastro antes de gerar a cobrança.',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!empresa.email) {
      return new Response(
        JSON.stringify({ error: 'Empresa sem e-mail cadastrado' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Plano
    const { data: plano, error: erroPlano } = await supabase
      .from('planos')
      .select('id, nome, descricao, valor, duracao_dias, usa_periodo, usa_limite_lotes, limite_lotes, usa_limite_frangos, limite_frangos, eh_trial')
      .eq('id', planoId)
      .single();

    if (erroPlano || !plano) {
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 3. Licença atual da empresa (fonte da verdade para o app)
    const { data: licencaAtual, error: erroLicenca } = await supabase
      .from('licencas')
      .select('id, status, data_final, expira_em, asaas_customer_id')
      .eq('empresa_id', empresa.id)
      .maybeSingle();

    if (erroLicenca) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar licença da empresa', detalhes: erroLicenca }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!licencaAtual) {
      return new Response(
        JSON.stringify({ error: 'Licença da empresa não encontrada. Verifique o cadastro inicial.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 3.1 Aviso de licença ativa fora da janela de renovação (10 dias)
    const dataReferencia = licencaAtual.data_final ?? licencaAtual.expira_em;
    if (licencaAtual.status === 'ativa' && dataReferencia && !forcar) {
      const hoje = new Date();
      const dataFinal = new Date(dataReferencia);
      const diasRestantes = Math.ceil((dataFinal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diasRestantes > DIAS_JANELA_RENOVACAO) {
        return new Response(
          JSON.stringify({
            avisoLicencaAtiva: true,
            dataFinal: dataReferencia,
            diasRestantes,
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // 4. Já existe assinatura PENDENTE (aguardando pagamento) para esta empresa?
    //    -> Reimprime o boleto/Pix existente, sem criar cobrança duplicada.
    const { data: assinaturaPendente } = await supabase
      .from('assinaturas')
      .select('id, asaas_subscription_id, plano_id')
      .eq('empresa_id', empresa.id)
      .eq('status', 'pendente')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assinaturaPendente?.asaas_subscription_id) {
      const subCheckResp = await fetch(
        `${ASAAS_API_URL}/subscriptions/${assinaturaPendente.asaas_subscription_id}`,
        { headers: { access_token: ASAAS_API_KEY } }
      );

      if (subCheckResp.ok) {
        const subExistente = await subCheckResp.json();

        if (subExistente.status !== 'DELETED' && subExistente.status !== 'INACTIVE') {
          const pagamentosResp = await fetch(
            `${ASAAS_API_URL}/payments?subscription=${subExistente.id}&status=PENDING`,
            { headers: { access_token: ASAAS_API_KEY } }
          );
          const pagamentosExistentes = await pagamentosResp.json();
          const pagamentoPendente = pagamentosExistentes?.data?.[0];

          if (pagamentoPendente) {
            // ✅ Reimpressão: retorna o mesmo boleto/Pix já gerado
            return new Response(
              JSON.stringify({
                reimpressao: true,
                linkCheckout: pagamentoPendente.invoiceUrl,
                asaasSubscriptionId: subExistente.id,
              }),
              { status: 200, headers: corsHeaders }
            );
          }
        }
      }
    }

    // 5. Cliente na Asaas (customer_id fica salvo na licença, é reaproveitado entre planos)
    let asaasCustomerId = licencaAtual.asaas_customer_id ?? null;

    if (asaasCustomerId) {
      const checkResp = await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        headers: { access_token: ASAAS_API_KEY },
      });
      if (!checkResp.ok) {
        asaasCustomerId = null;
      }
    }

    if (!asaasCustomerId) {
      const buscaResp = await fetch(
        `${ASAAS_API_URL}/customers?cpfCnpj=${cpfCnpjLimpo}`,
        { headers: { access_token: ASAAS_API_KEY } }
      );
      const busca = await buscaResp.json();

      if (buscaResp.ok && busca?.data?.length > 0) {
        asaasCustomerId = busca.data[0].id;
      } else {
        const clienteResp = await fetch(`${ASAAS_API_URL}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            access_token: ASAAS_API_KEY,
          },
          body: JSON.stringify({
            name: empresa.nome,
            email: empresa.email,
            cpfCnpj: cpfCnpjLimpo,
            phone: (empresa.telefone ?? '').replace(/\D/g, '') || undefined,
          }),
        });

        const cliente = await clienteResp.json();

        if (!clienteResp.ok) {
          return new Response(
            JSON.stringify({ error: 'Erro ao criar cliente na Asaas', detalhes: cliente }),
            { status: 400, headers: corsHeaders }
          );
        }

        asaasCustomerId = cliente.id;
      }
    }

    // 6. Cria a nova assinatura recorrente na Asaas
    const hoje = new Date();
    const proximoVencimento = new Date(hoje);
    proximoVencimento.setDate(hoje.getDate() + 3);

    const assinaturaResp = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: plano.valor,
        nextDueDate: proximoVencimento.toISOString().split('T')[0],
        cycle: cicloCobranca ?? 'MONTHLY',
        description: `Assinatura plano ${plano.nome} - ${empresa.nome}`,
      }),
    });

    const assinaturaAsaas = await assinaturaResp.json();

    if (!assinaturaResp.ok) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar assinatura na Asaas', detalhes: assinaturaAsaas }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 7. Busca o link de checkout do primeiro pagamento gerado
    const pagamentosResp = await fetch(
      `${ASAAS_API_URL}/payments?subscription=${assinaturaAsaas.id}`,
      { headers: { access_token: ASAAS_API_KEY } }
    );
    const pagamentos = await pagamentosResp.json();
    const primeiroPagamento = pagamentos?.data?.[0];
    const linkCheckout = primeiroPagamento?.invoiceUrl ?? null;

    // 8. Persiste asaas_customer_id na licença (reaproveitável), sem tocar no restante
    await supabase
      .from('licencas')
      .update({ asaas_customer_id: asaasCustomerId, updated_at: new Date().toISOString() })
      .eq('empresa_id', empresa.id);

    // 9. Marca qualquer assinatura pendente antiga como substituída (segurança)
    await supabase
      .from('assinaturas')
      .update({ status: 'substituida', atualizado_em: new Date().toISOString() })
      .eq('empresa_id', empresa.id)
      .eq('status', 'pendente');

    // 10. Cria a NOVA linha em `assinaturas` -> SOMENTE colunas que existem na tabela real:
    //     id, usuario_id, plano_id, asaas_customer_id, asaas_subscription_id, status,
    //     criado_em, empresa_id, ultimo_pagamento_em, vencimento_em, atualizado_em
    const { data: novaAssinatura, error: erroInsert } = await supabase
      .from('assinaturas')
      .insert({
        usuario_id: usuarioId,
        empresa_id: empresa.id,
        plano_id: plano.id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: assinaturaAsaas.id,
        status: 'pendente',
        vencimento_em: primeiroPagamento?.dueDate ?? null,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (erroInsert) {
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar assinatura pendente', detalhes: erroInsert }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        assinatura: novaAssinatura,
        linkCheckout,
        asaasSubscriptionId: assinaturaAsaas.id,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
