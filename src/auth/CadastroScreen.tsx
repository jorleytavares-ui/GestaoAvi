import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Modal, TextInput, FlatList,
} from 'react-native';
import { useAuth } from './AuthContext';
import { COLORS } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { TextField } from '../components/TextField';
import { SimpleSelect } from '../components/SimpleSelect';

type Pais = { id: number; nome: string; sigla: string };
type Estado = { id: number; nome: string; sigla: string };
type EmpresaIntegracao = { id: string; nome: string };

const TIPO_EMPRESA_OPCOES = [
  { value: 'Integracao', label: 'Integração' },
  { value: 'Integrado', label: 'Integrado' },
  { value: 'Independente', label: 'Independente' },
];

const TIPO_PESSOA_OPCOES = [
  { value: 'Fisica', label: 'Pessoa Física' },
  { value: 'Juridica', label: 'Pessoa Jurídica' },
];


function paraMaiuscula(texto: string) {
  return texto.toUpperCase();
}

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

function validarCpf(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[10])) return false;
  return true;
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
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
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

export function CadastroScreen({ navigation }: any) {
  const { signUp } = useAuth();

  // Dados de acesso
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cpfUsuario, setCpfUsuario] = useState('');
  const [senha, setSenha] = useState('');

  // Dados da empresa
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'Fisica' | 'Juridica'>('Juridica');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [emailContato, setEmailContato] = useState('');

  // Localização
  const [paises, setPaises] = useState<Pais[]>([]);
  const [paisId, setPaisId] = useState<string>('');
  const [estados, setEstados] = useState<Estado[]>([]);
  const [estadoId, setEstadoId] = useState<string>('');
  const [cidades, setCidades] = useState<string[]>([]);
  const [cidade, setCidade] = useState('');
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // Tipo de empresa
  const [tipoEmpresa, setTipoEmpresa] = useState('');
  const [empresasIntegracao, setEmpresasIntegracao] = useState<EmpresaIntegracao[]>([]);
  const [codigoIntegracao, setCodigoIntegracao] = useState('');
  const [codigoParceiro, setCodigoParceiro] = useState('');


  const [carregando, setCarregando] = useState(false);

  // --- Carrega países ---
  useEffect(() => {
    async function carregarPaises() {
      const { data, error } = await supabase.from('paises').select('id, nome, sigla').order('nome');
      if (!error && data) {
        setPaises(data);
        const brasil = data.find((p) => p.sigla === 'BR');
        if (brasil) setPaisId(String(brasil.id));
      }
    }
    carregarPaises();
  }, []);

  // --- Carrega estados quando país muda ---
  useEffect(() => {
    if (!paisId) {
      setEstados([]);
      return;
    }
    async function carregarEstados() {
      const { data, error } = await supabase
        .from('estados')
        .select('id, nome, sigla')
        .eq('pais_id', Number(paisId))
        .order('nome');
      if (!error && data) setEstados(data);
      setEstadoId('');
      setCidade('');
      setCidades([]);
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
  }, [estadoId, paisId]);

  // --- Carrega empresas "Integração" quando tipoEmpresa = "Integrado" ---
  useEffect(() => {
    if (tipoEmpresa !== 'Integrado') {
      setCodigoIntegracao('');
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
    if (!nomeUsuario.trim()) return 'Informe o nome do usuário.';
    const cpfUsuarioLimpo = cpfUsuario.replace(/\D/g, '');
    if (!validarCpf(cpfUsuarioLimpo)) return 'CPF do usuário inválido.';
    if (!senha || senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres.';
    if (!emailContato.trim() || !validarEmail(emailContato.trim())) return 'Informe um e-mail válido.';

    if (!nomeEmpresa.trim()) return 'Informe o nome da empresa.';
    const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, '');
    if (tipoPessoa === 'Fisica' && !validarCpf(cpfCnpjLimpo)) return 'CPF da empresa inválido.';
    if (tipoPessoa === 'Juridica' && cpfCnpjLimpo.length !== 14) return 'CNPJ da empresa inválido.';
    if (!responsavel.trim()) return 'Informe o responsável.';
    if (!telefone.trim()) return 'Informe o telefone.';
    if (!paisId) return 'Selecione o país.';
    if (!estadoId) return 'Selecione o estado.';
    if (!cidade.trim()) return 'Informe a cidade.';
    if (!tipoEmpresa) return 'Selecione o tipo de empresa.';
    if (tipoEmpresa === 'Integrado' && !codigoIntegracao) {
      return 'Selecione a empresa de Integração vinculada.';
    }
    if (tipoEmpresa === 'Integrado' && !codigoParceiro.trim()) {
  return 'Informe o código de parceiro.';
}

    return null;
  }

  async function handleCadastro() {
    const erro = validar();
    if (erro) {
      Alert.alert('Atenção', erro);
      return;
    }

    setCarregando(true);
    const resultado = await signUp({
      senha,
      nomeEmpresa: nomeEmpresa.trim(),
      nomeUsuario: nomeUsuario.trim(),
      cpf: cpfUsuario,
      emailContato: emailContato.trim(),
      tipoPessoa,
      cpfCnpj,
      responsavel: responsavel.trim(),
      telefone: telefone.trim(),
      paisId: Number(paisId),
      estadoId: Number(estadoId),
      cidade,
      tipoEmpresa,
      codigoIntegracao: tipoEmpresa === 'Integrado' ? codigoIntegracao : null,
      codigoParceiro: tipoEmpresa === 'Integrado' ? codigoParceiro.trim() : null,
    });
    setCarregando(false);

    if (resultado.error) {
      Alert.alert('Erro ao cadastrar', resultado.error);
    } else {
      Alert.alert('Cadastro concluído', 'Sua empresa foi criada com sucesso!');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 50 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.ink, marginBottom: 20 }}>
          Criar conta
        </Text>

        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 10 }}>
          Dados de acesso
        </Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          <TextField
            label="Seu nome"
            value={nomeUsuario}
            onChangeText={(v) => setNomeUsuario(paraMaiuscula(v))}
            autoCapitalize="characters"
          />
          <TextField
            label="CPF"
            value={cpfUsuario}
            onChangeText={(v) => setCpfUsuario(formatarCpf(v))}
            keyboardType="numeric"
            maxLength={14}
          />
          <TextField
            label="E-mail"
            value={emailContato}
            onChangeText={setEmailContato}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField label="Senha (mín. 6 caracteres)" value={senha} onChangeText={setSenha} secureTextEntry />
        </View>

        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 10 }}>
          Dados da empresa
        </Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          <TextField
            label="Nome da empresa"
            value={nomeEmpresa}
            onChangeText={(v) => setNomeEmpresa(paraMaiuscula(v))}
            autoCapitalize="characters"
          />

          <SimpleSelect
            label="Tipo de pessoa"
            value={tipoPessoa}
            onChange={(v) => setTipoPessoa(v as 'Fisica' | 'Juridica')}
            opcoes={TIPO_PESSOA_OPCOES}
          />

          <TextField
            label={tipoPessoa === 'Fisica' ? 'CPF da empresa' : 'CNPJ da empresa'}
            value={cpfCnpj}
            onChangeText={(v) => setCpfCnpj(tipoPessoa === 'Fisica' ? formatarCpf(v) : formatarCnpj(v))}
            keyboardType="numeric"
            maxLength={tipoPessoa === 'Fisica' ? 14 : 18}
          />

          <TextField
            label="Responsável"
            value={responsavel}
            onChangeText={(v) => setResponsavel(paraMaiuscula(v))}
            autoCapitalize="characters"
          />
          <TextField label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
        </View>

        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 10 }}>
          Localização
        </Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
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
              onChangeText={(v) => setCidade(paraMaiuscula(v))}
              autoCapitalize="characters"
            />
          )}
        </View>

        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 10 }}>
          Tipo de empresa
        </Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          <SimpleSelect
            value={tipoEmpresa}
            onChange={setTipoEmpresa}
            opcoes={TIPO_EMPRESA_OPCOES}
            placeholder="Selecione o tipo"
          />

          {tipoEmpresa === 'Integrado' && (
  <>
    <SimpleSelect
      label="Empresa de Integração vinculada"
      value={codigoIntegracao}
      onChange={setCodigoIntegracao}
      opcoes={empresasIntegracao.map((e) => ({ value: e.id, label: e.nome }))}
      placeholder="Selecione a empresa"
    />
    <TextField
      label="Código de parceiro"
      value={codigoParceiro}
      onChangeText={setCodigoParceiro}
      autoCapitalize="characters"
    />
  </>
)}

        </View>

        <TouchableOpacity
          onPress={handleCadastro}
          disabled={carregando}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            padding: 16,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={{ color: COLORS.primary, textAlign: 'center' }}>
            Já tem conta? Entrar
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
