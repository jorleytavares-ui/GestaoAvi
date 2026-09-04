import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Plus, Check, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { fmt } from '../../utils/calculations';
import { NumericFieldInline } from './NumericFieldInline';
import type { PontoPesoPadrao } from '../../data/padraoSexagem';

interface Props {
  linhagemLabel: string;
  pontos: PontoPesoPadrao[];
  onSave: (pontos: PontoPesoPadrao[]) => void;
  onClose: () => void;
}

export function PesoPadraoEditor({ linhagemLabel, pontos, onSave, onClose }: Props) {
  const [lista, setLista] = useState<PontoPesoPadrao[]>(
    [...pontos].sort((a, b) => a.idade - b.idade)
  );
  const [idade, setIdade] = useState('');
  const [pesoG, setPesoG] = useState('');

  const adicionar = () => {
    if (idade === '' || pesoG === '' || Number(idade) < 0 || Number(pesoG) <= 0) return;
    const novos = [
      ...lista.filter((p) => p.idade !== Number(idade)),
      { idade: Number(idade), pesoG: Number(pesoG) },
    ].sort((a, b) => a.idade - b.idade);
    setLista(novos);
    setIdade('');
    setPesoG('');
  };

  const remover = (idadeRemover: number) =>
    setLista(lista.filter((p) => p.idade !== idadeRemover));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Padrão · {linhagemLabel}</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={16} color={COLORS.inkSoft} />
        </TouchableOpacity>
      </View>
      <Text style={styles.desc}>
        Informe pontos de idade (dias) e peso previsto (g) conforme a tabela de desempenho ou
        orientação do técnico. Vale para todos os lotes dessa sexagem.
      </Text>

      {lista.length > 0 && (
        <View>
          {lista.map((p) => (
            <View key={p.idade} style={styles.linha}>
              <Text style={styles.linhaTexto}>Dia {p.idade}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.linhaValor}>{fmt(p.pesoG, 0)} g</Text>
                <TouchableOpacity onPress={() => remover(p.idade)}>
                  <Trash2 size={13} color={COLORS.danger ?? '#c0392b'} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <NumericFieldInline label="Idade (dias)" value={idade} onChangeText={setIdade} />
        <NumericFieldInline label="Peso previsto" unit="g" value={pesoG} onChangeText={setPesoG} />
      </View>

      <TouchableOpacity style={styles.btnGhost} onPress={adicionar}>
        <Plus size={15} color={COLORS.ink} />
        <Text style={styles.btnGhostTexto}>Adicionar ponto</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnPrimary} onPress={() => onSave(lista)}>
        <Check size={16} color="#fff" />
        <Text style={styles.btnPrimaryTexto}>Salvar padrão</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  desc: { fontSize: 12, color: COLORS.inkSoft },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    borderStyle: 'dotted' as any,
  },
  linhaTexto: { fontSize: 13, color: COLORS.inkSoft },
  linhaValor: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
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
  btnPrimary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  btnPrimaryTexto: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
