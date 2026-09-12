import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, ScrollView, TouchableOpacity, Text, TextInput, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus, CloudOff, ChevronDown } from 'lucide-react-native';

import { AppHeader } from '../components/AppHeader';
import { LoteCard } from '../components/LoteCard';
import { EmptyState } from '../components/EmptyState';
import { COLORS } from '../theme/colors';
import { Lote, computeIndices, daysBetween, todayStr } from '../utils/calculations';
import { getLotes } from '../storage/storage';
import { contarPendentes } from '../storage/sync';
import { listarEmpresasVinculadas, EmpresaVinculada } from '../services/empresas';
import { buscarLotesEncerradosDaEmpresa } from '../services/lotes';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { StatusVinculoBanner } from '../components/StatusVinculoBanner';
import { SolicitacoesPendentesBanner } from '../components/SolicitacoesPendentesBanner';



type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type StatusFiltro = 'ativo' | 'encerrado';

export function HomeScreen({ navigation }: Props) {
  const { userId, empresaId, empresaTipo } = useAuth();
  const isIntegracao = empresaTipo === 'Integracao';

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pendentes, setPendentes] = useState(0);

  // ---- Filtros (só para Integracao) ----
  const [empresasVinculadas, setEmpresasVinculadas] = useState<EmpresaVinculada[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaVinculada | null>(null);
  const [numeroParceiro, setNumeroParceiro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('ativo');
  const [modalEmpresaVisivel, setModalEmpresaVisivel] = useState(false);

  const [lotesEncerrados, setLotesEncerrados] = useState<Lote[]>([]);
  const [carregandoEncerrados, setCarregandoEncerrados] = useState(false);

  const carregarLotes = useCallback(async () => {
    if (!userId) return;
    const dados = await getLotes(userId);
    setLotes(dados);
    const qtdPendentes = await contarPendentes();
    setPendentes(qtdPendentes);
    setCarregando(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      carregarLotes();
    }, [carregarLotes])
  );

  useEffect(() => {
    const interval = setInterval(carregarLotes, 5000);
    return () => clearInterval(interval);
  }, [carregarLotes]);

  // Busca empresas vinculadas (para o dropdown)
  useEffect(() => {
    if (!isIntegracao || !empresaId) return;
    (async () => {
      const { data, error } = await listarEmpresasVinculadas(empresaId);
      if (!error && data) setEmpresasVinculadas(data as EmpresaVinculada[]);
    })();
  }, [isIntegracao, empresaId]);

  // Busca Encerrados no servidor, só quando: status = 'encerrado' + empresa selecionada
  useEffect(() => {
    if (!isIntegracao || statusFiltro !== 'encerrado' || !empresaSelecionada) {
      setLotesEncerrados([]);
      return;
    }
    (async () => {
      setCarregandoEncerrados(true);
      const dados = await buscarLotesEncerradosDaEmpresa(empresaSelecionada.id);
      setLotesEncerrados(dados);
      setCarregandoEncerrados(false);
    })();
  }, [isIntegracao, statusFiltro, empresaSelecionada]);

  // Mapa empresaId -> codigo_parceiro (para filtrar Ativos localmente)
  const mapaCodigoParceiro = useMemo(() => {
    return new Map(empresasVinculadas.map((e) => [e.id, e.codigo_parceiro ?? '']));
  }, [empresasVinculadas]);

  const lotesFiltrados = useMemo(() => {
    if (!isIntegracao) return lotes; // empresas comuns: sem filtro

    if (statusFiltro === 'encerrado') {
      // já vem filtrado por empresa direto do servidor
      if (!numeroParceiro.trim()) return lotesEncerrados;
      const codParceiro = empresaSelecionada
        ? (mapaCodigoParceiro.get(empresaSelecionada.id) ?? '')
        : '';
      return codParceiro.toLowerCase().includes(numeroParceiro.trim().toLowerCase())
        ? lotesEncerrados
        : [];
    }

    // status === 'ativo' -> filtro local
    return lotes.filter((l) => {
      if (l.status !== 'ativo') return false;

      if (empresaSelecionada && (l as any).empresaId !== empresaSelecionada.id) return false;

      if (numeroParceiro.trim()) {
        const codParceiro = mapaCodigoParceiro.get((l as any).empresaId) ?? '';
        if (!codParceiro.toLowerCase().includes(numeroParceiro.trim().toLowerCase())) return false;
      }

      return true;
    });
  }, [isIntegracao, statusFiltro, lotes, lotesEncerrados, empresaSelecionada, numeroParceiro, mapaCodigoParceiro]);

  if (carregando) return null;

  const listaBase = isIntegracao ? lotesFiltrados : lotes;
  const lotesOrdenados = [...listaBase].sort((a, b) => (a.status === 'ativo' ? -1 : 1));

  const mudarStatus = (novoStatus: StatusFiltro) => {
    if (novoStatus === 'encerrado' && !empresaSelecionada) {
      // exige selecionar o integrado antes
      setModalEmpresaVisivel(true);
      return;
    }
    setStatusFiltro(novoStatus);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <AppHeader />

        {!isIntegracao && <StatusVinculoBanner empresaId={empresaId} />}
        {isIntegracao && <SolicitacoesPendentesBanner empresaId={empresaId} />}

        {isIntegracao && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            {/* Dropdown: Nome do Integrado */}
            <TouchableOpacity
              onPress={() => setModalEmpresaVisivel(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: COLORS.surfaceAlt,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: empresaSelecionada ? COLORS.ink : COLORS.inkSoft }}>
                {empresaSelecionada ? empresaSelecionada.nome : 'Todos os Integrados'}
              </Text>
              <ChevronDown size={18} color={COLORS.inkSoft} />
            </TouchableOpacity>

            {/* Input: N° do parceiro */}
            <TextInput
              value={numeroParceiro}
              onChangeText={setNumeroParceiro}
              placeholder="N° do parceiro"
              placeholderTextColor={COLORS.inkSoft}
              style={{
                borderWidth: 1,
                borderColor: COLORS.surfaceAlt,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 8,
                color: COLORS.ink,
              }}
            />

            {/* Toggle: Ativo / Encerrado */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['ativo', 'encerrado'] as StatusFiltro[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => mudarStatus(opt)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: statusFiltro === opt ? COLORS.primary : COLORS.surfaceAlt,
                  }}
                >
                  <Text style={{ color: statusFiltro === opt ? '#fff' : COLORS.inkSoft, fontWeight: '600' }}>
                    {opt === 'ativo' ? 'Ativos' : 'Encerrados'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {pendentes > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginHorizontal: 16,
              marginBottom: 8,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: COLORS.surfaceAlt,
              borderRadius: 8,
            }}
          >
            <CloudOff size={16} color={COLORS.accent} />
            <Text style={{ color: COLORS.inkSoft, fontSize: 13 }}>
              {pendentes} {pendentes === 1 ? 'registro pendente' : 'registros pendentes'} de sincronização
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 16 }}>
          {carregandoEncerrados ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : lotesOrdenados.length === 0 ? (
            <EmptyState onNovo={() => navigation.navigate('NovoLote' as never)} />
          ) : (
            lotesOrdenados.map((lote) => {
              const idx = computeIndices(lote);
              const idade = daysBetween(
                lote.dataAlojamento,
                lote.status === 'encerrado' && lote.encerramento
                  ? lote.encerramento.data
                  : todayStr()
              );
              return (
                <LoteCard
                  key={lote.id}
                  numero={lote.numero}
                  linhagem={lote.linhagem}
                  nomesGalpoes={lote.galpoes.map((g) => g.nome).join(', ')}
                  status={lote.status}
                  idadeDias={idade}
                  viabilidade={idx.viabilidade}
                  avesVivas={idx.avesVivas}
                  quantidadeAlojadaTotal={idx.quantidadeAlojadaTotal}
                  numGalpoes={lote.galpoes.length}
                  liberado={lote.liberado}
                  ownerId={lote.ownerId}
                  ownerNome={lote.ownerNome}
                  empresaNome={lote.empresaNome}
                  numeroGranja={(lote as any).nGranja}
                  racaoAcumuladaKg={idx.racaoAcumuladaKg}
                  conversaoAlimentar={idx.conversaoAlimentar}
                  gpd={idx.gpd}
                  onPress={() => navigation.navigate('DetalheLote', { loteId: lote.id })}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {lotes.length > 0 && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 24,
            right: 20,
            backgroundColor: COLORS.primary,
            borderRadius: 30,
            width: 58,
            height: 58,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 4,
          }}
          onPress={() => navigation.navigate('NovoLote' as never)}
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal seleção do Integrado */}
      <Modal visible={modalEmpresaVisivel} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' }}>
            <Text style={{ padding: 16, fontWeight: '700', fontSize: 16, color: COLORS.ink }}>
              Selecione o Integrado
            </Text>
            <FlatList
              data={empresasVinculadas}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <TouchableOpacity
                  onPress={() => {
                    setEmpresaSelecionada(null);
                    setModalEmpresaVisivel(false);
                  }}
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: COLORS.surfaceAlt }}
                >
                  <Text style={{ color: COLORS.inkSoft }}>Todos os Integrados</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setEmpresaSelecionada(item);
                    setModalEmpresaVisivel(false);
                    // se estava tentando ir pra "Encerrados" sem empresa, aplica agora
                    if (statusFiltro !== 'encerrado') setStatusFiltro('ativo');
                  }}
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: COLORS.surfaceAlt }}
                >
                  <Text style={{ color: COLORS.ink }}>{item.nome}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
