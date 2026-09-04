// src/screens/detalhe/GraficoComparativoTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Pencil, Weight, TrendingUp } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';

import { COLORS } from '../../theme/colors';
import { getLoteById, getPadraoPeso, salvarPadraoPeso } from '../../storage/storage';
import {
  Lote,
  daysBetween,
  todayStr,
  interpolarPeso,
  pesoSerieCombinada,
  fmt,
} from '../../utils/calculations';
import type { PontoPesoPadrao, Sexagem } from '../../data/padraoSexagem';
import { LABEL_SEXAGEM } from '../../utils/constants';
import { StatCard } from '../../components/StatCard';
import { PesoPadraoEditor } from '../../components/registros/PesoPadraoEditor';
import type { DetalheLoteTabParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';

type Props = MaterialTopTabScreenProps<DetalheLoteTabParamList, 'GraficoComparativo'>;

export function GraficoComparativoTab({ route }: Props) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);
  const [padroes, setPadroes] = useState<PontoPesoPadrao[]>([]);
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const l = await getLoteById(userId, loteId);
    if (!l) {
      setLoading(false);
      return;
    }
    setLote(l);
    const p = await getPadraoPeso(userId, l.sexagem as Sexagem);
    setPadroes(p);
    setLoading(false);
  }, [loteId, userId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function handleSalvarPadroes(lista: PontoPesoPadrao[]) {
    if (!lote || !userId) return;
    setPadroes(lista);
    await salvarPadraoPeso(userId, lote.sexagem as Sexagem, lista);
    setEditando(false);
  }

  if (loading || !lote) {
    return (
      <View>
        <Text style={{ color: COLORS.inkSoft }}>Carregando...</Text>
      </View>
    );
  }

  const sexagemLabel = LABEL_SEXAGEM[lote.sexagem] || 'Misto';

  if (editando) {
    return (
      <View>
        <PesoPadraoEditor
          linhagemLabel={sexagemLabel}
          pontos={padroes}
          onClose={() => setEditando(false)}
          onSave={handleSalvarPadroes}
        />
      </View>
    );
  }

  const pesoSeries = pesoSerieCombinada(lote);
  const idadesUniao = Array.from(
    new Set([...padroes.map((p) => p.idade), ...pesoSeries.map((p) => p.idade)])
  ).sort((a, b) => a - b);

  const comparativoPeso = idadesUniao.map((idade) => ({
    idade,
    previsto: padroes.length ? interpolarPeso(padroes, idade) : null,
    real: pesoSeries.find((p) => p.idade === idade)?.peso ?? null,
  }));

  const comparativoGpd = idadesUniao
    .filter((i) => i > 0)
    .map((idade) => {
      const previstoPeso = padroes.length ? interpolarPeso(padroes, idade) : null;
      const realPeso = pesoSeries.find((p) => p.idade === idade)?.peso ?? null;
      return {
        idade,
        gpdPrevisto: previstoPeso !== null ? +(previstoPeso / idade).toFixed(1) : null,
        gpdReal: realPeso !== null ? +(realPeso / idade).toFixed(1) : null,
      };
    });

  const idadeReferencia = daysBetween(lote.dataAlojamento, todayStr());
  const previstoAtual = padroes.length ? interpolarPeso(padroes, idadeReferencia) : null;
  const ultimoReal = pesoSeries.length ? pesoSeries[pesoSeries.length - 1].peso : null;
  const diffAtual =
    previstoAtual !== null && ultimoReal !== null ? ultimoReal - previstoAtual : null;

  const dadosPrevistoPeso = comparativoPeso
    .filter((p) => p.previsto !== null)
    .map((p) => ({ value: p.previsto as number, label: `${p.idade}` }));
  const dadosRealPeso = comparativoPeso
    .filter((p) => p.real !== null)
    .map((p) => ({ value: p.real as number, label: `${p.idade}` }));

  const dadosPrevistoGpd = comparativoGpd
    .filter((p) => p.gpdPrevisto !== null)
    .map((p) => ({ value: p.gpdPrevisto as number, label: `${p.idade}` }));
  const dadosRealGpd = comparativoGpd
    .filter((p) => p.gpdReal !== null)
    .map((p) => ({ value: p.gpdReal as number, label: `${p.idade}` }));

  return (
    <View style={{ gap: 16 }}>
      <TouchableOpacity style={styles.btnEditar} onPress={() => setEditando(true)}>
        <Pencil size={14} color={COLORS.ink} />
        <Text style={styles.btnEditarTexto}>
          {padroes.length ? `Editar padrão (${sexagemLabel})` : `Definir padrão (${sexagemLabel})`}
        </Text>
      </TouchableOpacity>

      {padroes.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.vazio}>
            Nenhum padrão cadastrado para {sexagemLabel} ainda. Defina os pesos previstos por
            idade para comparar com o desempenho real deste lote.
          </Text>
        </View>
      ) : (
        <>
          {diffAtual !== null && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <StatCard
                  icon={Weight}
                  label="Peso previsto (hoje)"
                  value={fmt(previstoAtual as number, 0)}
                  unit="g"
                />
              </View>
              <View style={{ flex: 1 }}>
                <StatCard
                  icon={TrendingUp}
                  label="Real − previsto"
                  value={(diffAtual >= 0 ? '+' : '') + fmt(diffAtual, 0)}
                  unit="g"
                  accent={diffAtual >= 0 ? COLORS.primary : COLORS.alert}
                />
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.tituloGrafico}>
              Peso (g) × idade (dias) — previsto x real (todos os galpões)
            </Text>
            {dadosRealPeso.length > 0 || dadosPrevistoPeso.length > 0 ? (
              <>
                <LineChart
                  data={dadosPrevistoPeso}
                  data2={dadosRealPeso}
                  color1={COLORS.accent}
                  color2={COLORS.primary}
                  dataPointsColor1={COLORS.accent}
                  dataPointsColor2={COLORS.primary}
                  thickness1={2}
                  thickness2={2}
                  curved
                  noOfSections={4}
                  height={200}
                  spacing={30}
                  hideRules
                  initialSpacing={10}
                  yAxisTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: COLORS.inkSoft, fontSize: 9 }}
                  isAnimated
                  animationDuration={900}
                  animateOnDataChange
                  onDataChangeAnimationDuration={900}
                />
                <Legenda />
              </>
            ) : (
              <Text style={styles.vazio}>Registre pesos para comparar.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.tituloGrafico}>
              GPD médio acumulado (g/dia) × idade — previsto x real
            </Text>
            {comparativoGpd.length ? (
              <>
                <LineChart
                  data={dadosPrevistoGpd}
                  data2={dadosRealGpd}
                  color1={COLORS.accent}
                  color2={COLORS.primary}
                  dataPointsColor1={COLORS.accent}
                  dataPointsColor2={COLORS.primary}
                  thickness1={2}
                  thickness2={2}
                  curved
                  noOfSections={4}
                  height={200}
                  spacing={30}
                  hideRules
                  initialSpacing={10}
                  yAxisTextStyle={{ color: COLORS.inkSoft, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: COLORS.inkSoft, fontSize: 9 }}
                  isAnimated
                  animationDuration={900}
                  animateOnDataChange
                  onDataChangeAnimationDuration={900}
                />
                <Legenda />
              </>
            ) : (
              <Text style={styles.vazio}>Registre pesos para comparar o GPD.</Text>
            )}
            <Text style={styles.analiseTexto}>
              Peso combinado de todos os galpões (ponderado pela quantidade alojada em cada um).
              GPD = peso ÷ idade.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function Legenda() {
  return (
    <View style={styles.legendaContainer}>
      <View style={styles.legendaItem}>
        <View style={[styles.legendaCor, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.legendaTexto}>Real</Text>
      </View>
      <View style={styles.legendaItem}>
        <View style={[styles.legendaCor, { backgroundColor: COLORS.accent }]} />
        <Text style={styles.legendaTexto}>Previsto</Text>
      </View>
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
    gap: 8,
  },
  vazio: { fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 19, textAlign: 'center' },
  tituloGrafico: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  btnEditar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  btnEditarTexto: { fontSize: 13.5, fontWeight: '600', color: COLORS.ink },
  legendaContainer: { flexDirection: 'row', gap: 16, marginTop: 4, justifyContent: 'center' },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaCor: { width: 10, height: 10, borderRadius: 5 },
  legendaTexto: { fontSize: 11.5, color: COLORS.inkSoft },
  analiseTexto: { fontSize: 12, color: COLORS.inkSoft, lineHeight: 17 },
});
