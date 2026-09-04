import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { COLORS } from '../../theme/colors';
import { NumericFieldInline } from './NumericFieldInline';
import {
  PontoPesoPadrao,
  Sexagem,
  LABEL_SEXAGEM,
  DEFAULT_PESO_SEXAGEM,
} from '../../data/padraoSexagem';
import { getPadraoPeso, salvarPadraoPeso } from '../../storage/storage';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  sexagem: Sexagem;
}

export function PadraoEditor({ sexagem }: Props) {
  const { userId } = useAuth();
  const [pontos, setPontos] = useState<PontoPesoPadrao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const dados = await getPadraoPeso(userId, sexagem);
      setPontos(dados);
      setLoading(false);
    })();
  }, [sexagem, userId]);

  function atualizarPeso(idx: number, valor: string) {
    const novoPeso = parseFloat(valor) || 0;
    setPontos((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, pesoG: novoPeso } : p))
    );
  }

  async function salvar() {
    if (!userId) return;
    await salvarPadraoPeso(userId, sexagem, pontos);
    Alert.alert('Sucesso', `Padrão de peso (${LABEL_SEXAGEM[sexagem]}) salvo!`);
  }

  function restaurarPadrao() {
    Alert.alert(
      'Restaurar padrão',
      `Deseja restaurar os valores padrão de fábrica para ${LABEL_SEXAGEM[sexagem]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => setPontos(DEFAULT_PESO_SEXAGEM[sexagem]),
        },
      ]
    );
  }

  if (loading) {
    return <Text style={{ color: COLORS.inkSoft }}>Carregando...</Text>;
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.ink, marginBottom: 10 }}>
        Padrão de peso — {LABEL_SEXAGEM[sexagem]}
      </Text>

      {pontos.map((p, idx) => (
        <View key={p.idade} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ width: 70, fontSize: 13, color: COLORS.inkSoft }}>
            Dia {p.idade}
          </Text>
          <NumericFieldInline
            label=""
            value={String(p.pesoG)}
            onChangeText={(t) => atualizarPeso(idx, t)}
            unit="g"
          />
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <TouchableOpacity
          onPress={salvar}
          style={{
            flex: 1,
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Salvar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={restaurarPadrao}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: COLORS.line,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: COLORS.ink, fontWeight: '600' }}>Restaurar padrão</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
