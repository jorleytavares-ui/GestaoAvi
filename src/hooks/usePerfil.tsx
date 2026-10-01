// src/hooks/usePerfil.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { salvarPerfilCache, getPerfilCache } from '../storage/perfilCache';
import { sincronizarLogo } from '../storage/logoCache';
import { PapelId } from '../constants/papeis';

type Perfil = {
  id: string;
  nome: string;
  empresa_id: string;
  papelId: PapelId;
  empresaTipo?: string;
  logoUrl?: string | null;
  logoAtualizadoEm?: string | null;
};

function mesmoPerfil(a: Perfil, b: Perfil) {
  return (
    a.id === b.id &&
    a.nome === b.nome &&
    a.empresa_id === b.empresa_id &&
    a.papelId === b.papelId &&
    a.empresaTipo === b.empresaTipo &&
    a.logoUrl === b.logoUrl &&
    a.logoAtualizadoEm === b.logoAtualizadoEm
  );
}

export function usePerfil() {
  const { user, offline } = useAuth();
  // Dependemos do ID (string estável), NÃO do objeto `user`: o objeto muda de referência
  // a cada renovação de token e disparava novo fetch + spinner em tela cheia.
  const userId = user?.id ?? null;

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  const perfilRef = useRef<Perfil | null>(null);
  const reqRef = useRef(0); // descarta respostas de buscas antigas (corrida online/offline)

  const aplicar = useCallback((p: Perfil | null, owner: string | null) => {
    const prev = perfilRef.current;
    // Mantém a MESMA referência quando nada mudou → useLicenca/useAutoSync não recarregam à toa.
    if (!(prev && p && mesmoPerfil(prev, p))) {
      perfilRef.current = p;
      setPerfil(p);
    }
    setOwnerId(owner);
  }, []);

  const buscarPerfil = useCallback(async () => {
    if (!userId) {
      perfilRef.current = null;
      setPerfil(null);
      setOwnerId(null);
      setCarregandoPerfil(false);
      return;
    }

    const reqId = ++reqRef.current;
    const atual = () => reqId === reqRef.current;

    // "Carregando" só na primeira carga deste usuário. Recargas (internet voltou, login
    // silencioso) rodam em segundo plano: antes elas trocavam o app inteiro por um
    // spinner e o usuário perdia a tela em que estava.
    if (!perfilRef.current || perfilRef.current.id !== userId) {
      setCarregandoPerfil(true);
    }

    const usarCache = async () => {
      const cache = await getPerfilCache(userId);
      if (!atual()) return;
      if (cache) {
        aplicar(
          {
            id: cache.id,
            nome: cache.nome,
            empresa_id: cache.empresaId,
            papelId: cache.papelId,
            empresaTipo: cache.empresaTipo,
            logoUrl: cache.logoUrl ?? null,
            logoAtualizadoEm: cache.logoAtualizadoEm ?? null,
          },
          cache.ownerId
        );
      } else if (!perfilRef.current) {
        aplicar(null, null);
      } // senão: mantém o perfil que já estava na tela
      setCarregandoPerfil(false);
    };

    const net = await NetInfo.fetch();

    // ---------- OFFLINE: cache local ----------
    if (offline || !net.isConnected) {
      await usarCache();
      return;
    }

    // ---------- ONLINE: servidor + atualiza cache ----------
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, empresa_id, papel_id, precisa_redefinir_senha')
        .eq('id', userId)
        .maybeSingle();

      if (!atual()) return;
      if (error || !data) {
        await usarCache();
        return;
      }

      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('owner_id, tipo, logo_url, logo_atualizado_em')
        .eq('id', data.empresa_id)
        .maybeSingle();

      if (!atual()) return;
      if (empresaError) {
        // Antes: owner_id caía para o próprio user.id e isso era gravado no cache.
        await usarCache();
        return;
      }

      const ownerIdResolvido = empresa?.owner_id ?? userId;

      aplicar(
        {
          id: data.id,
          nome: data.nome,
          empresa_id: data.empresa_id,
          papelId: data.papel_id,
          empresaTipo: empresa?.tipo,
          logoUrl: empresa?.logo_url ?? null,
          logoAtualizadoEm: empresa?.logo_atualizado_em ?? null,
        },
        ownerIdResolvido
      );

      await salvarPerfilCache({
        id: data.id,
        nome: data.nome,
        empresaId: data.empresa_id,
        papelId: data.papel_id,
        ownerId: ownerIdResolvido,
        empresaTipo: empresa?.tipo,
        logoUrl: empresa?.logo_url ?? null,
        logoAtualizadoEm: empresa?.logo_atualizado_em ?? null,
        precisaRedefinirSenha: !!data.precisa_redefinir_senha,
      });

      // Baixa/atualiza o logo em cache local (não bloqueia a tela)
      if (empresa?.logo_url) {
        sincronizarLogo(data.empresa_id, empresa.logo_url, empresa.logo_atualizado_em ?? null);
      }

      if (atual()) setCarregandoPerfil(false);
    } catch (e) {
      console.log('usePerfil: falha ao buscar no servidor, usando cache:', e);
      await usarCache();
    }
  }, [userId, offline, aplicar]);

  useEffect(() => {
    buscarPerfil();
  }, [buscarPerfil]);

  return { perfil, ownerId, carregandoPerfil, recarregarPerfil: buscarPerfil };
}
