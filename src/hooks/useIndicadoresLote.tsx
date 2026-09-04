// src/hooks/useIndicadoresLote.ts
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getLoteById } from '../storage/storage';
import { useAuth } from '../auth/AuthContext';
import { computeIndices, daysBetween, todayStr, Lote } from '../utils/calculations';

export function useIndicadoresLote(loteId: string) {
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);
  const [idx, setIdx] = useState<ReturnType<typeof computeIndices> | null>(null);
  const [idade, setIdade] = useState<number>(0);

  const recarregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => {
      if (!l) return;
      setLote(l);
      setIdx(computeIndices(l));
      setIdade(
        daysBetween(
          l.dataAlojamento,
          l.status === 'encerrado' && l.encerramento ? l.encerramento.data : todayStr()
        )
      );
    });
  }, [loteId, userId]);

  useFocusEffect(recarregar);

  return { lote, idx, idade, recarregar };
}
