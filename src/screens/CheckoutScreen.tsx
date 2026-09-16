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
  const { plano } = route.params;
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
