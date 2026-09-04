// src/components/ConformeToggle.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { COLORS } from '../theme/colors';

interface ConformeToggleProps {
  label: string;
  value: 'C' | 'NC' | 'NA' | '';
  onChange: (value: 'C' | 'NC' | 'NA') => void;
}

const OPCOES: Array<['C' | 'NC' | 'NA', string]> = [
  ['C', 'C'],
  ['NC', 'NC'],
  ['NA', '—'],
];

const CORES: Record<string, string> = {
  C: COLORS.primary,
  NC: COLORS.alert,
  NA: COLORS.inkSoft,
};

export function ConformeToggle({ label, value, onChange }: ConformeToggleProps) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.line,
        borderStyle: 'dashed',
      }}
    >
      <Text className="font-body" style={{ fontSize: 12.8, color: COLORS.ink, flex: 1 }}>
        {label}
      </Text>
      <View className="flex-row" style={{ gap: 4 }}>
        {OPCOES.map(([v, l]) => {
          const ativo = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={{
                width: 34,
                height: 28,
                borderRadius: 7,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: ativo ? CORES[v] : COLORS.surfaceAlt,
                borderWidth: 1,
                borderColor: COLORS.line,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: ativo ? '#FFFFFF' : COLORS.inkSoft,
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
