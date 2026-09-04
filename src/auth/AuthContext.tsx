// AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import {
  salvarCredencialLocal,
  validarCredencialLocal,
  getCredencialSalva,
} from './authVault';
import { salvarPerfilCache, getPerfilCache } from '../storage/perfilCache';
import { sincronizarRelogioServidor } from '../services/serverTime';
import { baixarLotesDoServidor, baixarFaixaConforto } from '../storage/sync';

type AuthContextData = {
  session: Session | null;
  user: User | null;
  userId: string | null;
  offline: boolean; // true quando a sessão ativa veio do cofre local, sem validação no servidor
  carregandoSessao: boolean;
  signIn: (email: string, senha: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    senha: string,
    nomeEmpresa: string,
    nomeUsuario: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [offline, setOffline] = useState(false);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

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
          }
        } else {
          // Sem rede: aceita a sessão local salva pelo SDK, sem validar no servidor
          setSession(sessionData.session);
          setOffline(true);
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
    tempClient: ReturnType<typeof createClient>,
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
      papel: 'admin',
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

    return { empresaId: empresaData.id };
  }

  // ---------- LOGIN ONLINE ----------
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
      .select('id, nome, empresa_id, papel')
      .eq('id', userId)
      .maybeSingle();

    if (perfilCheckError) return { error: perfilCheckError.message };

    let empresaId: string | null = perfilExistente?.empresa_id ?? null;
    let nome = perfilExistente?.nome ?? email.split('@')[0];
    let papel = perfilExistente?.papel ?? 'admin';

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
      empresaId = resultado.empresaId ?? null;
      nome = nomeUsuario;
      papel = 'admin';
    }

    // Busca owner_id da empresa (para o cache de perfil)
    let ownerId = userId;
    if (empresaId) {
      const { data: empresa } = await tempClient
        .from('empresas')
        .select('owner_id')
        .eq('id', empresaId)
        .maybeSingle();
      ownerId = (empresa as any)?.owner_id ?? userId;
    }

    await sincronizarRelogioServidor();

    // Salva credenciais no cofre local + cache de perfil (permite login offline depois)
    await salvarCredencialLocal({
      email,
      senha,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      empresaId,
      ownerId,
    });

    if (empresaId) {
      await salvarPerfilCache({
        id: userId,
        nome,
        empresaId,
        papel,
        ownerId,
      });

      // ✅ Ativa a sessão ANTES do pull, pois getUsuarioAtualId() em sync.ts
      // depende de supabase.auth.getSession() para resolver o userId.
      setSession(data.session);
      setOffline(false);

      // ✅ Garante que os lotes da empresa sejam buscados já no login,
      // independente do modo de sincronização configurado pelo usuário.
      // Falhas aqui não bloqueiam o login (ex: lentidão de rede) —
      // o useAutoSync tentará novamente em seguida.
      try {
        await baixarLotesDoServidor(empresaId);
        await baixarFaixaConforto(empresaId);
      } catch (e) {
        console.log('Pull inicial de lotes falhou (será tentado novamente pelo auto-sync):', e);
      }

      return {};
    }

    setSession(data.session);
    setOffline(false);

    return {};
  }

  // ---------- LOGIN OFFLINE (via cofre local) ----------
  async function signInOffline(email: string, senha: string) {
    const credencial = await validarCredencialLocal(email, senha);

    if (!credencial) {
      return {
        error:
          'Não foi possível validar suas credenciais offline. Conecte-se à internet ao menos uma vez neste aparelho para habilitar o acesso sem conexão.',
      };
    }

    // Restaura a sessão do Supabase com os tokens salvos (sem contato com o servidor)
    const { error } = await supabase.auth.setSession({
      access_token: credencial.accessToken,
      refresh_token: credencial.refreshToken,
    });

    if (error) {
      // Tokens podem ter sido invalidados/expirados localmente pelo SDK; ainda assim
      // seguimos liberando o acesso offline, montando uma sessão "manual" mínima.
      // (Os dados operacionais do app dependem do userId, não da validade do token em si.)
    }

    setOffline(true);
    setCarregandoSessao(false);

    return {};
  }

  // ---------- LOGIN (decide online/offline) ----------
  async function signIn(email: string, senha: string) {
    const net = await NetInfo.fetch();

    if (net.isConnected) {
      const resultadoOnline = await signInOnline(email, senha);
      if (!resultadoOnline.error) return resultadoOnline;

      // Se falhou online por erro de credencial (não por falta de rede),
      // não tentamos offline — evita mascarar senha errada.
      return resultadoOnline;
    }

    // Sem rede: tenta direto pelo cofre local
    return signInOffline(email, senha);
  }

    async function signUp(
    email: string,
    senha: string,
    nomeEmpresa: string,
    nomeUsuario: string
  ) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome_usuario: nomeUsuario,
          nome_empresa: nomeEmpresa,
        },
      },
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    if (!signUpData.user) {
      return { error: 'Não foi possível criar o usuário.' };
    }

    if (!signUpData.session) {
      return {
        error:
          'Cadastro criado! Confirme seu e-mail antes de continuar (a empresa será criada no primeiro login).',
      };
    }

    const userId = signUpData.user.id;
    const token = signUpData.session.access_token;

    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const resultado = await criarEmpresaPerfilELicenca(
      tempClient,
      userId,
      nomeUsuario,
      nomeEmpresa
    );

    if (resultado.error) {
      return { error: resultado.error };
    }

    await supabase.auth.setSession({
      access_token: signUpData.session.access_token,
      refresh_token: signUpData.session.refresh_token,
    });

    // Salva no cofre local também no cadastro (garante acesso offline futuro)
    await salvarCredencialLocal({
      email,
      senha,
      accessToken: signUpData.session.access_token,
      refreshToken: signUpData.session.refresh_token,
      empresaId: resultado.empresaId ?? null,
      ownerId: userId,
    });

    if (resultado.empresaId) {
      await salvarPerfilCache({
        id: userId,
        nome: nomeUsuario,
        empresaId: resultado.empresaId,
        papel: 'admin',
        ownerId: userId,
      });

      // ✅ Ativa a sessão ANTES do pull, pelo mesmo motivo do signInOnline:
      // getUsuarioAtualId() em sync.ts depende de getSession() já resolvido.
      setSession(signUpData.session);
      setOffline(false);

      // ✅ Consistência com o signInOnline. Na prática não trará nenhum lote
      // (empresa recém-criada), mas garante que o merge local/servidor já
      // aconteça desde o primeiro momento, sem depender do useAutoSync.
      try {
        await baixarLotesDoServidor(resultado.empresaId);
        await baixarFaixaConforto(resultado.empresaId);
      } catch (e) {
        console.log('Pull inicial de lotes falhou (será tentado novamente pelo auto-sync):', e);
      }

      return {};
    }

    setSession(signUpData.session);
    setOffline(false);

    return {};
  }


  // ---------- SAIR ----------
  // IMPORTANTE: só limpa a sessão ATIVA. O cofre local (credenciais salvas)
  // permanece intacto, permitindo que o mesmo ou outro usuário
  // faça login offline neste aparelho depois.
  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setOffline(false);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userId: session?.user?.id ?? null,
        offline,
        carregandoSessao,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
