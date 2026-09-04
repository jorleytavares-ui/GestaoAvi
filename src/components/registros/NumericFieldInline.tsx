import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { COLORS } from '../../theme/colors';

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  unit?: string;
  placeholder?: string;
}

export function NumericFieldInline({ label, value, onChangeText, unit, placeholder }: Props) {
  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 4 }}>
        {label} {unit ? `(${unit})` : ''}
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.replace(',', '.'))}
        keyboardType="numeric"
        placeholder={placeholder || '0'}
        placeholderTextColor={COLORS.inkSoft}
        style={{
          borderWidth: 1,
          borderColor: COLORS.line,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: COLORS.ink,
          backgroundColor: COLORS.surface,
        }}
      />
    </View>
  );
}
