import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { NovoLoteForm } from '../components/NovoLoteForm';
import { COLORS } from '../theme/colors';
import { Lote } from '../utils/calculations';
import { upsertLote, getLoteById } from '../storage/storage';
import { useLicenca } from '../hooks/useLicenca';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NovoLote'>;

export function NovoLoteScreen({ navigation, route }: Props) {
  const { podeCriarLote, motivoBloqueio, recarregar } = useLicenca();
  const { userId } = useAuth();
  const loteId = route.params?.loteId;

  const [loteExistente, setLoteExistente] = useState<Lote | null>(null);
  const [carregando, setCarregando] = useState(!!loteId);

  useEffect(() => {
    if (!loteId || !userId) return;
    (async () => {
      const lote = await getLoteById(userId, loteId);
      if (!lote) {
        Alert.alert('Erro', 'Lote não encontrado.');
        navigation.goBack();
        return;
      }
      setLoteExistente(lote);
      setCarregando(false);
    })();
  }, [loteId, userId]);

  const handleSalvarLote = async (lote: Lote) => {
  if (!userId) {
    Alert.alert('Erro', 'Usuário não autenticado.');
    return;
  }

  if (!loteId && !podeCriarLote) {
    Alert.alert('Acesso bloqueado', motivoBloqueio ?? 'Não é possível criar lote.');
    return;
  }

  let loteParaSalvar = lote;

  // 👇 Se o lote estava liberado para transferência e o usuário o editou,
  // ele automaticamente se torna o novo proprietário.
  if (loteExistente?.liberado && loteExistente.ownerId !== userId) {
    loteParaSalvar = {
      ...lote,
      ownerId: userId,
      liberado: false,
    };
  }

  try {
    await upsertLote(userId, { ...loteParaSalvar, syncStatus: 'pendente' });
    recarregar();
    navigation.goBack();
  } catch (e: any) {
    Alert.alert('Erro ao salvar lote', e?.message ?? 'Tente novamente.');
  }
};


  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <AppHeader onVoltar={() => navigation.goBack()} titulo={loteId ? 'Editar lote' : 'Novo lote'} />
      <NovoLoteForm
        onSave={handleSalvarLote}
        onCancel={() => navigation.goBack()}
        loteInicial={loteExistente ?? undefined}
      />
    </View>
  );
}
