// src/screens/NovoLoteScreen.tsx
import React from 'react';
import { View, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
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
  const { userId } = useAuth(); // 👈 pega o userId

  const handleSalvarLote = async (lote: Lote) => {
    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    if (!podeCriarLote) {
      Alert.alert('Acesso bloqueado', motivoBloqueio ?? 'Não é possível criar lote.');
      return;
    }

    try {
      await upsertLote(userId, lote); // 👈 corrigido
      recarregar();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erro ao salvar lote', e?.message ?? 'Tente novamente.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <AppHeader onVoltar={() => navigation.goBack()} titulo="Novo lote" />
      <NovoLoteForm onSave={handleSalvarLote} onCancel={() => navigation.goBack()} />
    </View>
  );
}
