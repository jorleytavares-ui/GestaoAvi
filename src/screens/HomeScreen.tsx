import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus, CloudOff } from 'lucide-react-native';

import { AppHeader } from '../components/AppHeader';
import { LoteCard } from '../components/LoteCard';
import { EmptyState } from '../components/EmptyState';
import { COLORS } from '../theme/colors';
import { Lote, computeIndices, daysBetween, todayStr } from '../utils/calculations';
import { getLotes } from '../storage/storage';
import { contarPendentes } from '../storage/sync';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { userId } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pendentes, setPendentes] = useState(0);

  const carregarLotes = useCallback(async () => {
    if (!userId) return;
    const dados = await getLotes(userId);
    setLotes(dados);
    const qtdPendentes = await contarPendentes();
    setPendentes(qtdPendentes);
    setCarregando(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      carregarLotes();
    }, [carregarLotes])
  );

  useEffect(() => {
    const interval = setInterval(carregarLotes, 5000);
    return () => clearInterval(interval);
  }, [carregarLotes]);

  if (carregando) return null;

  const lotesOrdenados = [...lotes].sort((a, b) => (a.status === 'ativo' ? -1 : 1));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <AppHeader />

        {pendentes > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginHorizontal: 16,
              marginBottom: 8,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: COLORS.surfaceAlt,
              borderRadius: 8,
            }}
          >
            <CloudOff size={16} color={COLORS.accent} />
            <Text style={{ color: COLORS.inkSoft, fontSize: 13 }}>
              {pendentes} {pendentes === 1 ? 'registro pendente' : 'registros pendentes'} de sincronização
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 16 }}>
          {lotes.length === 0 ? (
            <EmptyState onNovo={() => navigation.navigate('NovoLote' as never)} />
          ) : (
            lotesOrdenados.map((lote) => {
              const idx = computeIndices(lote);
              const idade = daysBetween(
                lote.dataAlojamento,
                lote.status === 'encerrado' && lote.encerramento
                  ? lote.encerramento.data
                  : todayStr()
              );
              return (
                <LoteCard
                  key={lote.id}
                  numero={lote.numero}
                  linhagem={lote.linhagem}
                  nomesGalpoes={lote.galpoes.map((g) => g.nome).join(', ')}
                  status={lote.status}
                  idadeDias={idade}
                  viabilidade={idx.viabilidade}
                  avesVivas={idx.avesVivas}
                  quantidadeAlojadaTotal={idx.quantidadeAlojadaTotal}
                  numGalpoes={lote.galpoes.length}
                  onPress={() => navigation.navigate('DetalheLote', { loteId: lote.id })}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {lotes.length > 0 && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 24,
            right: 20,
            backgroundColor: COLORS.primary,
            borderRadius: 30,
            width: 58,
            height: 58,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 4,
          }}
          onPress={() => navigation.navigate('NovoLote' as never)}
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
