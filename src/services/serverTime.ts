// src/services/serverTime.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const OFFSET_KEY = '@gestaoavi:relogio:offsetMs';
const ULTIMA_SYNC_KEY = '@gestaoavi:relogio:ultimaSincronizacao';
const ULTIMO_TRUSTED_KEY = '@gestaoavi:relogio:ultimoTrustedTime';

/**
 * Consulta a hora real do servidor Postgres e calcula o offset
 * entre o relógio do servidor e o relógio do aparelho.
 * offset = horaServidor - horaAparelho
 *
 * Deve ser chamada sempre que houver internet disponível
 * (login, sync automático, revalidação de licença).
 */
export async function sincronizarRelogioServidor(): Promise<void> {
  try {
    const antesRequisicao = Date.now();
    const { data, error } = await supabase.rpc('get_server_time');
    const depoisRequisicao = Date.now();

    if (error || !data) return;

    // Compensa a latência da requisição (média do tempo de ida e volta)
    const latenciaEstimada = (depoisRequisicao - antesRequisicao) / 2;
    const horaServidorMs = new Date(data as string).getTime() + latenciaEstimada;
    const horaAparelhoMs = antesRequisicao + latenciaEstimada;

    const offset = horaServidorMs - horaAparelhoMs;

    await AsyncStorage.setItem(OFFSET_KEY, String(offset));
    await AsyncStorage.setItem(ULTIMA_SYNC_KEY, String(Date.now()));
  } catch {
    // Sem rede ou erro de RPC: mantém o offset anterior (se existir)
  }
}

async function getOffset(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(OFFSET_KEY);
  return raw ? Number(raw) : null;
}

/**
 * Retorna a hora "confiável" atual, em milissegundos.
 * - Se já houve sincronização com o servidor alguma vez: deviceTime + offset
 * - Se nunca sincronizou: retorna null (quem chamar deve tratar como "sem confiança")
 *
 * Também detecta manipulação: se o tempo confiável calculado agora for
 * MENOR que o último tempo confiável já registrado (o que é fisicamente
 * impossível em condições normais), sinaliza suspeita de fraude.
 */
export async function getTrustedNow(): Promise<{
  timestampMs: number | null;
  suspeitaManipulacao: boolean;
}> {
  const offset = await getOffset();

  if (offset === null) {
    return { timestampMs: null, suspeitaManipulacao: false };
  }

  const trustedNow = Date.now() + offset;

  const ultimoRaw = await AsyncStorage.getItem(ULTIMO_TRUSTED_KEY);
  const ultimo = ultimoRaw ? Number(ultimoRaw) : null;

  // Tolerância de 2 minutos para evitar falso positivo (ex: drift natural do device)
  const TOLERANCIA_MS = 2 * 60 * 1000;

  const suspeitaManipulacao = ultimo !== null && trustedNow < ultimo - TOLERANCIA_MS;

  // Só avança o "carimbo" se não houve suspeita (evita gravar um tempo manipulado)
  if (!suspeitaManipulacao) {
    await AsyncStorage.setItem(ULTIMO_TRUSTED_KEY, String(trustedNow));
  }

  return { timestampMs: suspeitaManipulacao ? null : trustedNow, suspeitaManipulacao };
}

/**
 * Quanto tempo (em ms) faz desde a última sincronização com o servidor.
 * Útil para decidir se o offset ainda é "fresco" o suficiente para confiar.
 */
export async function tempoDesdeUltimaSincronizacao(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ULTIMA_SYNC_KEY);
  if (!raw) return null;
  return Date.now() - Number(raw);
}
