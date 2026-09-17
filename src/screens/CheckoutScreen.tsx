import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export function CheckoutScreen({ route, navigation }: any) {
  const { plano, forcar } = route.params;
  const { userId, empresaId } = useAuth();
  const [carregando, setCarregando] = useState(false);

  async function iniciarPagamento() {
    if (!userId || !empresaId) {
      Alert.alert('Erro', 'Usuário ou empresa não identificados.');
      return;
    }

    try {
      setCarregando(true);

      const { data, error } = await supabase.functions.invoke(
        'criar-cobranca-asaas',
        {
          body: {
            planoId: plano.id,
            empresaId,
            usuarioId: userId,
            forcar: !!forcar,
          },
        }
      );

      if (error) {
        let mensagem = error.message ?? 'Erro ao gerar cobrança.';
        try {
          const contexto = (error as any)?.context;
          if (contexto && typeof contexto.json === 'function') {
            const corpo = await contexto.json();
            if (corpo?.error) mensagem = corpo.error;
          }
        } catch {}
        throw new Error(mensagem);
      }

      // ✅ Licença ativa fora da janela de renovação: precisa confirmar
      if (data?.avisoLicencaAtiva) {
        const dataFormatada = new Date(data.dataFinal).toLocaleDateString('pt-BR');
        Alert.alert(
          'Licença ativa',
          `Você já possui uma licença ativa até ${dataFormatada}. Deseja mesmo gerar uma nova cobrança de troca de plano?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setCarregando(false) },
            {
              text: 'Confirmar',
              onPress: () => {
                navigation.setParams({ forcar: true });
                iniciarPagamentoForcado();
              },
            },
          ]
        );
        return;
      }

      if (data?.reimpressao) {
        Alert.alert(
          'Cobrança já existente',
          'Você já possui uma cobrança aguardando pagamento. Abrindo o boleto/Pix para reimpressão.'
        );
      }

      if (data?.linkCheckout) {
        await Linking.openURL(data.linkCheckout);
        navigation.goBack();
      } else {
        Alert.alert('Erro', 'Não foi possível gerar o link de pagamento.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setCarregando(false);
    }
  }

  // Reenvia a chamada já com forcar=true após a confirmação do usuário
  async function iniciarPagamentoForcado() {
    try {
      setCarregando(true);

      const { data, error } = await supabase.functions.invoke(
        'criar-cobranca-asaas',
        {
          body: {
            planoId: plano.id,
            empresaId,
            usuarioId: userId,
            forcar: true,
          },
        }
      );

      if (error) {
        let mensagem = error.message ?? 'Erro ao gerar cobrança.';
        try {
          const contexto = (error as any)?.context;
          if (contexto && typeof contexto.json === 'function') {
            const corpo = await contexto.json();
            if (corpo?.error) mensagem = corpo.error;
          }
        } catch {}
        throw new Error(mensagem);
      }

      if (data?.linkCheckout) {
        await Linking.openURL(data.linkCheckout);
        navigation.goBack();
      } else {
        Alert.alert('Erro', 'Não foi possível gerar o link de pagamento.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Confirmar assinatura</Text>
      <Text style={styles.plano}>{plano.nome}</Text>
      <Text style={styles.valor}>
        {plano.valor.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </Text>

      <TouchableOpacity
        style={styles.botao}
        onPress={iniciarPagamento}
        disabled={carregando}
      >
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoTexto}>Ir para pagamento</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  plano: { fontSize: 18, textAlign: 'center', color: '#333' },
  valor: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center', marginVertical: 16 },
  botao: { backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
