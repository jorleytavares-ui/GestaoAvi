import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pencil, Weight, TrendingUp } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import {
  Lote,
  todayStr,
  daysBetween,
  interpolarPeso,
  pesoSerieCombinada,
  fmt,
} from '../../utils/calculations';
import type { PontoPesoPadrao, Sexagem } from '../../data/padraoSexagem';
import { StatCard } from '../StatCard';
import { PesoPadraoEditor } from './PesoPadraoEditor';

interface Props {
  lote: Lote;
  padraoSexagem: PontoPesoPadrao[];
  onSalvarPadraoSexagem: (sexagem: Sexagem, pontos: PontoPesoPadrao[]) => void;
}

const LABEL_SEXAGEM: Record<string, string> = { misto: 'Misto', femea: 'Fêmea', macho: 'Macho' };

export function PesagemPadraoCard({ lote, padraoSexagem, onSalvarPadraoSexagem }: Props) {
  const [editando, setEditando] = useState(false);

  const sexagemLabel = LABEL_SEXAGEM[lote.sexagem] || 'Misto';
  const idadeHoje = daysBetween(lote.dataAlojamento, todayStr());
  const serieReal = pesoSerieCombinada(lote);
  const ultimo = serieReal.length ? serieReal[serieReal.length - 1] : null;
  const penultimo = serieReal.length > 1 ? serieReal[serieReal.length - 2] : null;

  const pesoPrevistoHoje = padraoSexagem.length ? interpolarPeso(padraoSexagem, idadeHoje) : null;
  const pesoPrevistoUltimo =
    ultimo && padraoSexagem.length ? interpolarPeso(padraoSexagem, ultimo.idade) : null;
  const diffUltimo =
    pesoPrevistoUltimo !== null && ultimo ? ultimo.peso - pesoPrevistoUltimo : null;

  const fatorRealUltimo =
    ultimo && penultimo && penultimo.peso > 0 ? ultimo.peso / penultimo.peso : null;
  const fatorEsperadoUltimo =
    ultimo && penultimo && padraoSexagem.length
      ? (interpolarPeso(padraoSexagem, ultimo.idade) as number) /
        (interpolarPeso(padraoSexagem, penultimo.idade) as number)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.sectionBar}>
          <Text style={styles.sectionBarTexto}>PADRÃO · {sexagemLabel.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={() => setEditando(!editando)}>
          <Pencil size={14} color={COLORS.inkSoft} />
        </TouchableOpacity>
      </View>

      {editando ? (
        <PesoPadraoEditor
          linhagemLabel={sexagemLabel}
          pontos={padraoSexagem}
          onClose={() => setEditando(false)}
          onSave={(lista) => {
            onSalvarPadraoSexagem(lote.sexagem as Sexagem, lista);
            setEditando(false);
          }}
        />
      ) : padraoSexagem.length === 0 ? (
        <Text style={styles.vazioTexto}>Nenhum padrão cadastrado. Toque no lápis para definir.</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <StatCard
                icon={Weight}
                label={`Previsto (dia ${idadeHoje})`}
                value={pesoPrevistoHoje !== null ? fmt(pesoPrevistoHoje, 0) : '—'}
                unit="g"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon={TrendingUp}
                label="Real − previsto"
                value={diffUltimo !== null ? (diffUltimo >= 0 ? '+' : '') + fmt(diffUltimo, 0) : '—'}
                unit="g"
                accent={diffUltimo !== null ? (diffUltimo >= 0 ? COLORS.primary : COLORS.alert) : undefined}
              />
            </View>
          </View>

          {fatorRealUltimo !== null && (
  <View style={styles.infoRow}>
  <Text style={styles.infoLabel}>Fator de ganho (última pesagem)</Text>
  <Text style={styles.infoValor}>
    real {fmt(fatorRealUltimo, 1)}× · esperado{' '}
    {fatorEsperadoUltimo !== null ? fmt(fatorEsperadoUltimo, 1) + '×' : '—'}
  </Text>
</View>

)}

        </>
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
    marginBottom: 16,
    gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionBar: { backgroundColor: COLORS.primary, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 12 },
  sectionBarTexto: { color: '#fff', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5 },
  vazioTexto: { fontSize: 13, color: COLORS.inkSoft },
  infoRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  paddingTop: 4,
},
infoLabel: {
  fontSize: 12.5,
  color: COLORS.inkSoft,
  width: '50%',
  paddingRight: 8,
},
infoValor: {
  fontSize: 12.5,
  fontWeight: '600',
  color: COLORS.ink,
  width: '50%',
  textAlign: 'right',
},




});
