import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2, Plus } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { TextField } from '../TextField';
import { DateField } from '../../components/DateField';
import { GalpaoSelector } from './GalpaoSelector';
import { uid, todayStr, fmtDateBR } from '../../utils/calculations';
import {
  addMedicamentoTerapeutico,
  removeMedicamentoTerapeutico,
  addExecucaoMedicamento,
  removeExecucaoMedicamento,
} from '../../storage/storage';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  lote: any;
  onChanged: () => void;
}

function toDate(v: string | null) {
  return v ? new Date(v + 'T00:00:00') : null;
}
function fromDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function MedicamentosTerapeuticosCard({ lote, onChanged }: Props) {
  const { userId } = useAuth();
  const galpoes = lote.galpoes || [];
  const medicamentosTerapeuticos = lote.medicamentosTerapeuticos || [];

  const [galpaoId, setGalpaoId] = useState<string>(galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [produto, setProduto] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [partida, setPartida] = useState('');
  const [dose, setDose] = useState('');
  const [dataInicio, setDataInicio] = useState<string | null>(null);
  const [dataTermino, setDataTermino] = useState<string | null>(null);
  const [periodoCarencia, setPeriodoCarencia] = useState('');
  const [medicoVeterinario, setMedicoVeterinario] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [respExecucao, setRespExecucao] = useState<Record<string, string>>({});
  const [dataExecucao, setDataExecucao] = useState<Record<string, string>>({});

  function limparForm() {
    setData(todayStr());
    setProduto('');
    setQuantidade('');
    setPartida('');
    setDose('');
    setDataInicio(null);
    setDataTermino(null);
    setPeriodoCarencia('');
    setMedicoVeterinario('');
  }

  async function handleSalvar() {
    if (!userId) return;
    if (!galpaoId) { setErro('Selecione o galpão.'); return; }
    if (!data) { setErro('Informe a data.'); return; }
    if (!produto.trim()) { setErro('Informe o produto.'); return; }
    if (!quantidade.trim()) { setErro('Informe a quantidade.'); return; }
    if (!medicoVeterinario.trim()) { setErro('Informe o médico veterinário.'); return; }

    setErro('');
    setSalvando(true);
    try {
      await addMedicamentoTerapeutico(userId, lote.id, {
        id: uid(),
        galpaoId,
        data,
        produto,
        quantidade,
        partida,
        dose,
        dataInicioAdministracao: dataInicio,
        dataTerminoAdministracao: dataTermino,
        periodoCarencia,
        medicoVeterinario,
        execucoes: [],
      });
      limparForm();
      onChanged();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar o registro.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(id: string) {
    if (!userId) return;
    await removeMedicamentoTerapeutico(userId, lote.id, id);
    onChanged();
  }

  async function handleAddExecucao(medicamentoId: string) {
    if (!userId) return;
    const responsavel = respExecucao[medicamentoId]?.trim();
    if (!responsavel) return;
    const dataExec = dataExecucao[medicamentoId]?.trim() || todayStr();

    await addExecucaoMedicamento(userId, lote.id, medicamentoId, {
      id: uid(),
      responsavel,
      data: dataExec,
    });
    setRespExecucao((p) => ({ ...p, [medicamentoId]: '' }));
    setDataExecucao((p) => ({ ...p, [medicamentoId]: '' }));
    onChanged();
  }

  async function handleRemoverExecucao(medicamentoId: string, execucaoId: string) {
    if (!userId) return;
    await removeExecucaoMedicamento(userId, lote.id, medicamentoId, execucaoId);
    onChanged();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Medicamentos terapêuticos</Text>

      <GalpaoSelector galpoes={galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />

      <DateField
        mode="date"
        label="Data"
        value={toDate(data)}
        onChange={(d) => setData(fromDate(d))}
      />

      <TextField label="Produto" placeholder="Ex: Remédio" value={produto} onChangeText={setProduto} />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField label="Quantidade" placeholder="Ex: 1 kg" value={quantidade} onChangeText={setQuantidade} />
        </View>
        <View style={styles.rowItem}>
          <TextField label="Partida" placeholder="Ex: L2306" optional value={partida} onChangeText={setPartida} />
        </View>
      </View>

      <TextField label="Dose" placeholder="Ex: 1g / 10L de água" optional value={dose} onChangeText={setDose} />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <DateField
            mode="date"
            label="Data início administração"
            optional
            value={toDate(dataInicio)}
            onChange={(d) => setDataInicio(fromDate(d))}
          />
        </View>
        <View style={styles.rowItem}>
          <DateField
            mode="date"
            label="Data término administração"
            optional
            value={toDate(dataTermino)}
            onChange={(d) => setDataTermino(fromDate(d))}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField
            label="Período de carência"
            placeholder="Ex: 5 dias"
            optional
            value={periodoCarencia}
            onChangeText={setPeriodoCarencia}
          />
        </View>
        <View style={styles.rowItem}>
          <TextField
            label="Médico veterinário"
            placeholder="Nome"
            value={medicoVeterinario}
            onChangeText={setMedicoVeterinario}
          />
        </View>
      </View>

      {!!erro && <Text style={styles.erro}>{erro}</Text>}

      <TouchableOpacity style={styles.botaoOutline} onPress={handleSalvar} disabled={salvando}>
        <Plus size={16} color={COLORS.ink} />
        <Text style={styles.botaoOutlineTexto}>Adicionar medicamento</Text>
      </TouchableOpacity>

      {medicamentosTerapeuticos.length > 0 && (
        <View style={styles.historico}>
          {[...medicamentosTerapeuticos].reverse().map((m: any) => (
            <View key={m.id} style={styles.itemHistorico}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemLinha1}>
                  {fmtDateBR(m.data)} · {m.produto}
                </Text>
                <TouchableOpacity onPress={() => handleRemover(m.id)} style={styles.btnLixeira}>
                  <Trash2 size={17} color={COLORS.alert} />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemLinha2}>
                Qtde {m.quantidade} · Partida {m.partida || '—'} · Dose {m.dose || '—'}
              </Text>

              <Text style={styles.itemLinha2}>
                Início {fmtDateBR(m.dataInicioAdministracao) || '—'} · Término{' '}
                {fmtDateBR(m.dataTerminoAdministracao) || '—'} · Carência {m.periodoCarencia || '—'}
              </Text>

              <Text style={styles.itemLinha3}>Vet. responsável: {m.medicoVeterinario}</Text>

              <View style={styles.separador} />

              <Text style={styles.execucaoTitulo}>EXECUÇÃO</Text>
              {(m.execucoes || []).map((e: any) => (
                <View key={e.id} style={styles.execucaoLinha}>
                  <Text style={styles.execucaoNome}>{e.responsavel}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.execucaoData}>{fmtDateBR(e.data)}</Text>
                    <TouchableOpacity onPress={() => handleRemoverExecucao(m.id, e.id)}>
                      <Trash2 size={16} color={COLORS.alert} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.execucaoForm}>
                <View style={styles.execucaoInput}>
                  <TextField
                    label="Responsável"
                    placeholder="Nome"
                    value={respExecucao[m.id] || ''}
                    onChangeText={(v) => setRespExecucao((p) => ({ ...p, [m.id]: v }))}
                  />
                </View>
                <View style={styles.execucaoInput}>
                  <DateField
                    mode="date"
                    label="Data"
                    value={toDate(dataExecucao[m.id] || todayStr())}
                    onChange={(d) => setDataExecucao((p) => ({ ...p, [m.id]: fromDate(d) }))}
                  />
                </View>
                <TouchableOpacity style={styles.btnAddExecucao} onPress={() => handleAddExecucao(m.id)}>
                  <Plus size={18} color={COLORS.ink} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
    gap: 4,
    marginBottom: 16,
  },
  titulo: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  erro: { color: COLORS.alert, fontSize: 13.5, marginBottom: 8 },
  botaoOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  botaoOutlineTexto: { color: COLORS.ink, fontWeight: '700', fontSize: 14 },
  historico: { marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 12, gap: 14 },
  itemHistorico: { gap: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLinha1: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  itemLinha2: { fontSize: 13, color: COLORS.inkSoft, marginTop: 2 },
  itemLinha3: { fontSize: 13, color: COLORS.inkSoft, marginTop: 4 },
  btnLixeira: { padding: 4 },
  separador: { height: 1, backgroundColor: COLORS.line, marginVertical: 10 },
  execucaoTitulo: { fontSize: 12, fontWeight: '700', color: COLORS.inkSoft, letterSpacing: 0.5, marginBottom: 6 },
  execucaoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  execucaoNome: { fontSize: 14, color: COLORS.ink, fontWeight: '500' },
  execucaoData: { fontSize: 13, color: COLORS.inkSoft },
  execucaoForm: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10 },
  execucaoInput: { flex: 1 },
  btnAddExecucao: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
