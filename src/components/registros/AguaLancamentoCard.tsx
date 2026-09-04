import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { TextField } from '../TextField';
import { DateField } from '../DateField';
import { HistoricoLista } from './HistoricoLista';
import { GalpaoSelector } from './GalpaoSelector';
import { Lote, todayStr, dataMenosDias, fmt, uid, daysBetween } from '../../utils/calculations';

interface Props {
  lote: Lote;
  onAdicionar: (registro: {
    id: string;
    galpaoId: string;
    data: string;
    leituraHidrometro: number;
    consumoM3: number;
    ppm: number | null;
    ph: number | null;
  }) => void;
  onRemover: (id: string) => void;
  onSalvarHoraLeitura: (hora: string) => void;
}

// --- helpers de conversão string <-> Date ---
function dataStrToDate(v: string | null): Date | null {
  return v ? new Date(v + 'T00:00:00') : null;
}
function dateToDataStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function horaStrToDate(v: string | null): Date | null {
  if (!v) return null;
  const [hh, mi] = v.split(':').map(Number);
  const d = new Date();
  d.setHours(hh || 0, mi || 0, 0, 0);
  return d;
}
function dateToHoraStr(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

export function AguaLancamentoCard({ lote, onAdicionar, onRemover, onSalvarHoraLeitura }: Props) {
  const [galpaoId, setGalpaoId] = useState(lote.galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [leituraHidrometro, setLeituraHidrometro] = useState('');
  const [ppm, setPpm] = useState('');
  const [ph, setPh] = useState('');
  const [horaLeitura, setHoraLeitura] = useState(lote.horaLeituraAgua || '');
  const [erro, setErro] = useState('');

  const itens = [...(lote.aguas || [])].sort((a, b) => a.data.localeCompare(b.data));
  const itensGalpao = itens.filter((a) => a.galpaoId === galpaoId);
  const anterior = itensGalpao.length ? itensGalpao[itensGalpao.length - 1] : null;

  const consumoCalculadoM3 =
    leituraHidrometro !== '' && anterior && Number(leituraHidrometro) >= anterior.leituraHidrometro
      ? +(Number(leituraHidrometro) - anterior.leituraHidrometro).toFixed(3)
      : null;

  const adicionar = () => {
    if (!galpaoId) { setErro('Selecione o galpão.'); return; }
    if (!data) { setErro('Informe a data.'); return; }
    if (leituraHidrometro === '') { setErro('Informe a leitura do hidrômetro.'); return; }
    if (anterior && Number(leituraHidrometro) < anterior.leituraHidrometro) {
      setErro('Leitura menor que a anterior — confira o valor.');
      return;
    }
    setErro('');
    onAdicionar({
      id: uid(),
      galpaoId,
      data,
      leituraHidrometro: Number(leituraHidrometro),
      consumoM3: anterior ? +(Number(leituraHidrometro) - anterior.leituraHidrometro).toFixed(3) : 0,
      ppm: ppm === '' ? null : Number(ppm),
      ph: ph === '' ? null : Number(ph),
    });
    setLeituraHidrometro('');
    setPpm('');
    setPh('');
  };

  const itensHistorico = [...itens].reverse().map((item) => {
    const ppmPh = [
      item.ppm != null ? `Ppm ${fmt(Number(item.ppm), 2)}` : null,
      item.ph != null ? `pH ${fmt(Number(item.ph), 1)}` : null,
    ].filter(Boolean).join(' · ');

    return {
      id: item.id,
      data: item.data,
      galpaoId: item.galpaoId,
      dia: daysBetween(lote.dataAlojamento, item.data),
      linhaCustom: `Leitura ${fmt(Number(item.leituraHidrometro), 3)} m³ · Consumo ${fmt(Number(item.consumoM3), 3)} m³ (${fmt(Number(item.consumoM3) * 1000, 0)} L)`,
      linha3Custom: ppmPh || undefined,
    };
  });

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Avaliação do consumo de água</Text>
      <Text style={styles.descricao}>
        A leitura deve ser feita diariamente, sempre no mesmo horário. O app calcula o consumo do dia
        automaticamente pela diferença entre a leitura de hoje e a anterior.
      </Text>

      <DateField
        mode="time"
        label="Horário da leitura"
        optional
        value={horaStrToDate(horaLeitura)}
        onChange={(d) => {
          const h = dateToHoraStr(d);
          setHoraLeitura(h);
          onSalvarHoraLeitura(h);
        }}
      />

      <GalpaoSelector galpoes={lote.galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />

      <DateField
        mode="date"
        label="Data"
        value={dataStrToDate(data)}
        onChange={(d) => setData(dateToDataStr(d))}
        minimumDate={dataStrToDate(dataMenosDias(lote.dataAlojamento, 15)) || undefined}
        maximumDate={dataStrToDate(todayStr()) || undefined}
      />

      <TextField
        label="Leitura do hidrômetro (m³)"
        keyboardType="decimal-pad"
        value={leituraHidrometro}
        onChangeText={setLeituraHidrometro}
      />

      <View style={styles.row}>
        <View style={styles.col}>
          <TextField label="Ppm — opcional" keyboardType="decimal-pad" value={ppm} onChangeText={setPpm} />
        </View>
        <View style={styles.col}>
          <TextField label="pH — opcional" keyboardType="decimal-pad" value={ph} onChangeText={setPh} />
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Consumo do dia</Text>
        <Text style={styles.infoValor}>
          {consumoCalculadoM3 !== null
            ? `${fmt(consumoCalculadoM3, 3)} m³ (${fmt(consumoCalculadoM3 * 1000, 0)} L)`
            : anterior
            ? '—'
            : 'primeira leitura (base)'}
        </Text>
      </View>

      {!!erro && <Text style={styles.erro}>{erro}</Text>}

      <TouchableOpacity style={styles.btnAdicionar} onPress={adicionar}>
        <Plus size={14} color={COLORS.ink} />
        <Text style={styles.btnAdicionarTexto}>Adicionar leitura</Text>
      </TouchableOpacity>

      <HistoricoLista itens={itensHistorico} galpoes={lote.galpoes} onExcluir={(item: any) => onRemover(item.id)} />
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
    gap: 12,
  },
  titulo: { fontSize: 14, fontWeight: '600', color: COLORS.inkSoft },
  descricao: { fontSize: 12, color: COLORS.inkSoft },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  infoLabel: { fontSize: 13, color: COLORS.inkSoft },
  infoValor: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  erro: { color: COLORS.danger ?? '#c0392b', fontSize: 13.5 },
  btnAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 10,
  },
  btnAdicionarTexto: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
});
