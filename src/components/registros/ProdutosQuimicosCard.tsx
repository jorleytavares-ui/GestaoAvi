import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2, Plus } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { TextField } from '../TextField';
import { DateField } from '../../components/DateField';
import { GalpaoSelector } from './GalpaoSelector';
import { uid, todayStr, fmtDateBR } from '../../utils/calculations';
import { addProdutoQuimico, removeProdutoQuimico } from '../../storage/storage';
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

export default function ProdutosQuimicosCard({ lote, onChanged }: Props) {
  const { userId } = useAuth();
  const galpoes = lote.galpoes || [];
  const produtosQuimicos = lote.produtosQuimicos || [];

  const [galpaoId, setGalpaoId] = useState<string>(galpoes[0]?.id || '');
  const [data, setData] = useState(todayStr());
  const [produto, setProduto] = useState('');
  const [quantidadeFrasco, setQuantidadeFrasco] = useState('');
  const [partida, setPartida] = useState('');
  const [diluicao, setDiluicao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function limparForm() {
    setData(todayStr());
    setProduto('');
    setQuantidadeFrasco('');
    setPartida('');
    setDiluicao('');
  }

  async function handleSalvar() {
    if (!userId) return;
    if (!galpaoId) { setErro('Selecione o galpão.'); return; }
    if (!data) { setErro('Informe a data.'); return; }
    if (!produto.trim()) { setErro('Informe o produto.'); return; }
    if (!quantidadeFrasco.trim()) { setErro('Informe a quantidade do frasco.'); return; }

    setErro('');
    setSalvando(true);
    try {
      await addProdutoQuimico(userId, lote.id, {
        id: uid(),
        galpaoId,
        data,
        produto,
        quantidadeFrasco,
        partida,
        diluicao,
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
    await removeProdutoQuimico(userId, lote.id, id);
    onChanged();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Produtos químicos</Text>

      <GalpaoSelector galpoes={galpoes} selecionadoId={galpaoId} onSelect={setGalpaoId} />

      <DateField
        mode="date"
        label="Data"
        value={toDate(data)}
        onChange={(d) => setData(fromDate(d))}
      />

      <TextField label="Produto" placeholder="Ex: Desinfetante X" value={produto} onChangeText={setProduto} />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField
            label="Quantidade do frasco"
            placeholder="Ex: 500 ml"
            value={quantidadeFrasco}
            onChangeText={setQuantidadeFrasco}
          />
        </View>
        <View style={styles.rowItem}>
          <TextField label="Partida" placeholder="Ex: L2306" optional value={partida} onChangeText={setPartida} />
        </View>
      </View>

      <TextField
        label="Diluição — quando aplicável"
        placeholder="Ex: 1:200"
        optional
        value={diluicao}
        onChangeText={setDiluicao}
      />

      {!!erro && <Text style={styles.erro}>{erro}</Text>}

      <TouchableOpacity style={styles.botaoOutline} onPress={handleSalvar} disabled={salvando}>
        <Plus size={16} color={COLORS.ink} />
        <Text style={styles.botaoOutlineTexto}>Adicionar produto</Text>
      </TouchableOpacity>

      {produtosQuimicos.length > 0 && (
        <View style={styles.historico}>
          {[...produtosQuimicos].reverse().map((p: any) => (
            <View key={p.id} style={styles.itemHistorico}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemLinha1}>
                  {fmtDateBR(p.data)} · {p.produto}
                </Text>
                <TouchableOpacity onPress={() => handleRemover(p.id)} style={styles.btnLixeira}>
                  <Trash2 size={17} color={COLORS.alert} />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemLinha2}>
                Frasco {p.quantidadeFrasco} · Partida {p.partida || '—'} · Diluição {p.diluicao || '—'}
              </Text>
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
  btnLixeira: { padding: 4 },
});
