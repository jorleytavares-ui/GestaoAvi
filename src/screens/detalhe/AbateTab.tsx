// src/screens/detalhe/AbateTab.tsx
import { Toast } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { Trash2 } from 'lucide-react-native';

import { COLORS } from '../../theme/colors';
import { DateField } from '../../components/DateField';
import { TextField } from '../../components/TextField';
import { GalpaoSelector } from '../../components/registros/GalpaoSelector';
import { SalvarButton } from '../../components/registros/SalvarButton';
import { HistoricoLista } from '../../components/registros/HistoricoLista';
import {
  getLoteById,
  setSaidaAves,
  setRetiradaSilo,
  setRetiradaLinha,
  addEmbarque,
  removeEmbarque,
  setSobrasAves,
  addMedicamentoAbate,
  removeMedicamentoAbate,
  setObservacaoAbate,
} from '../../storage/storage';
import { Lote, fmtDateBR, uid } from '../../utils/calculations';
import type { DetalheLoteTabParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';

type Props = MaterialTopTabScreenProps<DetalheLoteTabParamList, 'Abate'>;

// ---------- Helpers de conversão string <-> Date ----------
function strToDate(dataStr?: string | null, horaStr?: string | null): Date | null {
  if (!dataStr) return null;
  const [y, m, d] = dataStr.split('-').map(Number);
  const date = new Date();
  date.setFullYear(y, (m || 1) - 1, d || 1);
  if (horaStr) {
    const [hh, mi] = horaStr.split(':').map(Number);
    date.setHours(hh || 0, mi || 0, 0, 0);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}
function dateToDataStr(d: Date | null): string {
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function dateToHoraStr(d: Date | null): string {
  if (!d) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

type DataHora = { data: Date | null; hora: Date | null };

export function AbateTab({ route }: Props) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const [saida, setSaida] = useState<Record<string, DataHora>>({});
  const [silo, setSilo] = useState<Record<string, DataHora>>({});
  const [linha, setLinha] = useState<Record<string, DataHora>>({});
  const [sobras, setSobras] = useState<Record<string, { mortas: string; vivas: string; aleijados: string; refugos: string }>>({});
  const [obs, setObs] = useState('');

  const [embGalpaoId, setEmbGalpaoId] = useState('');
  const [embData, setEmbData] = useState<Date | null>(null);
  const [embHora, setEmbHora] = useState<Date | null>(null);
  const [embPorta, setEmbPorta] = useState('');
  const [embCaixas, setEmbCaixas] = useState('');
  const [embVazias, setEmbVazias] = useState('');
  const [embPlaca, setEmbPlaca] = useState('');

  const [medNome, setMedNome] = useState('');
  const [medInicio, setMedInicio] = useState<Date | null>(null);
  const [medFim, setMedFim] = useState<Date | null>(null);
  const [medDose, setMedDose] = useState('');

  const carregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => {
      if (!l) return;
      setLote(l);
      setObs((l as any).observacaoAbate || '');

      setSaida(Object.fromEntries(l.galpoes.map((g: any) => {
        const ex = ((l as any).saidaAves || []).find((s: any) => s.galpaoId === g.id);
        return [g.id, { data: strToDate(ex?.data), hora: strToDate(ex?.data, ex?.hora) }];
      })));

      setSilo(Object.fromEntries(l.galpoes.map((g: any) => {
        const ex = ((l as any).retiradaSilo || []).find((s: any) => s.galpaoId === g.id);
        return [g.id, { data: strToDate(ex?.data), hora: strToDate(ex?.data, ex?.hora) }];
      })));

      setLinha(Object.fromEntries(l.galpoes.map((g: any) => {
        const ex = ((l as any).retiradaLinha || []).find((s: any) => s.galpaoId === g.id);
        return [g.id, { data: strToDate(ex?.data), hora: strToDate(ex?.data, ex?.horaSubirLinhas) }];
      })));

      setSobras(Object.fromEntries(l.galpoes.map((g: any) => {
        const ex = ((l as any).sobrasAves || []).find((s: any) => s.galpaoId === g.id);
        return [g.id, {
          mortas: ex?.mortas != null ? String(ex.mortas) : '',
          vivas: ex?.vivas != null ? String(ex.vivas) : '',
          aleijados: ex?.aleijados != null ? String(ex.aleijados) : '',
          refugos: ex?.refugos != null ? String(ex.refugos) : '',
        }];
      })));

      if (!embGalpaoId && l.galpoes[0]) setEmbGalpaoId(l.galpoes[0].id);
    });
  }, [loteId, userId]);

  useFocusEffect(carregar);

  if (!lote) return null;

  const embarques = [...((lote as any).embarques || [])].sort((a: any, b: any) => a.data.localeCompare(b.data));
  const medicamentos = [...((lote as any).medicamentosAbate || [])].sort((a: any, b: any) =>
    (b.dataInicio || '').localeCompare(a.dataInicio || '')
  );

  const itensEmbarques = embarques.map((e: any) => ({
    id: e.id,
    data: e.data,
    galpaoId: e.galpaoId,
    linha1Extra: e.hora || undefined,
    linhaCustom: [
      e.portaAviario ? `Porta ${e.portaAviario}` : null,
      e.numCaixas != null ? `${e.numCaixas} caixas` : null,
      e.caixasVazias != null ? `${e.caixasVazias} vazias` : null,
      e.placaCaminhao || null,
    ].filter(Boolean).join(' · '),
  }));

  const salvarSaida = async () => {
    if (!userId) return;
    try {
      await setSaidaAves(
        userId,
        loteId,
        lote!.galpoes.map((g: any) => ({
          galpaoId: g.id,
          data: dateToDataStr(saida[g.id]?.data),
          hora: dateToHoraStr(saida[g.id]?.hora),
        }))
      );
      carregar();
      showToast('Data e horário de saída das aves salvos com sucesso.', 'success');
    } catch (e) {
      console.log('Erro ao salvar saída das aves:', e);
      showToast('Não foi possível salvar a saída das aves.', 'error');
    }
  };

  const salvarSilo = async () => {
    if (!userId) return;
    try {
      await setRetiradaSilo(
        userId,
        loteId,
        lote!.galpoes.map((g: any) => ({
          galpaoId: g.id,
          data: dateToDataStr(silo[g.id]?.data),
          hora: dateToHoraStr(silo[g.id]?.hora),
        }))
      );
      carregar();
      showToast('Retirada de ração (silo) salva com sucesso.', 'success');
    } catch (e) {
      console.log('Erro ao salvar retirada de ração (silo):', e);
      showToast('Não foi possível salvar a retirada de ração (silo).', 'error');
    }
  };

  const salvarLinha = async () => {
    if (!userId) return;
    try {
      await setRetiradaLinha(
        userId,
        loteId,
        lote!.galpoes.map((g: any) => ({
          galpaoId: g.id,
          data: dateToDataStr(linha[g.id]?.data),
          horaSubirLinhas: dateToHoraStr(linha[g.id]?.hora),
        }))
      );
      carregar();
      showToast('Retirada de ração (linha) salva com sucesso.', 'success');
    } catch (e) {
      console.log('Erro ao salvar retirada de ração (linha):', e);
      showToast('Não foi possível salvar a retirada de ração (linha).', 'error');
    }
  };

  const salvarSobras = async () => {
    if (!userId) return;
    try {
      await setSobrasAves(
        userId,
        loteId,
        lote!.galpoes.map((g: any) => ({
          galpaoId: g.id,
          mortas: Number(sobras[g.id]?.mortas) || 0,
          vivas: Number(sobras[g.id]?.vivas) || 0,
          aleijados: Number(sobras[g.id]?.aleijados) || 0,
          refugos: Number(sobras[g.id]?.refugos) || 0,
        }))
      );
      carregar();
      showToast('Sobras de aves salvas com sucesso.', 'success');
    } catch (e) {
      console.log('Erro ao salvar sobras de aves:', e);
      showToast('Não foi possível salvar as sobras de aves.', 'error');
    }
  };

  const salvarEmbarque = async () => {
    if (!userId) return;
    if (!embGalpaoId || !embData) {
      showToast('Selecione o galpão e a data do embarque.', 'error');
      return;
    }
    try {
      await addEmbarque(userId, loteId, {
        id: uid(),
        galpaoId: embGalpaoId,
        data: dateToDataStr(embData),
        hora: embHora ? dateToHoraStr(embHora) : null,
        portaAviario: embPorta.trim(),
        numCaixas: embCaixas ? Number(embCaixas) : null,
        caixasVazias: embVazias ? Number(embVazias) : null,
        placaCaminhao: embPlaca.trim(),
      });
      setEmbData(null); setEmbHora(null); setEmbPorta(''); setEmbCaixas(''); setEmbVazias(''); setEmbPlaca('');
      carregar();
      showToast('Embarque adicionado com sucesso.', 'success');
    } catch (e) {
      console.log('Erro ao salvar embarque:', e);
      showToast('Não foi possível salvar o embarque.', 'error');
    }
  };

  const excluirEmbarque = async (item: any) => {
    if (!userId) return;
    try {
      await removeEmbarque(userId, loteId, item.id);
      carregar();
    } catch (e) {
      console.log('Erro ao excluir embarque:', e);
      showToast('Não foi possível excluir o embarque.', 'error');
    }
  };

  const salvarMedicamento = async () => {
    if (!userId) return;
    if (!medNome.trim()) {
      showToast('Informe o nome do medicamento.', 'error');
      return;
    }
    try {
      await addMedicamentoAbate(userId, loteId, {
        id: uid(),
        medicamento: medNome.trim(),
        dataInicio: medInicio ? dateToDataStr(medInicio) : null,
        dataFim: medFim ? dateToDataStr(medFim) : null,
        dosagem: medDose.trim(),
      });
      setMedNome(''); setMedInicio(null); setMedFim(null); setMedDose('');
      carregar();
      showToast('Medicamento adicionado com sucesso.', 'success');
    } catch (e) {
      console.log('Erro ao salvar medicamento:', e);
      showToast('Não foi possível salvar o medicamento.', 'error');
    }
  };

  const excluirMedicamento = async (id: string) => {
    if (!userId) return;
    try {
      await removeMedicamentoAbate(userId, loteId, id);
      carregar();
    } catch (e) {
      console.log('Erro ao excluir medicamento:', e);
      showToast('Não foi possível excluir o medicamento.', 'error');
    }
  };

  const salvarObs = async () => {
    if (!userId) return;
    try {
      await setObservacaoAbate(userId, loteId, obs);
      showToast('Observação salva com sucesso.', 'success');
    } catch (e) {
      console.log('Erro ao salvar observação:', e);
      showToast('Não foi possível salvar a observação.', 'error');
    }
  };

  return (
    <View>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Saída das aves */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Data e horário de saída das aves</Text>
        <Text style={styles.subtitulo}>Um horário para cada galpão do lote.</Text>
        {lote.galpoes.map((g: any) => (
          <View key={g.id} style={styles.galpaoBox}>
            <Text style={styles.galpaoNome}>{g.nome}</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <DateField
                  label="Data"
                  mode="date"
                  value={saida[g.id]?.data || null}
                  onChange={(d) => setSaida({ ...saida, [g.id]: { ...saida[g.id], data: d } })}
                />
              </View>
              <View style={styles.col}>
                <DateField
                  label="Hora"
                  mode="time"
                  value={saida[g.id]?.hora || null}
                  onChange={(d) => setSaida({ ...saida, [g.id]: { ...saida[g.id], hora: d } })}
                />
              </View>
            </View>
          </View>
        ))}
        <SalvarButton onPress={salvarSaida} />
      </View>

      {/* Retirada de ração — Silo */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Retirada de ração — Silo</Text>
        {lote.galpoes.map((g: any) => (
          <View key={g.id} style={styles.galpaoBox}>
            <Text style={styles.galpaoNome}>{g.nome}</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <DateField
                  label="Data"
                  mode="date"
                  value={silo[g.id]?.data || null}
                  onChange={(d) => setSilo({ ...silo, [g.id]: { ...silo[g.id], data: d } })}
                />
              </View>
              <View style={styles.col}>
                <DateField
                  label="Hora"
                  mode="time"
                  value={silo[g.id]?.hora || null}
                  onChange={(d) => setSilo({ ...silo, [g.id]: { ...silo[g.id], hora: d } })}
                />
              </View>
            </View>
          </View>
        ))}
        <SalvarButton onPress={salvarSilo} />
      </View>

      {/* Retirada de ração — Linha de ração */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Retirada de ração — Linha de ração</Text>
        {lote.galpoes.map((g: any) => (
          <View key={g.id} style={styles.galpaoBox}>
            <Text style={styles.galpaoNome}>{g.nome}</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <DateField
                  label="Data"
                  mode="date"
                  value={linha[g.id]?.data || null}
                  onChange={(d) => setLinha({ ...linha, [g.id]: { ...linha[g.id], data: d } })}
                />
              </View>
              <View style={styles.col}>
                <DateField
                  label="Horário de subir as linhas de ração"
                  mode="time"
                  value={linha[g.id]?.hora || null}
                  onChange={(d) => setLinha({ ...linha, [g.id]: { ...linha[g.id], hora: d } })}
                />
              </View>
            </View>
          </View>
        ))}
        <SalvarButton onPress={salvarLinha} />
      </View>

      {/* Embarque das aves */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Embarque das aves</Text>

        <GalpaoSelector
          galpoes={lote.galpoes}
          selecionadoId={embGalpaoId}
          onSelect={setEmbGalpaoId}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <DateField label="Data" mode="date" value={embData} onChange={setEmbData} />
          </View>
          <View style={styles.col}>
            <DateField label="Horário" mode="time" value={embHora} onChange={setEmbHora} optional />
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <TextField label="Porta do aviário" placeholder="Ex: Porta 2" value={embPorta} onChangeText={setEmbPorta} />
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={styles.col}>
            <TextField label="Número de caixas" placeholder="0" keyboardType="numeric" value={embCaixas} onChangeText={setEmbCaixas} />
          </View>
          <View style={styles.col}>
            <TextField label="Caixas vazias" placeholder="0" keyboardType="numeric" value={embVazias} onChangeText={setEmbVazias} />
          </View>
        </View>
        <View style={{ marginTop: 8, marginBottom: 4 }}>
          <TextField label="Placa do caminhão" placeholder="Ex: ABC1D23" value={embPlaca} onChangeText={setEmbPlaca} />
        </View>
        <SalvarButton onPress={salvarEmbarque} label="Adicionar embarque" />

        <View style={{ marginTop: 12 }}>
          <HistoricoLista
            itens={itensEmbarques}
            galpoes={lote.galpoes}
            onExcluir={excluirEmbarque}
            embedded
          />
        </View>
      </View>

      {/* Sobras de aves */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Sobras de aves</Text>
        {lote.galpoes.map((g: any) => (
          <View key={g.id} style={styles.galpaoBox}>
            <Text style={styles.galpaoNome}>{g.nome}</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label="Mortas"
                  placeholder="0"
                  keyboardType="numeric"
                  value={sobras[g.id]?.mortas || ''}
                  onChangeText={(v: string) => setSobras({ ...sobras, [g.id]: { ...sobras[g.id], mortas: v } })}
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Vivas"
                  placeholder="0"
                  keyboardType="numeric"
                  value={sobras[g.id]?.vivas || ''}
                  onChangeText={(v: string) => setSobras({ ...sobras, [g.id]: { ...sobras[g.id], vivas: v } })}
                />
              </View>
            </View>
            <View style={[styles.row, { marginTop: 8 }]}>
              <View style={styles.col}>
                <TextField
                  label="Aleijados"
                  placeholder="0"
                  keyboardType="numeric"
                  value={sobras[g.id]?.aleijados || ''}
                  onChangeText={(v: string) => setSobras({ ...sobras, [g.id]: { ...sobras[g.id], aleijados: v } })}
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Refugos"
                  placeholder="0"
                  keyboardType="numeric"
                  value={sobras[g.id]?.refugos || ''}
                  onChangeText={(v: string) => setSobras({ ...sobras, [g.id]: { ...sobras[g.id], refugos: v } })}
                />
              </View>
            </View>
          </View>
        ))}
        <SalvarButton onPress={salvarSobras} />
      </View>

      {/* Medicamentos — período e dosagem */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Medicamentos — período e dosagem</Text>
        <TextField label="Medicamento" placeholder="Nome do medicamento" value={medNome} onChangeText={setMedNome} />
        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={styles.col}>
            <DateField label="Período — data início" mode="date" value={medInicio} onChange={setMedInicio} optional />
          </View>
          <View style={styles.col}>
            <DateField label="Período — data fim" mode="date" value={medFim} onChange={setMedFim} optional />
          </View>
        </View>
        <View style={{ marginTop: 8, marginBottom: 4 }}>
          <TextField label="Dosagem" placeholder="Ex: 1g / 10L de água" value={medDose} onChangeText={setMedDose} />
        </View>
        <SalvarButton onPress={salvarMedicamento} label="Adicionar" />

        {medicamentos.map((m: any) => (
          <View key={m.id} style={styles.itemBox}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitulo}>{m.medicamento}</Text>
              <Pressable onPress={() => excluirMedicamento(m.id)} style={{ padding: 4 }}>
                <Trash2 size={17} color={COLORS.alert} />
              </Pressable>
            </View>
            <Text style={styles.itemSub}>
              {m.dataInicio ? fmtDateBR(m.dataInicio) : '—'} a {m.dataFim ? fmtDateBR(m.dataFim) : '—'}
              {m.dosagem ? ` · Dose ${m.dosagem}` : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Observação */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Observação</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={obs}
          onChangeText={setObs}
          placeholder="Ex: aumento de temperatura à tarde..."
          multiline
          numberOfLines={3}
        />
        <View style={{ marginTop: 8 }}>
          <SalvarButton onPress={salvarObs} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  subtitulo: { fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 10 },
  galpaoBox: { marginBottom: 14 },
  galpaoNome: { fontSize: 12.5, fontWeight: '700', color: COLORS.inkSoft, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  itemBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.line, borderStyle: 'dashed' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitulo: { fontSize: 12.5, fontWeight: '700', color: COLORS.ink },
  itemSub: { fontSize: 12, color: COLORS.inkSoft, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: COLORS.ink,
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
