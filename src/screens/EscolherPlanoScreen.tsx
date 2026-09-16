import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listarPlanosAtivos } from '../services/planos';
import { useNavigation } from '@react-navigation/native';
import { useLicenca } from '../hooks/useLicenca';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  duracao_dias: number;
  usa_periodo: boolean;
  usa_limite_lotes: boolean;
  limite_lotes: number;
  usa_limite_frangos: boolean;
  limite_frangos: number;
  eh_trial: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; cor: string; icone: keyof typeof Ionicons.glyphMap }
> = {
  trial: { label: 'PERÍODO DE TESTE', cor: '#FF9800', icone: 'time-outline' },
  ativa: { label: 'ATIVA', cor: '#4CAF50', icone: 'checkmark-circle-outline' },
  expirada: { label: 'EXPIRADA', cor: '#E53935', icone: 'alert-circle-outline' },
  pendente: { label: 'PENDENTE', cor: '#FF9800', icone: 'hourglass-outline' },
};

export function EscolherPlanoScreen() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { licenca, carregando: carregandoLicenca } = useLicenca();

  useEffect(() => {
    carregarPlanos();
  }, []);

  async function carregarPlanos() {
    try {
      setCarregando(true);
      const dados = await listarPlanosAtivos();
      const planosSemTrial = dados.filter((p: Plano) => !p.eh_trial);
      setPlanos(planosSemTrial);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os planos.');
    } finally {
      setCarregando(false);
    }
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function formatarData(data: string | null) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }

  function confirmarPlano(plano: Plano) {
    setPlanoSelecionado(plano.id);
    navigation.navigate('Checkout', { plano });
  }

  function sair() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }

  function renderLicencaAtual() {
    if (carregandoLicenca) {
      return (
        <View style={styles.cardAtual}>
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      );
    }

    if (!licenca) return null;

    const config = STATUS_CONFIG[licenca.status] ?? {
      label: licenca.status?.toUpperCase() ?? '—',
      cor: '#999',
      icone: 'help-circle-outline',
    };

    const validade = licenca.usa_periodo
      ? licenca.data_final ?? licenca.expira_em
      : licenca.expira_em;

    return (
      <View style={styles.cardAtual}>
        <Text style={styles.cardAtualTitulo}>Sua licença atual</Text>

        <View style={styles.linhaTopo}>
          <Text style={styles.cardAtualNome}>
            {licenca.plano_nome ?? 'Período de teste'}
          </Text>
          <View style={[styles.badgeStatus, { backgroundColor: config.cor }]}>
            <Ionicons name={config.icone} size={12} color="#fff" />
            <Text style={styles.badgeStatusTexto}>{config.label}</Text>
          </View>
        </View>

        {licenca.plano_descricao && (
          <Text style={styles.cardAtualDescricao}>{licenca.plano_descricao}</Text>
        )}

        {licenca.status === 'trial' ? (
          <Text style={styles.cardAtualValidade}>
            Início do teste: {formatarData(licenca.trial_inicio)} • {licenca.trial_dias} dias
          </Text>
        ) : (
          validade && (
            <Text style={styles.cardAtualValidade}>
              Válido até {formatarData(validade)}
            </Text>
          )
        )}

        {licenca.usa_limite_lotes && licenca.limite_lotes != null && (
          <Text style={styles.cardAtualUso}>
            Lotes: {licenca.lotes_gerados}/{licenca.limite_lotes}
          </Text>
        )}
        {licenca.usa_limite_frangos && licenca.limite_frangos != null && (
          <Text style={styles.cardAtualUso}>
            Frangos: {licenca.frangos_utilizados ?? 0}/{licenca.limite_frangos}
          </Text>
        )}

        {(licenca.pagamento_status === 'OVERDUE' ||
          licenca.pagamento_status === 'PAYMENT_OVERDUE') && (
          <Text style={styles.avisoAtraso}>⚠️ Pagamento em atraso</Text>
        )}
      </View>
    );
  }

  function renderPlano({ item }: { item: Plano }) {
    const selecionado = planoSelecionado === item.id;

    return (
      <View style={[styles.card, selecionado && styles.cardSelecionado]}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.descricao}>{item.descricao}</Text>

        <Text style={styles.valor}>
          {formatarValor(item.valor)}
          {item.usa_periodo && (
            <Text style={styles.periodo}> /{item.duracao_dias} dias</Text>
          )}
        </Text>

        <View style={styles.beneficios}>
          {item.usa_periodo && (
            <View style={styles.beneficioItem}>
              <Ionicons name="time-outline" size={18} color="#4CAF50" />
              <Text style={styles.beneficioTexto}>
                Duração: {item.duracao_dias} dias
              </Text>
            </View>
          )}
          {item.usa_limite_lotes && (
            <View style={styles.beneficioItem}>
              <Ionicons name="layers-outline" size={18} color="#4CAF50" />
              <Text style={styles.beneficioTexto}>
                Até {item.limite_lotes} lotes
              </Text>
            </View>
          )}
          {item.usa_limite_frangos && (
            <View style={styles.beneficioItem}>
              <Ionicons name="paw-outline" size={18} color="#4CAF50" />
              <Text style={styles.beneficioTexto}>
                Até {item.limite_frangos} frangos
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.botaoAssinar}
          onPress={() => confirmarPlano(item)}
        >
          <Text style={styles.botaoAssinarTexto}>Assinar plano</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.botaoSair} onPress={sair}>
        <Ionicons name="close-outline" size={22} color="#333" />
        <Text style={styles.botaoSairTexto}>Sair</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Escolha o seu plano</Text>
      <Text style={styles.subtitulo}>
        Selecione o plano ideal para o seu negócio
      </Text>

      <FlatList
        data={planos}
        keyExtractor={(item) => item.id}
        renderItem={renderPlano}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderLicencaAtual()}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhum plano disponível.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 4,
  },
  botaoSairTexto: { fontSize: 14, color: '#333', fontWeight: '600' },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  subtitulo: {
    fontSize: 14,
    textAlign: 'center',
    color: '#777',
    marginBottom: 16,
  },
  lista: { paddingHorizontal: 16, paddingBottom: 32 },

  cardAtual: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardAtualTitulo: { fontSize: 12, color: '#999', marginBottom: 6, textTransform: 'uppercase' },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAtualNome: { fontSize: 17, fontWeight: 'bold', color: '#222', flexShrink: 1 },
  cardAtualDescricao: { fontSize: 13, color: '#777', marginTop: 4 },
  cardAtualValidade: { fontSize: 13, color: '#555', marginTop: 8 },
  cardAtualUso: { fontSize: 13, color: '#555', marginTop: 2 },
  avisoAtraso: { fontSize: 13, color: '#E53935', fontWeight: 'bold', marginTop: 8 },
  badgeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeStatusTexto: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardSelecionado: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  descricao: { fontSize: 13, color: '#777', marginTop: 4, marginBottom: 12 },
  valor: { fontSize: 26, fontWeight: 'bold', color: '#4CAF50' },
  periodo: { fontSize: 13, fontWeight: 'normal', color: '#999' },
  beneficios: { marginTop: 14, marginBottom: 16 },
  beneficioItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  beneficioTexto: { marginLeft: 8, fontSize: 14, color: '#444' },
  botaoAssinar: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoAssinarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  vazio: { textAlign: 'center', color: '#999', marginTop: 40 },
});
