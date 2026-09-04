// src/screens/detalhe/AvaliacaoTecnicaTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { TextField } from '../../components/TextField';
import { DateField } from '../../components/DateField';
import { GalpaoSelector } from '../../components/registros/GalpaoSelector';
import { SalvarButton } from '../../components/registros/SalvarButton';
import {
  getLoteById,
  addAvaliacaoTecnica,
  removeAvaliacaoTecnica,
} from '../../storage/storage';
import { todayStr, dataMenosDias, fmtDateBR, uid, Lote, daysBetween } from '../../utils/calculations';
import { Trash2 } from 'lucide-react-native';
import { useAuth } from '../../auth/AuthContext';

const ITENS = [
  { chave: 'condicaoPinteira', label: 'Condição na pinteira no alojamento' },
  { chave: 'usoPapelRecebimento', label: 'Uso de papel no recebimento' },
  { chave: 'confortoTermico', label: 'Conforto térmico' },
  { chave: 'sistemaAquecimento', label: 'Sistema de aquecimento' },
  { chave: 'cloracaoAgua', label: 'Cloração da água' },
  { chave: 'qualidadeCama', label: 'Qualidade da cama' },
  { chave: 'organizacaoInternaExterna', label: 'Organização interna e externa' },
  { chave: 'ventilacaoMinima', label: 'Ventilação mínima' },
  { chave: 'iluminacao', label: 'Iluminação' },
  { chave: 'comedouros', label: 'Comedouros' },
  { chave: 'bebedouros', label: 'Bebedouros' },
  { chave: 'ventiladoresExaustores', label: 'Ventiladores / exaustores' },
  { chave: 'nebulizacao', label: 'Nebulização' },
  { chave: 'limpezaCaixaAgua', label: "Limpeza da caixa d'água" },
  { chave: 'limpezaCondicoesSilo', label: 'Limpeza e condições do silo' },
  { chave: 'controleCascudinho', label: 'Controle de cascudinho' },
  { chave: 'controleRoedores', label: 'Controle de roedores' },
  { chave: 'gasAmonia', label: 'Gás amônia' },
  { chave: 'compostagem', label: 'Compostagem' },
];

function ConformeToggle({ label, value, onChange }: any) {
  const opcoes: [string, string][] = [['C', 'C'], ['NC', 'NC'], ['NA', '—']];
  const cores: any = { C: COLORS.primary, NC: COLORS.danger ?? '#c0392b', NA: COLORS.inkSoft };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.line,
      }}
    >
      <Text style={{ fontSize: 12.8, flex: 1, paddingRight: 8, color: COLORS.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {opcoes.map(([v, l]) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={{
              width: 34,
              height: 28,
              borderRadius: 7,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.line,
              backgroundColor: value === v ? cores[v] : COLORS.surfaceAlt ?? '#f2f2f2',
            }}
          >
            <Text style={{ color: value === v ? '#fff' : COLORS.inkSoft, fontSize: 12, fontWeight: '700' }}>
              {l}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AvaliacaoTecnicaTab({ route }: any) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);

  const [galpaoId, setGalpaoId] = useState('');
  const [data, setData] = useState(todayStr());
  const [hora, setHora] = useState<string>('');
  const [tecnico, setTecnico] = useState('');
  const [itens, setItens] = useState<Record<string, string>>(
    Object.fromEntries(ITENS.map((i) => [i.chave, 'NA']))
  );
  const [orientacoes, setOrientacoes] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => {
      if (l) {
        setLote(l);
        if (!galpaoId) setGalpaoId(l.galpoes[0]?.id || '');
        if (!tecnico) setTecnico(l.tecnico || '');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId, userId]);

  useFocusEffect(carregar);

  if (!lote) return null;

  const visitas = [...(lote.avaliacoesTecnicas || [])].sort((a: any, b: any) => b.data.localeCompare(a.data));
  const idadeNaVisita = daysBetween(lote.dataAlojamento, data || todayStr());

  const salvar = async () => {
    if (!userId) return;
    if (!galpaoId) { setErro('Selecione o galpão.'); return; }
    if (!data) { setErro('Informe a data da visita.'); return; }
    setErro('');
    setSalvando(true);
    try {
      await addAvaliacaoTecnica(userId, loteId, {
        id: uid(),
        galpaoId,
        data,
        hora: hora || null,
        tecnico: tecnico.trim(),
        itens: { ...itens },
        orientacoes: orientacoes.trim(),
      });
      setHora('');
      setOrientacoes('');
      setItens(Object.fromEntries(ITENS.map((i) => [i.chave, 'NA'])));
      carregar();
    } catch (e: any) {
      setErro(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (item: any) => {
    if (!userId) return;
    await removeAvaliacaoTecnica(userId, loteId, item.id);
    carregar();
  };

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
          Nova visita técnica
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 8 }}>
          Registre a avaliação técnica do galpão realizada durante a visita.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <DateField
              mode="date"
              label="Data da visita"
              value={data ? new Date(data + 'T00:00:00') : null}
              onChange={(d: Date) => {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                setData(`${yyyy}-${mm}-${dd}`);
              }}
              minimumDate={new Date(dataMenosDias(lote.dataAlojamento, 15) + 'T00:00:00')}
              maximumDate={new Date(todayStr() + 'T00:00:00')}
            />
          </View>

          <View style={{ flex: 1 }}>
            <DateField
              mode="time"
              label="Hora da visita"
              optional
              value={
                hora
                  ? (() => {
                      const [hh, mm] = hora.split(':').map(Number);
                      const d = new Date();
                      d.setHours(hh, mm, 0, 0);
                      return d;
                    })()
                  : null
              }
              onChange={(d: Date) => {
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                setHora(`${hh}:${mm}`);
              }}
            />
          </View>
        </View>

        <GalpaoSelector
          galpoes={lote.galpoes}
          selecionadoId={galpaoId}
          onSelect={setGalpaoId}
        />

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
          <Text style={{ fontSize: 13, color: COLORS.inkSoft }}>Idade na visita</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>
            {idadeNaVisita} dias
          </Text>
        </View>

        <TextField
          label="Técnico responsável"
          placeholder="Nome"
          value={tecnico}
          onChangeText={setTecnico}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink, marginTop: 10, marginBottom: 4 }}>
          Itens avaliados
        </Text>
        <View>
          {ITENS.map((i) => (
            <ConformeToggle
              key={i.chave}
              label={i.label}
              value={itens[i.chave]}
              onChange={(v: string) => setItens({ ...itens, [i.chave]: v })}
            />
          ))}
        </View>

        <Text style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 10, marginBottom: 4 }}>
          Orientações técnicas — opcional
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: COLORS.line,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: COLORS.ink,
            backgroundColor: COLORS.surfaceAlt ?? '#fff',
            minHeight: 80,
            textAlignVertical: 'top',
            marginBottom: 8,
          }}
          multiline
          value={orientacoes}
          onChangeText={setOrientacoes}
          placeholder="Observações e orientações do técnico para esta visita"
          placeholderTextColor={COLORS.inkSoft}
        />

        {!!erro && (
          <Text style={{ color: COLORS.danger ?? '#c0392b', fontSize: 13.5, marginBottom: 8 }}>
            {erro}
          </Text>
        )}

        <SalvarButton onPress={salvar} loading={salvando} label="Salvar visita técnica" />
      </View>

      <View style={{ height: 16 }} />

      {visitas.map((v: any) => {
        const galpao = lote.galpoes.find((g: any) => g.id === v.galpaoId);
        const ncCount = Object.values(v.itens || {}).filter((x) => x === 'NC').length;
        return (
          <View
            key={v.id}
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.line,
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.ink }}>
                {fmtDateBR(v.data)}{v.hora ? ` · ${v.hora}` : ''} · dia {daysBetween(lote.dataAlojamento, v.data)}
              </Text>
              <Pressable onPress={() => handleExcluir(v)} style={{ padding: 4 }}>
                <Trash2 size={17} color={COLORS.danger ?? '#c0392b'} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
              {galpao ? `${galpao.nome} · ` : ''}{v.tecnico || 'Técnico não informado'}
              {ncCount > 0 && (
                <Text style={{ color: COLORS.danger ?? '#c0392b', fontWeight: '600' }}>
                  {' '}· {ncCount} item(ns) não conforme(s)
                </Text>
              )}
            </Text>

            {ncCount > 0 && (
              <View style={{ marginTop: 8 }}>
                {ITENS.filter((i) => v.itens && v.itens[i.chave] === 'NC').map((i) => (
                  <View
                    key={i.chave}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: COLORS.danger ?? '#c0392b', fontSize: 12 }}>{i.label}</Text>
                    <Text style={{ color: COLORS.danger ?? '#c0392b', fontSize: 12, fontWeight: '700' }}>NC</Text>
                  </View>
                ))}
              </View>
            )}

            {!!v.orientacoes && (
              <Text style={{ fontSize: 13, marginTop: 8, color: COLORS.ink }}>{v.orientacoes}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
