// src/storage/sync.ts
import { supabase } from '../lib/supabase';
import {
  getLotes,
  upsertLote,
  getFaixaConforto,
  isFaixaConfortoPendente,
  limparFaixaConfortoPendente,
  salvarFaixaConfortoLocal,
  getExclusoesPendentes,
  limparExclusaoPendente,
} from './storage';

import { Lote } from '../utils/calculations';

let syncEmAndamento = false;
const SYNC_ENABLED = true; // ✅ reativado

export interface ResultadoSync {
  sucesso: number;
  falhas: number;
}

// Helper: pega o usuário logado atual (necessário pois storage.ts agora
// é multiusuário e exige userId em todas as suas funções).
// ✅ Usa getSession() (leitura local) em vez de getUser() (bate no servidor),
// para que push/pull/contadores funcionem também no modo offline.
async function getUsuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) throw new Error('Usuário não autenticado.');
  return userId;
}

export async function marcarComoPendente(loteId: string): Promise<void> {
  const userId = await getUsuarioAtualId();
  const lotes = await getLotes(userId);
  const lote = lotes.find((l) => l.id === loteId);
  if (!lote) return;

  await upsertLote(userId, { ...lote, syncStatus: 'pendente', syncError: null });
}

// ---------- PUSH ----------
// ---------- PUSH ----------
export async function enviarLotesPendentes(
  empresaId: string,
  ownerId: string
): Promise<ResultadoSync> {
  if (!SYNC_ENABLED) return { sucesso: 0, falhas: 0 };
  if (syncEmAndamento) return { sucesso: 0, falhas: 0 };
  syncEmAndamento = true;

  let sucesso = 0;
  let falhas = 0;

  try {
    const userId = await getUsuarioAtualId();
    const lotes = await getLotes(userId);
    const pendentes = lotes.filter(
      (l) => l.syncStatus === 'pendente' || l.syncStatus === 'erro' || !l.syncStatus
    );

    for (const lote of pendentes) {
      try {
        const payload: Record<string, any> = {
          id: lote.id,
          empresa_id: empresaId,
          numero: lote.numero,
          linhagem: lote.linhagem,
          status: lote.status,
          owner_id: lote.ownerId ?? ownerId,
          data: lote,
        };

        // ✅ Verifica se o lote já existe no servidor.
        // Isso evita usar upsert (que sempre executa como INSERT ... ON CONFLICT
        // e nunca dispara triggers BEFORE UPDATE, além de recontar na licença
        // a cada edição de aba do lote).
        const { data: existente, error: checkError } = await supabase
          .from('lotes')
          .select('id')
          .eq('id', lote.id)
          .maybeSingle();

        if (checkError) {
          await upsertLote(userId, {
            ...lote,
            syncStatus: 'erro',
            syncError: checkError.message,
            syncUpdatedAt: new Date().toISOString(),
          });
          falhas++;
          continue;
        }

        let error;

        if (existente) {
          // Lote já existe → UPDATE real, dispara trigger de transferência
          // e NÃO conta como novo lote na licença.
          const { error: updateError } = await supabase
            .from('lotes')
            .update(payload)
            .eq('id', lote.id);
          error = updateError;
        } else {
          // Lote novo → INSERT, dispara validação/contagem de licença
          // normalmente (é uma criação real).
          const { error: insertError } = await supabase
            .from('lotes')
            .insert(payload);
          error = insertError;
        }

        if (error) {
          await upsertLote(userId, {
            ...lote,
            syncStatus: 'erro',
            syncError: error.message,
            syncUpdatedAt: new Date().toISOString(),
          });
          falhas++;
          continue;
        }

        const { data: atual } = await supabase
          .from('lotes')
          .select('owner_id, liberado, liberado_em, liberado_por, perfis:owner_id (nome)')
          .eq('id', lote.id)
          .single();

        const ownerNome = (atual as any)?.perfis?.nome ?? null;

        await upsertLote(userId, {
          ...lote,
          ownerId: atual?.owner_id ?? lote.ownerId,
          ownerNome,
          liberado: atual?.liberado ?? false,
          liberadoEm: atual?.liberado_em ?? null,
          liberadoPor: atual?.liberado_por ?? null,
          syncStatus: 'sincronizado',
          syncError: null,
          syncUpdatedAt: new Date().toISOString(),
        });
        sucesso++;
      } catch (e: any) {
        await upsertLote(userId, {
          ...lote,
          syncStatus: 'erro',
          syncError: e?.message ?? 'Erro desconhecido ao sincronizar.',
          syncUpdatedAt: new Date().toISOString(),
        });
        falhas++;
      }
    }
  } finally {
    syncEmAndamento = false;
  }

  return { sucesso, falhas };
}


// ---------- PULL ----------
export async function baixarLotesDoServidor(empresaId: string): Promise<ResultadoSync> {
  if (!SYNC_ENABLED) return { sucesso: 0, falhas: 0 };

  let sucesso = 0;
  let falhas = 0;

  try {
    const userId = await getUsuarioAtualId();

    const { data: remotos, error } = await supabase
      .from('lotes')
      .select('id, owner_id, liberado, liberado_em, liberado_por, data')
      .eq('empresa_id', empresaId);

    if (error || !remotos) {
      falhas++;
      return { sucesso, falhas };
    }

    // ✅ Busca os nomes de todos os owners envolvidos, de uma vez só
    const ownerIds = Array.from(new Set(remotos.map((r) => r.owner_id).filter(Boolean)));
    const { data: perfis } = await supabase
      .from('perfis')
      .select('id, nome')
      .in('id', ownerIds);

    const mapaNomes = new Map((perfis || []).map((p) => [p.id, p.nome]));

    const locais = await getLotes(userId);
    const mapaLocais = new Map(locais.map((l) => [l.id, l]));
    const exclusoesPendentes = await getExclusoesPendentes(userId);

    for (const remoto of remotos) {
      if (exclusoesPendentes.includes(remoto.id)) continue;
      try {
        const loteRemoto = remoto.data as Lote;
        const loteLocal = mapaLocais.get(remoto.id);
        const podeSobrescrever = !loteLocal || loteLocal.syncStatus === 'sincronizado';

        if (podeSobrescrever) {
          await upsertLote(userId, {
            ...loteRemoto,
            ownerId: remoto.owner_id,
            ownerNome: mapaNomes.get(remoto.owner_id) ?? null, // ← ADICIONADO
            liberado: remoto.liberado ?? false,
            liberadoEm: remoto.liberado_em ?? null,
            liberadoPor: remoto.liberado_por ?? null,
            syncStatus: 'sincronizado',
            syncError: null,
            syncUpdatedAt: new Date().toISOString(),
          });
          sucesso++;
        }
      } catch {
        falhas++;
      }
    }
  } catch {
    falhas++;
  }

  return { sucesso, falhas };
}




export async function enviarFaixaConfortoPendente(empresaId: string): Promise<void> {
  try {
    const userId = await getUsuarioAtualId();
    const pendente = await isFaixaConfortoPendente(userId);
    if (!pendente) return;

    const pontos = await getFaixaConforto(userId);

    const { error } = await supabase
      .from('faixa_conforto_config')
      .upsert(
        { empresa_id: empresaId, pontos, atualizado_em: new Date().toISOString() },
        { onConflict: 'empresa_id' }
      );

    if (!error) {
      await limparFaixaConfortoPendente(userId);
    }
  } catch (e) {
    console.log('Erro ao sincronizar faixa de conforto (push):', e);
  }
}

// ---------- Faixa de conforto: PULL ----------
export async function baixarFaixaConforto(empresaId: string): Promise<void> {
  try {
    const userId = await getUsuarioAtualId();

    // Se há alteração local pendente, não sobrescreve — evita perder
    // uma configuração feita offline que ainda não foi enviada.
    const pendente = await isFaixaConfortoPendente(userId);
    if (pendente) return;

    const { data, error } = await supabase
      .from('faixa_conforto_config')
      .select('pontos')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error || !data) return;

    await salvarFaixaConfortoLocal(userId, data.pontos);
  } catch (e) {
    console.log('Erro ao sincronizar faixa de conforto (pull):', e);
  }
}

// ---------- Orquestrador completo ----------
export async function sincronizarTudo(
  empresaId: string,
  ownerId: string
): Promise<{ push: ResultadoSync; pull: ResultadoSync }> {
  const push = await enviarLotesPendentes(empresaId, ownerId);

  // ✅ Envia exclusões pendentes antes do pull, para não trazer de volta
  // um lote que já foi excluído localmente.
  await enviarExclusoesPendentes();

  const pull = await baixarLotesDoServidor(empresaId);

  await enviarFaixaConfortoPendente(empresaId);
  await baixarFaixaConforto(empresaId);

  return { push, pull };
}


// ---------- Revalidação de licença (usado no modo OFFLINE) ----------
export async function revalidarLicenca(empresaId: string): Promise<{ liberado: boolean; motivo?: string }> {
  try {
    const { data, error } = await supabase
      .from('licencas')
      .select('status, limite_lotes, lotes_gerados, trial_inicio, trial_dias, expira_em')
      .eq('empresa_id', empresaId)
      .single();

    if (error || !data) return { liberado: false, motivo: 'Licença não encontrada.' };

    const hoje = new Date();

    if (data.status === 'trial') {
      const inicioTrial = new Date(data.trial_inicio);
      const fimTrial = new Date(inicioTrial);
      fimTrial.setDate(fimTrial.getDate() + (data.trial_dias ?? 14));
      const trialValido = hoje <= fimTrial;
      const limiteOk = (data.lotes_gerados ?? 0) < (data.limite_lotes ?? 3);
      return { liberado: trialValido && limiteOk, motivo: !trialValido ? 'Trial expirado.' : !limiteOk ? 'Limite de lotes atingido.' : undefined };
    }

    if (data.status === 'ativa') {
      const expirou = data.expira_em ? new Date(data.expira_em) < hoje : false;
      return { liberado: !expirou, motivo: expirou ? 'Licença expirada.' : undefined };
    }

    return { liberado: false, motivo: `Status da licença: ${data.status}` };
  } catch {
    return { liberado: false, motivo: 'Erro ao consultar licença.' };
  }
}

export async function contarPendentes(): Promise<number> {
  const userId = await getUsuarioAtualId();
  const lotes = await getLotes(userId);
  return lotes.filter((l) => l.syncStatus === 'pendente' || l.syncStatus === 'erro').length;
}

// ---------- PUSH: exclusões pendentes ----------
export async function enviarExclusoesPendentes(): Promise<ResultadoSync> {
  if (!SYNC_ENABLED) return { sucesso: 0, falhas: 0 };

  let sucesso = 0;
  let falhas = 0;

  try {
    const userId = await getUsuarioAtualId();
    const pendentes = await getExclusoesPendentes(userId);

    for (const loteId of pendentes) {
      try {
        const { error } = await supabase.from('lotes').delete().eq('id', loteId);
        if (!error) {
          await limparExclusaoPendente(userId, loteId);
          sucesso++;
        } else {
          falhas++;
        }
      } catch {
        falhas++;
      }
    }
  } catch {
    falhas++;
  }

  return { sucesso, falhas };
}
