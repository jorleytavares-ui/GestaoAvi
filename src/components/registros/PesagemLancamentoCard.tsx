import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Lote, todayStr } from '../../utils/calculations';
import { addPesagem } from '../../storage/storage';
import { GalpaoSelector } from './GalpaoSelector';
import { DateFieldInline } from './DateFieldInline';
import { NumericFieldInline } from './NumericFieldInline';
import { SalvarButton } from './SalvarButton';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  lote: Lote;
  onSalvo: () => void;
}

export function PesagemLancamentoCard({ lote, onSalvo }: Props) {
  const { userId } = useAuth();
  const [galpaoId, setGalpaoId] = useState(lote.galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [pesoMedioG, setPesoMedioG] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSalvar = async () => {
    if (!userId) return;
    if (!galpaoId || !pesoMedioG) return;
    setLoading(true);
    try {
      await addPesagem(userId, lote.id, { galpaoId, data, pesoMedioG: Number(pesoMedioG) });
      setPesoMedioG('');
      onSalvo();
    } catch (e: any) {
      Alert.alert('Lote encerrado', e.message || 'Não foi possível salvar o registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Lançar pesagem</Text>
      <GalpaoSelector galpoes={lote.galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />
      <DateFieldInline
        label="Data"
        value={data}
        onChange={setData}
        minimumDate={new Date(lote.dataAlojamento + 'T00:00:00')}
        maximumDate={new Date()}
      />
      <NumericFieldInline label="Peso médio" value={pesoMedioG} onChangeText={setPesoMedioG} unit="g" />
      <SalvarButton onPress={handleSalvar} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 12 },
});
