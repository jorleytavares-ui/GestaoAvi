import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';
import { fmtDateBR } from '../../utils/calculations';

interface Props {
  label: string;
  value: string; // ISO yyyy-mm-dd
  onChange: (iso: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DateFieldInline({ label, value, onChange, minimumDate, maximumDate }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_event: any, selected?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selected) onChange(selected.toISOString().slice(0, 10));
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: COLORS.line,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: COLORS.surface,
        }}
      >
        <Calendar size={16} color={COLORS.inkSoft} />
        <Text style={{ fontSize: 14, color: COLORS.ink }}>{fmtDateBR(value)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={new Date(value + 'T00:00:00')}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}
