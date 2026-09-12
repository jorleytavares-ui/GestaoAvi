// src/screens/SolicitacoesVinculoScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, X } from 'lucide-react-native';

import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { COLORS } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';
import {
  listarSolicitacoesPendentes,
  aprovarVinculo,
  rejeitarVinculo,
  EmpresaVinculada,
} from '../services/empresas';
import type { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'SolicitacoesVinculo'>;

export function SolicitacoesVinculoScreen({ navigation }: Props) {
  const { userId, empresaId } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<EmpresaVinculada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    const { data, error } = await listarSolicitacoesPendentes(empresaId);
    if (!error && data) setSolicitacoes(data as EmpresaVinculada[]);
    setCarregando(false);
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // ✅ Realtime: atualiza a lista automaticamente enquanto a tela está aberta
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`solicitacoes-vinculo-${empresaId}`)
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

  async function handleAprovar(item: EmpresaVinculada) {
    if (!userId) return;
    setProcessando(item.id);
    try {
      const { error } = await aprovarVinculo(item.id, userId);
      if (error) throw error;
      setSolicitacoes((prev) => prev.filter((s) => s.id !== item.id));
      Alert.alert('Sucesso', `Vínculo com "${item.nome}" aprovado.`);
    } catch (e: any) {
      Alert.alert('Erro ao aprovar', e.message ?? 'Tente novamente.');
    } finally {
      setProcessando(null);
    }
  }

  function handleRejeitar(item: EmpresaVinculada) {
    Alert.alert(
      'Rejeitar vínculo',
      `Tem certeza que deseja rejeitar o vínculo com "${item.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            setProcessando(item.id);
            try {
              const { error } = await rejeitarVinculo(item.id, userId);
              if (error) throw error;
              setSolicitacoes((prev) => prev.filter((s) => s.id !== item.id));
            } catch (e: any) {
              Alert.alert('Erro ao rejeitar', e.message ?? 'Tente novamente.');
            } finally {
              setProcessando(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <AppHeader onVoltar={() => navigation.goBack()} titulo="Solicitações de vínculo" />

      {carregando ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : solicitacoes.length === 0 ? (
        <EmptyState
          titulo="Nenhuma solicitação pendente"
          descricao="Quando uma empresa se vincular usando seu código de integração, ela aparecerá aqui."
        />
      ) : (
        <FlatList
          data={solicitacoes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.line,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>
                {item.nome}
              </Text>

              {item.codigo_parceiro && (
                <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 }}>
                  N° do parceiro: {item.codigo_parceiro}
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  disabled={processando === item.id}
                  onPress={() => handleAprovar(item)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: COLORS.primary,
                    paddingVertical: 10,
                    borderRadius: 8,
                    opacity: processando === item.id ? 0.6 : 1,
                  }}
                >
                  <Check size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Aprovar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={processando === item.id}
                  onPress={() => handleRejeitar(item)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#B33A3A',
                    paddingVertical: 10,
                    borderRadius: 8,
                    opacity: processando === item.id ? 0.6 : 1,
                  }}
                >
                  <X size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Rejeitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          refreshing={carregando}
          onRefresh={carregar}
        />
      )}
    </View>
  );
}
