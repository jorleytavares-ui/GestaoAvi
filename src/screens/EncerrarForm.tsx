import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { getLoteById, encerrarLote } from '../storage/storage';
import { todayStr, Lote, Encerramento } from '../utils/calculations';
import { useAuth } from '../auth/AuthContext';
import { alertaUniversal } from '../utils/alerta';

interface LinhaGalpao {
  galpaoId: string;
  nome: string;
  pesoMedioFinalG: string;
  qtdeAbatida: string;
  pesoRecebidoKg: string;
  condenadosTotal: string;
}

export function EncerrarForm() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { loteId } = route.params;
  const { userId } = useAuth();

  const [lote, setLote] = useState<Lote | null>(null);
  const [linhas, setLinhas] = useState<LinhaGalpao[]>([]);
  const [pesoMedioProjetadoG, setPesoMedioProjetadoG] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregado, setCarregado] = useState(false);

  React.useEffect(() => {
    (async () => {
      if (!userId) return;
      const l = await getLoteById(userId, loteId);

      if (l) {
        setLote(l);
        setLinhas(
          (l.galpoes || []).map((g) => ({
            galpaoId: g.id,
            nome: g.nome,
            pesoMedioFinalG: '',
            qtdeAbatida: '',
            pesoRecebidoKg: '',
            condenadosTotal: '',
          }))
        );
      }
      setCarregado(true);
    })();
  }, [loteId, userId]);

  const atualizarLinha = (galpaoId: string, campo: keyof LinhaGalpao, valor: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.galpaoId === galpaoId ? { ...l, [campo]: valor } : l))
    );
  };

  const validar = () => {
    for (const l of linhas) {
      if (!l.pesoMedioFinalG || isNaN(Number(l.pesoMedioFinalG))) {
        alertaUniversal('Atenção', `Informe o peso médio final do galpão "${l.nome}".`);
        return false;
      }
    }
    return true;
  };

  const handleVoltar = () => {
    alertaUniversal(
      'Cancelar encerramento',
      'Deseja realmente desistir do encerramento deste lote? Os dados informados serão perdidos.',
      [
        { text: 'Continuar aqui', style: 'cancel' },
        {
          text: 'Sim, voltar',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleEncerrar = async () => {
    if (!lote || !userId) return;
    if (!validar()) return;
    setSalvando(true);
    try {
      const encerramento: Encerramento = {
        data: todayStr(),
        obs: obs.trim() || undefined,
        pesoMedioProjetadoG: pesoMedioProjetadoG ? Number(pesoMedioProjetadoG) : null,
        porGalpao: linhas.map((l) => ({
          galpaoId: l.galpaoId,
          pesoMedioFinalG: Number(l.pesoMedioFinalG),
          qtdeAbatida: l.qtdeAbatida ? Number(l.qtdeAbatida) : null,
          pesoRecebidoKg: l.pesoRecebidoKg ? Number(l.pesoRecebidoKg) : null,
          condenadosTotal: l.condenadosTotal ? Number(l.condenadosTotal) : null,
        })),
      };

      const resultado = await encerrarLote(userId, loteId, encerramento);

      if (!resultado) {
        alertaUniversal('Erro', 'Lote não encontrado para encerramento.');
        return;
      }

      alertaUniversal('Lote encerrado', 'O lote foi encerrado com sucesso.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('DetalheLote', { loteId, tab: 'Resumo' }),
        },
      ]);
    } catch {
      alertaUniversal('Erro', 'Não foi possível encerrar o lote.');
    } finally {
      setSalvando(false);
    }
  };

  if (!carregado) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <Pressable onPress={handleVoltar} style={styles.botaoVoltar} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.headerTitulo}>Encerrar lote {lote?.numero}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitulo}>
          Informe os dados de encerramento por galpão. Isso libera a geração do relatório em PDF.
        </Text>

        {linhas.map((l) => (
          <View key={l.galpaoId} style={styles.galpaoBox}>
            <Text style={styles.galpaoTitulo}>{l.nome}</Text>

            <Text style={styles.label}>Peso médio final (g)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={l.pesoMedioFinalG}
              onChangeText={(v) => atualizarLinha(l.galpaoId, 'pesoMedioFinalG', v)}
              placeholder="Ex: 2450"
              placeholderTextColor={COLORS.inkSoft}
            />

            <Text style={styles.label}>Qtde abatida (opcional)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={l.qtdeAbatida}
              onChangeText={(v) => atualizarLinha(l.galpaoId, 'qtdeAbatida', v)}
              placeholder="Ex: 9800"
              placeholderTextColor={COLORS.inkSoft}
            />

            <Text style={styles.label}>Peso recebido no frigorífico (kg, opcional)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={l.pesoRecebidoKg}
              onChangeText={(v) => atualizarLinha(l.galpaoId, 'pesoRecebidoKg', v)}
              placeholder="Ex: 24500"
              placeholderTextColor={COLORS.inkSoft}
            />

            <Text style={styles.label}>Condenados total (opcional)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={l.condenadosTotal}
              onChangeText={(v) => atualizarLinha(l.galpaoId, 'condenadosTotal', v)}
              placeholder="Ex: 120"
              placeholderTextColor={COLORS.inkSoft}
            />
          </View>
        ))}

        <Text style={styles.label}>Peso médio projetado do lote (g, opcional)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={pesoMedioProjetadoG}
          onChangeText={setPesoMedioProjetadoG}
          placeholder="Meta contratual"
          placeholderTextColor={COLORS.inkSoft}
        />

        <Text style={styles.label}>Observações (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={obs}
          onChangeText={setObs}
          placeholder="Notas finais sobre o desempenho do lote"
          placeholderTextColor={COLORS.inkSoft}
          multiline
        />

        <Pressable style={[styles.botao, salvando && { opacity: 0.6 }]} onPress={handleEncerrar} disabled={salvando}>
          <Text style={styles.botaoTexto}>{salvando ? 'Encerrando...' : 'Encerrar lote'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  botaoVoltar: { padding: 6, marginRight: 8 },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 16 },
  subtitulo: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 16, lineHeight: 17 },
  galpaoBox: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, marginBottom: 16, backgroundColor: COLORS.bg },
  galpaoTitulo: { fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  label: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.ink, backgroundColor: '#fff' },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  botao: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
