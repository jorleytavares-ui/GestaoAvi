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

export function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleLogin() {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    const { error } = await signIn(email.trim(), senha);
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
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 100, justifyContent: 'flex-start' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.ink, marginBottom: 24 }}>
          Entrar
        </Text>

        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            borderWidth: 1,
            borderColor: COLORS.line,
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
            color: COLORS.ink,
          }}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: COLORS.line,
            borderRadius: 10,
            padding: 14,
            marginBottom: 20,
            color: COLORS.ink,
          }}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TouchableOpacity
          onPress={handleLogin}
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
            <Text style={{ color: '#fff', fontWeight: '700' }}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
          <Text style={{ color: COLORS.primary, textAlign: 'center' }}>
            Não tem conta? Cadastre-se
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
