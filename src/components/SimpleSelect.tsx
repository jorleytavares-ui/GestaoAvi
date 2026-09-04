// src/components/SimpleSelect.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

type Opcao = { label: string; value: string };

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  opcoes: Opcao[];
  placeholder?: string;
}

export function SimpleSelect({ label, value, onChange, opcoes, placeholder = 'Selecione' }: Props) {
  const [aberto, setAberto] = useState(false);
  const selecionado = opcoes.find((o) => o.value === value);

  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.trigger} onPress={() => setAberto(true)}>
        <Text style={{ fontSize: 13, color: selecionado ? COLORS.ink : COLORS.inkSoft }}>
          {selecionado ? selecionado.label : placeholder}
        </Text>
        <ChevronDown size={16} color={COLORS.inkSoft} />
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={styles.overlay} onPress={() => setAberto(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={opcoes}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.item}
                  onPress={() => {
                    onChange(item.value);
                    setAberto(false);
                  }}
                >
                  <Text style={{ fontSize: 14, color: COLORS.ink }}>{item.label}</Text>
                  {item.value === value && <Check size={16} color={COLORS.primary} />}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 4 },
  trigger: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingVertical: 8,
  },
  item: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sep: { height: 1, backgroundColor: COLORS.line, marginHorizontal: 18 },
});
