// src/services/lotes.ts
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';

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

  if (!lote.liberado) {
    throw new Error('Este lote não está liberado para transferência.');
  }

  if (lote.owner_id === userId) {
    throw new Error('Você já é o proprietário deste lote.');
  }

  // Atualiza owner + fecha liberação (trigger cuida da auditoria)
  const { data: updated, error: updateError } = await supabase
    .from('lotes')
    .update({ owner_id: userId })
    .eq('id', loteId)
    .eq('liberado', true)
    .select('id'); // <- necessário para saber quantas linhas foram afetadas

  if (updateError) throw updateError;

  // Se nenhuma linha foi atualizada, alguém já assumiu o lote antes de você
  if (!updated || updated.length === 0) {
    throw new Error('Este lote já foi assumido por outro usuário. Tente novamente.');
  }
}


/**
 * Marca um lote como liberado para transferência.
 * Só o proprietário atual pode liberar. Exige internet
 * (a mudança de dono precisa ser validada no servidor).
 */
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

  if (lote.owner_id !== userId) {
    throw new Error('Apenas o proprietário atual pode liberar este lote.');
  }

  if (lote.liberado) {
    throw new Error('Este lote já está liberado.');
  }

  const { error: updateError } = await supabase
    .from('lotes')
    .update({ liberado: true })
    .eq('id', loteId)
    .eq('owner_id', userId); // garante que ele ainda é o dono no momento da atualização

  if (updateError) throw updateError;
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