import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Trash2, X, Check } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { NumericFieldInline } from './NumericFieldInline';
import { fmt, uid, PontoFaixaConforto } from '../../utils/calculations';

interface Props {
  pontos: PontoFaixaConforto[];
  onSave: (lista: PontoFaixaConforto[]) => void;
  onClose: () => void;
}

export function FaixaConfortoEditor({ pontos, onSave, onClose }: Props) {
  const [lista, setLista] = useState<(PontoFaixaConforto & { id: string })[]>(
    [...pontos].sort((a, b) => a.idade - b.idade).map((p) => ({ ...p, id: uid() }))
  );
  const [idade, setIdade] = useState('');
  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');

  const adicionar = () => {
    if (idade === '' || tempMin === '' || tempMax === '' || Number(idade) < 0) return;
    const novos = [
      ...lista.filter((p) => p.idade !== Number(idade)),
      { id: uid(), idade: Number(idade), tempMin: Number(tempMin), tempMax: Number(tempMax) },
    ].sort((a, b) => a.idade - b.idade);
    setLista(novos);
    setIdade('');
    setTempMin('');
    setTempMax('');
  };

  const remover = (id: string) => setLista(lista.filter((p) => p.id !== id));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Faixa de conforto térmico</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={16} color={COLORS.inkSoft} />
        </TouchableOpacity>
      </View>

      <Text style={styles.descricao}>
        Valores de referência usuais de aquecimento para frango de corte — ajuste conforme a
        orientação do seu técnico ou linhagem. Vale para todos os lotes.
      </Text>

      {lista.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          {lista.map((p) => (
            <View key={p.id} style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dia {p.idade}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.infoValor}>
                  {fmt(p.tempMin, 0)}–{fmt(p.tempMax, 0)} °C
                </Text>
                <TouchableOpacity onPress={() => remover(p.id)}>
                  <Trash2 size={13} color={COLORS.danger ?? '#c0392b'} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <NumericFieldInline label="Idade (dias)" value={idade} onChangeText={setIdade} />
        </View>
        <View style={{ flex: 1 }}>
          <NumericFieldInline label="Mín. (°C)" value={tempMin} onChangeText={setTempMin} />
        </View>
        <View style={{ flex: 1 }}>
          <NumericFieldInline label="Máx. (°C)" value={tempMax} onChangeText={setTempMax} />
        </View>
      </View>

      <TouchableOpacity style={styles.btnGhost} onPress={adicionar}>
        <Plus size={15} color={COLORS.ink} />
        <Text style={styles.btnGhostTexto}>Adicionar ponto</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={() => onSave(lista.map(({ id, ...p }) => p))}
      >
        <Check size={16} color="#fff" />
        <Text style={styles.btnPrimaryTexto}>Salvar faixa</Text>
      </TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  descricao: { fontSize: 12, color: COLORS.inkSoft },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  infoLabel: { fontSize: 13, color: COLORS.inkSoft },
  infoValor: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 10,
  },
  btnGhostTexto: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  btnPrimaryTexto: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
