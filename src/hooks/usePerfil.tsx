// src/hooks/usePerfil.ts
import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { salvarPerfilCache, getPerfilCache } from '../storage/perfilCache';

type Perfil = {
  id: string;
  nome: string;
  empresa_id: string;
  papel: 'admin' | string;
};

export function usePerfil() {
  const { user, offline } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  const buscarPerfil = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      setOwnerId(null);
      setCarregandoPerfil(false);
      return;
    }

    setCarregandoPerfil(true);

    const net = await NetInfo.fetch();

    // ---------- MODO OFFLINE: usa o cache local ----------
    if (offline || !net.isConnected) {
      const cache = await getPerfilCache(user.id);

      if (cache) {
        setPerfil({
          id: cache.id,
          nome: cache.nome,
          empresa_id: cache.empresaId,
          papel: cache.papel,
        });
        setOwnerId(cache.ownerId);
      } else {
        // Sem cache local e sem rede: não há como montar o perfil
        setPerfil(null);
        setOwnerId(null);
      }
      setCarregandoPerfil(false);
      return;
    }

    // ---------- MODO ONLINE: busca no servidor e atualiza o cache ----------
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, empresa_id, papel')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      // Se falhou online por algum motivo, tenta cair pro cache como último recurso
      const cache = await getPerfilCache(user.id);
      if (cache) {
        setPerfil({
          id: cache.id,
          nome: cache.nome,
          empresa_id: cache.empresaId,
          papel: cache.papel,
        });
        setOwnerId(cache.ownerId);
      } else {
        setPerfil(null);
        setOwnerId(null);
      }
      setCarregandoPerfil(false);
      return;
    }

    setPerfil(data);

    const { data: empresa } = await supabase
      .from('empresas')
      .select('owner_id')
      .eq('id', data.empresa_id)
      .maybeSingle();

    const ownerIdResolvido = empresa?.owner_id ?? user.id;
    setOwnerId(ownerIdResolvido);

    // Atualiza o cache local com o dado fresco do servidor
    await salvarPerfilCache({
      id: data.id,
      nome: data.nome,
      empresaId: data.empresa_id,
      papel: data.papel,
      ownerId: ownerIdResolvido,
    });

    setCarregandoPerfil(false);
  }, [user, offline]);

  useEffect(() => {
    buscarPerfil();
  }, [buscarPerfil]);

  return { perfil, ownerId, carregandoPerfil, recarregarPerfil: buscarPerfil };
}
