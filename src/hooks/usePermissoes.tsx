// src/hooks/usePermissoes.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePerfil } from './usePerfil';
import { PapelId } from '../constants/papeis';

type Permissao = {
  recurso: string;
  podeVisualizar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
};

const CACHE: Record<string, Permissao[]> = {};

export function usePermissoes() {
  const { perfil } = usePerfil();
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!perfil) {
      setPermissoes([]);
      setCarregando(false);
      return;
    }

    const papelKey = String(perfil.papelId);

    if (CACHE[papelKey]) {
      setPermissoes(CACHE[papelKey]);
      setCarregando(false);
      return;
    }

    const { data } = await supabase
      .from('papel_permissoes')
      .select('recurso, pode_visualizar, pode_editar, pode_excluir')
      .eq('papel', papelKey);

    const lista = (data || []).map((p) => ({
      recurso: p.recurso,
      podeVisualizar: p.pode_visualizar,
      podeEditar: p.pode_editar,
      podeExcluir: p.pode_excluir,
    }));

    CACHE[papelKey] = lista;
    setPermissoes(lista);
    setCarregando(false);
  }, [perfil]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function pode(recurso: string, acao: 'visualizar' | 'editar' | 'excluir'): boolean {
    // ADMIN sempre pode tudo (opcional, mas prático)
    if (perfil?.papelId === 1) return true;

    const permissao = permissoes.find((p) => p.recurso === recurso);
    if (!permissao) return false;

    if (acao === 'visualizar') return permissao.podeVisualizar;
    if (acao === 'editar') return permissao.podeEditar;
    return permissao.podeExcluir;
  }

  return { permissoes, carregandoPermissoes: carregando, pode };
}
