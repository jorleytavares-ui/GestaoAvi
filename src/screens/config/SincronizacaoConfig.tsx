// src/screens/config/SincronizacaoConfig.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../../theme/colors';
import { DateField } from '../../components/DateField';
import { TextField } from '../../components/TextField';
import { SalvarButton } from '../../components/registros/SalvarButton';
import {
  ModoSync,
  getModoSync,
  setModoSync,
  getHorarioSync,
  setHorarioSync,
  getIntervaloSyncMin,
  setIntervaloSyncMin,
} from '../../storage/syncPrefs';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';


const OPCOES: { valor: ModoSync; label: string; desc: string }[] = [
  { valor: 'intervalo', label: 'Automática', desc: 'Sincroniza a cada X minutos automaticamente.' },
  { valor: 'horario', label: 'Agendada', desc: 'Sincroniza 1x por dia no horário escolhido.' },
  { valor: 'online', label: 'Sempre online', desc: 'Sincroniza automaticamente sempre que houver conexão.' },
  { valor: 'manual', label: 'Manual', desc: 'Só sincroniza quando você tocar em "Sincronizar agora" no menu.' },
  { valor: 'offline', label: 'Sempre offline', desc: 'Não sincroniza dados. Apenas revalida a licença periodicamente.' },
];

export function SincronizacaoConfig() {
  const { toast, showToast, hideToast } = useToast();
  const [modo, setModo] = useState<ModoSync>('online');
  const [horaDate, setHoraDate] = useState<Date | null>(null);
  const [intervalo, setIntervalo] = useState('30');

  useEffect(() => {
    (async () => {
      const m = await getModoSync();
      setModo(m);
      const h = await getHorarioSync();
      if (h) {
        const [hh, mm] = h.split(':').map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        setHoraDate(d);
      }
      const i = await getIntervaloSyncMin();
      setIntervalo(String(i));
    })();
  }, []);

  const salvar = async () => {
    try {
      await setModoSync(modo);
      if (modo === 'horario' && horaDate) {
        const hh = String(horaDate.getHours()).padStart(2, '0');
        const mm = String(horaDate.getMinutes()).padStart(2, '0');
        await setHorarioSync(`${hh}:${mm}`);
      }
      if (modo === 'intervalo') {
        await setIntervaloSyncMin(Number(intervalo) || 30);
      }
      showToast('Configuração de sincronização salva.', 'success');
    } catch (e) {
      showToast('Não foi possível salvar a configuração.', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <Text style={styles.titulo}>Sincronização</Text>

      {OPCOES.map((op) => (
        <Pressable key={op.valor} style={styles.opcao} onPress={() => setModo(op.valor)}>
          <View style={[styles.radio, modo === op.valor && styles.radioAtivo]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.opcaoLabel}>{op.label}</Text>
            <Text style={styles.opcaoDesc}>{op.desc}</Text>
          </View>
        </Pressable>
      ))}

      {modo === 'horario' && (
        <View style={{ marginTop: 12 }}>
          <DateField label="Horário da sincronização" mode="time" value={horaDate} onChange={setHoraDate} />
        </View>
      )}

      {modo === 'intervalo' && (
        <View style={{ marginTop: 12 }}>
          <TextField
            label="Intervalo (minutos)"
            keyboardType="numeric"
            value={intervalo}
            onChangeText={setIntervalo}
            placeholder="30"
          />
        </View>
      )}

      <View style={{ marginTop: 20 }}>
        <SalvarButton onPress={salvar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 16 },
  opcao: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.line, marginTop: 2 },
  radioAtivo: { borderColor: COLORS.ink, backgroundColor: COLORS.ink },
  opcaoLabel: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  opcaoDesc: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 },
});
