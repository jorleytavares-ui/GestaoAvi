// src/screens/detalhe/RacaoTab.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { getLoteById, removeRacao } from '../../storage/storage';
import { Lote, fmt, daysBetween } from '../../utils/calculations';
import { RacaoLancamentoCard } from '../../components/registros/RacaoLancamentoCard';
import { RacaoPorFaseCard } from '../../components/registros/RacaoPorFaseCard';
import { EstoqueRacaoCard } from '../../components/registros/EstoqueRacaoCard';
import { HistoricoLista } from '../../components/registros/HistoricoLista';
import { useAuth } from '../../auth/AuthContext';

export function RacaoTab({ route }: any) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);

  const carregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => {
      if (l) setLote(l);
    });
  }, [loteId, userId]);

  useFocusEffect(carregar);

  if (!lote) return null;

  const handleExcluirRacao = async (item: any) => {
    if (!userId) return;
    await removeRacao(userId, lote.id, item.id);
    carregar();
  };

  const itensHistoricoRacao = [...(lote.racoes || [])]
    .sort((a: any, b: any) => a.data.localeCompare(b.data))
    .reverse()
    .map((item: any) => ({
      id: item.id,
      data: item.data,
      galpaoId: item.galpaoId,
      dia: daysBetween(lote.dataAlojamento, item.data),
      linha1Extra: item.tipoRacao || undefined,
      linhaCustom: `${fmt(item.racaoKg, 0)} kg`,
      linha3Custom: item.notaFiscalRacao ? `NF: ${item.notaFiscalRacao}` : undefined,
    }));

  return (
    <View style={{ gap: 16 }}>
      {/* Lançamento + Histórico colados no mesmo card */}
      <View style={styles.cardUnico}>
        <RacaoLancamentoCard lote={lote} onSalvo={carregar} embedded />
        <HistoricoLista
          embedded
          itens={itensHistoricoRacao}
          galpoes={lote.galpoes}
          onExcluir={handleExcluirRacao}
        />
      </View>

      <RacaoPorFaseCard lote={lote} />

      <EstoqueRacaoCard lote={lote} onSalvo={carregar} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardUnico: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
  },
});
