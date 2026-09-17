import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN')!;

serve(async (req) => {
  try {
    const token = req.headers.get('asaas-access-token');
    if (token !== ASAAS_WEBHOOK_TOKEN) {
      return new Response('Não autorizado', { status: 401 });
    }

    const payload = await req.json();
    const evento = payload.event;
    const pagamento = payload.payment;
    const subscriptionObj = payload.subscription;

    const subscriptionId = pagamento?.subscription ?? subscriptionObj?.id;

    if (!subscriptionId) {
      return new Response(JSON.stringify({ ok: true, ignorado: true }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Localiza a assinatura pelo subscription_id
    //    (tabela assinaturas só tem: id, usuario_id, plano_id, asaas_customer_id,
    //     asaas_subscription_id, status, criado_em, empresa_id, ultimo_pagamento_em,
    //     vencimento_em, atualizado_em)
    const { data: assinatura, error: erroAssinatura } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('asaas_subscription_id', subscriptionId)
      .maybeSingle();

    if (erroAssinatura || !assinatura) {
      return new Response(JSON.stringify({ ok: true, ignorado: true, motivo: 'assinatura não encontrada' }), { status: 200 });
    }

    let novoStatus: string | null = null;
    let confirmado = false;

    switch (evento) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        novoStatus = 'ativa';
        confirmado = true;
        break;
      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        novoStatus = 'expirada';
        break;
      default:
        novoStatus = null;
    }

    // Update em `assinaturas` -> só colunas que EXISTEM nessa tabela
    const updateAssinatura: Record<string, unknown> = {
      atualizado_em: new Date().toISOString(),
    };

    if (pagamento) {
      updateAssinatura.vencimento_em = pagamento.dueDate ?? null;
      if (confirmado) {
        updateAssinatura.ultimo_pagamento_em = pagamento.paymentDate ?? new Date().toISOString();
      }
    }

    if (novoStatus) {
      updateAssinatura.status = novoStatus;
    }

    const { error: erroUpdateAssinatura } = await supabase
      .from('assinaturas')
      .update(updateAssinatura)
      .eq('id', assinatura.id);

    if (erroUpdateAssinatura) {
      console.error('Erro ao atualizar assinatura via webhook:', erroUpdateAssinatura);
      return new Response(JSON.stringify({ ok: false, error: erroUpdateAssinatura }), { status: 500 });
    }

    // 2. Se pagamento CONFIRMADO -> promove os dados para `licencas`
    if (confirmado) {
      // Busca o plano COMPLETO (assinaturas não guarda regras do plano)
      const { data: plano, error: erroPlano } = await supabase
        .from('planos')
        .select('nome, descricao, valor, duracao_dias, usa_periodo, usa_limite_lotes, limite_lotes, usa_limite_frangos, limite_frangos')
        .eq('id', assinatura.plano_id)
        .maybeSingle();

      if (erroPlano || !plano) {
        console.error('Erro ao buscar plano para promoção de licença:', erroPlano);
        return new Response(JSON.stringify({ ok: false, error: erroPlano ?? 'Plano não encontrado' }), { status: 500 });
      }

      const hoje = new Date();
      let dataFinal: string | null = null;
      if (plano.usa_periodo) {
        const dias = plano.duracao_dias ?? 30;
        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + dias);
        dataFinal = dataExpiracao.toISOString().split('T')[0];
      }

      const { error: erroLicenca } = await supabase
        .from('licencas')
        .update({
          status: 'ativa',
          plano_id: assinatura.plano_id,
          plano_nome: plano.nome,
          plano_descricao: plano.descricao,
          asaas_customer_id: assinatura.asaas_customer_id,
          asaas_subscription_id: assinatura.asaas_subscription_id,
          cobranca_id: pagamento?.id ?? null,
          pagamento_status: evento,
          valor_pago: pagamento?.value ?? plano.valor,
          usa_periodo: plano.usa_periodo,
          usa_limite_lotes: plano.usa_limite_lotes,
          limite_lotes: plano.limite_lotes,
          usa_limite_frangos: plano.usa_limite_frangos,
          limite_frangos: plano.limite_frangos,
          data_inicial: hoje.toISOString().split('T')[0],
          data_final: dataFinal,
          expira_em: dataFinal,
          vencimento_em: pagamento?.dueDate ?? null,
          ultimo_pagamento_em: pagamento?.paymentDate ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('empresa_id', assinatura.empresa_id);

      if (erroLicenca) {
        console.error('Erro ao promover assinatura para licença:', erroLicenca);
        return new Response(JSON.stringify({ ok: false, error: erroLicenca }), { status: 500 });
      }

      // Marca outras assinaturas ativas antigas dessa empresa como substituídas
      await supabase
        .from('assinaturas')
        .update({ status: 'substituida', atualizado_em: new Date().toISOString() })
        .eq('empresa_id', assinatura.empresa_id)
        .neq('id', assinatura.id)
        .eq('status', 'ativa');
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('Erro no webhook Asaas:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
