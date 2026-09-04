// src/screens/detalhe/PlaceholderTab.tsx
// Usado temporariamente para as abas que serão implementadas nas próximas fases
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';

export function PlaceholderTab({ titulo }: { titulo: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{titulo} — em construção</Text>
      <Text style={styles.subtext}>Esta aba será implementada na próxima fase.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { fontSize: 15, fontWeight: '600', color: COLORS.ink, marginBottom: 4 },
  subtext: { fontSize: 13, color: COLORS.inkSoft, textAlign: 'center' },
});
