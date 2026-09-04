// src/screens/LicencaBloqueadaScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';

type Props = {
  motivo: string;
  onTentarNovamente: () => Promise<void>;
};

export function LicencaBloqueadaScreen({ motivo, onTentarNovamente }: Props) {
  const { signOut } = useAuth();
  const [tentando, setTentando] = useState(false);

  async function handleTentar() {
    setTentando(true);
    await onTentarNovamente();
    setTentando(false);
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
      }}
    >
      <AlertTriangle size={48} color={COLORS.accent} style={{ marginBottom: 16 }} />

      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: COLORS.ink,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Acesso bloqueado
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: COLORS.inkSoft,
          textAlign: 'center',
          marginBottom: 28,
          lineHeight: 20,
        }}
      >
        {motivo}
      </Text>

      <TouchableOpacity
        onPress={handleTentar}
        disabled={tentando}
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 10,
          paddingVertical: 14,
          paddingHorizontal: 32,
          alignItems: 'center',
          marginBottom: 16,
          minWidth: 220,
        }}
      >
        {tentando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '700' }}>Tentar novamente</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut}>
        <Text style={{ color: COLORS.inkSoft, textAlign: 'center' }}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}
