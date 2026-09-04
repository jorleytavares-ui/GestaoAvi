// src/components/TextField.tsx
import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { COLORS } from '../theme/colors';

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, ...props }: TextFieldProps) {
  return (
    <View>
      <Text
        className="font-bodySemi"
        style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 4 }}
      >
        {label}
      </Text>
      <TextInput
        className="font-body"
        style={{
          backgroundColor: COLORS.surfaceAlt,
          borderWidth: 1,
          borderColor: COLORS.line,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          fontSize: 15,
          color: COLORS.ink,
        }}
        placeholderTextColor={COLORS.inkSoft}
        {...props}
      />
    </View>
  );
}
