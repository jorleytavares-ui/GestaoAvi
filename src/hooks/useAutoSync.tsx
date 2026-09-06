// src/hooks/useAutoSync.ts
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { sincronizarTudo, revalidarLicenca } from '../storage/sync';
import {
  getModoSync,
  getHorarioSync,
  getIntervaloSyncMin,
  getUltimaSyncTimestamp,
  setUltimaSyncTimestamp,
  getUltimaSyncData,
  setUltimaSyncData,
  getUltimaLicencaCheck,
  setUltimaLicencaCheck,
} from '../storage/syncPrefs';
import { sincronizarRelogioServidor } from '../services/serverTime';
import { onLocalChange } from '../storage/localChangeEmitter';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function executarSync(empresaId: string, ownerId: string) {
  try {
    await sincronizarTudo(empresaId, ownerId);
    await setUltimaSyncTimestamp();
  } catch (e) {
    console.log('Erro na sincronização automática:', e);
  }
}

async function executarRevalidacaoLicenca(empresaId: string) {
  try {
    await sincronizarRelogioServidor();
    await revalidarLicenca(empresaId);
    await setUltimaLicencaCheck();
  } catch (e) {
    console.log('Erro ao revalidar licença:', e);
  }
}

/**
 * Orquestra a sincronização automática conforme o modo escolhido pelo usuário:
 * - 'horario': sincroniza 1x por dia, a partir do horário definido
 * - 'online': sincroniza sempre que a conexão volta OU quando há alteração local
 * - 'intervalo': sincroniza a cada N minutos (checagem periódica + ao focar o app)
 * - 'manual': só sincroniza dados quando o usuário aciona manualmente
 * - 'offline': não sincroniza dados; só revalida a licença periodicamente (a cada 24h)
 */
export function useAutoSync(empresaId: string | null, ownerId: string | null) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!empresaId || !ownerId) return;

    const verificarERodar = async () => {
      const modo = await getModoSync();
      const net = await NetInfo.fetch();

      // ✅ Revalida licença 1x/dia, independente do modo (se tiver conexão)
      if (net.isConnected) {
        const ultimaCheck = await getUltimaLicencaCheck();
        const passou24h =
          !ultimaCheck || Date.now() - new Date(ultimaCheck).getTime() > 24 * 60 * 60 * 1000;
        if (passou24h) {
          await executarRevalidacaoLicenca(empresaId);
        }
      }

      if (modo === 'manual') return; // só corta a sincronização de dados, não a licença
      if (modo === 'offline') {
        return; // licença já foi tratada acima
      }
      if (!net.isConnected) return;

      if (modo === 'online') {
        await executarSync(empresaId, ownerId);
        return;
      }

      if (modo === 'horario') {
        const horario = await getHorarioSync();
        if (!horario) return;
        const [hh, mm] = horario.split(':').map(Number);
        const agora = new Date();
        const horarioPassou =
          agora.getHours() > hh || (agora.getHours() === hh && agora.getMinutes() >= mm);
        const jaSincronizouHoje = (await getUltimaSyncData()) === todayStr();
        if (horarioPassou && !jaSincronizouHoje) {
          await executarSync(empresaId, ownerId);
          await setUltimaSyncData(todayStr());
        }
        return;
      }

      if (modo === 'intervalo') {
        const intervaloMin = await getIntervaloSyncMin();
        const ultima = await getUltimaSyncTimestamp();
        const passouIntervalo =
          !ultima || Date.now() - new Date(ultima).getTime() > intervaloMin * 60 * 1000;
        if (passouIntervalo) {
          await executarSync(empresaId, ownerId);
        }
        return;
      }
    };

    // Roda ao montar
    verificarERodar();

    // ✅ Verificação periódica enquanto o app está aberto/em uso.
    // Cobre os modos 'horario' e 'intervalo' mesmo sem o app ir para background
    // ou perder/recuperar conexão.
    const intervalId = setInterval(verificarERodar, 60 * 1000); // checa a cada 1 min

    // Roda ao reconectar (relevante pros modos 'online' e 'offline'-licença)
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) verificarERodar();
    });

    // Roda ao voltar do background (relevante pros modos 'horario' e 'intervalo')
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        verificarERodar();
      }
      appState.current = next;
    });

    // ✅ Roda a cada alteração local relevante (com debounce), somente no modo 'online'.
    // Assim, qualquer registro salvo (ração, mortalidade, pesagem, etc.) dispara
    // a sincronização automática quase em tempo real, sem precisar de ação manual.
    let debounceTimer: ReturnType<typeof setTimeout>;
    const unsubscribeLocalChange = onLocalChange(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const modo = await getModoSync();
        if (modo !== 'online') return;
        const net = await NetInfo.fetch();
        if (!net.isConnected) return;
        await executarSync(empresaId, ownerId);
      }, 1500); // pausa de 1,5s para evitar disparos múltiplos em sequência
    });

    return () => {
      clearInterval(intervalId);
      unsubscribeNet();
      subscription.remove();
      unsubscribeLocalChange();
      clearTimeout(debounceTimer);
    };
  }, [empresaId, ownerId]);
}
