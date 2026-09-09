// src/screens/EditarEmpresaScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, Modal, TextInput, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { usePerfil } from '../hooks/usePerfil';
import { COLORS } from '../theme/colors';
import { TextField } from '../components/TextField';
import { SimpleSelect } from '../components/SimpleSelect';
import { AppHeader } from '../components/AppHeader';

type Pais = { id: number; nome: string; sigla: string };
type Estado = { id: number; nome: string; sigla: string };
type EmpresaIntegracao = { id: string; nome: string };

const TIPO_PESSOA_OPCOES = [
  { value: 'Fisica', label: 'Pessoa Física' },
  { value: 'Juridica', label: 'Pessoa Jurídica' },
];

const TIPO_EMPRESA_OPCOES = [
  { value: 'Integracao', label: 'Integração' },
  { value: 'Integrado', label: 'Integrado' },
  { value: 'Independente', label: 'Independente' },
];

function formatarCpf(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);
  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarCnpj(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 14);
  return numeros
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// --- Seletor nativo de cidade com busca (ignora acentos) ---
function SeletorCidade({
  label,
  value,
  onChange,
  opcoes,
  placeholder,
  carregando,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  opcoes: string[];
  placeholder?: string;
  carregando?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const opcoesFiltradas = opcoes.filter((c) =>
    normalizar(c).includes(normalizar(busca))
  );

  function selecionar(cidade: string) {
    onChange(cidade);
    setBusca('');
    setAberto(false);
  }

  return (
    <View>
      {label ? (
        <Text style={{ fontSize: 13, color: COLORS.ink, marginBottom: 4, fontWeight: '600' }}>
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => setAberto(true)}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 14,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ color: value ? COLORS.ink : '#999' }}>
          {value || placeholder || 'Selecione'}
        </Text>
      </TouchableOpacity>

      <Modal visible={aberto} animationType="slide" transparent onRequestClose={() => setAberto(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '80%',
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 10 }}>
              Selecionar cidade
            </Text>

            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Digite para buscar..."
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
              }}
            />

            {carregando ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={opcoesFiltradas}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => selecionar(item)}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                  >
                    <Text style={{ color: COLORS.ink }}>{item}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>
                    Nenhuma cidade encontrada.
                  </Text>
                }
              />
            )}

            <TouchableOpacity
              onPress={() => setAberto(false)}
              style={{ marginTop: 12, alignItems: 'center', padding: 10 }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function EditarEmpresaScreen() {
  const navigation = useNavigation<any>();
  const { perfil } = usePerfil();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'Fisica' | 'Juridica'>('Juridica');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const [paises, setPaises] = useState<Pais[]>([]);
  const [paisId, setPaisId] = useState('');
  const [estados, setEstados] = useState<Estado[]>([]);
  const [estadoId, setEstadoId] = useState('');
  const [cidades, setCidades] = useState<string[]>([]);
  const [cidade, setCidade] = useState('');
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // Tipo de empresa
  const [tipoEmpresa, setTipoEmpresa] = useState('');
  const [empresasIntegracao, setEmpresasIntegracao] = useState<EmpresaIntegracao[]>([]);
  const [codigoIntegracao, setCodigoIntegracao] = useState('');

  useEffect(() => {
    async function carregar() {
      if (!perfil?.empresa_id) return;

      const { data: empresa, error } = await supabase
        .from('empresas')
        .select(
          'nome, tipopessoa, cpf_cnpj, responsavel, telefone, email, pais_id, estado_id, cidade, tipo, codigo_integracao'
        )
        .eq('id', perfil.empresa_id)
        .maybeSingle();

      if (error || !empresa) {
        Alert.alert('Erro', 'Não foi possível carregar os dados da empresa.');
        navigation.goBack();
        return;
      }

      setNome(empresa.nome ?? '');
      setTipoPessoa((empresa.tipopessoa as 'Fisica' | 'Juridica') ?? 'Juridica');
      setCpfCnpj(empresa.cpf_cnpj ?? '');
      setResponsavel(empresa.responsavel ?? '');
      setTelefone(empresa.telefone ?? '');
      setEmail(empresa.email ?? '');
      setPaisId(empresa.pais_id ? String(empresa.pais_id) : '');
      setEstadoId(empresa.estado_id ? String(empresa.estado_id) : '');
      setCidade(empresa.cidade ?? '');
      setTipoEmpresa(empresa.tipo ?? '');
      setCodigoIntegracao(empresa.codigo_integracao ?? '');

      const { data: paisesData } = await supabase.from('paises').select('id, nome, sigla').order('nome');
      if (paisesData) setPaises(paisesData);

      if (empresa.pais_id) {
        const { data: estadosData } = await supabase
          .from('estados')
          .select('id, nome, sigla')
          .eq('pais_id', empresa.pais_id)
          .order('nome');
        if (estadosData) setEstados(estadosData);
      }

      setCarregando(false);
    }
    carregar();
  }, [perfil?.empresa_id]);

  useEffect(() => {
    if (!paisId) return;
    async function carregarEstados() {
      const { data } = await supabase
        .from('estados')
        .select('id, nome, sigla')
        .eq('pais_id', Number(paisId))
        .order('nome');
      if (data) setEstados(data);
    }
    carregarEstados();
  }, [paisId]);

  const paisSelecionado = paises.find((p) => String(p.id) === paisId);
  const estadoSelecionado = estados.find((e) => String(e.id) === estadoId);
  const ehBrasil = paisSelecionado?.sigla === 'BR';

  // --- Carrega cidades via IBGE (apenas Brasil) ---
  useEffect(() => {
  if (!estadoSelecionado || !ehBrasil) {
    setCidades([]);
    return;
  }

  const sigla = estadoSelecionado.sigla;

  async function carregarCidadesIBGE() {
    setCarregandoCidades(true);
    try {
      const resp = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios`
      );
      const json = await resp.json();
      setCidades(json.map((m: any) => m.nome.toUpperCase()));
    } catch {
      setCidades([]);
    } finally {
      setCarregandoCidades(false);
    }
  }
  carregarCidadesIBGE();
}, [estadoSelecionado, ehBrasil]);

  // --- Carrega empresas "Integração" quando tipoEmpresa = "Integrado" ---
  useEffect(() => {
    if (tipoEmpresa !== 'Integrado') {
      setEmpresasIntegracao([]);
      return;
    }
    async function carregarIntegracoes() {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('tipo', 'Integracao')
        .order('nome');
      if (!error && data) setEmpresasIntegracao(data);
    }
    carregarIntegracoes();
  }, [tipoEmpresa]);

  function validar(): string | null {
    if (!nome.trim()) return 'Informe o nome da empresa.';
    const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');
    if (tipoPessoa === 'Fisica' && cpfCnpjLimpo.length !== 11) return 'CPF inválido.';
    if (tipoPessoa === 'Juridica' && cpfCnpjLimpo.length !== 14) return 'CNPJ inválido.';
    if (!responsavel.trim()) return 'Informe o responsável.';
    if (!telefone.trim()) return 'Informe o telefone.';
    if (email.trim() && !validarEmail(email.trim())) return 'E-mail inválido.';
    if (!paisId) return 'Selecione o país.';
    if (!estadoId) return 'Selecione o estado.';
    if (!cidade.trim()) return 'Informe a cidade.';
    if (!tipoEmpresa) return 'Selecione o tipo de empresa.';
    if (tipoEmpresa === 'Integrado' && !codigoIntegracao) {
      return 'Selecione a empresa de Integração vinculada.';
    }
    return null;
  }

  async function salvar() {
    const erro = validar();
    if (erro) {
      Alert.alert('Atenção', erro);
      return;
    }
    if (!perfil?.empresa_id) return;

    setSalvando(true);
    const { error } = await supabase
      .from('empresas')
      .update({
        nome: nome.trim(),
        tipopessoa: tipoPessoa,
        cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
        responsavel: responsavel.trim(),
        telefone: telefone.trim(),
        email: email.trim() || null,
        pais_id: Number(paisId),
        estado_id: Number(estadoId),
        cidade: cidade.trim(),
        tipo: tipoEmpresa,
        codigo_integracao: tipoEmpresa === 'Integrado' ? codigoIntegracao : null,
      })
      .eq('id', perfil.empresa_id);
    setSalvando(false);

    if (error) {
      Alert.alert('Erro ao salvar', error.message);
      return;
    }
    Alert.alert('Sucesso', 'Dados da empresa atualizados.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AppHeader onVoltar={() => navigation.goBack()} titulo="Editar Empresa" />
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}>
          <TextField label="Nome da empresa" value={nome} onChangeText={setNome} autoCapitalize="characters" />

          <SimpleSelect
            label="Tipo de pessoa"
            value={tipoPessoa}
            onChange={(v) => setTipoPessoa(v as 'Fisica' | 'Juridica')}
            opcoes={TIPO_PESSOA_OPCOES}
          />

          <TextField
            label={tipoPessoa === 'Fisica' ? 'CPF' : 'CNPJ'}
            value={cpfCnpj}
            onChangeText={(v) => setCpfCnpj(tipoPessoa === 'Fisica' ? formatarCpf(v) : formatarCnpj(v))}
            keyboardType="numeric"
            maxLength={tipoPessoa === 'Fisica' ? 14 : 18}
          />

          <TextField label="Responsável" value={responsavel} onChangeText={setResponsavel} autoCapitalize="characters" />
          <TextField label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
          <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <SimpleSelect
            label="País"
            value={paisId}
            onChange={setPaisId}
            opcoes={paises.map((p) => ({ value: String(p.id), label: p.nome }))}
            placeholder="Selecione o país"
          />
          <SimpleSelect
            label="Estado"
            value={estadoId}
            onChange={setEstadoId}
            opcoes={estados.map((e) => ({ value: String(e.id), label: e.nome }))}
            placeholder="Selecione o estado"
          />

          {ehBrasil ? (
            <SeletorCidade
              label="Cidade"
              value={cidade}
              onChange={setCidade}
              opcoes={cidades}
              placeholder={carregandoCidades ? 'Carregando...' : 'Selecione a cidade'}
              carregando={carregandoCidades}
            />
          ) : (
            <TextField
              label="Cidade"
              value={cidade}
              onChangeText={setCidade}
              autoCapitalize="characters"
            />
          )}

          <SimpleSelect
            label="Tipo de empresa"
            value={tipoEmpresa}
            onChange={setTipoEmpresa}
            opcoes={TIPO_EMPRESA_OPCOES}
            placeholder="Selecione o tipo"
          />

          {tipoEmpresa === 'Integrado' && (
            <SimpleSelect
              label="Empresa de Integração vinculada"
              value={codigoIntegracao}
              onChange={setCodigoIntegracao}
              opcoes={empresasIntegracao.map((e) => ({ value: e.id, label: e.nome }))}
              placeholder="Selecione a empresa"
            />
          )}
        </View>

        <TouchableOpacity
          onPress={salvar}
          disabled={salvando}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            padding: 16,
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          {salvando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
