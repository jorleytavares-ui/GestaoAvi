// src/components/AppHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { HeaderMenu } from './HeaderMenu';

interface AppHeaderProps {
  onVoltar?: () => void;
  titulo?: string;
}

export function AppHeader({ onVoltar, titulo }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  if (!onVoltar) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: 16, // mesmo valor do card (paddingHorizontal: 16 no HomeScreen)
          paddingBottom: 8,
          paddingTop: insets.top + 12,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.primary }}>
            GestãoAvi
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: -2 }}>
            Gestão de lotes de frango de corte
          </Text>
        </View>

        <HeaderMenu />
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: insets.top + 12,
        gap: 8,
      }}
    >
      <TouchableOpacity onPress={onVoltar} style={{ padding: 4 }}>
        <ChevronLeft size={24} color={COLORS.ink} />
      </TouchableOpacity>
      <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.ink }}>
        {titulo || ''}
      </Text>
    </View>
  );
}

