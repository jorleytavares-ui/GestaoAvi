// src/screens/detalhe/EvolucaoTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { COLORS } from '../../theme/colors';
import {
  Lote,
  pesoSerieCombinada,
  mortalidadeSerieCombinada,
  racaoSerieCombinada,
  conversaoAlimentarSerieCombinada,
} from '../../utils/calculations';
import { getLoteById } from '../../storage/storage';
import { useAuth } from '../../auth/AuthContext';

const screenWidth = Dimensions.get('window').width - 64;

function toGiftedData(pontos: { idade: number; [k: string]: any }[], campo: string) {
  return pontos.map((p) => ({
    value: Number(p[campo]) || 0,
    label: String(p.idade),
    dataPointText: String(Number(p[campo]).toFixed(1)),
  }));
}

export function EvolucaoTab() {
  const route = useRoute<any>();
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  const carregar = useCallback(async () => {
    if (!userId) return;
    const l = await getLoteById(userId, loteId);
    if (l) setLote(l);
  }, [loteId, userId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
      setFocusKey((k) => k + 1); // força remount a cada foco
    }, [carregar])
  );

  if (!lote) return null;

  const pesoSeries = pesoSerieCombinada(lote);
  const mortalidadeSeries = mortalidadeSerieCombinada(lote);
  const racaoSeries = racaoSerieCombinada(lote);
  const conversaoSeries = conversaoAlimentarSerieCombinada(lote);

  return (
    <View key={focusKey}>
      <Text style={styles.label}>Peso médio combinado (g) × idade (dias)</Text>
      {pesoSeries.length >= 2 ? (
        <View style={styles.chartBox}>
          <LineChart
            data={toGiftedData(pesoSeries, 'peso')}
            width={screenWidth}
            height={180}
            color={COLORS.primary}
            thickness={2}
            dataPointsColor={COLORS.primary}
            yAxisTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
            noOfSections={4}
            curved
            isAnimated
            animationDuration={900}
            animateOnDataChange
            onDataChangeAnimationDuration={900}
          />
        </View>
      ) : <EmptyBox texto="Registre o peso em pelo menos duas datas para ver a curva." />}

      <Text style={styles.label}>Mortalidade acumulada (%) × idade (dias)</Text>
      {mortalidadeSeries.length >= 1 ? (
        <View style={styles.chartBox}>
          <LineChart
            data={toGiftedData(mortalidadeSeries, 'mortPct')}
            width={screenWidth}
            height={180}
            color={COLORS.alert}
            thickness={2}
            dataPointsColor={COLORS.alert}
            yAxisTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
            noOfSections={4}
            curved
            isAnimated
            animationDuration={900}
            animateOnDataChange
            onDataChangeAnimationDuration={900}
          />
        </View>
      ) : <EmptyBox texto="Nenhum registro ainda." />}

      <Text style={styles.label}>Ração consumida por dia — todos os galpões (kg)</Text>
      {racaoSeries.length >= 1 ? (
        <View style={styles.chartBox}>
          <BarChart
            data={toGiftedData(racaoSeries, 'racao').map((d) => ({
              value: d.value,
              label: d.label,
              frontColor: COLORS.accent,
            }))}
            width={screenWidth}
            height={180}
            yAxisTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
            noOfSections={4}
            isAnimated
            animationDuration={900}
          />
        </View>
      ) : <EmptyBox texto="Nenhum registro ainda." />}

      <Text style={styles.label}>Conversão alimentar acumulada × idade (dias)</Text>
      {conversaoSeries.length >= 1 ? (
        <>
          <View style={styles.chartBox}>
            <LineChart
              data={toGiftedData(conversaoSeries, 'conversao')}
              width={screenWidth}
              height={180}
              color={COLORS.primary}
              thickness={2}
              dataPointsColor={COLORS.primary}
              yAxisTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
              noOfSections={4}
              curved
              isAnimated
              animationDuration={900}
              animateOnDataChange
              onDataChangeAnimationDuration={900}
            />
          </View>
          <Text style={styles.legenda}>
            Conversão = ração fornecida acumulada ÷ peso vivo total, calculada a cada pesagem.
          </Text>
        </>
      ) : <EmptyBox texto="Registre ração e peso para calcular a conversão." />}
    </View>
  );
}

function EmptyBox({ texto }: { texto: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, textAlign: 'center' }}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: COLORS.inkSoft, marginBottom: 8, marginTop: 18 },
  chartBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 4,
    alignItems: 'center',
  },
  emptyBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 20 },
  legenda: { fontSize: 11.5, color: COLORS.inkSoft, marginTop: 6 },
});
