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

    // ✅ cobre tanto eventos de payment quanto de subscription
    const subscriptionId = pagamento?.subscription ?? subscriptionObj?.id;

    if (!subscriptionId) {
      return new Response(JSON.stringify({ ok: true, ignorado: true }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let novoStatus: string | null = null;

    switch (evento) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        novoStatus = 'ativa';
        break;
      case 'PAYMENT_OVERDUE':
        novoStatus = 'expirada';
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        novoStatus = 'expirada';
        break;
      default:
        novoStatus = null;
    }

    const updatePayload: Record<string, unknown> = {
      pagamento_status: evento,
      updated_at: new Date().toISOString(),
    };

    // ✅ só atualiza campos de pagamento se o evento realmente for de payment
    if (pagamento) {
      updatePayload.cobranca_id = pagamento.id ?? null;
      updatePayload.ultimo_pagamento_em = pagamento.paymentDate ?? null;
      updatePayload.vencimento_em = pagamento.dueDate ?? null;
      updatePayload.valor_pago = pagamento.value ?? null;
    }

    if (novoStatus) {
      updatePayload.status = novoStatus;
    }

    const { error } = await supabase
      .from('licencas')
      .update(updatePayload)
      .eq('asaas_subscription_id', subscriptionId);

    if (error) {
      console.error('Erro ao atualizar licença via webhook:', error);
      return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('Erro no webhook Asaas:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
