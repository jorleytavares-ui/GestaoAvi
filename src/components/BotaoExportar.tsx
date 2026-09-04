import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { exportarRelatorioPdf } from '../utils/pdfReport';
import { Lote } from '../utils/calculations';

export function BotaoExportar({ lote }: { lote: Lote }) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    setLoading(true);
    await exportarRelatorioPdf(lote);
    setLoading(false);
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} disabled={loading} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <FileDown size={18} color="#fff" />
          <Text style={styles.text}>Exportar Relatório (PDF)</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary ?? '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
