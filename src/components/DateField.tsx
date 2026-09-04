// src/components/DateField.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  optional?: boolean;
}

function fmtDate(d: Date) {
  return d instanceof Date && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '';
}
function fmtTime(d: Date) {
  return d instanceof Date && !isNaN(d.getTime())
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
}


// --- Helpers para converter Date <-> string de input HTML ---
function toDateInputValue(d: Date) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function toTimeInputValue(d: Date) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}


export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  optional = false,
}: DateFieldProps) {
  const [show, setShow] = useState(false);
  const Icon = mode === 'date' ? Calendar : Clock;

  // ---------- WEB ----------
  if (Platform.OS === 'web') {
    const handleWebChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (!raw) return;

      if (mode === 'date') {
        const [yyyy, mm, dd] = raw.split('-').map(Number);
        const base = value || new Date();
        const newDate = new Date(base);
        newDate.setFullYear(yyyy, mm - 1, dd);
        onChange(newDate);
      } else {
        const [hh, mi] = raw.split(':').map(Number);
        const base = value || new Date();
        const newDate = new Date(base);
        newDate.setHours(hh, mi, 0, 0);
        onChange(newDate);
      }
    };

    return (
      <View>
        <Text style={styles.label}>
          {label}
          {optional ? ' — opcional' : ''}
        </Text>
        <View style={styles.webInputWrapper}>
          <input
            type={mode}
            value={value instanceof Date && !isNaN(value.getTime())
  ? (mode === 'date' ? toDateInputValue(value) : toTimeInputValue(value))
  : ''}

            onChange={handleWebChange}
            min={mode === 'date' && minimumDate ? toDateInputValue(minimumDate) : undefined}
            max={mode === 'date' && maximumDate ? toDateInputValue(maximumDate) : undefined}
            style={webInputStyle}
          />
        </View>
      </View>
    );
  }

  // ---------- MOBILE (iOS / Android) ----------
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  const handleChange = (_event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) onChange(selected);
  };

  return (
    <View>
      <Text style={styles.label}>
        {label}
        {optional ? ' — opcional' : ''}
      </Text>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
        <Text style={{ fontSize: 15, color: value ? COLORS.ink : COLORS.inkSoft }}>
          {value ? (mode === 'date' ? fmtDate(value) : fmtTime(value)) : 'Selecionar'}
        </Text>
        <Icon size={16} color={COLORS.inkSoft} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          locale="pt-BR"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSoft, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webInputWrapper: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});

// Estilo inline para o <input> HTML (não dá pra usar StyleSheet aqui)
const webInputStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontSize: 15,
  padding: '10px 8px',
  color: COLORS.ink,
  fontFamily: 'inherit',
};
