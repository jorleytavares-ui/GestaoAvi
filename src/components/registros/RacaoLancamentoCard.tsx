import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Lote, todayStr, dataMenosDias } from '../../utils/calculations';
import { FASES_RACAO } from '../../utils/constants';
import { addRacao } from '../../storage/storage';
import { GalpaoSelector } from './GalpaoSelector';
import { DateField } from '../DateField';
import { NumericFieldInline } from './NumericFieldInline';
import { SalvarButton } from './SalvarButton';
import { SimpleSelect } from '../SimpleSelect';
import { TextField } from '../TextField';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  lote: Lote;
  onSalvo: () => void;
  embedded?: boolean;
}

export function RacaoLancamentoCard({ lote, onSalvo, embedded }: Props) {
  const { userId } = useAuth();
  const [galpaoId, setGalpaoId] = useState(lote.galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [tipoRacao, setTipoRacao] = useState('');
  const [racaoKg, setRacaoKg] = useState('');
  const [notaFiscalRacao, setNotaFiscalRacao] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSalvar = async () => {
    if (!userId) return;
    if (!galpaoId) { setErro('Selecione o galpão.'); return; }
    if (!data) { setErro('Informe a data.'); return; }
    if (!tipoRacao) { setErro('Selecione o tipo de ração.'); return; }
    if (!racaoKg || Number(racaoKg) <= 0) { setErro('Informe a quantidade de ração.'); return; }
    if (!notaFiscalRacao.trim()) { setErro('Informe o número da nota fiscal.'); return; }

    setErro('');
    setLoading(true);
    try {
      await addRacao(userId, lote.id, {
        galpaoId,
        data,
        racaoKg: Number(racaoKg),
        tipoRacao,
        notaFiscalRacao: notaFiscalRacao.trim(),
      });
      setRacaoKg('');
      setNotaFiscalRacao('');
      onSalvo();
    } catch (e: any) {
      Alert.alert('Lote encerrado', e.message || 'Não foi possível salvar o registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={embedded ? undefined : styles.card}>
      <Text style={styles.titulo}>Lançamentos de ração</Text>
      <GalpaoSelector galpoes={lote.galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />

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

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <SimpleSelect
            label="Tipo de ração"
            value={tipoRacao}
            onChange={setTipoRacao}
            placeholder="Selecione o tipo"
            opcoes={FASES_RACAO.map((f) => ({ label: f, value: f }))}
          />
        </View>
        <NumericFieldInline label="Quantidade" value={racaoKg} onChangeText={setRacaoKg} unit="kg" />
      </View>

      <TextField
        label="Nº da nota fiscal"
        placeholder="Ex: 116290"
        value={notaFiscalRacao}
        onChangeText={setNotaFiscalRacao}
      />

      {!!erro && <Text style={styles.erro}>{erro}</Text>}

      <SalvarButton onPress={handleSalvar} loading={loading} label="Adicionar lançamento" />
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
    gap: 4,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 12 },
  erro: { color: COLORS.alert, fontSize: 13.5, marginBottom: 8 },
});
