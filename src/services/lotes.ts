// src/services/lotes.ts
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import { getLoteById, upsertLote } from '../storage/storage';


export async function assumirLote(loteId: string): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    throw new Error('Você precisa estar online para assumir este lote.');
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Usuário não autenticado.');

  const { data: lote, error: fetchError } = await supabase
    .from('lotes')
    .select('id, owner_id, liberado')
    .eq('id', loteId)
    .single();

  if (fetchError || !lote) throw new Error('Lote não encontrado.');
  if (!lote.liberado) throw new Error('Este lote não está liberado para transferência.');
  if (lote.owner_id === userId) throw new Error('Você já é o proprietário deste lote.');

// assumirLote — ao assumir, limpa os campos de liberação
const { data: updated, error: updateError } = await supabase
  .from('lotes')
  .update({
    owner_id: userId,
    liberado: false,
    liberado_em: null,
    liberado_por: null,
  })
  .eq('id', loteId)
  .eq('liberado', true)
  .select('id');




  if (updateError) throw updateError;
  if (!updated || updated.length === 0) {
    throw new Error('Este lote já foi assumido por outro usuário. Tente novamente.');
  }

  // 👇 Atualiza o cache local do usuário atual
  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome')
    .eq('id', userId)
    .single();

  const loteLocal = await getLoteById(userId, loteId);
  if (loteLocal) {
    await upsertLote(userId, {
  ...loteLocal,
  ownerId: userId,
  ownerNome: perfil?.nome ?? loteLocal.ownerNome ?? null,
  liberado: false,
  liberadoEm: null,
  liberadoPor: null,
  syncStatus: 'sincronizado',
} as any);

  }
}

export async function liberarLote(loteId: string): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    throw new Error('Você precisa estar online para liberar este lote.');
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Usuário não autenticado.');

  const { data: lote, error: fetchError } = await supabase
    .from('lotes')
    .select('id, owner_id, liberado')
    .eq('id', loteId)
    .single();

  if (fetchError || !lote) throw new Error('Lote não encontrado.');
  if (lote.owner_id !== userId) throw new Error('Apenas o proprietário atual pode liberar este lote.');
  if (lote.liberado) throw new Error('Este lote já está liberado.');

  const agora = new Date().toISOString(); // 👈 reaproveita o mesmo timestamp

  const { error: updateError } = await supabase
    .from('lotes')
    .update({
      liberado: true,
      liberado_em: agora,
      liberado_por: userId,
    })
    .eq('id', loteId)
    .eq('owner_id', userId);

  if (updateError) throw updateError;

  // 👇 Atualiza o cache local — agora completo
  const loteLocal = await getLoteById(userId, loteId);
  if (loteLocal) {
    await upsertLote(userId, {
      ...loteLocal,
      liberado: true,
      liberadoEm: agora,        // 👈 adicionado
      liberadoPor: userId,      // 👈 adicionado
      syncStatus: 'sincronizado',
    } as any);
  }
}


export function podeEditarLote(
  lote: { owner_id: string; liberado: boolean },
  usuarioId: string
): boolean {
  return lote.owner_id === usuarioId;
}

export function podeAssumirLote(
  lote: { owner_id: string; liberado: boolean },
  usuarioId: string
): boolean {
  return lote.liberado === true && lote.owner_id !== usuarioId;
}

// adicionar em src/services/lotes.ts
import { Lote } from '../utils/calculations';

export async function buscarLotesEncerradosDaEmpresa(empresaId: string): Promise<Lote[]> {
  const { data, error } = await supabase
    .from('lotes')
    .select('id, owner_id, liberado, liberado_em, liberado_por, data')
    .eq('empresa_id', empresaId)
    .eq('status', 'encerrado');

  if (error || !data) return [];

  return data.map((r: any) => ({
    ...(r.data as Lote),
    ownerId: r.owner_id,
    liberado: r.liberado ?? false,
    liberadoEm: r.liberado_em ?? null,
    liberadoPor: r.liberado_por ?? null,
    syncStatus: 'sincronizado',
  })) as Lote[];
}

