import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Lote, todayStr, MOTIVOS_DESCARTE } from '../../utils/calculations';
import { addMortalidade } from '../../storage/storage';
import { GalpaoSelector } from './GalpaoSelector';
import { DateFieldInline } from './DateFieldInline';
import { NumericFieldInline } from './NumericFieldInline';
import { SalvarButton } from './SalvarButton';
import { SimpleSelect } from '../SimpleSelect';
import { TextField } from '../TextField';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  lote: Lote;
  onSalvo: () => void;
}

export function MortalidadeLancamentoCard({ lote, onSalvo }: Props) {
  const { userId } = useAuth();
  const [galpaoId, setGalpaoId] = useState(lote.galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [mortalidade, setMortalidade] = useState('0');
  const [descartados, setDescartados] = useState('0');
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);

  const opcoesMotivo = [
    { label: 'Não informado', value: '' },
    ...MOTIVOS_DESCARTE.map((m) => ({ label: m, value: m })),
  ];

  const handleSalvar = async () => {
    if (!userId) return;
    if (!galpaoId) return;
    setLoading(true);
    try {
      await addMortalidade(userId, lote.id, {
        galpaoId,
        data,
        mortalidade: Number(mortalidade) || 0,
        descartados: Number(descartados) || 0,
        motivoDescarte: motivoDescarte || null,
        obs: obs.trim(),
      });
      setMortalidade('0');
      setDescartados('0');
      setMotivoDescarte('');
      setObs('');
      onSalvo();
    } catch (e: any) {
      Alert.alert('Lote encerrado', e.message || 'Não foi possível salvar o registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Mortalidade e descarte</Text>
      <GalpaoSelector galpoes={lote.galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />
      <DateFieldInline
        label="Data"
        value={data}
        onChange={setData}
        minimumDate={new Date(lote.dataAlojamento + 'T00:00:00')}
        maximumDate={new Date()}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <NumericFieldInline label="Mortalidade do dia (aves)" value={mortalidade} onChangeText={setMortalidade} />
        <NumericFieldInline label="Descartados do dia (aves)" value={descartados} onChangeText={setDescartados} />
      </View>

      <SimpleSelect
        label="Motivo do descarte — opcional"
        value={motivoDescarte}
        onChange={setMotivoDescarte}
        opcoes={opcoesMotivo}
        placeholder="Não informado"
      />

      <TextField
        label="Observações — opcional"
        value={obs}
        onChangeText={setObs}
        placeholder="Ex: aumento de temperatura à tarde..."
        multiline
        numberOfLines={3}
        style={{
          backgroundColor: COLORS.surfaceAlt,
          borderWidth: 1,
          borderColor: COLORS.line,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          fontSize: 15,
          color: COLORS.ink,
          minHeight: 70,
          textAlignVertical: 'top',
        }}
      />

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
    gap: 12,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
});
