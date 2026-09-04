import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Lote, fmt } from '../../utils/calculations';

interface Props {
  lote: Lote;
}

export function RacaoPorFaseCard({ lote }: Props) {
  const racoes = lote.racoes || [];

  const totaisPorFase = racoes.reduce((acc: Record<string, number>, r: any) => {
    const fase = r.tipoRacao || 'Sem fase';
    acc[fase] = (acc[fase] || 0) + (Number(r.racaoKg) || 0);
    return acc;
  }, {});

  const fases = Object.keys(totaisPorFase);

  if (!fases.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Ração consumida por fase</Text>
      {fases.map((fase) => (
        <View key={fase} style={styles.linha}>
          <Text style={styles.label}>{fase}</Text>
          <Text style={styles.valor}>{fmt(totaisPorFase[fase], 0)} kg</Text>
        </View>
      ))}
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
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  label: { fontSize: 13.5, color: COLORS.ink, fontWeight: '600' },
  valor: { fontSize: 13.5, color: COLORS.ink, fontWeight: '700' },
});
