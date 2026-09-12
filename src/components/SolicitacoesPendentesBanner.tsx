// src/components/SolicitacoesPendentesBanner.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Link2 } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { listarSolicitacoesPendentes } from '../services/empresas';
import { supabase } from '../lib/supabase';

export function SolicitacoesPendentesBanner({ empresaId }: { empresaId: string | null }) {
  const navigation = useNavigation<any>();
  const [quantidade, setQuantidade] = useState(0);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await listarSolicitacoesPendentes(empresaId);
    if (!error && data) setQuantidade(data.length);
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // ✅ Realtime: atualiza quando alguém solicitar/cancelar vínculo, sem sair da tela
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`solicitacoes-pendentes-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'empresas',
          filter: `codigo_integracao=eq.${empresaId}`,
        },
        () => {
          carregar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, carregar]);

  if (quantidade === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('SolicitacoesVinculo')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FFF4E5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFD08A',
      }}
    >
      <Link2 size={18} color="#B26A00" />
      <Text style={{ color: '#B26A00', fontSize: 13, fontWeight: '600', flex: 1 }}>
        {quantidade} {quantidade === 1 ? 'solicitação' : 'solicitações'} de vínculo pendente
        {quantidade === 1 ? '' : 's'} — toque para revisar
      </Text>
    </TouchableOpacity>
  );
}
