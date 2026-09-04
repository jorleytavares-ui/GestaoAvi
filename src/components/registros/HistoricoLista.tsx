import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { Galpao, fmtDateBR } from '../../utils/calculations';

interface ItemHistorico {
  data: string;
  galpaoId: string;
  dia?: number | null;
  mortalidade?: number;
  descartados?: number;
  motivoDescarte?: string | null;
  obs?: string | null;
  linha1Extra?: string;   // NOVO: aparece ao lado da data (ex: tipo de ração)
  linhaCustom?: string;   // linha 2 personalizada (ex: consumo de água)
  linha3Custom?: string;  // linha 3 personalizada (ex: ppm/pH)
}

interface Props {
  itens: ItemHistorico[];
  galpoes: Galpao[];
  onExcluir?: (item: ItemHistorico) => void;
  embedded?: boolean; // NOVO: remove o card/borda externa (usado quando colado a outro card)
  titulo?: string;
}

export function HistoricoLista({ itens, galpoes, onExcluir, embedded, titulo = 'Histórico' }: Props) {
  const ordenados = [...itens].sort((a, b) => b.data.localeCompare(a.data));

  const getGalpaoNome = (galpaoId: string) =>
    galpoes.find((g) => g.id === galpaoId)?.nome || galpaoId;

  if (!ordenados.length) {
    return (
      <View style={embedded ? styles.vazioEmbedded : styles.vazio}>
        <Text style={styles.vazioTexto}>Nenhum registro lançado ainda.</Text>
      </View>
    );
  }

  const conteudo = (
    <>
      {!embedded && <Text style={styles.titulo}>{titulo}</Text>}
      {ordenados.map((item, idx) => {
        const linhaResumo = item.linhaCustom
          ? `${getGalpaoNome(item.galpaoId)} · ${item.linhaCustom}`
          : [
              getGalpaoNome(item.galpaoId),
              item.mortalidade != null ? `${item.mortalidade} mortos` : null,
              item.descartados != null
                ? `${item.descartados} descartes${item.motivoDescarte ? ` (${item.motivoDescarte})` : ''}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ');

        const linhaExtra = item.linha3Custom ?? item.obs;

        return (
          <View key={idx} style={[styles.item, idx === 0 && embedded ? styles.itemPrimeiroEmbedded : null]}>
            <View style={styles.linhaTopo}>
              <Text style={styles.linha1}>
                {fmtDateBR(item.data)}
                {item.dia != null ? ` · dia ${item.dia}` : ''}
                {item.linha1Extra ? ` · ${item.linha1Extra}` : ''}
              </Text>
              {onExcluir && (
                <TouchableOpacity onPress={() => onExcluir(item)} style={styles.btnExcluir}>
                  <Trash2 size={17} color={COLORS.danger ?? '#c0392b'} />
                </TouchableOpacity>
              )}
            </View>
            {!!linhaResumo && <Text style={styles.linha2}>{linhaResumo}</Text>}
            {!!linhaExtra && <Text style={styles.linha3}>{linhaExtra}</Text>}
          </View>
        );
      })}
    </>
  );

  return embedded ? <View>{conteudo}</View> : <View style={styles.card}>{conteudo}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  item: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  itemPrimeiroEmbedded: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    marginTop: 8,
    paddingTop: 12,
  },
  linhaTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linha1: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  linha2: { fontSize: 13, color: COLORS.inkSoft, marginTop: 4, textAlign: 'left' },
  linha3: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 6, textAlign: 'left' },
  btnExcluir: { padding: 4 },
  vazio: { paddingVertical: 20, alignItems: 'center' },
  vazioEmbedded: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 8 },
  vazioTexto: { fontSize: 13, color: COLORS.inkSoft },
});
