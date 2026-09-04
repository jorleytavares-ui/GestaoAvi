// components/AvaliacoesTecnicasCard.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { addAvaliacaoTecnica } from '../utils/storage';
import { todayStr, Lote } from '../utils/calculations';
import { useAuth } from '../auth/AuthContext';

interface Props {
  lote: Lote;
  galpaoId: string;
  onSaved: () => void;
}

export default function AvaliacoesTecnicasCard({ lote, galpaoId, onSaved }: Props) {
  const { userId } = useAuth();
  const [data, setData] = useState(todayStr());
  const [uniformidade, setUniformidade] = useState('');
  const [escoreCama, setEscoreCama] = useState('');
  const [escoreFezes, setEscoreFezes] = useState('');
  const [observacoes, setObservacoes] = useState('');

  async function salvar() {
    if (!userId) return;
    await addAvaliacaoTecnica(userId, lote.id, {
      galpaoId,
      data,
      uniformidade: uniformidade ? Number(uniformidade) : null,
      escoreCama: escoreCama ? Number(escoreCama) : null,
      escoreFezes: escoreFezes ? Number(escoreFezes) : null,
      observacoes,
    });
    setUniformidade(''); setEscoreCama(''); setEscoreFezes(''); setObservacoes('');
    onSaved();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Avaliação Técnica</Text>
      <TextInput style={styles.input} placeholder="Data (AAAA-MM-DD)" value={data} onChangeText={setData} />
      <TextInput style={styles.input} placeholder="Uniformidade (%)" value={uniformidade} onChangeText={setUniformidade} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Escore de cama (1-5)" value={escoreCama} onChangeText={setEscoreCama} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Escore de fezes (1-5)" value={escoreFezes} onChangeText={setEscoreFezes} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Observações" value={observacoes} onChangeText={setObservacoes} multiline />
      <TouchableOpacity style={styles.btn} onPress={salvar}>
        <Text style={styles.btnText}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 16, marginBottom: 12 },
  title: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 },
  btn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
