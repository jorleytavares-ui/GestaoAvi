// src/screens/lote/tabs/MortalidadeTab.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';

import { DateField } from '../../components/DateField';
import { HistoricoLista } from '../../components/registros/HistoricoLista';
import { SimpleSelect } from '../../components/SimpleSelect';
import { COLORS } from '../../theme/colors';
import { Lote, daysBetween } from '../../utils/calculations';
import { getLoteById, addMortalidade, removeMortalidade } from '../../storage/storage';
import type { DetalheLoteTabParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';

const MOTIVOS_DESCARTE = [
  { label: 'Não informado', value: '' },
  { label: 'Refugo', value: 'Refugo' },
  { label: 'Problema locomotor', value: 'Problema locomotor' },
  { label: 'Caquético', value: 'Caquético' },
];

type Props = MaterialTopTabScreenProps<DetalheLoteTabParamList, 'Mortalidade'>;

export function MortalidadeTab({ route }: Props) {
  const { loteId } = route.params;
  const { userId } = useAuth();

  const [lote, setLote] = useState<Lote | null>(null);
  const [galpaoId, setGalpaoId] = useState<string>('');
  const [carregandoLote, setCarregandoLote] = useState(true);

  const [data, setData] = useState<Date | null>(new Date());
  const [mortalidade, setMortalidade] = useState('0');
  const [descartados, setDescartados] = useState('0');
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarLote = useCallback(async () => {
    if (!userId) return;
    setCarregandoLote(true);
    try {
      const l = await getLoteById(userId, loteId);
      if (l) {
        setLote(l);
        setGalpaoId((atual) => {
          if (atual && l.galpoes.some((g) => g.id === atual)) return atual;
          return l.galpoes[0]?.id || '';
        });
      }
    } finally {
      setCarregandoLote(false);
    }
  }, [loteId, userId]);

  useFocusEffect(
    useCallback(() => {
      carregarLote();
    }, [carregarLote])
  );

  if (carregandoLote || !lote) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.label}>Carregando dados do lote...</Text>
      </View>
    );
  }

  const dataAlojamento = new Date(lote.dataAlojamento);

  const handleSalvar = async () => {
    if (!data || !userId) return;
    if (!galpaoId) {
      const msg = 'Selecione o galpão.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    setSalvando(true);
    try {
      await addMortalidade(userId, lote.id, {
        galpaoId,
        data: data.toISOString().slice(0, 10),
        mortalidade: Number(mortalidade) || 0,
        descartados: Number(descartados) || 0,
        motivoDescarte: motivoDescarte || undefined,
        obs: obs || undefined,
      });

      setMortalidade('0');
      setDescartados('0');
      setMotivoDescarte('');
      setObs('');
      await carregarLote();
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(e.message);
      } else {
        Alert.alert('Erro ao salvar', e.message);
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (item: { data: string; galpaoId: string }) => {
    if (!userId) return;
    const confirmar =
      Platform.OS === 'web'
        ? window.confirm('Deseja realmente excluir este registro de mortalidade?')
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Excluir registro',
              'Deseja realmente excluir este registro de mortalidade?',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });

    if (!confirmar) return;

    try {
      await removeMortalidade(userId, lote.id, item.galpaoId, item.data);
      await carregarLote();
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(e.message);
      } else {
        Alert.alert('Lote encerrado', e.message);
      }
    }
  };

  const itens = (lote.mortalidades || [])
  .filter((r: any) => r.galpaoId === galpaoId)
  .map((r: any) => ({
    data: r.data,
    galpaoId: r.galpaoId,
    dia: daysBetween(lote.dataAlojamento, r.data),
    mortalidade: Number(r.mortalidade) || 0,
    descartados: Number(r.descartados) || 0,
    motivoDescarte: r.motivoDescarte,
    obs: r.obs,
  }))
  .sort((a: any, b: any) => b.data.localeCompare(a.data));

const opcoesGalpao = lote.galpoes.map((g: any) => ({ label: g.nome, value: g.id }));


  return (
    <View>
      <Text style={styles.titulo}>Mortalidade e descarte</Text>

      {lote.galpoes.length > 1 && (
        <View style={styles.campo}>
          <SimpleSelect
            label="Galpão"
            value={galpaoId}
            onChange={setGalpaoId}
            opcoes={opcoesGalpao}
          />
        </View>
      )}

      <View style={styles.campo}>
        <DateField
          label="Data"
          value={data}
          onChange={setData}
          mode="date"
          minimumDate={dataAlojamento}
          maximumDate={new Date()}
        />
      </View>

      <View style={styles.linha}>
        <View style={[styles.campo, styles.metade]}>
          <Text style={styles.label}>Mortalidade do dia (aves)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={mortalidade}
            onChangeText={setMortalidade}
            placeholder="0"
          />
        </View>

        <View style={[styles.campo, styles.metade]}>
          <Text style={styles.label}>Descartados do dia (aves)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={descartados}
            onChangeText={setDescartados}
            placeholder="0"
          />
        </View>
      </View>

      <View style={styles.campo}>
        <SimpleSelect
          label="Motivo do descarte — opcional"
          value={motivoDescarte}
          onChange={setMotivoDescarte}
          opcoes={MOTIVOS_DESCARTE}
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.label}>Observações — opcional</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={obs}
          onChangeText={setObs}
          placeholder="Ex: aumento de temperatura à tarde..."
          multiline
          numberOfLines={4}
        />
      </View>

      <Pressable
        style={[styles.button, salvando && styles.buttonDisabled]}
        onPress={handleSalvar}
        disabled={salvando}
      >
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Salvar lançamento</Text>
        )}
      </Pressable>

      <Text style={styles.subtitulo}>Histórico</Text>
      <HistoricoLista
        itens={itens}
        galpoes={lote.galpoes}
        onExcluir={handleExcluir}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 16,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    marginTop: 24,
    marginBottom: 12,
  },
  campo: {
    marginBottom: 16,
  },
  linha: {
    flexDirection: 'row',
    gap: 12,
  },
  metade: {
    flex: 1,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.inkSoft,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.ink,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
