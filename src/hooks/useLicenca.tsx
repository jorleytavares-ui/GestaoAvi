// src/hooks/useLicenca.ts
import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { usePerfil } from './usePerfil';
import { salvarLicencaCache, getLicencaCache } from '../storage/licencaCache';
import { getTrustedNow, sincronizarRelogioServidor } from '../services/serverTime';

type StatusLicenca = 'trial' | 'ativa' | 'expirada';

type Licenca = {
  empresa_id: string;
  status: StatusLicenca;
  limite_lotes: number;
  lotes_gerados: number;
  trial_inicio: string;
  trial_dias: number;
  expira_em: string | null;
};

type LicencaInfo = {
  licenca: Licenca | null;
  carregando: boolean;
  status: StatusLicenca | null;
  diasRestantesTrial: number | null;
  podeCriarLote: boolean;
  motivoBloqueio: string | null;
  offlineSemCache: boolean;
  relogioSuspeito: boolean;
  recarregar: () => Promise<void>;
};

/**
 * Calcula o status da licença usando a hora CONFIÁVEL (servidor + offset),
 * nunca a hora bruta do aparelho.
 */
function calcularStatus(
  licenca: Omit<Licenca, 'status'> & { status: StatusLicenca },
  agoraMs: number
): StatusLicenca {
  let statusAtual = licenca.status;

  if (statusAtual === 'trial') {
    const inicioMs = new Date(licenca.trial_inicio).getTime();
    const diffDias = Math.floor((agoraMs - inicioMs) / (1000 * 60 * 60 * 24));
    if (diffDias >= licenca.trial_dias) statusAtual = 'expirada';
  }

  if (statusAtual === 'ativa' && licenca.expira_em) {
    const expiraMs = new Date(licenca.expira_em).getTime();
    if (expiraMs < agoraMs) statusAtual = 'expirada';
  }

  return statusAtual;
}

export function useLicenca(): LicencaInfo {
  const { perfil } = usePerfil();
  const { offline } = useAuth();
  const [licenca, setLicenca] = useState<Licenca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [offlineSemCache, setOfflineSemCache] = useState(false);
  const [relogioSuspeito, setRelogioSuspeito] = useState(false);

  const buscarLicenca = useCallback(async () => {
    if (!perfil) {
      setLicenca(null);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setOfflineSemCache(false);
    setRelogioSuspeito(false);

    const net = await NetInfo.fetch();
    const semRede = offline || !net.isConnected;

    // Se tiver rede, atualiza o offset do relógio ANTES de qualquer verificação
    if (!semRede) {
      await sincronizarRelogioServidor();
    }

    const { timestampMs: agoraMs, suspeitaManipulacao } = await getTrustedNow();

    if (suspeitaManipulacao) {
      // Relógio do aparelho foi voltado no tempo — bloqueia por segurança
      setLicenca(null);
      setRelogioSuspeito(true);
      setCarregando(false);
      return;
    }

    // ---------- MODO OFFLINE ----------
    if (semRede) {
      const cache = await getLicencaCache(perfil.empresa_id);

      if (!cache || agoraMs === null) {
        setLicenca(null);
        setOfflineSemCache(true);
        setCarregando(false);
        return;
      }

      const statusRecalculado = calcularStatus(
        {
          empresa_id: cache.empresaId,
          status: cache.status,
          limite_lotes: cache.limiteLotes,
          lotes_gerados: cache.lotesGerados,
          trial_inicio: cache.trialInicio,
          trial_dias: cache.trialDias,
          expira_em: cache.expiraEm,
        },
        agoraMs
      );

      setLicenca({
        empresa_id: cache.empresaId,
        status: statusRecalculado,
        limite_lotes: cache.limiteLotes,
        lotes_gerados: cache.lotesGerados,
        trial_inicio: cache.trialInicio,
        trial_dias: cache.trialDias,
        expira_em: cache.expiraEm,
      });
      setCarregando(false);
      return;
    }

    // ---------- MODO ONLINE ----------
    const { data: licencaData, error: licencaError } = await supabase
      .from('licencas')
      .select('*')
      .eq('empresa_id', perfil.empresa_id)
      .maybeSingle();

    if (licencaError || !licencaData) {
      const cache = await getLicencaCache(perfil.empresa_id);
      if (cache && agoraMs !== null) {
        const statusRecalculado = calcularStatus(
          {
            empresa_id: cache.empresaId,
            status: cache.status,
            limite_lotes: cache.limiteLotes,
            lotes_gerados: cache.lotesGerados,
            trial_inicio: cache.trialInicio,
            trial_dias: cache.trialDias,
            expira_em: cache.expiraEm,
          },
          agoraMs
        );
        setLicenca({
          empresa_id: cache.empresaId,
          status: statusRecalculado,
          limite_lotes: cache.limiteLotes,
          lotes_gerados: cache.lotesGerados,
          trial_inicio: cache.trialInicio,
          trial_dias: cache.trialDias,
          expira_em: cache.expiraEm,
        });
      } else {
        setLicenca(null);
        setOfflineSemCache(true);
      }
      setCarregando(false);
      return;
    }

    const statusAtual = calcularStatus(licencaData as any, agoraMs ?? Date.now());
    setLicenca({ ...licencaData, status: statusAtual });

    await salvarLicencaCache({
      empresaId: licencaData.empresa_id,
      status: licencaData.status,
      limiteLotes: licencaData.limite_lotes,
      lotesGerados: licencaData.lotes_gerados,
      trialInicio: licencaData.trial_inicio,
      trialDias: licencaData.trial_dias,
      expiraEm: licencaData.expira_em,
      atualizadoEm: new Date().toISOString(),
    });

    setCarregando(false);
  }, [perfil, offline]);

  useEffect(() => {
    buscarLicenca();
  }, [buscarLicenca]);

  const diasRestantesTrial =
    licenca && licenca.status === 'trial'
      ? Math.max(
          0,
          licenca.trial_dias -
            Math.floor((Date.now() - new Date(licenca.trial_inicio).getTime()) / (1000 * 60 * 60 * 24))
        )
      : null;

  let podeCriarLote = false;
  let motivoBloqueio: string | null = null;

  if (relogioSuspeito) {
    motivoBloqueio =
      'Detectamos uma alteração no relógio do aparelho. Conecte-se à internet para revalidar sua licença.';
  } else if (offlineSemCache) {
    motivoBloqueio = 'Conecte-se à internet ao menos uma vez neste aparelho para validar sua licença.';
  } else if (!licenca) {
    motivoBloqueio = 'Licença não encontrada.';
  } else if (licenca.status === 'expirada') {
    motivoBloqueio = 'Sua licença expirou. Conecte-se à internet para renovar.';
  } else if (licenca.lotes_gerados >= licenca.limite_lotes) {
    motivoBloqueio = `Limite de ${licenca.limite_lotes} lotes atingido para o plano atual.`;
  } else {
    podeCriarLote = true;
  }

  return {
    licenca,
    carregando,
    status: licenca?.status ?? null,
    diasRestantesTrial,
    podeCriarLote,
    motivoBloqueio,
    offlineSemCache,
    relogioSuspeito,
    recarregar: buscarLicenca,
  };
}
