// src/screens/detalhe/PesagensTab.tsx
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';

import { COLORS } from '../../theme/colors';
import { getLoteById, getPadraoPeso, salvarPadraoPeso, removePesagem } from '../../storage/storage';
import { Lote, fmt } from '../../utils/calculations';
import type { PontoPesoPadrao, Sexagem } from '../../data/padraoSexagem';
import { PesagemPadraoCard } from '../../components/registros/PesagemPadraoCard';
import { PesagemAmostraCard } from '../../components/registros/PesagemAmostraCard';
import { HistoricoLista } from '../../components/registros/HistoricoLista';
import type { DetalheLoteTabParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';

type Props = MaterialTopTabScreenProps<DetalheLoteTabParamList, 'Pesagens'>;

export function PesagensTab({ route }: Props) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);
  const [padraoSexagem, setPadraoSexagem] = useState<PontoPesoPadrao[]>([]);

  const carregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => {
      if (!l) return;
      setLote(l);
      getPadraoPeso(userId, l.sexagem as Sexagem).then(setPadraoSexagem);
    });
  }, [loteId, userId]);

  useFocusEffect(carregar);

  if (!lote) return null;

  const salvarPadraoSexagem = async (sexagem: Sexagem, pontos: PontoPesoPadrao[]) => {
    if (!userId) return;
    setPadraoSexagem(pontos);
    await salvarPadraoPeso(userId, sexagem, pontos);
  };

  const handleExcluir = async (item: any) => {
    if (!userId) return;
    await removePesagem(userId, lote.id, item.id);
    carregar();
  };

  const itens = (lote.pesagens || [])
    .filter((r) => r.pesoMedioG !== null && r.pesoMedioG !== undefined && r.pesoMedioG !== '')
    .map((r: any) => ({
      id: r.id,
      data: r.data,
      galpaoId: r.galpaoId,
      linha1Extra: `${fmt(Number(r.pesoMedioG))} g`,
      linhaCustom: `${r.pesagemQtdAves ? r.pesagemQtdAves : '—'} aves${
        r.pesagens && r.pesagens.length > 1 ? ` · ${r.pesagens.length} pesagens` : ''
      }`,
    }));

  return (
    <View>
      <PesagemPadraoCard
        lote={lote}
        padraoSexagem={padraoSexagem}
        onSalvarPadraoSexagem={salvarPadraoSexagem}
      />
      <PesagemAmostraCard lote={lote} onSalvo={carregar} />
      <HistoricoLista itens={itens} galpoes={lote.galpoes} onExcluir={handleExcluir} />
    </View>
  );
}
