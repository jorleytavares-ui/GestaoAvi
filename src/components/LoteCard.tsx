// src/components/LoteCard.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { COLORS } from '../theme/colors';

interface LoteCardProps {
  numero: string;
  linhagem: string;
  nomesGalpoes: string;
  status: 'ativo' | 'encerrado';
  idadeDias: number;
  viabilidade: number;
  avesVivas: number;
  quantidadeAlojadaTotal: number;
  numGalpoes: number;
  onPress: () => void;
}

export function LoteCard({
  numero,
  linhagem,
  nomesGalpoes,
  status,
  idadeDias,
  viabilidade,
  avesVivas,
  quantidadeAlojadaTotal,
  numGalpoes,
  onPress,
}: LoteCardProps) {
  const ativo = status === 'ativo';

  return (
  <Pressable
    onPress={onPress}
    style={{
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.line,
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
      gap: 10,
    }}
  >
    {/* Cabeçalho */}
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <View>
        <Text style={{ fontSize: 16.8, fontWeight: '700', color: COLORS.ink }}>
          Lote {numero}
        </Text>
        <Text style={{ fontSize: 12.8, color: COLORS.inkSoft }}>
          {nomesGalpoes} · {linhagem}
        </Text>
      </View>

      {/* Selo de status */}
      <View
        style={{
          alignSelf: 'flex-start',
          borderWidth: 2,
          borderColor: ativo ? COLORS.primary : COLORS.inkSoft,
          borderRadius: 6,
          paddingHorizontal: 9,
          paddingVertical: 3,
          transform: [{ rotate: '-4deg' }],
        }}
      >
        <Text
          style={{
            fontSize: 10.4,
            fontWeight: '700',
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: ativo ? COLORS.primary : COLORS.inkSoft,
          }}
        >
          {ativo ? 'Ativo' : 'Encerrado'}
        </Text>
      </View>
    </View>

    {/* Linha de indicadores */}
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.line,
        borderStyle: 'dashed',
      }}
    >
      <Text style={{ fontSize: 12.8 }}>
        <Text style={{ color: COLORS.inkSoft }}>Idade </Text>
        <Text style={{ color: COLORS.ink }}>{idadeDias}d</Text>
      </Text>

      <Text style={{ fontSize: 12.8 }}>
        <Text style={{ color: COLORS.inkSoft }}>Viab. </Text>
        <Text style={{ color: COLORS.ink }}>{viabilidade.toFixed(1)}%</Text>
      </Text>

      <Text style={{ fontSize: 12.8 }}>
        <Text style={{ color: COLORS.inkSoft }}>Aves </Text>
        <Text style={{ color: COLORS.ink }}>
          {avesVivas}/{quantidadeAlojadaTotal}
        </Text>
      </Text>
    </View>

    {numGalpoes > 1 && (
      <Text style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
        {numGalpoes} galpões neste lote
      </Text>
    )}
  </Pressable>
);
}
