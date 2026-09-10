// AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import {
  salvarCredencialLocal,
  validarCredencialLocal,
  getCredencialSalva,
  buscarEmailLocalPorCpf,
} from './authVault';
import { salvarPerfilCache, getPerfilCache } from '../storage/perfilCache';
import { sincronizarRelogioServidor } from '../services/serverTime';
import { baixarLotesDoServidor, baixarFaixaConforto } from '../storage/sync';
import { PAPEL_ID } from '../constants/papeis';
import * as Crypto from 'expo-crypto';

type OpcaoEmpresa = { email: string; empresaId: string; empresaNome: string };

type AuthContextData = {
  session: Session | null;
  user: User | null;
  userId: string | null;
  offline: boolean;
  carregandoSessao: boolean;
  precisaRedefinirSenha: boolean;
  empresaId: string | null;
  empresaTipo: string | null;
  signIn: (email: string, senha: string) => Promise<{ error?: string }>;
  signInComCpf: (
    cpf: string,
    senha: string
  ) => Promise<{ error?: string; opcoes?: OpcaoEmpresa[] }>;
  signUp: (params: {
  senha: string;
  nomeEmpresa: string;
  nomeUsuario: string;
  cpf: string;
  emailContato?: string;
  tipoPessoa: 'Fisica' | 'Juridica';
  cpfCnpj: string;
  responsavel: string;
  telefone: string;
  paisId: number;
  estadoId: number;
  cidade: string;
  tipoEmpresa: string;
  codigoIntegracao: string | null;
  codigoParceiro: string | null; 
}) => Promise<{ error?: string }>;

  signOut: () => Promise<void>;
  atualizarSenhaPropria: (novaSenha: string) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [offline, setOffline] = useState(false);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [precisaRedefinirSenha, setPrecisaRedefinirSenha] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaTipo, setEmpresaTipo] = useState<string | null>(null);

  async function verificarNecessidadeRedefinicao(userId: string, tempClient?: any) {
    const client = tempClient ?? supabase;
    const { data } = await client
      .from('perfis')
      .select('precisa_redefinir_senha')
      .eq('id', userId)
      .maybeSingle();

    setPrecisaRedefinirSenha(!!data?.precisa_redefinir_senha);
  }

  useEffect(() => {
    async function verificarSessao() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        const net = await NetInfo.fetch();

        if (net.isConnected) {
          const { data: userData, error } = await supabase.auth.getUser();
          if (error || !userData.user) {
            await supabase.auth.signOut();
            setSession(null);
          } else {
            setSession(sessionData.session);
            setOffline(false);
            const perfilCache = await getPerfilCache(userData.user.id);
            setPrecisaRedefinirSenha(!!perfilCache?.precisaRedefinirSenha);
            setEmpresaId(perfilCache?.empresaId ?? null);
            setEmpresaTipo(perfilCache?.empresaTipo ?? null);
            await verificarNecessidadeRedefinicao(userData.user.id);
          }
        } else {
          setSession(sessionData.session);
          setOffline(true);
          const perfilCache = await getPerfilCache(sessionData.session.user.id);
          setPrecisaRedefinirSenha(!!perfilCache?.precisaRedefinirSenha);
          setEmpresaId(perfilCache?.empresaId ?? null);
          setEmpresaTipo(perfilCache?.empresaTipo ?? null);
        }
      } else {
        setSession(null);
      }
      setCarregandoSessao(false);
    }

    verificarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function criarEmpresaPerfilELicenca(
    tempClient: any,
    userId: string,
    nomeUsuario: string,
    nomeEmpresa: string
  ) {
    const { data: empresaData, error: empresaError } = await tempClient
      .from('empresas')
      .insert({ nome: nomeEmpresa, owner_id: userId })
      .select()
      .single();

    if (empresaError || !empresaData) {
      return { error: empresaError?.message ?? 'Erro ao criar empresa.' };
    }

    const { error: perfilError } = await tempClient.from('perfis').insert({
      id: userId,
      nome: nomeUsuario,
      empresa_id: empresaData.id,
      papel_id: PAPEL_ID.ADMIN,
    });

    if (perfilError) {
      return { error: perfilError.message };
    }

    const { error: licencaError } = await tempClient.from('licencas').insert({
      empresa_id: empresaData.id,
      status: 'trial',
      limite_lotes: 3,
      lotes_gerados: 0,
      trial_inicio: new Date().toISOString().slice(0, 10),
      trial_dias: 14,
    });

    if (licencaError) {
      return { error: licencaError.message };
    }

    return { empresaId: empresaData.id, empresaTipo: (empresaData as any)?.tipo ?? null };
  }

  async function buscarEmailPorCpf(
    cpf: string
  ): Promise<{ email?: string; opcoes?: OpcaoEmpresa[]; error?: string }> {
    const cpfLimpo = cpf.replace(/\D/g, '');

    const { data, error } = await supabase.functions.invoke('buscar-email-por-cpf', {
      body: { cpf: cpfLimpo },
    });

    if (error) return { error: 'Erro ao buscar CPF. Verifique sua conexão.' };
    if (data?.error) return { error: data.error };

    if (data?.opcoes) return { opcoes: data.opcoes };
    return { email: data.email };
  }

  async function signInOnline(email: string, senha: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) return { error: error.message };
    if (!data.user || !data.session) {
      return { error: 'Não foi possível autenticar o usuário.' };
    }

    const userId = data.user.id;
    const token = data.session.access_token;

    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: perfilExistente, error: perfilCheckError } = await tempClient
      .from('perfis')
      .select('id, nome, empresa_id, papel_id, cpf, precisa_redefinir_senha')
      .eq('id', userId)
      .maybeSingle();

    if (perfilCheckError) return { error: perfilCheckError.message };

    let empresaIdLocal: string | null = perfilExistente?.empresa_id ?? null;
    let nome = perfilExistente?.nome ?? email.split('@')[0];
    let papelId = perfilExistente?.papel_id ?? PAPEL_ID.ADMIN;
    const cpf: string | undefined = (perfilExistente as any)?.cpf ?? undefined;
    let empresaTipoLocal: string | null = null;

    if (perfilExistente) {
      setPrecisaRedefinirSenha(!!(perfilExistente as any)?.precisa_redefinir_senha);
    }

    if (!perfilExistente) {
      const metadata = data.user.user_metadata ?? {};
      const nomeUsuario = metadata.nome_usuario ?? email.split('@')[0];
      const nomeEmpresa = metadata.nome_empresa ?? `Empresa de ${email.split('@')[0]}`;

      const resultado = await criarEmpresaPerfilELicenca(
        tempClient,
        userId,
        nomeUsuario,
        nomeEmpresa
      );

      if (resultado.error) return { error: resultado.error };
      empresaIdLocal = resultado.empresaId ?? null;
      empresaTipoLocal = resultado.empresaTipo ?? null;
      nome = nomeUsuario;
      papelId = PAPEL_ID.ADMIN;
      setPrecisaRedefinirSenha(false);
    }

    let ownerId = userId;
    if (empresaIdLocal) {
      // ✅ Busca owner_id e tipo da empresa numa única query
      const { data: empresa } = await tempClient
        .from('empresas')
        .select('owner_id, tipo')
        .eq('id', empresaIdLocal)
        .maybeSingle();
      ownerId = (empresa as any)?.owner_id ?? userId;
      empresaTipoLocal = (empresa as any)?.tipo ?? empresaTipoLocal;
    }

    await sincronizarRelogioServidor();

    await salvarCredencialLocal({
      userId,
      email,
      cpf,
      senha,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      empresaId: empresaIdLocal,
      ownerId,
    });

    await salvarPerfilCache({
      id: userId,
      nome,
      empresaId: empresaIdLocal ?? '',
      papelId,
      ownerId,
      empresaTipo: empresaTipoLocal ?? undefined,
      precisaRedefinirSenha,
    });

    setSession(data.session);
    setOffline(false);
    setEmpresaId(empresaIdLocal);
    setEmpresaTipo(empresaTipoLocal);

    try {
  await baixarLotesDoServidor(empresaIdLocal ?? '');
  await baixarFaixaConforto(empresaIdLocal ?? '');
} catch (e) {
  console.log('Pull inicial de lotes falhou (será tentado novamente pelo auto-sync):', e);
}


    return {};
  }

  async function signInOffline(email: string, senha: string) {
    const credencial = await validarCredencialLocal(email, senha);

    if (!credencial) {
      return {
        error:
          'Não foi possível validar suas credenciais offline. Conecte-se à internet ao menos uma vez neste aparelho para habilitar o acesso sem conexão.',
      };
    }

    const { error } = await supabase.auth.setSession({
      access_token: credencial.accessToken,
      refresh_token: credencial.refreshToken,
    });

    if (error) {
      // segue liberando acesso offline mesmo assim
    }

    // 👇 aplica o flag cacheado
    const perfilCache = await getPerfilCache(credencial.userId);
    setPrecisaRedefinirSenha(!!perfilCache?.precisaRedefinirSenha);
    setEmpresaId(perfilCache?.empresaId ?? credencial.empresaId ?? null);
    setEmpresaTipo(perfilCache?.empresaTipo ?? null);

    setOffline(true);
    setCarregandoSessao(false);

    return {};
  }

  async function signIn(email: string, senha: string) {
    const net = await NetInfo.fetch();

    if (net.isConnected) {
      return signInOnline(email, senha);
    }

    return signInOffline(email, senha);
  }

  async function signInComCpf(cpf: string, senha: string) {
    const net = await NetInfo.fetch();
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (net.isConnected) {
      const resultado = await buscarEmailPorCpf(cpfLimpo);

      if (resultado.error) return { error: resultado.error };

      if (resultado.opcoes) {
        return { opcoes: resultado.opcoes };
      }

      return signIn(resultado.email!, senha);
    }

    const emailsSalvos = await buscarEmailLocalPorCpf(cpfLimpo);

    if (emailsSalvos.length === 0) {
      return {
        error:
          'CPF não encontrado neste aparelho. Conecte-se à internet ao menos uma vez para habilitar o acesso offline.',
      };
    }

    if (emailsSalvos.length === 1) {
      return signIn(emailsSalvos[0], senha);
    }

    return {
      opcoes: emailsSalvos.map((email) => ({ email, empresaId: '', empresaNome: email })),
    };
  }

async function signUp(params: {
  senha: string;
  nomeEmpresa: string;
  nomeUsuario: string;
  cpf: string;
  emailContato?: string;
  tipoPessoa: 'Fisica' | 'Juridica';
  cpfCnpj: string;
  responsavel: string;
  telefone: string;
  paisId: number;
  estadoId: number;
  cidade: string;
  tipoEmpresa: string;
  codigoIntegracao: string | null;
  codigoParceiro: string | null;
}) {
  const cpfLimpo = params.cpf.replace(/\D/g, '');
  const empresaIdNovo = Crypto.randomUUID();
  const emailSintetico = `${cpfLimpo}-${empresaIdNovo}@gestaoavi.com`;

  const { data, error } = await supabase.functions.invoke('cadastrar-empresa', {
    body: {
      empresaId: empresaIdNovo,
      nomeEmpresa: params.nomeEmpresa,
      nomeUsuario: params.nomeUsuario,
      cpf: cpfLimpo,
      senha: params.senha,
      emailContato: params.emailContato,
      tipoPessoa: params.tipoPessoa,
      cpfCnpj: params.cpfCnpj.replace(/\D/g, ''),
      responsavel: params.responsavel,
      telefone: params.telefone,
      paisId: params.paisId,
      estadoId: params.estadoId,
      cidade: params.cidade,
      tipoEmpresa: params.tipoEmpresa,
      codigoIntegracao: params.codigoIntegracao,
      codigoParceiro: params.codigoParceiro,
    },
  });

  if (error) return { error: 'Erro ao cadastrar. Verifique sua conexão.' };
  if (data?.error) return { error: data.error };

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: emailSintetico,
    password: params.senha,
  });

  if (loginError || !loginData.session) {
    return { error: 'Empresa criada, mas houve erro ao iniciar sessão. Tente fazer login.' };
  }

  const userId = loginData.user!.id;

  await salvarCredencialLocal({
    userId,
    email: emailSintetico,
    cpf: cpfLimpo,
    senha: params.senha,
    accessToken: loginData.session.access_token,
    refreshToken: loginData.session.refresh_token,
    empresaId: empresaIdNovo,
    ownerId: userId,
  });

  // ✅ Já sabemos o tipo da empresa (veio nos parâmetros), não precisa reconsultar
  await salvarPerfilCache({
    id: userId,
    nome: params.nomeUsuario,
    empresaId: empresaIdNovo,
    papelId: PAPEL_ID.ADMIN,
    ownerId: userId,
    empresaTipo: params.tipoEmpresa,
    precisaRedefinirSenha: false,
  });

  setSession(loginData.session);
  setOffline(false);
  setPrecisaRedefinirSenha(false);
  setEmpresaId(empresaIdNovo);
  setEmpresaTipo(params.tipoEmpresa);

  try {
    await baixarLotesDoServidor(empresaIdNovo);
    await baixarFaixaConforto(empresaIdNovo);
  } catch (e) {
    console.log('Pull inicial de lotes falhou:', e);
  }

  return {};
}


  async function atualizarSenhaPropria(novaSenha: string) {
    if (novaSenha.length < 6) {
      return { error: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) return { error: error.message };

    const userId = session?.user?.id;
    if (userId) {
      await supabase.from('perfis').update({ precisa_redefinir_senha: false }).eq('id', userId);
    }

    setPrecisaRedefinirSenha(false);
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setOffline(false);
    setPrecisaRedefinirSenha(false);
    setEmpresaId(null);
    setEmpresaTipo(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userId: session?.user?.id ?? null,
        offline,
        carregandoSessao,
        precisaRedefinirSenha,
        empresaId,
        empresaTipo,
        signIn,
        signInComCpf,
        signUp,
        signOut,
        atualizarSenhaPropria,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
