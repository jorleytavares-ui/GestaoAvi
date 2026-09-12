// src/components/StatusVinculoBanner.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { buscarStatusVinculo, VinculoStatus } from '../services/empresas';

interface Props {
  empresaId: string | null | undefined;
}

function getKeyVinculoVisto(empresaId: string) {
  return `@gestaoavi:vinculoVisto:${empresaId}`;
}

export function StatusVinculoBanner({ empresaId }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [status, setStatus] = useState<VinculoStatus | null>(null);
  const [statusEm, setStatusEm] = useState<string | null>(null);
  const [temCodigo, setTemCodigo] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await buscarStatusVinculo(empresaId);
    if (!error && data) {
      const novoStatus = data.vinculo_status as VinculoStatus | null;
      const novoStatusEm = (data as any).status_em ?? null;

      setStatus(novoStatus);
      setStatusEm(novoStatusEm);
      setTemCodigo(!!data.codigo_integracao);

      if (novoStatus === 'aprovado' || novoStatus === 'rejeitado') {
        const chave = getKeyVinculoVisto(empresaId);
        const visto = await AsyncStorage.getItem(chave);
        // Se já visualizou ESSA mudança específica (mesmo status_em), fica oculto.
        // Se a Integração mudar o status de novo depois, status_em muda e volta a aparecer.
        setDispensado(visto === novoStatusEm);
      } else {
        setDispensado(false); // "pendente" nunca é dispensável
      }
    }
    setCarregando(false);
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // ✅ Polling: atualiza mesmo sem sair/voltar da tela
  useEffect(() => {
    const interval = setInterval(carregar, 5000);
    return () => clearInterval(interval);
  }, [carregar]);

  async function dispensar() {
    if (empresaId && statusEm) {
      await AsyncStorage.setItem(getKeyVinculoVisto(empresaId), statusEm);
    }
    setDispensado(true);
  }

  // Sem código de integração preenchido -> nada a exibir
  if (!status && !temCodigo) return null;
if (carregando || dispensado) return null;


  if (status === 'pendente') {
    return (
      <View style={[styles.base, { backgroundColor: '#FFF3CD' }]}>
        <Clock size={18} color="#8A6D1D" />
        <Text style={[styles.texto, { color: '#8A6D1D' }]}>
          Aguardando aprovação da Integração para vincular sua empresa.
        </Text>
      </View>
    );
  }

  if (status === 'rejeitado') {
    return (
      <TouchableOpacity
        onPress={dispensar}
        style={[styles.base, { backgroundColor: '#FDE2E2' }]}
      >
        <XCircle size={18} color="#B33A3A" />
        <Text style={[styles.texto, { color: '#B33A3A' }]}>
          Vínculo rejeitado pela Integração. Verifique o código informado ou entre em contato com ela. (toque para dispensar)
        </Text>
      </TouchableOpacity>
    );
  }

  if (status === 'aprovado') {
    return (
      <TouchableOpacity
        onPress={dispensar}
        style={[styles.base, { backgroundColor: '#E3F2E1' }]}
      >
        <CheckCircle2 size={18} color={COLORS.primary} />
        <Text style={[styles.texto, { color: COLORS.primary }]}>
          Vínculo aprovado! Sua empresa está conectada à Integração. (toque para dispensar)
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = {
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  texto: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600' as const,
  },
};
