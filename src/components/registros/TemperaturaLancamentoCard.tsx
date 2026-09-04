import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Pencil, Trash2, Thermometer } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import {
  Lote,
  todayStr,
  dataMenosDias,
  daysBetween,
  fmtDateBR,
  fmt,
  faixaConfortoNaIdade,
  PontoFaixaConforto,
} from '../../utils/calculations';
import { addTemperatura, removeTemperatura } from '../../storage/storage';
import { GalpaoSelector } from './GalpaoSelector';
import { NumericFieldInline } from './NumericFieldInline';
import { SalvarButton } from './SalvarButton';
import { StatCard } from '../StatCard';
import { FaixaConfortoEditor } from './FaixaConfortoEditor';
import { DateField } from '../DateField';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  lote: Lote;
  faixaConforto: PontoFaixaConforto[];
  onSalvarFaixaConforto: (pontos: PontoFaixaConforto[]) => void;
  onSalvo: () => void;
}

export function TemperaturaLancamentoCard({
  lote,
  faixaConforto,
  onSalvarFaixaConforto,
  onSalvo,
}: Props) {
  const { userId } = useAuth();
  const [galpaoId, setGalpaoId] = useState(lote.galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');
  const [loading, setLoading] = useState(false);
  const [editandoFaixa, setEditandoFaixa] = useState(false);

  const idade = daysBetween(lote.dataAlojamento, data || todayStr());
  const faixaSugerida = faixaConforto.length ? faixaConfortoNaIdade(faixaConforto, idade) : null;

  const avaliacao = (() => {
    if (!faixaSugerida) return null;
    const min = tempMin !== '' ? Number(tempMin) : null;
    const max = tempMax !== '' ? Number(tempMax) : null;
    if (min === null && max === null) return null;
    if (
      (min !== null && min < faixaSugerida.tempMin) ||
      (max !== null && max < faixaSugerida.tempMin)
    ) {
      return { texto: 'Abaixo da faixa ideal — considere aumentar o aquecimento.', cor: COLORS.danger ?? '#c0392b' };
    }
    if (
      (max !== null && max > faixaSugerida.tempMax) ||
      (min !== null && min > faixaSugerida.tempMax)
    ) {
      return { texto: 'Acima da faixa ideal — considere ventilar ou reduzir o aquecimento.', cor: COLORS.danger ?? '#c0392b' };
    }
    return { texto: 'Dentro da faixa ideal.', cor: COLORS.primary };
  })();

  const handleSalvar = async () => {
    if (!userId) return;
    if (!galpaoId || (tempMin === '' && tempMax === '')) return;
    setLoading(true);
    try {
      await addTemperatura(userId, lote.id, {
        galpaoId,
        data,
        tempMin: tempMin === '' ? null : Number(tempMin),
        tempMax: tempMax === '' ? null : Number(tempMax),
      });
      setTempMin('');
      setTempMax('');
      onSalvo();
    } catch (e: any) {
      Alert.alert('Lote encerrado', e.message || 'Não foi possível salvar o registro.');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!userId) return;
    await removeTemperatura(userId, lote.id, id);
    onSalvo();
  };

  const itensHistorico = [...(lote.temperaturas || [])].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <View style={styles.card}>
      <View style={styles.headerFaixa}>
        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>FAIXA IDEAL · DIA {idade}</Text>
        </View>
        <TouchableOpacity onPress={() => setEditandoFaixa(!editandoFaixa)}>
          <Pencil size={14} color={COLORS.inkSoft} />
        </TouchableOpacity>
      </View>

      {editandoFaixa ? (
        <FaixaConfortoEditor
          pontos={faixaConforto}
          onClose={() => setEditandoFaixa(false)}
          onSave={(lista) => {
            onSalvarFaixaConforto(lista);
            setEditandoFaixa(false);
          }}
        />
      ) : (
        <StatCard
          icon={Thermometer}
          label="Temperatura ideal para esta data"
          value={faixaSugerida ? `${fmt(faixaSugerida.tempMin, 0)}–${fmt(faixaSugerida.tempMax, 0)}` : '—'}
          unit="°C"
          accent={COLORS.accent}
        />
      )}

      <Text style={styles.titulo}>Registrar temperatura</Text>

      <GalpaoSelector galpoes={lote.galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />

      <DateField
        label="Data"
        value={data ? new Date(data + 'T00:00:00') : null}
        onChange={(date: Date) => {
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          setData(`${yyyy}-${mm}-${dd}`);
        }}
        minimumDate={new Date(dataMenosDias(lote.dataAlojamento, 15) + 'T00:00:00')}
        maximumDate={new Date()}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <NumericFieldInline label="Temp. mínima" unit="°C" value={tempMin} onChangeText={setTempMin} />
        <NumericFieldInline label="Temp. máxima" unit="°C" value={tempMax} onChangeText={setTempMax} />
      </View>

      {!!avaliacao && (
        <Text style={[styles.avaliacao, { color: avaliacao.cor }]}>{avaliacao.texto}</Text>
      )}

      <SalvarButton onPress={handleSalvar} loading={loading} />

      {itensHistorico.length > 0 && (
        <View style={{ marginTop: 4 }}>
          {itensHistorico.map((item) => {
            const galpao = lote.galpoes.find((g) => g.id === item.galpaoId);
            const idadeItem = daysBetween(lote.dataAlojamento, item.data);
            const faixaItem = faixaConforto.length
              ? faixaConfortoNaIdade(faixaConforto, idadeItem)
              : null;
            const foraFaixa =
              faixaItem &&
              ((item.tempMin !== null && item.tempMin < faixaItem.tempMin) ||
                (item.tempMax !== null && item.tempMax > faixaItem.tempMax));

            return (
              <View key={item.id} style={styles.itemHistorico}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemData}>
                    {fmtDateBR(item.data)} · dia {idadeItem}
                  </Text>
                  <TouchableOpacity onPress={() => handleExcluir(item.id)}>
                    <Trash2 size={13} color={COLORS.danger ?? '#c0392b'} />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[
                    styles.itemLinha,
                    { color: foraFaixa ? COLORS.danger ?? '#c0392b' : COLORS.inkSoft },
                  ]}
                >
                  {galpao ? `${galpao.nome} · ` : ''}
                  {item.tempMin ?? '?'}–{item.tempMax ?? '?'}°C
                  {faixaItem ? ` (ideal ${fmt(faixaItem.tempMin, 0)}–${fmt(faixaItem.tempMax, 0)}°C)` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}
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
  headerFaixa: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionBar: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  sectionBarTexto: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titulo: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, marginTop: 4 },
  avaliacao: { fontSize: 13, fontWeight: '600' },
  itemHistorico: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    borderStyle: 'dashed' as any,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemData: { fontSize: 12.5, fontWeight: '600', color: COLORS.ink },
  itemLinha: { fontSize: 12, marginTop: 2 },
});
