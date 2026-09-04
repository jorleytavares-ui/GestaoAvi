// src/components/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}

export function StatCard({ icon: Icon, label, value, unit, accent }: StatCardProps) {
  const iconColor = accent || COLORS.inkSoft;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Icon size={14} strokeWidth={2.2} color={iconColor} />
        <Text style={[styles.label, { color: iconColor }]}>{label}</Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 21.6,
    fontWeight: '700',
    color: COLORS.ink,
  },
  unit: {
    fontSize: 11.2,
    color: COLORS.inkSoft,
    marginLeft: 3,
    fontWeight: '500',
  },
});
