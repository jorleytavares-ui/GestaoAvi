import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Galpao } from '../../utils/calculations';

interface Props {
  galpoes: Galpao[];
  selecionadoId: string;
  onSelect: (id: string) => void;
}

export function GalpaoSelector({ galpoes, selecionadoId, onSelect }: Props) {
  if (galpoes.length <= 1) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {galpoes.map((g) => {
        const ativo = g.id === selecionadoId;
        return (
          <TouchableOpacity
            key={g.id}
            onPress={() => onSelect(g.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: ativo ? COLORS.primary : COLORS.surfaceAlt,
              borderWidth: 1,
              borderColor: ativo ? COLORS.primary : COLORS.line,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: ativo ? '#fff' : COLORS.ink }}>
              {g.nome}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
