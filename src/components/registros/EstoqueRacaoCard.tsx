import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../theme/colors';
import {
  Lote,
  todayStr,
  dataMenosDias,
  fmt,
  daysBetween,
  conversaoAjustadaGalpaoNaData,
  consumoMedioRecente,
} from '../../utils/calculations';
import { addEstoqueRacao, removeEstoqueRacao } from '../../storage/storage';
import { GalpaoSelector } from './GalpaoSelector';
import { DateField } from '../DateField';
import { NumericFieldInline } from './NumericFieldInline';
import { SalvarButton } from './SalvarButton';
import { HistoricoLista } from './HistoricoLista';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  lote: Lote;
  onSalvo: () => void;
}

export function EstoqueRacaoCard({ lote, onSalvo }: Props) {
  const { userId } = useAuth();
  const [galpaoId, setGalpaoId] = useState(lote.galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [estoqueSiloKg, setEstoqueSiloKg] = useState('');
  const [estoqueEquipamentosKg, setEstoqueEquipamentosKg] = useState('');
  const [diasPrevisao, setDiasPrevisao] = useState('7');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const galpaoNome = lote.galpoes.find((g) => g.id === galpaoId)?.nome || '';

  const estoques = [...((lote as any).estoquesRacao || [])].sort((a: any, b: any) =>
    a.data.localeCompare(b.data)
  );
  const estoquesGalpao = estoques.filter((e: any) => e.galpaoId === galpaoId);
  const ultimo = estoquesGalpao.length ? estoquesGalpao[estoquesGalpao.length - 1] : null;

  const consumoMedio = consumoMedioRecente(lote, galpaoId, 5);
  const dias = Number(diasPrevisao) || 0;
  const previsaoConsumoKg = consumoMedio !== null ? consumoMedio * dias : null;
  const estoqueInformadoKg =
    estoqueSiloKg !== '' || estoqueEquipamentosKg !== ''
      ? (Number(estoqueSiloKg) || 0) + (Number(estoqueEquipamentosKg) || 0)
      : 0;
  const autonomiaDias =
    consumoMedio && consumoMedio > 0 ? estoqueInformadoKg / consumoMedio : null;
  const faltaKg =
    previsaoConsumoKg !== null && estoqueInformadoKg < previsaoConsumoKg
      ? previsaoConsumoKg - estoqueInformadoKg
      : 0;
  const estoqueInsuficiente = previsaoConsumoKg !== null && faltaKg > 0;

  const previa =
    galpaoId && data && estoqueSiloKg !== '' && estoqueEquipamentosKg !== ''
      ? conversaoAjustadaGalpaoNaData(
          lote,
          galpaoId,
          data,
          Number(estoqueSiloKg),
          Number(estoqueEquipamentosKg)
        )
      : null;

  const handleSalvar = async () => {
    if (!userId) return;
    if (!galpaoId) { setErro('Selecione o galpão.'); return; }
    if (!data) { setErro('Informe a data.'); return; }
    if (estoqueSiloKg === '') { setErro('Informe o estoque no silo.'); return; }
    if (estoqueEquipamentosKg === '') { setErro('Informe o estoque nos equipamentos.'); return; }

    setErro('');
    setLoading(true);
    try {
      await addEstoqueRacao(userId, lote.id, {
        galpaoId,
        data,
        estoqueSiloKg: Number(estoqueSiloKg),
        estoqueEquipamentosKg: Number(estoqueEquipamentosKg),
      });
      setEstoqueSiloKg('');
      setEstoqueEquipamentosKg('');
      onSalvo();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível salvar o estoque.');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (item: any) => {
    if (!userId) return;
    await removeEstoqueRacao(userId, lote.id, item.id);
    onSalvo();
  };

  const itensHistorico = [...estoques].reverse().map((item: any) => {
    const conv = conversaoAjustadaGalpaoNaData(
      lote,
      item.galpaoId,
      item.data,
      item.estoqueSiloKg,
      item.estoqueEquipamentosKg
    );
    return {
      id: item.id,
      data: item.data,
      galpaoId: item.galpaoId,
      dia: daysBetween(lote.dataAlojamento, item.data),
      linhaCustom: `Silo ${fmt(item.estoqueSiloKg, 0)} kg · Equip. ${fmt(
        item.estoqueEquipamentosKg,
        0
      )} kg`,
      linha3Custom:
        conv.conversaoAjustada !== null
          ? `Conversão ajustada: ${fmt(conv.conversaoAjustada, 3)}`
          : undefined,
    };
  });

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Estoque de ração — conversão ajustada por idade</Text>
      <Text style={styles.subtitulo}>
        Informe, para cada galpão, o que ainda está parado no silo e nos equipamentos numa data —
        o app desconta isso da ração fornecida e mostra a conversão alimentar real. Também estima
        o consumo dos próximos dias com base no ritmo recente, para ajudar a programar reposição
        sem faltar nem sobrar ração até o encerramento.
      </Text>

      <GalpaoSelector galpoes={lote.galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />

      {!!galpaoNome && <Text style={styles.galpaoNome}>{galpaoNome}</Text>}

      <DateField
        label="Data"
        value={data ? new Date(data + 'T00:00:00') : null}
        onChange={(d) => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setData(`${yyyy}-${mm}-${dd}`);
        }}
        minimumDate={new Date(dataMenosDias(lote.dataAlojamento, 15) + 'T00:00:00')}
        maximumDate={new Date(todayStr() + 'T00:00:00')}
      />

      {ultimo && (
        <Text style={styles.ultimoInfo}>
          Última leitura: {fmt(ultimo.estoqueSiloKg, 0)} kg (silo) + {fmt(ultimo.estoqueEquipamentosKg, 0)} kg (equip.)
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <NumericFieldInline
          label="Estoque no Silo (kg)"
          unit="kg"
          value={estoqueSiloKg}
          onChangeText={setEstoqueSiloKg}
        />
        <NumericFieldInline
          label="Estoque nos Equipamentos (kg)"
          unit="kg"
          value={estoqueEquipamentosKg}
          onChangeText={setEstoqueEquipamentosKg}
        />
      </View>

      <View style={styles.previsaoBloco}>
        <Text style={styles.previsaoTitulo}>PREVISÃO DE CONSUMO</Text>

        <NumericFieldInline
          label="Prever para quantos dias?"
          value={diasPrevisao}
          onChangeText={setDiasPrevisao}
        />

        <View style={styles.previsaoLinha}>
          <Text style={styles.previsaoLabel}>Consumo médio recente</Text>
          <Text style={styles.previsaoValor}>
            {consumoMedio !== null ? `${fmt(consumoMedio, 1)} kg/dia` : '—'}
          </Text>
        </View>

        <View style={styles.previsaoLinha}>
          <Text style={styles.previsaoLabel}>Previsão para {dias} dias</Text>
          <Text style={styles.previsaoValor}>
            {previsaoConsumoKg !== null ? `${fmt(previsaoConsumoKg, 1)} kg` : '—'}
          </Text>
        </View>

        <View style={styles.previsaoLinha}>
          <Text style={styles.previsaoLabel}>Estoque informado acima</Text>
          <Text style={styles.previsaoValor}>{fmt(estoqueInformadoKg, 1)} kg</Text>
        </View>

        <View style={[styles.previsaoLinha, { borderBottomWidth: 0 }]}>
          <Text style={styles.previsaoLabel}>Autonomia do estoque atual</Text>
          <Text style={styles.previsaoValor}>
            {autonomiaDias !== null ? `${fmt(autonomiaDias, 1)} dias` : '—'}
          </Text>
        </View>

        {estoqueInsuficiente && (
          <Text style={styles.avisoInsuficiente}>
            ⚠ Estoque insuficiente: faltam aprox. {fmt(faltaKg, 1)} kg para cobrir os próximos {dias} dias. Programe reposição.
          </Text>
        )}
      </View>

      {previa && (
        <View style={styles.previaBox}>
          <View style={styles.previaLinha}>
            <Text style={styles.previaLabel}>Ração fornecida (acum.)</Text>
            <Text style={styles.previaValor}>{fmt(previa.racaoFornecidaKg, 0)} kg</Text>
          </View>
          <View style={styles.previaLinha}>
            <Text style={styles.previaLabel}>Ração consumida real</Text>
            <Text style={styles.previaValor}>{fmt(previa.racaoConsumidaRealKg, 0)} kg</Text>
          </View>
          <View style={styles.previaLinha}>
            <Text style={styles.previaLabel}>Peso vivo total</Text>
            <Text style={styles.previaValor}>
              {previa.pesoVivoTotalKg !== null ? `${fmt(previa.pesoVivoTotalKg, 0)} kg` : '—'}
            </Text>
          </View>
          <View style={[styles.previaLinha, { borderBottomWidth: 0 }]}>
            <Text style={[styles.previaLabel, { fontWeight: '700' }]}>Conversão ajustada</Text>
            <Text style={[styles.previaValor, { fontWeight: '700', color: COLORS.primary }]}>
              {previa.conversaoAjustada !== null ? fmt(previa.conversaoAjustada, 3) : '—'}
            </Text>
          </View>
        </View>
      )}

      {!!erro && <Text style={styles.erro}>{erro}</Text>}

      <SalvarButton onPress={handleSalvar} loading={loading} label="Calcular e salvar" />

      <HistoricoLista embedded itens={itensHistorico} galpoes={lote.galpoes} onExcluir={handleExcluir} />
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
    gap: 4,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  subtitulo: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 12 },
  galpaoNome: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  ultimoInfo: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 8 },
  previsaoBloco: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    gap: 4,
  },
  previsaoTitulo: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.inkSoft,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  previsaoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  previsaoLabel: { fontSize: 12.5, color: COLORS.inkSoft },
  previsaoValor: { fontSize: 12.5, fontWeight: '700', color: COLORS.ink },
  avisoInsuficiente: {
    fontSize: 12,
    color: COLORS.alert,
    marginTop: 8,
    backgroundColor: '#fdecea',
    padding: 8,
    borderRadius: 8,
  },
  previaBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  previaLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  previaLabel: { fontSize: 12.5, color: COLORS.inkSoft },
  previaValor: { fontSize: 12.5, color: COLORS.ink },
  erro: { color: COLORS.alert, fontSize: 13.5, marginVertical: 6 },
});
