// src/components/PromptSenhaModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';

interface Props {
  visible: boolean;
  titulo: string;
  descricao?: string;
  onCancelar: () => void;
  onConfirmar: (senha: string) => void;
  carregando?: boolean;
}

export function PromptSenhaModal({
  visible,
  titulo,
  descricao,
  onCancelar,
  onConfirmar,
  carregando = false,
}: Props) {
  const [senha, setSenha] = useState('');

  useEffect(() => {
    if (visible) setSenha('');
  }, [visible]);

  function handleConfirmar() {
    if (senha.length < 6) return;
    onConfirmar(senha);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 6 }}>
            {titulo}
          </Text>

          {descricao && (
            <Text style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 14 }}>
              {descricao}
            </Text>
          )}

          <TextInput
            placeholder="Nova senha (mín. 6 caracteres)"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            autoFocus
            style={{
              borderWidth: 1,
              borderColor: COLORS.line,
              borderRadius: 10,
              padding: 14,
              color: COLORS.ink,
              marginBottom: 16,
            }}
            placeholderTextColor={COLORS.inkSoft}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onCancelar}
              disabled={carregando}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: COLORS.line,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.ink, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmar}
              disabled={carregando || senha.length < 6}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 10,
                backgroundColor: senha.length < 6 ? COLORS.line : COLORS.primary,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {carregando ? 'Salvando...' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
