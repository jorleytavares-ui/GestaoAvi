// src/screens/CadastroUsuarioScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { usePerfil } from '../hooks/usePerfil';
import {
  cadastrarUsuario,
  listarUsuarios,
  atualizarUsuario,
  redefinirSenhaUsuario,
} from '../services/usuarios';
import { PAPEL_ID } from '../constants/papeis';
import { SimpleSelect } from '../components/SimpleSelect';
import { PromptSenhaModal } from '../components/PromptSenhaModal';

const TODAS_OPCOES_PAPEL = [
  { value: String(PAPEL_ID.ADMIN), label: 'Administrador' },
  { value: String(PAPEL_ID.GERENTE), label: 'Gerente avícola' },
  { value: String(PAPEL_ID.VETERINARIO), label: 'Médico Veterinário' },
  { value: String(PAPEL_ID.GRANJEIRO), label: 'Granjeiro' },
  { value: String(PAPEL_ID.GESTOR), label: 'Gestor' },
];

function formatarCpf(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);
  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
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

function validarEmailOpcional(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type Funcionario = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email_contato?: string;
  papel_id: number;
};

export function CadastroUsuarioScreen({ navigation }: any) {
  const { perfil } = usePerfil();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [emailContato, setEmailContato] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [papelId, setPapelId] = useState<string>(String(PAPEL_ID.GRANJEIRO));
  const [carregando, setCarregando] = useState(false);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioSelecionadoId, setFuncionarioSelecionadoId] = useState<string>('');
  const [modoEdicao, setModoEdicao] = useState(false);

  // ✅ Estado do modal de redefinir senha (agora dentro do componente)
  const [modalRedefinirVisivel, setModalRedefinirVisivel] = useState(false);

  const ehAdmin = perfil?.papelId === PAPEL_ID.ADMIN;
  const ehEmpresaIntegracao = perfil?.empresaTipo === 'Integracao';


  const OPCOES_PAPEL = TODAS_OPCOES_PAPEL.filter((op) => {
  if (op.value === String(PAPEL_ID.ADMIN) && !ehAdmin) return false;
  if (op.value === String(PAPEL_ID.GESTOR) && !ehEmpresaIntegracao) return false;
  return true;
});

  useEffect(() => {
    if (!perfil?.empresa_id) return;
    (async () => {
      const { data, error } = await listarUsuarios(perfil.empresa_id);
      if (!error && data) setFuncionarios(data);
    })();
  }, [perfil?.empresa_id]);

  function handleSelecionarFuncionario(id: string) {
    setFuncionarioSelecionadoId(id);

    if (!id) {
      setModoEdicao(false);
      setNome('');
      setCpf('');
      setEmailContato('');
      setTelefone('');
      setPapelId(String(PAPEL_ID.GRANJEIRO));
      setSenha('');
      return;
    }

    const f = funcionarios.find((item) => item.id === id);
    if (!f) return;

    setModoEdicao(true);
    setNome(f.nome);
    setCpf(formatarCpf(f.cpf));
    setEmailContato(f.email_contato ?? '');
    setTelefone(f.telefone);
    setPapelId(String(f.papel_id));
    setSenha('');
  }

  async function handleCadastro() {
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!nome || !cpfLimpo || !telefone) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (!modoEdicao && !senha) {
      Alert.alert('Atenção', 'Preencha a senha.');
      return;
    }
    if (!validarCpf(cpfLimpo)) {
      Alert.alert('Atenção', 'CPF inválido. Verifique e tente novamente.');
      return;
    }
    if (!validarEmailOpcional(emailContato)) {
      Alert.alert('Atenção', 'E-mail inválido.');
      return;
    }
    if (!modoEdicao && senha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!perfil?.empresa_id) {
      Alert.alert('Erro', 'Empresa não identificada.');
      return;
    }

    setCarregando(true);

    if (modoEdicao) {
      const { error } = await atualizarUsuario({
        id: funcionarioSelecionadoId,
        nome: nome.trim(),
        telefone: telefone.trim(),
        emailContato: emailContato.trim() || undefined,
        papel_id: Number(papelId),
      });
      setCarregando(false);

      if (error) {
        Alert.alert('Erro ao atualizar', error);
      } else {
        Alert.alert('Sucesso', 'Usuário atualizado com sucesso.');
        navigation.goBack();
      }
      return;
    }

    const { error } = await cadastrarUsuario({
      nome: nome.trim(),
      cpf: cpfLimpo,
      emailContato: emailContato.trim() || undefined,
      senha,
      telefone: telefone.trim(),
      empresa_id: perfil.empresa_id,
      papel_id: Number(papelId),
    });
    setCarregando(false);

    if (error) {
      Alert.alert('Erro ao cadastrar', error);
    } else {
      Alert.alert(
        'Sucesso',
        'Usuário cadastrado com sucesso. Ele deverá redefinir a senha no primeiro acesso.'
      );
      navigation.goBack();
    }
  }

  // ✅ Abre o modal customizado (funciona em iOS e Android)
  function handleRedefinirSenha() {
    if (!funcionarioSelecionadoId) return;
    setModalRedefinirVisivel(true);
  }

  // ✅ Confirmação do modal
  async function confirmarRedefinicaoSenha(novaSenha: string) {
    setCarregando(true);
    const { error } = await redefinirSenhaUsuario({
      userId: funcionarioSelecionadoId,
      novaSenhaTemporaria: novaSenha,
    });
    setCarregando(false);
    setModalRedefinirVisivel(false);

    if (error) {
      Alert.alert('Erro', error);
    } else {
      Alert.alert(
        'Sucesso',
        'Senha redefinida. O usuário será solicitado a criar uma nova senha no próximo login.'
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.ink, marginBottom: 20 }}>
          {modoEdicao ? 'Editar usuário' : 'Cadastrar usuário'}
        </Text>

        {funcionarios.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 8 }}>
              Editar usuário existente (opcional)
            </Text>
            <SimpleSelect
              value={funcionarioSelecionadoId}
              onChange={handleSelecionarFuncionario}
              opcoes={[
                { value: '', label: 'Novo cadastro' },
                ...funcionarios.map((f) => ({ value: f.id, label: f.nome })),
              ]}
              placeholder="Selecione um usuário ou cadastre um novo"
            />
          </View>
        )}

        <TextInput
          placeholder="Nome"
          value={nome}
          onChangeText={setNome}
          style={inputStyle}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="CPF"
          value={cpf}
          onChangeText={(v) => setCpf(formatarCpf(v))}
          keyboardType="numeric"
          maxLength={14}
          editable={!modoEdicao}
          style={[inputStyle, modoEdicao && { backgroundColor: '#f0f0f0' }]}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          keyboardType="phone-pad"
          style={inputStyle}
          placeholderTextColor={COLORS.inkSoft}
        />

        <TextInput
          placeholder="E-mail (opcional, para contato)"
          value={emailContato}
          onChangeText={setEmailContato}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
          placeholderTextColor={COLORS.inkSoft}
        />

        {!modoEdicao && (
          <TextInput
            placeholder="Senha (mín. 6 caracteres)"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            style={[inputStyle, { marginBottom: 16 }]}
            placeholderTextColor={COLORS.inkSoft}
          />
        )}

        {/* ✅ Botão de redefinir senha, só aparece na edição */}
        {modoEdicao && (
          <TouchableOpacity
            onPress={handleRedefinirSenha}
            style={{
              borderWidth: 1,
              borderColor: COLORS.primary,
              borderRadius: 10,
              padding: 12,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Redefinir senha</Text>
          </TouchableOpacity>
        )}

        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 8 }}>Função</Text>
        <SimpleSelect
          value={papelId}
          onChange={setPapelId}
          opcoes={OPCOES_PAPEL}
          placeholder="Selecione o papel"
        />

        <TouchableOpacity
          onPress={handleCadastro}
          disabled={carregando}
          style={{ backgroundColor: COLORS.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 }}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {modoEdicao ? 'Salvar alterações' : 'Cadastrar'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ✅ Modal customizado de redefinição de senha (iOS + Android) */}
      <PromptSenhaModal
        visible={modalRedefinirVisivel}
        titulo="Redefinir senha"
        descricao="Digite a nova senha temporária. O usuário deverá criar uma nova senha no próximo login."
        onCancelar={() => setModalRedefinirVisivel(false)}
        onConfirmar={confirmarRedefinicaoSenha}
        carregando={carregando}
      />
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: COLORS.line,
  borderRadius: 10,
  padding: 14,
  marginBottom: 12,
  color: COLORS.ink,
};
