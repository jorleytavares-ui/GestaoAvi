import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { useAuth } from './AuthContext';
import { COLORS } from '../theme/colors';

function formatarCpf(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);
  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

type OpcaoEmpresa = { email: string; empresaId: string; empresaNome: string };

export function LoginScreen({ navigation }: any) {
  const { signInComCpf, signIn } = useAuth();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcaoEmpresa[]>([]); // ✅ lista de empresas quando há múltiplos vínculos

  async function handleLogin() {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11 || !senha) {
      Alert.alert('Atenção', 'Preencha um CPF válido e a senha.');
      return;
    }
    setCarregando(true);
    const resultado = await signInComCpf(cpfLimpo, senha);
    setCarregando(false);

    if (resultado.error) {
      Alert.alert('Erro ao entrar', resultado.error);
      return;
    }

    // ✅ Múltiplos vínculos: abre modal de seleção de empresa
    if (resultado.opcoes && resultado.opcoes.length > 0) {
      setOpcoes(resultado.opcoes);
    }
  }

  async function handleSelecionarEmpresa(email: string) {
    setOpcoes([]);
    setCarregando(true);
    const { error } = await signIn(email, senha);
    setCarregando(false);

    if (error) {
      Alert.alert('Erro ao entrar', error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.ink, marginBottom: 24 }}>
          Entrar
        </Text>

        <TextInput
          placeholder="CPF"
          value={cpf}
          onChangeText={(v) => setCpf(formatarCpf(v))}
          keyboardType="numeric"
          maxLength={14}
          style={{
            borderWidth: 1, borderColor: COLORS.line, borderRadius: 10,
            padding: 14, marginBottom: 12, color: COLORS.ink,
          }}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={{
            borderWidth: 1, borderColor: COLORS.line, borderRadius: 10,
            padding: 14, marginBottom: 20, color: COLORS.ink,
          }}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={carregando}
          style={{
            backgroundColor: COLORS.primary, borderRadius: 10,
            padding: 16, alignItems: 'center', marginBottom: 16,
          }}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
          <Text style={{ color: COLORS.primary, textAlign: 'center' }}>
            Não tem conta? Cadastre-se
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ✅ Modal de seleção de empresa quando o CPF tem múltiplos vínculos */}
      <Modal visible={opcoes.length > 0} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: COLORS.ink }}>
              Este CPF está vinculado a mais de uma empresa. Selecione:
            </Text>
            <FlatList
              data={opcoes}
              keyExtractor={(item) => item.email}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelecionarEmpresa(item.email)}
                  style={{
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.line,
                  }}
                >
                  <Text style={{ color: COLORS.ink, fontWeight: '600' }}>
                    {item.empresaNome}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setOpcoes([])} style={{ marginTop: 12 }}>
              <Text style={{ color: COLORS.primary, textAlign: 'center' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
