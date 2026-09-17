import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const hoje = new Date().toISOString().split('T')[0];

    // Busca licenças ativas cuja data_final (ou expira_em) já passou
    const { data: licencasVencidas, error } = await supabase
      .from('licencas')
      .select('id, data_final, expira_em')
      .eq('status', 'ativa')
      .or(`data_final.lt.${hoje},expira_em.lt.${hoje}`);

    if (error) {
      console.error('Erro ao buscar licenças vencidas:', error);
      return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
    }

    if (!licencasVencidas || licencasVencidas.length === 0) {
      return new Response(JSON.stringify({ ok: true, expiradas: 0 }), { status: 200 });
    }

    const ids = licencasVencidas.map((l) => l.id);

    const { error: erroUpdate } = await supabase
      .from('licencas')
      .update({ status: 'expirada', updated_at: new Date().toISOString() })
      .in('id', ids);

    if (erroUpdate) {
      console.error('Erro ao expirar licenças:', erroUpdate);
      return new Response(JSON.stringify({ ok: false, error: erroUpdate }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, expiradas: ids.length }), { status: 200 });
  } catch (e) {
    console.error('Erro no cron de expiração de licenças:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
