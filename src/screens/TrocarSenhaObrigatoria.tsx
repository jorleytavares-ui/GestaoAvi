// src/screens/TrocarSenhaObrigatoria.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';

export function TrocarSenhaObrigatoria() {
  const { atualizarSenhaPropria, signOut } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSalvar() {
    if (novaSenha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmaSenha) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setCarregando(true);
    const { error } = await atualizarSenhaPropria(novaSenha);
    setCarregando(false);

    if (error) {
      Alert.alert('Erro', error);
    } else {
      Alert.alert('Sucesso', 'Senha atualizada com sucesso!');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', padding: 24 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.ink, marginBottom: 8 }}>
        Defina sua nova senha
      </Text>
      <Text style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 24 }}>
        Por segurança, você precisa criar uma nova senha antes de continuar.
      </Text>

      <TextInput
        placeholder="Nova senha"
        value={novaSenha}
        onChangeText={setNovaSenha}
        secureTextEntry
        style={inputStyle}
        placeholderTextColor={COLORS.inkSoft}
      />

      <TextInput
        placeholder="Confirmar nova senha"
        value={confirmaSenha}
        onChangeText={setConfirmaSenha}
        secureTextEntry
        style={[inputStyle, { marginBottom: 20 }]}
        placeholderTextColor={COLORS.inkSoft}
      />

      <TouchableOpacity
        onPress={handleSalvar}
        disabled={carregando}
        style={{ backgroundColor: COLORS.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 }}
      >
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar nova senha</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut}>
        <Text style={{ color: COLORS.inkSoft, textAlign: 'center' }}>Cancelar e sair</Text>
      </TouchableOpacity>
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
