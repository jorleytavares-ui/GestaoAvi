import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
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

function validarCpf(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[10])) return false;

  return true;
}

// ✅ agora e-mail é obrigatório neste formulário
function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CadastroScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cpf, setCpf] = useState('');
  const [emailContato, setEmailContato] = useState(''); // ✅ obrigatório neste form
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleCadastro() {
    const cpfLimpo = cpf.replace(/\D/g, '');
    const emailLimpo = emailContato.trim();

    // ✅ todos os campos obrigatórios, incluindo e-mail
    if (!nomeEmpresa || !nomeUsuario || !cpfLimpo || !emailLimpo || !senha) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (!validarCpf(cpfLimpo)) {
      Alert.alert('Atenção', 'CPF inválido. Verifique e tente novamente.');
      return;
    }
    if (!validarEmail(emailLimpo)) {
      Alert.alert('Atenção', 'E-mail inválido.');
      return;
    }
    if (senha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);
    const { error } = await signUp(
      senha,
      nomeEmpresa.trim(),
      nomeUsuario.trim(),
      cpfLimpo,
      emailLimpo // ✅ sempre enviado, pois agora é obrigatório
    );
    setCarregando(false);

    if (error) {
      Alert.alert('Erro ao cadastrar', error);
    } else {
      Alert.alert('Cadastro concluído', 'Sua empresa foi criada com sucesso!');
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
          placeholder="CPF"
          value={cpf}
          onChangeText={(v) => setCpf(formatarCpf(v))}
          keyboardType="numeric"
          maxLength={14}
          style={inputStyle}
          placeholderTextColor={COLORS.inkSoft}
        />

        {/* ✅ E-mail agora obrigatório neste formulário */}
        <TextInput
          placeholder="E-mail"
          value={emailContato}
          onChangeText={setEmailContato}
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
