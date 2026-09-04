// src/screens/detalhe/TemperaturaTab.tsx
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';

import { getLoteById, getFaixaConforto, setFaixaConforto } from '../../storage/storage';
import { Lote, PontoFaixaConforto, DEFAULT_FAIXA_CONFORTO } from '../../utils/calculations';
import { TemperaturaLancamentoCard } from '../../components/registros/TemperaturaLancamentoCard';
import type { DetalheLoteTabParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';

type Props = MaterialTopTabScreenProps<DetalheLoteTabParamList, 'Temperatura'>;

export function TemperaturaTab({ route }: Props) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);
  const [faixaConforto, setFaixaConfortoState] = useState<PontoFaixaConforto[]>(DEFAULT_FAIXA_CONFORTO);

  const carregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => l && setLote(l));
    getFaixaConforto(userId).then(setFaixaConfortoState);
  }, [loteId, userId]);

  useFocusEffect(carregar);

  if (!lote) return null;

  const salvarFaixaConforto = async (pontos: PontoFaixaConforto[]) => {
    if (!userId) return;
    setFaixaConfortoState(pontos);
    await setFaixaConforto(userId, pontos);
  };

  return (
    <View>
      <TemperaturaLancamentoCard
        lote={lote}
        faixaConforto={faixaConforto}
        onSalvarFaixaConforto={salvarFaixaConforto}
        onSalvo={carregar}
      />
    </View>
  );
}
