// src/screens/detalhe/SanidadeTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';

import { getLoteById } from '../../storage/storage';
import MedicamentosTerapeuticosCard from '../../components/registros/MedicamentosTerapeuticosCard';
import ProdutosQuimicosCard from '../../components/registros/ProdutosQuimicosCard';
import type { DetalheLoteTabParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';

type Props = MaterialTopTabScreenProps<DetalheLoteTabParamList, 'Sanidade'>;

export function SanidadeTab({ route }: Props) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<any>(null);

  const carregar = useCallback(async () => {
    if (!userId) return;
    const l = await getLoteById(userId, loteId);
    if (l) setLote(l);
  }, [loteId, userId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (!lote) return null;

  return (
    <View>
      <MedicamentosTerapeuticosCard lote={lote} onChanged={carregar} />
      <ProdutosQuimicosCard lote={lote} onChanged={carregar} />
    </View>
  );
}