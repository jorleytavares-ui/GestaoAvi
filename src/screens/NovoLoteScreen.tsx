// src/screens/NovoLoteScreen.tsx
import React from 'react';
import { View, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { NovoLoteForm } from '../components/NovoLoteForm';
import { COLORS } from '../theme/colors';
import { Lote } from '../utils/calculations';
import { upsertLote } from '../storage/storage';
import { useLicenca } from '../hooks/useLicenca';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NovoLote'>;

export function NovoLoteScreen({ navigation }: Props) {
  const { podeCriarLote, motivoBloqueio, recarregar } = useLicenca();

  const handleSalvarLote = async (lote: Lote) => {
    if (!podeCriarLote) {
      Alert.alert('Acesso bloqueado', motivoBloqueio ?? 'Não é possível criar lote.');
      return;
    }

    await upsertLote(lote);
    recarregar(); // atualiza contador de licença na UI (Home, etc.)
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <AppHeader onVoltar={() => navigation.goBack()} titulo="Novo lote" />
      <NovoLoteForm onSave={handleSalvarLote} onCancel={() => navigation.goBack()} />
    </View>
  );
}
