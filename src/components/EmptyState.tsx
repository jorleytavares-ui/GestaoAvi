// src/components/EmptyState.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bird, Plus } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

interface EmptyStateProps {
  onNovo: () => void;
}

export function EmptyState({ onNovo }: EmptyStateProps) {
  return (
    <View
      className="items-center px-8 py-16"
      style={{ gap: 12 }}
    >
      <Bird size={40} strokeWidth={1.5} color={COLORS.primary} />

      <Text
        className="font-display text-center"
        style={{ fontSize: 19.2, fontWeight: '700', color: COLORS.ink }}
      >
        Nenhum lote cadastrado
      </Text>

      <Text
        className="font-body text-center"
        style={{ fontSize: 14.4, color: COLORS.inkSoft }}
      >
        Comece registrando o alojamento do seu primeiro lote de frangos de corte.
      </Text>

      <Pressable
        onPress={onNovo}
        className="flex-row items-center"
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 20,
          marginTop: 8,
          gap: 8,
        }}
      >
        <Plus size={16} color="#FFFFFF" />
        <Text
          className="font-bodySemi"
          style={{ fontSize: 14, color: '#FFFFFF' }}
        >
          Novo lote
        </Text>
      </Pressable>
    </View>
  );
}
