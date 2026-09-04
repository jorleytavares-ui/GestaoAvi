import React, { useState, useEffect } from 'react';
import { Alert, TouchableOpacity, Text, View, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Weight, TrendingUp, Bird, Wheat, Calendar } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';

import { AppHeader } from '../components/AppHeader';
import { StatCard } from '../components/StatCard';
import { COLORS } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';
import { useIndicadoresLote } from '../hooks/useIndicadoresLote';
import { fmt } from '../utils/calculations';

import { ResumoTab } from './detalhe/ResumoTab';
import { RacaoTab } from './detalhe/RacaoTab';
import { AguaTab } from './detalhe/AguaTab';
import { PesagensTab } from './detalhe/PesagensTab';
import { MortalidadeTab } from './detalhe/MortalidadeTab';
import { TemperaturaTab } from './detalhe/TemperaturaTab';
import { SanidadeTab } from './detalhe/SanidadeTab';
import { GraficoComparativoTab } from './detalhe/GraficoComparativoTab';
import { EvolucaoTab } from './detalhe/EvolucaoTab';
import { AvaliacaoTecnicaTab } from './detalhe/AvaliacaoTecnicaTab';
import { AbateTab } from './detalhe/AbateTab';

import { assumirLote, liberarLote, podeAssumirLote } from '../services/lotes';

type Props = NativeStackScreenProps<import('../navigation/types').RootStackParamList, 'DetalheLote'>;

type AbaComp = React.ComponentType<any>;

const ABAS: { key: string; label: string; Comp: AbaComp }[] = [
  { key: 'Resumo', label: 'Resumo', Comp: ResumoTab },
  { key: 'Mortalidade', label: 'Mortalidade', Comp: MortalidadeTab },
  { key: 'Agua', label: 'Água', Comp: AguaTab },
  { key: 'Temperatura', label: 'Temperatura', Comp: TemperaturaTab },
  { key: 'Racao', label: 'Ração', Comp: RacaoTab },
  { key: 'Pesagens', label: 'Peso', Comp: PesagensTab },
  { key: 'Sanidade', label: 'Sanidade', Comp: SanidadeTab },
  { key: 'Evolucao', label: 'Evolução', Comp: EvolucaoTab },
  { key: 'GraficoComparativo', label: 'Gráfico', Comp: GraficoComparativoTab },
  { key: 'AvaliacaoTecnica', label: 'Avaliação', Comp: AvaliacaoTecnicaTab },
  { key: 'Abate', label: 'Abate', Comp: AbateTab },
] as const;

function AvisoLoteLiberado({
  lote,
  usuarioId,
  onAssumido,
}: {
  lote: { id: string; owner_id: string; liberado: boolean };
  usuarioId: string;
  onAssumido: () => void;
}) {
  const [online, setOnline] = useState(true);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setOnline(!!s.isConnected));
    return () => unsub();
  }, []);

  if (!podeAssumirLote(lote, usuarioId)) return null;

  async function handleAssumir() {
    setCarregando(true);
    try {
      await assumirLote(lote.id);
      onAssumido();
    } catch (e: any) {
      Alert.alert('Não foi possível assumir o lote', e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.aviso}>
      <Text style={{ marginBottom: 8 }}>Este lote está liberado para transferência.</Text>
      <TouchableOpacity
        disabled={!online || carregando}
        onPress={handleAssumir}
        style={{
          backgroundColor: online ? '#3D5A3D' : '#999',
          padding: 10,
          borderRadius: 6,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FFF' }}>
          {online ? (carregando ? 'Assumindo...' : 'Assumir lote') : 'Você precisa estar online'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function DetalheLoteScreen({ route, navigation }: Props) {
  const { loteId } = route.params;
  const { user } = useAuth();
  const { lote, idx, idade, recarregar } = useIndicadoresLote(loteId);
  const [abaAtiva, setAbaAtiva] = useState<string>('Resumo');

  const totalAlojado = lote?.galpoes.reduce(
  (s, g) => s + (Number(g.quantidadeAlojada) || 0),
  0
) ?? 0;

  

  const AbaAtivaComp = ABAS.find(a => a.key === abaAtiva)?.Comp ?? ResumoTab;

  return (
    <View style={styles.root}>
      <AppHeader onVoltar={() => navigation.goBack()} titulo={lote ? `Lote ${lote.numero}` : 'Lote'} />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Card do lote */}
        {lote && (
          <View style={styles.cardTopo}>
            <View style={styles.linha}>
              <Text style={styles.nomeLote}>{`Lote ${lote.numero}`}</Text>
              <View
                style={[
                  styles.badgeStatus,
                  { borderColor: lote.status === 'encerrado' ? COLORS.inkSoft : COLORS.primary },
                ]}
              >
                <Text
                  style={[
                    styles.badgeStatusText,
                    { color: lote.status === 'encerrado' ? COLORS.inkSoft : COLORS.primary },
                  ]}
                >
                  {lote.status === 'encerrado' ? 'ENCERRADO' : 'ATIVO'}
                </Text>
              </View>
            </View>

            <Text style={styles.subInfo}>
              {[lote.linhagem, (lote as any).sexagem].filter(Boolean).join(' · ')}
            </Text>

            <Text style={styles.responsavel}>
              Resp:{' '}
              <Text style={styles.responsavelValor}>
                {lote.liberado || !lote.ownerId ? 'Lote livre' : lote.ownerNome || 'Usuário não identificado'}
              </Text>
            </Text>

            <View style={styles.divisor} />

            <View style={styles.linhaInfo}>
              <Text style={styles.infoLabel}>Data de alojamento</Text>
              <Text style={styles.infoValor}>{lote.dataAlojamento}</Text>
            </View>
            <View style={styles.divisor} />

            <View style={styles.linhaInfo}>
              <Text style={styles.infoLabel}>Total de aves alojadas</Text>
              <Text style={styles.infoValor}>{totalAlojado}</Text>
            </View>
            <View style={styles.divisor} />

            {(lote as any).numeroGranja !== undefined && (
              <>
                <View style={styles.linhaInfo}>
                  <Text style={styles.infoLabel}>Nº da granja</Text>
                  <Text style={styles.infoValor}>{(lote as any).numeroGranja}</Text>
                </View>
                <View style={styles.divisor} />
              </>
            )}

            <Text style={styles.secaoLabel}>GALPÕES DESTE LOTE</Text>
            {lote.galpoes.map(g => (
              <View key={g.id} style={styles.linhaInfo}>
                <Text style={styles.infoLabel}>{g.nome}</Text>
                <Text style={styles.infoValor}>{g.quantidadeAlojada}</Text>
              </View>
            ))}
          </View>
        )}

        {lote && user && (
          <AvisoLoteLiberado
            lote={{ id: lote.id, owner_id: lote.ownerId ?? '', liberado: !!lote.liberado }}
            usuarioId={user.id}
            onAssumido={recarregar}
          />
        )}

        {lote && user && lote.ownerId === user.id && !lote.liberado && (
          <TouchableOpacity
            style={styles.botaoLiberar}
            onPress={async () => {
              try {
                await liberarLote(lote.id);
                recarregar();
              } catch (e: any) {
                Alert.alert('Erro ao liberar lote', e.message);
              }
            }}
          >
            <Text style={{ color: '#FFF' }}>Liberar lote para outro usuário</Text>
          </TouchableOpacity>
        )}

        {/* Grid de índices */}
        {idx && (
          <View>
            <Text style={styles.sectionBar}>Índices zootécnicos (todos os galpões)</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <StatCard icon={Calendar} label="Idade" value={String(idade)} unit="dias" />
              </View>
              <View style={styles.gridItem}>
                <StatCard icon={Bird} label="Aves vivas" value={fmt(idx.avesVivas)} unit={`/ ${fmt(idx.quantidadeAlojadaTotal)}`} />
              </View>
              <View style={styles.gridItem}>
                <StatCard icon={TrendingUp} label="Viabilidade" value={fmt(idx.viabilidade, 1)} unit="%" />
              </View>
              <View style={styles.gridItem}>
                <StatCard icon={Wheat} label="Ração acum." value={fmt(idx.racaoAcumuladaKg, 0)} unit="kg" />
              </View>
              <View style={styles.gridItem}>
                <StatCard
                  icon={Weight}
                  label="Peso médio"
                  value={idx.pesoMedioAtualG !== null ? fmt(idx.pesoMedioAtualG, 0) : '—'}
                  unit="g"
                />
              </View>
              <View style={styles.gridItem}>
                <StatCard
                  icon={TrendingUp}
                  label="Conversão"
                  value={idx.conversaoAlimentar !== null ? fmt(idx.conversaoAlimentar, 3) : '—'}
                  unit=""
                />
              </View>
              <View style={styles.gridItem}>
                <StatCard
                  icon={TrendingUp}
                  label="GPD"
                  value={idx.gpd !== null ? fmt(idx.gpd, 1) : '—'}
                  unit="g/dia"
                />
              </View>
              <View style={styles.gridItem}>
                <StatCard icon={TrendingUp} label="IEP" value={idx.iep !== null ? fmt(idx.iep, 0) : '—'} unit="" />
              </View>
            </View>
          </View>
        )}

        {/* Barra de abas por botões */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsBarScroll}
          contentContainerStyle={styles.tabsBarContent}
        >
          {ABAS.map(aba => (
            <TouchableOpacity
              key={aba.key}
              onPress={() => setAbaAtiva(aba.key)}
              style={[styles.tabButton, abaAtiva === aba.key && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, abaAtiva === aba.key && styles.tabButtonTextActive]}>
                {aba.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Conteúdo da aba ativa */}
        <View style={styles.abaContent}>
          <AbaAtivaComp route={{ params: { loteId } } as any} navigation={navigation as any} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  cardTopo: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nomeLote: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  badgeStatus: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  subInfo: { fontSize: 13, color: COLORS.inkSoft, marginTop: 2 },
  responsavel: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 6 },
  responsavelValor: { fontWeight: '600', color: COLORS.ink },
  divisor: { height: 1, backgroundColor: COLORS.line, marginVertical: 10 },
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 13, color: COLORS.inkSoft },
  infoValor: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  secaoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.inkSoft,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  botaoLiberar: {
    backgroundColor: '#B33A3A',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  aviso: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
  },
  sectionBar: {
    backgroundColor: COLORS.primary,
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  gridItem: { width: '48%' },

  tabsBarScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  tabsBarContent: {
    paddingHorizontal: 12,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
  },
  abaContent: {
  minHeight: 400,
  paddingHorizontal: 16,
  paddingBottom: 8,
},

});
