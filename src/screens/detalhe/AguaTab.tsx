// src/screens/detalhe/AguaTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { TextField } from '../../components/TextField';
import { DateField } from '../../components/DateField';
import { GalpaoSelector } from '../../components/registros/GalpaoSelector';
import { NumericFieldInline } from '../../components/registros/NumericFieldInline';
import { SalvarButton } from '../../components/registros/SalvarButton';
import { HistoricoLista } from '../../components/registros/HistoricoLista';
import {
  getLoteById,
  addAgua,
  removeAgua,
  setHoraLeituraAgua,
} from '../../storage/storage';
import { todayStr, dataMenosDias, fmt, uid, Lote, daysBetween } from '../../utils/calculations';
import { useAuth } from '../../auth/AuthContext';

export function AguaTab({ route }: any) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);

  const [galpaoId, setGalpaoId] = useState('');
  const [data, setData] = useState(todayStr());
  const [leitura, setLeitura] = useState('');
  const [ppm, setPpm] = useState('');
  const [ph, setPh] = useState('');
  const [horaLeitura, setHoraLeitura] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => {
      if (l) {
        setLote(l);
        if (!galpaoId) setGalpaoId(l.galpoes[0]?.id || '');
        setHoraLeitura(l.horaLeituraAgua || '');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId, userId]);

  useFocusEffect(carregar);

  if (!lote) return null;

  const itens = [...(lote.aguas || [])].sort((a, b) => a.data.localeCompare(b.data));
  const itensGalpao = itens.filter((a) => a.galpaoId === galpaoId);
  const anterior = itensGalpao.length ? itensGalpao[itensGalpao.length - 1] : null;

  const consumoCalculadoM3 =
    leitura !== '' && anterior && Number(leitura) >= anterior.leituraHidrometro
      ? +(Number(leitura) - anterior.leituraHidrometro).toFixed(3)
      : null;

  const salvar = async () => {
    if (!userId) return;
    if (!galpaoId) { setErro('Selecione o galpão.'); return; }
    if (!data) { setErro('Informe a data.'); return; }
    if (leitura === '') { setErro('Informe a leitura do hidrômetro.'); return; }
    if (anterior && Number(leitura) < anterior.leituraHidrometro) {
      setErro('Leitura menor que a anterior — confira o valor.');
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      await addAgua(userId, lote.id, {
        id: uid(),
        galpaoId,
        data,
        leituraHidrometro: Number(leitura),
        consumoM3: anterior ? +(Number(leitura) - anterior.leituraHidrometro).toFixed(3) : 0,
        ppm: ppm === '' ? null : Number(ppm),
        ph: ph === '' ? null : Number(ph),
      });
      setLeitura('');
      setPpm('');
      setPh('');
      carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const handleHora = async (v: string) => {
    if (!userId) return;
    setHoraLeitura(v);
    await setHoraLeituraAgua(userId, lote.id, v || null);
  };

  const handleExcluir = async (item: any) => {
    if (!userId) return;
    await removeAgua(userId, lote.id, item.id);
    carregar();
  };

  const itensHistorico = [...itens].reverse().map((item) => {
    const ppmPh = [
      item.ppm != null ? `Ppm ${fmt(Number(item.ppm), 2)}` : null,
      item.ph != null ? `pH ${fmt(Number(item.ph), 1)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      id: item.id,
      data: item.data,
      galpaoId: item.galpaoId,
      dia: daysBetween(lote.dataAlojamento, item.data),
      linhaCustom: `Leitura ${fmt(Number(item.leituraHidrometro), 3)} m³ · Consumo ${fmt(
        Number(item.consumoM3),
        3
      )} m³ (${fmt(Number(item.consumoM3) * 1000, 0)} L)`,
      linha3Custom: ppmPh || undefined,
    };
  });

  return (
  <View>
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.line,
        borderRadius: 14,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }}>
        Avaliação do consumo de água
      </Text>
      <Text style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 8 }}>
        A leitura deve ser feita diariamente, sempre no mesmo horário. O app calcula o consumo
        do dia automaticamente pela diferença entre a leitura de hoje e a anterior.
      </Text>

      <DateField
        mode="time"
        label="Horário da leitura"
        optional
        value={
          horaLeitura
            ? (() => {
                const [hh, mm] = horaLeitura.split(':').map(Number);
                const d = new Date();
                d.setHours(hh, mm, 0, 0);
                return d;
              })()
            : null
        }
        onChange={(d) => {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          handleHora(`${hh}:${mm}`);
        }}
      />

      <DateField
        mode="date"
        label="Data"
        value={data ? new Date(data + 'T00:00:00') : null}
        onChange={(d) => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setData(`${yyyy}-${mm}-${dd}`);
        }}
        minimumDate={new Date(dataMenosDias(lote.dataAlojamento, 15) + 'T00:00:00')}
        maximumDate={new Date(todayStr() + 'T00:00:00')}
      />

      <GalpaoSelector
        galpoes={lote.galpoes}
        selecionadoId={galpaoId}
        onSelect={setGalpaoId}
      />

      <NumericFieldInline
        label="Leitura do hidrômetro"
        unit="m³"
        value={leitura}
        onChangeText={setLeitura}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <NumericFieldInline label="Ppm — opcional" value={ppm} onChangeText={setPpm} />
        <NumericFieldInline label="pH — opcional" value={ph} onChangeText={setPh} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.line,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 13, color: COLORS.inkSoft }}>Consumo do dia</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>
          {consumoCalculadoM3 !== null
            ? `${fmt(consumoCalculadoM3, 3)} m³ (${fmt(consumoCalculadoM3 * 1000, 0)} L)`
            : anterior
            ? '—'
            : 'primeira leitura (base)'}
        </Text>
      </View>

      {!!erro && (
        <Text style={{ color: COLORS.danger ?? '#c0392b', fontSize: 13.5, marginBottom: 8 }}>
          {erro}
        </Text>
      )}

      {/* Botão no meio do card, separando formulário do histórico */}
      <SalvarButton onPress={salvar} loading={salvando} label="Adicionar leitura" />

      {/* Histórico dentro do mesmo card */}
      <HistoricoLista itens={itensHistorico} galpoes={lote.galpoes} onExcluir={handleExcluir} />
    </View>
  </View>
);

}
