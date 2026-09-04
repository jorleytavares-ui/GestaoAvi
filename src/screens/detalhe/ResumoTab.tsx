// src/screens/detalhe/ResumoTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AlertTriangle, Weight, Droplets, FileDown, Trash2 } from 'lucide-react-native';

import { StatCard } from '../../components/StatCard';
import { COLORS } from '../../theme/colors';
import { setGeradoPor, deleteLoteLocal } from '../../storage/storage';
import { fmt, fmtDateBR, daysBetween } from '../../utils/calculations';
import { useIndicadoresLote } from '../../hooks/useIndicadoresLote';
import { SimpleSelect } from '../../components/SimpleSelect';
import { exportarRelatorioPdf } from '../../utils/pdfReport';
import { useAuth } from '../../auth/AuthContext';

const FUNCOES_GERADO_POR = [
  { label: 'Integrado', value: 'Integrado' },
  { label: 'Técnico veterinário', value: 'Técnico veterinário' },
  { label: 'Granjeiro', value: 'Granjeiro' },
];

export function ResumoTab({ route, navigation }: any) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const { lote, idx, recarregar } = useIndicadoresLote(loteId);
  const [nomeGeradoPor, setNomeGeradoPor] = useState('');
  const [funcaoGeradoPor, setFuncaoGeradoPor] = useState('');
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (lote) {
        setNomeGeradoPor(lote.geradoPor?.nome || '');
        setFuncaoGeradoPor(lote.geradoPor?.funcao || '');
      }
    }, [lote?.id])
  );

  if (!lote || !idx) return null;

  const handleSalvarGeradoPor = async () => {
  if (!userId) return;
  try {
    await setGeradoPor(userId, lote.id, { nome: nomeGeradoPor.trim(), funcao: funcaoGeradoPor });
    recarregar();
  } catch (e: any) {
    Alert.alert('Erro ao salvar', e.message);
  }
};


  const handleGerarPdf = async () => {
    setGerandoPdf(true);
    try {
      await exportarRelatorioPdf(lote);
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleEncerrar = () => {
    navigation.navigate('EncerrarForm', { loteId: lote.id });
  };

 const handleExcluir = () => {
  Alert.alert(
    'Excluir lote',
    `Tem certeza que deseja excluir o lote ${lote.numero}? Esta ação não pode ser desfeita.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!userId) return;
            await deleteLoteLocal(userId, lote.id);
            navigation.navigate('Home');
          } catch (e: any) {
            Alert.alert('Erro ao excluir', e.message);
          }
        },
      },
    ]
  );
};


  // ---------- Destaques diários (por galpão) ----------
  const ultimoPorGalpao = lote.galpoes.map((g) => {
    const morts = idx.mortalidadesSorted.filter((r) => r.galpaoId === g.id);
    const aguas = idx.aguasSorted.filter((r) => r.galpaoId === g.id);
    return {
      galpao: g,
      ultimaMortalidade: morts.length ? morts[morts.length - 1] : null,
      ultimaAgua: aguas.length ? aguas[aguas.length - 1] : null,
    };
  });
  const temDestaque = ultimoPorGalpao.some((u) => u.ultimaMortalidade || u.ultimaAgua);

  // ---------- Descartados por motivo (acumulado) ----------
  const porMotivo: Record<string, number> = {};
  idx.mortalidadesSorted.forEach((r) => {
    if (!r.descartados) return;
    const chave = r.motivoDescarte || 'Não informado';
    porMotivo[chave] = (porMotivo[chave] || 0) + (Number(r.descartados) || 0);
  });

  return (
    <View>
      {/* Resumo geral */}
      <View style={styles.card}>
        <Text style={styles.paragrafo}>
          Água acumulada:{' '}
          <Text style={styles.mono}>{idx.aguaAcumuladaL ? `${fmt(idx.aguaAcumuladaL, 0)} L` : '—'}</Text>
        </Text>
        <Text style={styles.paragrafo}>
          Mortalidade acumulada: <Text style={styles.mono}>{idx.mortalidadeAcumulada} aves</Text>
        </Text>
        {idx.descartadosAcumulados > 0 && (
          <Text style={styles.paragrafo}>
            Descartados acumulados: <Text style={styles.mono}>{idx.descartadosAcumulados} aves</Text>
          </Text>
        )}
        {lote.status === 'encerrado' && (
          <>
            <Text style={styles.paragrafo}>
              Quantidade abatida (total): <Text style={styles.mono}>{fmt(idx.qtdeAbatida)}</Text>
            </Text>
            {idx.condenadosTotal !== null && (
              <Text style={styles.paragrafo}>
                Aves condenadas:{' '}
                <Text style={styles.mono}>
                  {idx.condenadosTotal} ({fmt(idx.percentualCondenacao, 2)}%)
                </Text>
              </Text>
            )}
          </>
        )}
        {lote.status === 'encerrado' && lote.encerramento?.obs && (
          <Text style={styles.paragrafo}>
            Obs. de encerramento: <Text style={styles.monoInk}>{lote.encerramento.obs}</Text>
          </Text>
        )}
      </View>

      {/* Detalhamento por galpão */}
      {lote.galpoes.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.label}>Detalhamento por galpão</Text>
          {idx.statsGalpoes.map((s) => (
            <View key={s.galpao.id} style={styles.blocoGalpao}>
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabelDestaque}>{s.galpao.nome}</Text>
                <Text style={styles.infoRowValor}>
                  {fmt(s.avesVivas)}/{fmt(Number(s.galpao.quantidadeAlojada))}
                  {s.pesoFinal ? ` · ${fmt(s.pesoFinal)} g` : ''}
                </Text>
              </View>
              {s.galpao.temperaturaAviario && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>Temperatura</Text>
                  <Text style={styles.infoRowValor}>{fmt(s.galpao.temperaturaAviario, 1)} °C</Text>
                </View>
              )}
              {s.galpao.pintosMortos && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>Pintinhos mortos (chegada)</Text>
                  <Text style={styles.infoRowValor}>{s.galpao.pintosMortos}</Text>
                </View>
              )}
              {s.galpao.aspecto && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>Aspecto</Text>
                  <Text style={styles.infoRowValor}>{s.galpao.aspecto}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Destaques diários */}
      {temDestaque && (
        <View style={styles.card}>
          <Text style={styles.sectionBar}>Destaques diários</Text>

          {ultimoPorGalpao.map(({ galpao, ultimaMortalidade, ultimaAgua }) => {
            if (!ultimaMortalidade && !ultimaAgua) return null;
            return (
              <View key={galpao.id} style={{ marginBottom: 12 }}>
                {lote.galpoes.length > 1 ? (
                  <Text style={styles.subLabel}>
                    {galpao.nome}
                    {ultimaMortalidade ? ` · último registro em ${fmtDateBR(ultimaMortalidade.data)}` : ''}
                  </Text>
                ) : ultimaMortalidade ? (
                  <Text style={styles.subLabelSoft}>Último registro em {fmtDateBR(ultimaMortalidade.data)}</Text>
                ) : null}

                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <StatCard
                      icon={AlertTriangle}
                      label="Mortalidade diária"
                      value={ultimaMortalidade ? String(ultimaMortalidade.mortalidade) : '—'}
                      unit="aves"
                    />
                  </View>
                  <View style={styles.gridItem}>
                    <StatCard
                      icon={Droplets}
                      label="Água consumida"
                      value={ultimaAgua ? fmt(ultimaAgua.consumoM3 * 1000, 0) : '—'}
                      unit="L"
                    />
                  </View>
                </View>

                {ultimaMortalidade && ultimaMortalidade.descartados > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <StatCard
                      icon={AlertTriangle}
                      label="Descartados do dia"
                      value={String(ultimaMortalidade.descartados)}
                      unit="aves"
                    />
                  </View>
                )}
              </View>
            );
          })}

          {Object.keys(porMotivo).length > 0 && (
            <View style={styles.divisorSuperior}>
              <Text style={styles.subLabel}>Descartados por motivo (acumulado)</Text>
              {Object.entries(porMotivo).map(([motivo, qtd]) => (
                <View key={motivo} style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>{motivo}</Text>
                  <Text style={styles.infoRowValor}>{fmt(qtd)} aves</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Outros destaques */}
      {(idx.percentualCondenacao !== null || idx.diffPesoProjetado !== null) && (
        <>
          <Text style={styles.sectionBarSolta}>Outros destaques</Text>
          <View style={styles.grid}>
            {idx.percentualCondenacao !== null && (
              <View style={styles.gridItem}>
                <StatCard icon={AlertTriangle} label="Condenação" value={fmt(idx.percentualCondenacao, 2)} unit="%" />
              </View>
            )}
            {idx.diffPesoProjetado !== null && (
              <View style={styles.gridItem}>
                <StatCard
                  icon={Weight}
                  label="Real − projetado"
                  value={(idx.diffPesoProjetado >= 0 ? '+' : '') + fmt(idx.diffPesoProjetado, 0)}
                  unit="g"
                />
              </View>
            )}
          </View>
        </>
      )}

      {/* Bloco de geração do documento */}
      <View style={styles.card}>
        <Text style={styles.label}>Documento gerado por</Text>
        <SimpleSelect
          label="Função"
          value={funcaoGeradoPor}
          onChange={setFuncaoGeradoPor}
          opcoes={FUNCOES_GERADO_POR}
          placeholder="Selecione a função"
        />
        <TextInput
          style={styles.input}
          placeholder="Nome de quem está gerando o documento"
          value={nomeGeradoPor}
          onChangeText={setNomeGeradoPor}
        />
        <TouchableOpacity style={styles.btnGhost} onPress={handleSalvarGeradoPor}>
          <Text style={styles.btnGhostText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      {/* Gerar PDF */}
      <TouchableOpacity
        style={[styles.btnPrimary, gerandoPdf && { opacity: 0.6 }]}
        onPress={handleGerarPdf}
        disabled={gerandoPdf}
      >
        <FileDown size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.btnPrimaryText}>{gerandoPdf ? 'Gerando PDF...' : 'Gerar PDF completo'}</Text>
      </TouchableOpacity>

      {/* Encerrar / status */}
      {lote.status === 'ativo' ? (
        <TouchableOpacity style={styles.btnEncerrar} onPress={handleEncerrar}>
          <Text style={styles.btnEncerrarText}>Encerrar lote (abate)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.cardCentro}>
          <Text style={styles.textoCentro}>
            Encerrado em {fmtDateBR(lote.encerramento?.data)} · Peso médio combinado {fmt(idx.pesoMedioAtualG)} g
          </Text>
        </View>
      )}

      {/* Excluir lote */}
      <TouchableOpacity style={styles.btnExcluir} onPress={handleExcluir}>
        <Trash2 size={15} color={COLORS.alert ?? '#A6432B'} style={{ marginRight: 6 }} />
        <Text style={styles.btnExcluirText}>Excluir lote</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    marginBottom: 12,
  },
  cardCentro: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  textoCentro: { fontSize: 12.5, color: COLORS.inkSoft, textAlign: 'center' },
  paragrafo: { fontSize: 13, color: COLORS.inkSoft },
  mono: { fontFamily: 'monospace', color: COLORS.ink, fontWeight: '600' },
  monoInk: { color: COLORS.ink },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 2,
  },
  subLabel: { fontSize: 12, fontWeight: '600', color: COLORS.ink, marginBottom: 6 },
  subLabelSoft: { fontSize: 11.5, color: COLORS.inkSoft, marginBottom: 6 },
  sectionBar: {
    backgroundColor: COLORS.primary,
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
    overflow: 'hidden',
  },
  sectionBarSolta: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.inkSoft,
    marginTop: 4,
    marginBottom: 10,
  },
  blocoGalpao: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoRowLabel: { fontSize: 12.5, color: COLORS.inkSoft },
  infoRowLabelDestaque: { fontSize: 12.5, fontWeight: '600', color: COLORS.ink },
  infoRowValor: { fontSize: 12.5, fontWeight: '600', color: COLORS.ink },
  divisorSuperior: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  gridItem: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: COLORS.surfaceAlt ?? '#fff',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnGhostText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnEncerrar: {
    borderWidth: 1,
    borderColor: COLORS.alert ?? '#A6432B',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnEncerrarText: { color: COLORS.alert ?? '#A6432B', fontWeight: '600', fontSize: 14 },
  btnExcluir: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  btnExcluirText: {
    color: COLORS.alert ?? '#A6432B',
    fontWeight: '600',
    fontSize: 13.5,
  },
});
