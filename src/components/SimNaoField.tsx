// src/components/SimNaoField.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { COLORS } from '../theme/colors';

interface SimNaoFieldProps {
  label: string;
  value: 'sim' | 'nao' | '' | null;
  onChange: (value: 'sim' | 'nao') => void;
}

const OPCOES: Array<['sim' | 'nao', string]> = [
  ['sim', 'Sim'],
  ['nao', 'Não'],
];

export function SimNaoField({ label, value, onChange }: SimNaoFieldProps) {
  return (
    <View>
      <Text
        className="font-bodySemi"
        style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 4 }}
      >
        {label}
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {OPCOES.map(([v, l]) => {
          const ativo = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: ativo ? COLORS.primary : COLORS.surfaceAlt,
                borderWidth: 1,
                borderColor: COLORS.line,
              }}
            >
              <Text
                className="font-bodyMedium"
                style={{
                  fontSize: 14,
                  color: ativo ? '#FFFFFF' : COLORS.ink,
                }}
              >
                {l}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
