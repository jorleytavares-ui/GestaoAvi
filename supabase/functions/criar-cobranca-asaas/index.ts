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


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { empresaId, planoId, cicloCobranca } = await req.json();

    if (!empresaId || !planoId) {
      return new Response(
        JSON.stringify({ error: 'empresaId e planoId são obrigatórios' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Busca dados da empresa
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

    // Valida CPF/CNPJ antes de qualquer chamada à Asaas
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

    // 2. Busca dados do plano
    const { data: plano, error: erroPlano } = await supabase
      .from('planos')
      .select('id, nome, descricao, valor, duracao_dias, usa_periodo, usa_limite_lotes, limite_lotes, usa_limite_frangos, limite_frangos')
      .eq('id', planoId)
      .single();

    if (erroPlano || !plano) {
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 3. Busca a licença existente da empresa
    const { data: licencaExistente, error: erroLicencaExistente } = await supabase
      .from('licencas')
      .select('id, asaas_customer_id, asaas_subscription_id')
      .eq('empresa_id', empresa.id)
      .maybeSingle();

    if (erroLicencaExistente) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar licença da empresa', detalhes: erroLicencaExistente }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!licencaExistente) {
      return new Response(
        JSON.stringify({ error: 'Licença da empresa não encontrada. Verifique o cadastro inicial.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    let asaasCustomerId = licencaExistente.asaas_customer_id ?? null;

    // ✅ 3.1 Se já existe uma subscription vinculada, verifica se ainda está válida
    //     e reaproveita o pagamento pendente (evita duplicar boletos/pix)
    if (licencaExistente.asaas_subscription_id) {
      const subCheckResp = await fetch(
        `${ASAAS_API_URL}/subscriptions/${licencaExistente.asaas_subscription_id}`,
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
            // Já existe cobrança pendente: retorna sem criar nada novo
            return new Response(
              JSON.stringify({
                licenca: licencaExistente,
                linkCheckout: pagamentoPendente.invoiceUrl,
                asaasSubscriptionId: subExistente.id,
              }),
              { status: 200, headers: corsHeaders }
            );
          }
        }
      }
    }

    // 4. Verifica/cria cliente na Asaas
    if (asaasCustomerId) {
      const checkResp = await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        headers: { access_token: ASAAS_API_KEY },
      });
      if (!checkResp.ok) {
        asaasCustomerId = null; // força recriação
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

    // 5. Cria a assinatura recorrente na Asaas (só chega aqui se NÃO havia pagamento pendente)
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

    // 6. Busca o link de checkout do primeiro pagamento gerado
    const pagamentosResp = await fetch(
      `${ASAAS_API_URL}/payments?subscription=${assinaturaAsaas.id}`,
      { headers: { access_token: ASAAS_API_KEY } }
    );
    const pagamentos = await pagamentosResp.json();
    const primeiroPagamento = pagamentos?.data?.[0];
    const linkCheckout = primeiroPagamento?.invoiceUrl ?? null;

    // 7. Calcula data de expiração
    let expiraEm: string | null = null;
    if (plano.usa_periodo && plano.duracao_dias) {
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + plano.duracao_dias);
      expiraEm = dataExpiracao.toISOString().split('T')[0];
    }

    // 8. Atualiza a licença existente
    const { data: licencaAtualizada, error: erroUpdate } = await supabase
      .from('licencas')
      .update({
        plano_id: plano.id,
        plano_nome: plano.nome,
        plano_descricao: plano.descricao,
        status: 'aguardando_pagamento',
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: assinaturaAsaas.id,
        cobranca_id: primeiroPagamento?.id ?? null,
        pagamento_status: 'PENDING',
        valor_pago: plano.valor,
        usa_periodo: plano.usa_periodo,
        usa_limite_lotes: plano.usa_limite_lotes,
        limite_lotes: plano.limite_lotes,
        usa_limite_frangos: plano.usa_limite_frangos,
        limite_frangos: plano.limite_frangos,
        data_inicial: new Date().toISOString().split('T')[0],
        data_final: expiraEm,
        expira_em: expiraEm,
        vencimento_em: primeiroPagamento?.dueDate ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('empresa_id', empresa.id)
      .select()
      .single();

    if (erroUpdate) {
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar licença no banco', detalhes: erroUpdate }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        licenca: licencaAtualizada,
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
