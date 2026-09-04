import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from './AuthContext';
import { COLORS } from '../theme/colors';

export function CadastroScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleCadastro() {
    if (!nomeEmpresa || !nomeUsuario || !email || !senha) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);
    const { error } = await signUp(email.trim(), senha, nomeEmpresa.trim(), nomeUsuario.trim());
    setCarregando(false);

    if (error) {
      Alert.alert('Erro ao cadastrar', error);
    } else {
      Alert.alert(
        'Cadastro concluído',
        'Verifique seu e-mail para confirmar a conta (se a confirmação estiver ativada).'
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, justifyContent: 'flex-start' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.ink, marginBottom: 24 }}>
          Criar conta
        </Text>

        <TextInput
          placeholder="Nome da empresa/fazenda"
          value={nomeEmpresa}
          onChangeText={setNomeEmpresa}
          style={inputStyle}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="Seu nome"
          value={nomeUsuario}
          onChangeText={setNomeUsuario}
          style={inputStyle}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="Senha (mín. 6 caracteres)"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={[inputStyle, { marginBottom: 20 }]}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TouchableOpacity
          onPress={handleCadastro}
          disabled={carregando}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            padding: 16,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={{ color: COLORS.primary, textAlign: 'center' }}>
            Já tem conta? Entrar
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: COLORS.line,
  borderRadius: 10,
  padding: 14,
  marginBottom: 12,
  color: COLORS.ink,
};
