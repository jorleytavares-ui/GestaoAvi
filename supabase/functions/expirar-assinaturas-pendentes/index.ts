import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DIAS_LIMITE_PENDENCIA = 3;

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_LIMITE_PENDENCIA);

    const { data: pendentesAntigas, error } = await supabase
      .from('assinaturas')
      .select('id')
      .eq('status', 'pendente')
      .lt('criado_em', limite.toISOString());

    if (error) {
      console.error('Erro ao buscar pendências antigas:', error);
      return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
    }

    if (!pendentesAntigas || pendentesAntigas.length === 0) {
      return new Response(JSON.stringify({ ok: true, expiradas: 0 }), { status: 200 });
    }

    const ids = pendentesAntigas.map((a) => a.id);

    const { error: erroUpdate } = await supabase
      .from('assinaturas')
      .update({ status: 'expirada', atualizado_em: new Date().toISOString() })
      .in('id', ids);

    if (erroUpdate) {
      console.error('Erro ao expirar pendências:', erroUpdate);
      return new Response(JSON.stringify({ ok: false, error: erroUpdate }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, expiradas: ids.length }), { status: 200 });
  } catch (e) {
    console.error('Erro no cron de expiração:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
