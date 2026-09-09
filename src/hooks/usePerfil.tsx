// src/hooks/usePerfil.ts
import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { salvarPerfilCache, getPerfilCache } from '../storage/perfilCache';
import { PapelId } from '../constants/papeis';

type Perfil = {
  id: string;
  nome: string;
  empresa_id: string;
  papelId: PapelId;
  empresaTipo?: string;
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
          papelId: cache.papelId,
          empresaTipo: cache.empresaTipo,
        });
        setOwnerId(cache.ownerId);
      } else {
        setPerfil(null);
        setOwnerId(null);
      }
      setCarregandoPerfil(false);
      return;
    }

    // ---------- MODO ONLINE: busca no servidor e atualiza o cache ----------
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, empresa_id, papel_id, precisa_redefinir_senha')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      const cache = await getPerfilCache(user.id);
      if (cache) {
        setPerfil({
          id: cache.id,
          nome: cache.nome,
          empresa_id: cache.empresaId,
          papelId: cache.papelId,
          empresaTipo: cache.empresaTipo,
          
        });
        setOwnerId(cache.ownerId);
      } else {
        setPerfil(null);
        setOwnerId(null);
      }
      setCarregandoPerfil(false);
      return;
    }

    

    const { data: empresa } = await supabase
      .from('empresas')
      .select('owner_id, tipo') 
      .eq('id', data.empresa_id)
      .maybeSingle();

    const ownerIdResolvido = empresa?.owner_id ?? user.id;
    setOwnerId(ownerIdResolvido);

    setPerfil({
      id: data.id,
      nome: data.nome,
      empresa_id: data.empresa_id,
      papelId: data.papel_id,
      empresaTipo: empresa?.tipo
    });

    // Atualiza o cache local com o dado fresco do servidor
    await salvarPerfilCache({
      id: data.id,
      nome: data.nome,
      empresaId: data.empresa_id,
      papelId: data.papel_id,
      ownerId: ownerIdResolvido,
      empresaTipo: empresa?.tipo,
      precisaRedefinirSenha: !!data.precisa_redefinir_senha,
    });

    setCarregandoPerfil(false);
  }, [user, offline]);

  useEffect(() => {
    buscarPerfil();
  }, [buscarPerfil]);

  return { perfil, ownerId, carregandoPerfil, recarregarPerfil: buscarPerfil };
}
