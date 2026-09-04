import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { Lote, todayStr, dataMenosDias, fmt, uid } from '../../utils/calculations';
import { addPesagem } from '../../storage/storage';
import { GalpaoSelector } from './GalpaoSelector';
import { DateField } from '../DateField';
import { NumericFieldInline } from './NumericFieldInline';
import { SalvarButton } from './SalvarButton';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  lote: Lote;
  onSalvo: () => void;
}

interface LinhaPesagem {
  id: string;
  qtdAves: string;
  pesoRegistradoKg: string;
  descontosKg: string;
}

const novaLinha = (): LinhaPesagem => ({ id: uid(), qtdAves: '', pesoRegistradoKg: '', descontosKg: '' });

export function PesagemAmostraCard({ lote, onSalvo }: Props) {
  const { userId } = useAuth();
  const [galpaoId, setGalpaoId] = useState(lote.galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [pesagens, setPesagens] = useState<LinhaPesagem[]>([novaLinha()]);
  const [loading, setLoading] = useState(false);

  const atualizar = (id: string, campo: keyof LinhaPesagem, valor: string) =>
    setPesagens(pesagens.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));

  const adicionarLinha = () => setPesagens([...pesagens, novaLinha()]);
  const removerLinha = (id: string) => setPesagens(pesagens.filter((p) => p.id !== id));

  const pesagensValidas = pesagens.filter(
    (p) => p.qtdAves !== '' && Number(p.qtdAves) > 0 && p.pesoRegistradoKg !== ''
  );
  const totalAvesPesadas = pesagensValidas.reduce((s, p) => s + Number(p.qtdAves), 0);
  const totalPesoLiquidoKg = pesagensValidas.reduce(
    (s, p) => s + Math.max(Number(p.pesoRegistradoKg) - (Number(p.descontosKg) || 0), 0),
    0
  );
  const totalDescontosKg = pesagensValidas.reduce((s, p) => s + (Number(p.descontosKg) || 0), 0);
  const totalPesoRegistradoKg = pesagensValidas.reduce((s, p) => s + Number(p.pesoRegistradoKg), 0);
  const pesoMedioCalculadoG = totalAvesPesadas > 0 ? (totalPesoLiquidoKg * 1000) / totalAvesPesadas : null;

  const handleSalvar = async () => {
    if (!userId) return;
    if (!galpaoId || !pesagensValidas.length || pesoMedioCalculadoG === null) return;
    setLoading(true);
    try {
      await addPesagem(userId, lote.id, {
        galpaoId,
        data,
        pesoMedioG: +pesoMedioCalculadoG.toFixed(1),
        pesagens: pesagensValidas.map((p) => ({
          qtdAves: Number(p.qtdAves),
          pesoRegistradoKg: Number(p.pesoRegistradoKg),
          descontosKg: Number(p.descontosKg) || 0,
        })),
        pesagemQtdAves: totalAvesPesadas,
        pesagemPesoRegistradoKg: +totalPesoRegistradoKg.toFixed(2),
        pesagemDescontosKg: +totalDescontosKg.toFixed(2),
      });
      setPesagens([novaLinha()]);
      onSalvo();
    } catch (e: any) {
      Alert.alert('Lote encerrado', e.message || 'Não foi possível salvar o registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Pesagem da amostra</Text>

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

      {pesagens.map((p, i) => (
        <View key={p.id} style={styles.linhaBox}>
          <View style={styles.linhaHeader}>
            <Text style={styles.linhaTitulo}>Pesagem {i + 1}</Text>
            {pesagens.length > 1 && (
              <TouchableOpacity onPress={() => removerLinha(p.id)}>
                <Trash2 size={13} color={COLORS.danger ?? '#c0392b'} />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            <NumericFieldInline
              label="Qtde de aves"
              value={p.qtdAves}
              onChangeText={(v) => atualizar(p.id, 'qtdAves', v)}
            />
            <NumericFieldInline
              label="Peso registrado"
              unit="kg"
              value={p.pesoRegistradoKg}
              onChangeText={(v) => atualizar(p.id, 'pesoRegistradoKg', v)}
            />
          </View>
          <NumericFieldInline
            label="Descontos (kg) — tara, gaiola etc."
            value={p.descontosKg}
            onChangeText={(v) => atualizar(p.id, 'descontosKg', v)}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.btnGhost} onPress={adicionarLinha}>
        <Plus size={14} color={COLORS.ink} />
        <Text style={styles.btnGhostTexto}>Adicionar outra pesagem</Text>
      </TouchableOpacity>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Total de aves pesadas</Text>
        <Text style={styles.infoValor}>{totalAvesPesadas || '—'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Peso médio final</Text>
        <Text style={styles.infoValor}>
          {pesoMedioCalculadoG !== null ? `${fmt(pesoMedioCalculadoG, 1)} g` : '—'}
        </Text>
      </View>

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
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  linhaBox: {
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderStyle: 'dashed' as any,
    borderRadius: 10,
  },
  linhaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  linhaTitulo: { fontSize: 11.5, fontWeight: '600', color: COLORS.inkSoft },
  btnGhost: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
  },
  btnGhostTexto: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    borderStyle: 'dotted' as any,
  },
  infoLabel: { fontSize: 12.5, color: COLORS.inkSoft },
  infoValor: { fontSize: 12.5, fontWeight: '600', color: COLORS.ink },
});
