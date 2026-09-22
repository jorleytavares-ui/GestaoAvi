import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const CONTATO_WHATSAPP = '5562992938118';
const CONTATO_MENSAGEM_PADRAO = (nomePlano: string) =>
  `Olá! Gostaria de solicitar um orçamento para o plano "${nomePlano}".`;

// ✅ Função segura para web e mobile
function mostrarAlerta(titulo: string, mensagem: string) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  valor: number | null;
  eh_trial: boolean;
  usa_periodo: boolean;
  duracao_dias?: number;
  usa_limite_lotes: boolean;
  limite_lotes?: number;
  usa_limite_frangos: boolean;
  limite_frangos?: number;
}

export function EscolherPlanoScreen() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null);

  useEffect(() => {
    carregarPlanos();
  }, []);

  async function carregarPlanos() {
    try {
      setCarregando(true);
      setErro(null);
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('valor', { ascending: true });

      if (error) throw error;
      setPlanos(data ?? []);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
      setErro('Não foi possível carregar os planos.');
    } finally {
      setCarregando(false);
    }
  }

  function formatarValor(valor: number | null) {
    if (valor === null || valor === undefined) return '';
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function confirmarPlano(plano: Plano) {
    setPlanoSelecionado(plano.id);
    mostrarAlerta('Plano selecionado', `Você escolheu o plano "${plano.nome}".`);
  }

  function solicitarOrcamento(plano: Plano) {
    const mensagem = CONTATO_MENSAGEM_PADRAO(plano.nome);
    const url = `https://wa.me/${CONTATO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;

    Linking.openURL(url).catch(() => {
      mostrarAlerta('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  }

  function renderPlano({ item }: { item: Plano }) {
    const selecionado = planoSelecionado === item.id;
    const semValorDefinido =
      !item.eh_trial && (item.valor === null || item.valor === undefined || item.valor === 0);

    return (
      <View style={[styles.card, selecionado && styles.cardSelecionado]}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.descricao}>{item.descricao}</Text>

        {semValorDefinido ? (
          <Text style={styles.valor}>Sob Consulta</Text>
        ) : (
          <Text style={styles.valor}>
            {formatarValor(item.valor)}
            {item.usa_periodo && <Text style={styles.periodo}> /{item.duracao_dias} dias</Text>}
          </Text>
        )}

        <View style={styles.beneficios}>
          {item.usa_periodo && (
            <View style={styles.beneficioItem}>
              <Ionicons name="time-outline" size={18} color="#4CAF50" />
              <Text style={styles.beneficioTexto}>Duração: {item.duracao_dias} dias</Text>
            </View>
          )}
          {item.usa_limite_lotes && (
            <View style={styles.beneficioItem}>
              <Ionicons name="layers-outline" size={18} color="#4CAF50" />
              <Text style={styles.beneficioTexto}>Até {item.limite_lotes} lotes</Text>
            </View>
          )}
          {item.usa_limite_frangos && (
            <View style={styles.beneficioItem}>
              <Ionicons name="paw-outline" size={18} color="#4CAF50" />
              <Text style={styles.beneficioTexto}>Até {item.limite_frangos} frangos</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.botaoAssinar, semValorDefinido && styles.botaoOrcamento]}
          onPress={() => (semValorDefinido ? solicitarOrcamento(item) : confirmarPlano(item))}
        >
          <Text style={styles.botaoAssinarTexto}>
            {semValorDefinido ? 'Solicitar orçamento' : 'Assinar plano'}
          </Text>
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

  if (erro) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'red', marginBottom: 12 }}>{erro}</Text>
        <TouchableOpacity style={styles.botaoAssinar} onPress={carregarPlanos}>
          <Text style={styles.botaoAssinarTexto}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Escolha seu plano</Text>
      <FlatList
        data={planos}
        keyExtractor={(item) => item.id}
        renderItem={renderPlano}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  titulo: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#222' },
  lista: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardSelecionado: { borderWidth: 2, borderColor: '#4CAF50' },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  descricao: { fontSize: 14, color: '#666', marginBottom: 12 },
  valor: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', marginBottom: 12 },
  periodo: { fontSize: 14, fontWeight: 'normal', color: '#666' },
  beneficios: { marginBottom: 16 },
  beneficioItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  beneficioTexto: { marginLeft: 8, fontSize: 14, color: '#444' },
  botaoAssinar: { backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botaoOrcamento: { backgroundColor: '#2196F3' },
  botaoAssinarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
