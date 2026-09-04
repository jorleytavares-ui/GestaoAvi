import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../../theme/colors';

interface Props {
  onPress: () => void;
  loading?: boolean;
  label?: string;
}

export function SalvarButton({ onPress, loading, label = 'Salvar lançamento' }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={{
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.surface} />
      ) : (
        <Text style={{ color: COLORS.surface, fontWeight: '700', fontSize: 14.5 }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
