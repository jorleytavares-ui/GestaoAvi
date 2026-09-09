// src/components/NovoLoteForm.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Trash2, Check } from 'lucide-react-native';
import { TextField } from './TextField';
import { Select } from './Select';
import { SimNaoField } from './SimNaoField';
import { DateField } from './DateField';
import { COLORS } from '../theme/colors';
import { uid, todayStr, fmt, Lote, Galpao } from '../utils/calculations';
import { LINHAGENS } from '../utils/constants';

interface GalpaoFormData {
  id: string;
  nome: string;
  quantidadeAlojada: string;
  pesoMedioAlojadoG: string;
  temperaturaAviario: string;
  pintosMortos: string;
  horaCarregamento: Date | null;
  horaChegada: Date | null;
  horaDescarregamento: Date | null;
  aspecto: string;
  racaoComedouro: 'sim' | 'nao' | '';
  aguaBebedouro: 'sim' | 'nao' | '';
  aquecedorLigado: 'sim' | 'nao' | '';
  racaoLinhasIncentivo: 'sim' | 'nao' | '';
  racaoLinhasIncentivoQtd: string;
}

// helpers no topo do arquivo (fora do componente)
function hhmmParaDate(hhmm: string | null): Date | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function galpaoParaFormData(g: Galpao): GalpaoFormData {
  return {
    id: g.id,
    nome: g.nome ?? '',
    quantidadeAlojada: String(g.quantidadeAlojada ?? ''),
    pesoMedioAlojadoG: g.pesoMedioAlojadoG != null ? String(g.pesoMedioAlojadoG) : '',
    temperaturaAviario: g.temperaturaAviario != null ? String(g.temperaturaAviario) : '',
    pintosMortos: g.pintosMortos != null ? String(g.pintosMortos) : '',
    horaCarregamento: hhmmParaDate(g.horaCarregamento),
    horaChegada: hhmmParaDate(g.horaChegada),
    horaDescarregamento: hhmmParaDate(g.horaDescarregamento),
    aspecto: g.aspecto ?? '',
    racaoComedouro: (g.racaoComedouro as any) ?? '',
    aguaBebedouro: (g.aguaBebedouro as any) ?? '',
    aquecedorLigado: (g.aquecedorLigado as any) ?? '',
    racaoLinhasIncentivo: (g.racaoLinhasIncentivo as any) ?? '',
    racaoLinhasIncentivoQtd: g.racaoLinhasIncentivoQtd != null ? String(g.racaoLinhasIncentivoQtd) : '',
  };
}


function novoGalpaoVazio(): GalpaoFormData {
  return {
    id: uid(),
    nome: '',
    quantidadeAlojada: '',
    pesoMedioAlojadoG: '',
    temperaturaAviario: '',
    pintosMortos: '',
    horaCarregamento: null,
    horaChegada: null,
    horaDescarregamento: null,
    aspecto: '',
    racaoComedouro: '',
    aguaBebedouro: '',
    aquecedorLigado: '',
    racaoLinhasIncentivo: '',
    racaoLinhasIncentivoQtd: '',
  };
}

const ASPECTOS = ['Excelente', 'Muito bom', 'Regular', 'Ruim'];

interface NovoLoteFormProps {
  onSave: (lote: Lote) => void;
  onCancel: () => void;
  loteInicial?: Lote;
}

export function NovoLoteForm({ onSave, onCancel, loteInicial }: NovoLoteFormProps) {
  const editando = !!loteInicial;

  const [numero, setNumero] = useState(loteInicial?.numero ?? '');
  const [linhagem, setLinhagem] = useState(loteInicial?.linhagem ?? LINHAGENS[0]);
  const [sexagem, setSexagem] = useState<'misto' | 'macho' | 'femea'>(
    (loteInicial?.sexagem as any) ?? 'misto'
  );
  const [dataAlojamento, setDataAlojamento] = useState<Date>(
    loteInicial?.dataAlojamento ? new Date(loteInicial.dataAlojamento) : new Date()
  );
  const [horaCarregamento, setHoraCarregamento] = useState<Date | null>(
    hhmmParaDate(loteInicial?.horaCarregamento ?? null)
  );
  const [numPessoasDescarregamento, setNumPessoasDescarregamento] = useState(
    loteInicial?.numPessoasDescarregamento != null ? String(loteInicial.numPessoasDescarregamento) : ''
  );
  const [tecnico, setTecnico] = useState(loteInicial?.tecnico ?? '');
  const [nGranja, setNGranja] = useState((loteInicial as any)?.nGranja ?? '');
  const [galpoes, setGalpoes] = useState<GalpaoFormData[]>(
    loteInicial?.galpoes?.length ? loteInicial.galpoes.map(galpaoParaFormData) : [novoGalpaoVazio()]
  );
  const [erro, setErro] = useState('');

  const atualizarGalpao = (id: string, campo: keyof GalpaoFormData, valor: any) =>
    setGalpoes((prev) => prev.map((g) => (g.id === id ? { ...g, [campo]: valor } : g)));

  const adicionarGalpao = () => setGalpoes((prev) => [...prev, novoGalpaoVazio()]);
  const removerGalpao = (id: string) => setGalpoes((prev) => prev.filter((g) => g.id !== id));

  const totalAves = galpoes.reduce((s, g) => s + (Number(g.quantidadeAlojada) || 0), 0);

  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const toHHMM = (d: Date | null) =>
    d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  const salvar = () => {
  if (!numero.trim()) return setErro('Informe o número do lote.');
  if (!nGranja.trim()) return setErro('Informe o número da granja.');
  if (galpoes.some((g) => !g.nome.trim())) return setErro('Informe o nome de todos os galpões.');
  if (galpoes.some((g) => !g.quantidadeAlojada || Number(g.quantidadeAlojada) <= 0))
    return setErro('Informe a quantidade alojada em cada galpão.');
  if (galpoes.some((g) => !g.aspecto)) return setErro('Informe o aspecto de cada galpão.');

  setErro('');

  const camposEditados = {
    numero: numero.trim(),
    linhagem,
    sexagem,
    dataAlojamento: toISO(dataAlojamento),
    horaCarregamento: toHHMM(horaCarregamento),
    numPessoasDescarregamento:
      numPessoasDescarregamento === '' ? null : Number(numPessoasDescarregamento),
    tecnico: tecnico.trim(),
    nGranja: nGranja.trim(),
    galpoes: galpoes.map<Galpao>((g) => ({
      id: g.id,
      nome: g.nome.trim(),
      quantidadeAlojada: Number(g.quantidadeAlojada),
      pesoMedioAlojadoG: g.pesoMedioAlojadoG === '' ? null : Number(g.pesoMedioAlojadoG),
      temperaturaAviario: g.temperaturaAviario === '' ? null : Number(g.temperaturaAviario),
      pintosMortos: g.pintosMortos === '' ? null : Number(g.pintosMortos),
      horaCarregamento: toHHMM(g.horaCarregamento),
      horaChegada: toHHMM(g.horaChegada),
      horaDescarregamento: toHHMM(g.horaDescarregamento),
      aspecto: g.aspecto || null,
      racaoComedouro: g.racaoComedouro || null,
      racaoLinhasIncentivo: g.racaoLinhasIncentivo || null,
      racaoLinhasIncentivoQtd:
        g.racaoLinhasIncentivoQtd === '' ? null : Number(g.racaoLinhasIncentivoQtd),
      aguaBebedouro: g.aguaBebedouro || null,
      aquecedorLigado: g.aquecedorLigado || null,
    })),
  };

  if (editando && loteInicial) {
    // 👇 mescla com o lote original, preservando histórico e metadados
    const loteAtualizado: Lote = {
      ...loteInicial,
      ...camposEditados,
    };
    onSave(loteAtualizado);
    return;
  }

  // fluxo de criação (igual ao original)
  const lote: Lote = {
    id: uid(),
    ...camposEditados,
    status: 'ativo',
    registros: [],
    racoes: [],
    pesagens: [],
    aguas: [],
    mortalidades: [],
    temperaturas: [],
    avaliacoesTecnicas: [],
    horaLeituraAgua: null,
    retiradaSilo: [],
    retiradaLinha: [],
    saidaAves: [],
    embarques: [],
    sobrasAves: [],
    medicamentosAbate: [],
    observacaoAbate: '',
    encerramento: null,
    estoquesRacao: [],
    produtosQuimicos: [],
    medicamentosTerapeuticos: [],
  };

  onSave(lote);
};


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextField label="Número do lote" placeholder="Ex: 24" value={numero} onChangeText={setNumero} />

      <Select label="Linhagem" value={linhagem} options={LINHAGENS} onChange={setLinhagem} />

      <View>
        <Text style={styles.label}>Sexagem</Text>
        <View style={styles.rowButtons}>
          {(['misto', 'macho', 'femea'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setSexagem(v)}
              style={[styles.toggleBtn, sexagem === v && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, sexagem === v && styles.toggleTextActive]}>
                {v === 'misto' ? 'Misto' : v === 'macho' ? 'Macho' : 'Fêmea'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <DateField
        label="Data de alojamento"
        value={dataAlojamento}
        onChange={setDataAlojamento}
        mode="date"
        maximumDate={new Date()}
      />

      <View style={styles.grid2}>
        <View style={{ flex: 1 }}>
          <DateField
            label="Hora do carregamento"
            value={horaCarregamento}
            onChange={setHoraCarregamento}
            mode="time"
            optional
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Nº pessoas descarregamento"
            placeholder="Opcional"
            keyboardType="numeric"
            value={numPessoasDescarregamento}
            onChangeText={setNumPessoasDescarregamento}
          />
        </View>
      </View>

      {/* Galpões */}
      <View>
        <View style={styles.galpoesHeader}>
          <Text style={styles.label}>Galpões / aviários deste lote</Text>
          <Text style={styles.totalAves}>Total: {fmt(totalAves)} aves</Text>
        </View>

        {galpoes.map((g, i) => (
          <View key={g.id} style={styles.galpaoCard}>
            <View style={styles.galpaoCardHeader}>
              <Text style={styles.galpaoTitle}>Galpão {i + 1}</Text>
              {galpoes.length > 1 && (
                <TouchableOpacity onPress={() => removerGalpao(g.id)}>
                  <Trash2 size={16} color={COLORS.alert} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ gap: 10 }}>
              <TextField
                label="Nome / identificação"
                placeholder="Ex: Galpão 3"
                value={g.nome}
                onChangeText={(v) => atualizarGalpao(g.id, 'nome', v)}
              />

              <View style={styles.grid2}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Aves alojadas"
                    keyboardType="numeric"
                    value={g.quantidadeAlojada}
                    onChangeText={(v) => atualizarGalpao(g.id, 'quantidadeAlojada', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Peso pinto (g)"
                    placeholder="Opcional"
                    keyboardType="numeric"
                    value={g.pesoMedioAlojadoG}
                    onChangeText={(v) => atualizarGalpao(g.id, 'pesoMedioAlojadoG', v)}
                  />
                </View>
              </View>

              <View style={styles.grid2}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Temp. aviário (°C)"
                    placeholder="Opcional"
                    keyboardType="numeric"
                    value={g.temperaturaAviario}
                    onChangeText={(v) => atualizarGalpao(g.id, 'temperaturaAviario', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Pintinhos mortos"
                    placeholder="Opcional"
                    keyboardType="numeric"
                    value={g.pintosMortos}
                    onChangeText={(v) => atualizarGalpao(g.id, 'pintosMortos', v)}
                  />
                </View>
              </View>

              <View style={styles.grid2}>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Hora do carregamento"
                    value={g.horaCarregamento}
                    onChange={(v) => atualizarGalpao(g.id, 'horaCarregamento', v)}
                    mode="time"
                    optional
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Hora de chegada"
                    value={g.horaChegada}
                    onChange={(v) => atualizarGalpao(g.id, 'horaChegada', v)}
                    mode="time"
                    optional
                  />
                </View>
              </View>

              <DateField
                label="Hora do descarregamento"
                value={g.horaDescarregamento}
                onChange={(v) => atualizarGalpao(g.id, 'horaDescarregamento', v)}
                mode="time"
                optional
              />

              <Select
                label="Aspecto"
                value={g.aspecto}
                options={ASPECTOS}
                onChange={(v) => atualizarGalpao(g.id, 'aspecto', v)}
                placeholder="Selecione o aspecto"
              />

              <SimNaoField
                label="Ração nos comedouros"
                value={g.racaoComedouro}
                onChange={(v) => atualizarGalpao(g.id, 'racaoComedouro', v)}
              />
              <SimNaoField
                label="Ração nas linhas de incentivo"
                value={g.racaoLinhasIncentivo}
                onChange={(v) => atualizarGalpao(g.id, 'racaoLinhasIncentivo', v)}
              />
              {g.racaoLinhasIncentivo === 'sim' && (
                <TextField
                  label="Quantas linhas de incentivo?"
                  keyboardType="numeric"
                  value={g.racaoLinhasIncentivoQtd}
                  onChangeText={(v) => atualizarGalpao(g.id, 'racaoLinhasIncentivoQtd', v)}
                />
              )}
              <SimNaoField
                label="Água nos bebedouros"
                value={g.aguaBebedouro}
                onChange={(v) => atualizarGalpao(g.id, 'aguaBebedouro', v)}
              />
              <SimNaoField
                label="Aquecedor ligado"
                value={g.aquecedorLigado}
                onChange={(v) => atualizarGalpao(g.id, 'aquecedorLigado', v)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addGalpaoBtn} onPress={adicionarGalpao}>
          <Plus size={16} color={COLORS.ink} />
          <Text style={styles.addGalpaoText}>Adicionar outro galpão</Text>
        </TouchableOpacity>
      </View>

      <TextField label="Nº da granja" placeholder="Ex: 651" value={nGranja} onChangeText={setNGranja} />
      <TextField
        label="Técnico responsável"
        placeholder="Opcional"
        value={tecnico}
        onChangeText={setTecnico}
      />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <View style={styles.footerButtons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={salvar}>
          <Check size={16} color="#fff" />
          <Text style={styles.saveText}>{editando ? 'Salvar alterações' : 'Criar lote'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 16 },
  label: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSoft, marginBottom: 4 },
  rowButtons: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText: { fontSize: 13.5, fontWeight: '500', color: COLORS.ink },
  toggleTextActive: { color: '#fff' },
  grid2: { flexDirection: 'row', gap: 10 },
  galpoesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalAves: { fontSize: 12, color: COLORS.inkSoft, fontFamily: 'IBMPlexMono_600SemiBold' },
  galpaoCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  galpaoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  galpaoTitle: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSoft },
  addGalpaoBtn: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addGalpaoText: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  erro: { color: COLORS.alert, fontSize: 13.5 },
  footerButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
