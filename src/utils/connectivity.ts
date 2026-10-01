// src/utils/connectivity.ts
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

export async function estaConectado(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // NetInfo é pouco confiável na web; navigator.onLine é mais direto.
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
  const net = await NetInfo.fetch();
  if (!net.isConnected) return false;

  // net.isConnected só confirma que há um link de rede ativo (ex.: rádio
  // celular conectado à torre, ou Wi-Fi associado). Isso NÃO garante
  // internet real — em áreas sem dados/sem plano ou Wi-Fi sem saída,
  // isso gera falso positivo. Por isso, testamos com uma requisição real
  // e rápida, contra o próprio endpoint REST do Supabase.
  //
  // Usamos AbortController manual (em vez de AbortSignal.timeout) porque
  // essa API não é suportada de forma confiável em todas as versões do
  // Hermes/React Native — quando ausente, o fetch falha antes mesmo de
  // tentar a rede, gerando falso negativo mesmo com internet real.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: controller.signal,
    });
    // Qualquer resposta HTTP (mesmo 401/400 sem token de usuário) prova
    // que o servidor foi alcançado, ou seja, há internet real.
    // Só timeout/erro de DNS/rede caem no catch abaixo.
    return resposta.status < 500;
  } catch (e) {
    console.log('estaConectado: fetch de health-check falhou ->', e);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Executa uma promise com timeout; se demorar demais, rejeita
// para permitir fallback (ex.: cair pro modo offline).
export function comTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
