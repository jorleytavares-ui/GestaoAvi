// src/auth/AuthContext.tsx
//
// MODELO (leia isto antes de mexer):
//
//  1) IDENTIDADE LOCAL  → `session` (estado React). Quem é o usuário neste aparelho.
//     Vem do login online, do login offline (vault) ou da sessão persistida no cold start.
//     Existe SEMPRE que o usuário está "dentro" do app, com ou sem internet.
//
//  2) SESSÃO REMOTA     → `remotoPronto`. O client do Supabase tem um token válido e
//     confirmado pelo servidor. Só com isso as chamadas ao backend funcionam.
//     Começa false em login offline / cold start e vira true sozinha ("login silencioso")
//     quando há internet real e o modo de sincronização permite.
//
//  3) REDE REAL         → `netConectado`. Resultado do health-check (não só do NetInfo).
//
//  4) POLÍTICA DE SYNC  → `modoSync` (online | intervalo | horario | manual | offline).
//
//  `offline` (exposto aos demais hooks) é DERIVADO dessas peças — nunca setado à mão.
//  Isso elimina a briga de setOffline() entre efeitos/intervalos que existia antes.
//
//  REGRA DE OURO: erro de rede nunca desloga e nunca apaga a credencial do vault.
//  O usuário só é interrompido (modal de senha) se o refresh token estiver
//  definitivamente morto E não houver senha em memória para reautenticar sozinho.
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { createClient, Session, User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import { estaConectado, comTimeout } from '../utils/connectivity';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import {
  salvarCredencialLocal,
  validarCredencialLocal,
  buscarEmailLocalPorCpf,
  atualizarTokensLocal,
  getCredencialSalva,
  definirSessaoAtiva,
  getSessaoAtiva,
  limparSessaoAtiva,
} from './authVault';
import { lerSessaoPersistidaDoClient, montarSessaoOffline } from './sessaoLocal';
import { salvarPerfilCache, getPerfilCache } from '../storage/perfilCache';
import { sincronizarRelogioServidor } from '../services/serverTime';
import { baixarLotesDoServidor, baixarFaixaConforto } from '../storage/sync';
import { PAPEL_ID } from '../constants/papeis';
import { onSessaoInvalida, isErroDeRede } from './authSessionEvents';
import { setUsuarioAtual } from './authState';
import {
  getModoSync,
  getHorarioSync,
  onSyncPrefsChange,
  ModoSync,
} from '../storage/syncPrefs';
import { onSyncStatusChange } from '../storage/syncStatusEmitter';
import { deveExibirOnline } from '../utils/statusConectividadeDisplay';

type OpcaoEmpresa = { email: string; empresaId: string; empresaNome: string };
type ResultadoAuth = { error?: string; redeIndisponivel?: boolean };
type ResultadoRenovacao = 'ok' | 'rede' | 'morta' | 'sem-sessao';
export type MotivoSemOnline = 'modo-offline' | 'sem-internet' | 'sessao';
export type ResultadoOnline = { ok: true } | { ok: false; motivo: MotivoSemOnline };

type AuthContextData = {
  session: Session | null;
  user: User | null;
  userId: string | null;
  offline: boolean;
  /** true quando o client do Supabase tem token válido (backend utilizável). */
  remotoPronto: boolean;
  carregandoSessao: boolean;
  precisaRedefinirSenha: boolean;
  empresaId: string | null;
  empresaTipo: string | null;
  /** true quando o token morreu de vez e só a senha do usuário resolve. */
  reautenticacaoPendente: boolean;
  reautenticarComSenha: (senha: string) => Promise<{ error?: string }>;
  adiarReautenticacao: () => void;
  /**
   * Para ações que SÓ funcionam online (menu: sincronizar, cadastro de usuário, planos...).
   * Confirma a conexão real AGORA e, se o token remoto ainda não estiver pronto, tenta o
   * login silencioso antes de desistir. Não usa o badge `offline`, porque nos modos
   * manual/horário/intervalo o badge mostra Offline mesmo com internet — e o usuário
   * precisa conseguir clicar em "Sincronizar agora" justamente nesses modos.
   */
  garantirOnline: () => Promise<ResultadoOnline>;
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

function estaDentroDaJanelaAgendada(horario: string | null): boolean {
  if (!horario) return false;
  const [hh, mm] = horario.split(':').map(Number);
  const agora = new Date();
  const inicioJanela = new Date();
  inicioJanela.setHours(hh, mm, 0, 0);
  const fimJanela = new Date(inicioJanela.getTime() + 5 * 60 * 1000); // janela de 5 min
  return agora >= inicioJanela && agora <= fimJanela;
}

function traduzirErroLogin(msg: string | undefined): string {
  const m = (msg ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'CPF ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado.';
  return msg || 'Não foi possível autenticar o usuário.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ---------- estado exposto ----------
  const [session, setSessionState] = useState<Session | null>(null);
  const [remotoPronto, setRemotoProntoState] = useState(false);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [precisaRedefinirSenha, setPrecisaRedefinirSenha] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaTipo, setEmpresaTipo] = useState<string | null>(null);
  const [reautenticacaoPendente, setReautenticacaoPendente] = useState(false);

  // ---------- estado interno de conectividade / política ----------
  const [netConectado, setNetConectado] = useState(false);
  const [sincronizandoAgora, setSincronizandoAgora] = useState(false);
  const [modoSync, setModoSyncState] = useState<ModoSync>('online');
  const [horarioSync, setHorarioSyncState] = useState<string | null>(null);
  const [tickMinuto, setTickMinuto] = useState(0);
  const [tickForeground, setTickForeground] = useState(0);

  // ---------- refs (valores "vivos", sem closure velha) ----------
  const sessionRef = useRef<Session | null>(null);
  const remotoProntoRef = useRef(false);
  const netRef = useRef(false);
  const senhaMemoriaRef = useRef<string | null>(null); // só memória; nunca persistida
  const renovacaoRef = useRef<Promise<ResultadoRenovacao> | null>(null);
  const loginEmAndamentoRef = useRef(false);
  const saindoRef = useRef(false);
  const reauthAdiadaRef = useRef(false);

  // ============================================================
  // Helpers de estado (só usam refs/setters → seguros em qualquer closure)
  // ============================================================
  function aplicarSessao(nova: Session | null) {
    sessionRef.current = nova;
    setUsuarioAtual(nova ? { id: nova.user.id, email: nova.user.email ?? null } : null);
    setSessionState(nova);
  }

  function marcarRemotoPronto(valor: boolean) {
    remotoProntoRef.current = valor;
    setRemotoProntoState(valor);
  }

  /** Token remoto confirmado: promove a sessão e persiste tokens no vault. */
  function adotarSessaoRemota(nova: Session) {
    const atual = sessionRef.current;
    const igual =
      !!atual &&
      remotoProntoRef.current &&
      atual.user.id === nova.user.id &&
      atual.access_token === nova.access_token &&
      atual.refresh_token === nova.refresh_token;

    // Evita trocar a referência do objeto à toa: isso re-renderizava o app inteiro e
    // refazia fetch de perfil/licença (o "piscar" que interrompia o usuário).
    if (!igual) aplicarSessao(nova);
    marcarRemotoPronto(true);

    if (nova.user.email) {
      atualizarTokensLocal(nova.user.email, nova.access_token, nova.refresh_token).catch((e) =>
        console.log('Falha ao persistir tokens no vault:', e)
      );
    }
  }

  // ============================================================
  // LOGIN SILENCIOSO / RENOVAÇÃO DA SESSÃO REMOTA
  // ============================================================
  async function renovarSessaoSilenciosa(): Promise<ResultadoRenovacao> {
    if (renovacaoRef.current) return renovacaoRef.current; // single-flight

    const p = (async (): Promise<ResultadoRenovacao> => {
      const atual = sessionRef.current;
      if (!atual || saindoRef.current) return 'sem-sessao';

      try {
        // 1) O client já tem sessão utilizável (ou renova sozinho)?
        const { data, error } = await supabase.auth.getSession();
        if (data.session && data.session.user.id === atual.user.id) {
          adotarSessaoRemota(data.session);
          return 'ok';
        }
        if (error && isErroDeRede(error)) return 'rede';

        // 2) Client vazio (login offline / cold start sem rede): reidrata com o
        //    refresh_token guardado no vault.
        const email = atual.user.email ?? null;
        const cred = email ? await getCredencialSalva(email) : null;
        const refreshToken = cred?.refreshToken ?? atual.refresh_token;

        const { data: r, error: rErr } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });
        if (r?.session) {
          adotarSessaoRemota(r.session);
          return 'ok';
        }
        // Falha de rede/servidor ≠ token morto. NÃO apaga vault, NÃO desloga.
        if (rErr && isErroDeRede(rErr)) return 'rede';

        // 3) Refresh token definitivamente morto (revogado/rotacionado/senha trocada).
        //    Se a senha ainda está em memória (o usuário logou nesta execução do app),
        //    reautentica sozinho — o silencioso de verdade.
        if (email && senhaMemoriaRef.current) {
          const { data: l, error: lErr } = await supabase.auth.signInWithPassword({
            email,
            password: senhaMemoriaRef.current,
          });
          if (l?.session) {
            adotarSessaoRemota(l.session);
            return 'ok';
          }
          if (lErr && isErroDeRede(lErr)) return 'rede';
        }

        // 4) Só a senha do usuário resolve. Mantém o app funcionando offline e pede a
        //    senha num modal (sem derrubar a tela atual).
        console.log('Sessão remota irrecuperável sem senha:', rErr?.message);
        marcarRemotoPronto(false);
        setReautenticacaoPendente(true);
        return 'morta';
      } catch (e) {
        console.log('renovarSessaoSilenciosa: exceção, tratando como falha de rede:', e);
        return 'rede';
      }
    })();

    renovacaoRef.current = p;
    p.finally(() => {
      if (renovacaoRef.current === p) renovacaoRef.current = null;
    });
    return p;
  }

  // ============================================================
  // EFEITOS
  // ============================================================

  // --- Preferências de sincronização (modo/horário), reativas ---
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      const [m, h] = await Promise.all([getModoSync(), getHorarioSync()]);
      if (!ativo) return;
      setModoSyncState(m);
      setHorarioSyncState(h);
    };
    carregar();
    const unsub = onSyncPrefsChange(carregar);
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  // --- Tick de 1 min: reavalia a janela do modo 'horario' ---
  useEffect(() => {
    const id = setInterval(() => setTickMinuto((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // --- Sync em andamento (usado no modo 'manual') ---
  useEffect(() => onSyncStatusChange(setSincronizandoAgora), []);

  // --- Rede real: NetInfo + health-check + polling + foreground ---
  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checar = async () => {
      const ok = await estaConectado();
      if (!ativo) return;
      if (ok && !netRef.current) reauthAdiadaRef.current = false; // voltou a rede: pode pedir de novo
      netRef.current = ok;
      setNetConectado(ok);
    };

    // Polling: o NetInfo só avisa quando o LINK muda. Wi-Fi/4G "conectado sem dados" que
    // volta a ter internet não gera evento nenhum — sem este polling o app ficava offline
    // para sempre. Mais rápido enquanto offline, mais espaçado enquanto online.
    const agendar = () => {
      timer = setTimeout(
        async () => {
          if (AppState.currentState === 'active') await checar();
          if (ativo) agendar();
        },
        netRef.current ? 60_000 : 15_000
      );
    };

    checar();
    agendar();

    const unsubNet = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        netRef.current = false;
        setNetConectado(false);
        return;
      }
      checar(); // link ativo ≠ internet: confirma com requisição real
    });

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        reauthAdiadaRef.current = false;
        checar();
        setTickForeground((t) => t + 1); // revalida token após tempo em background
      }
    });

    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
      unsubNet();
      appSub.remove();
    };
  }, []);

  // --- Cold start: abre INSTANTANEAMENTE com o que existe localmente (sem rede) ---
  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        const persistida = await lerSessaoPersistidaDoClient();
        const emailAtivo = (await getSessaoAtiva()) ?? persistida?.user?.email ?? null;
        const cred = emailAtivo ? await getCredencialSalva(emailAtivo) : null;

        let inicial: Session | null = null;
        if (persistida && (!cred || cred.userId === persistida.user.id)) {
          inicial = persistida;
        } else if (cred) {
          inicial = montarSessaoOffline({
            userId: cred.userId,
            email: cred.email,
            accessToken: cred.accessToken,
            refreshToken: cred.refreshToken,
          });
        }

        if (!ativo) return;
        if (!inicial) {
          aplicarSessao(null);
          return;
        }

        const perfilCache = await getPerfilCache(inicial.user.id);
        if (!ativo) return;

        setPrecisaRedefinirSenha(!!perfilCache?.precisaRedefinirSenha);
        setEmpresaId(perfilCache?.empresaId ?? cred?.empresaId ?? null);
        setEmpresaTipo(perfilCache?.empresaTipo ?? null);
        aplicarSessao(inicial);
        marcarRemotoPronto(false); // o efeito de renovação promove quando houver internet
      } catch (e) {
        console.log('Falha no cold start da sessão:', e);
        aplicarSessao(null);
      } finally {
        // Garante que o app nunca fica preso no spinner de "carregando sessão".
        if (ativo) setCarregandoSessao(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  // --- Eventos de auth do supabase-js ---
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, novaSessao) => {
      // NÃO faça await de chamadas do supabase aqui dentro (deadlock conhecido).
      if (loginEmAndamentoRef.current || saindoRef.current) return;

      if (event === 'SIGNED_OUT') {
        // O supabase-js emite isso quando o refresh falha de forma definitiva.
        // NÃO desloga o usuário: ele segue no app (offline) e a renovação silenciosa
        // decide o que fazer (reautenticar sozinho, pedir senha, ou aguardar rede).
        marcarRemotoPronto(false);
        return;
      }

      if (
        novaSessao &&
        sessionRef.current &&
        novaSessao.user.id === sessionRef.current.user.id &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
      ) {
        adotarSessaoRemota(novaSessao); // também grava o token renovado no vault
      }
    });

    // Pedido de revalidação vindo do sync (ex.: "JWT expired" numa chamada).
    const unsubInvalida = onSessaoInvalida(() => {
      marcarRemotoPronto(false);
    });

    return () => {
      listener.subscription.unsubscribe();
      unsubInvalida();
    };
  }, []);

  // --- Login silencioso: internet real + sessão local + modo permite ---
  const temSessao = !!session;
  const userIdAtual = session?.user?.id ?? null;

  useEffect(() => {
    if (!temSessao || !netConectado) return;
    if (modoSync === 'offline') return; // usuário escolheu "sempre offline": respeita
    if (reautenticacaoPendente || reauthAdiadaRef.current) return;

    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tentativa = 0;

    const rodar = async () => {
      const r = await renovarSessaoSilenciosa();
      if (cancelado) return;
      if (r === 'rede') {
        // Internet "instável": tenta de novo com backoff (6s, 12s, 24s, até 60s).
        tentativa += 1;
        timer = setTimeout(rodar, Math.min(3000 * 2 ** tentativa, 60_000));
      }
    };
    rodar();

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temSessao, userIdAtual, netConectado, modoSync, remotoPronto, reautenticacaoPendente, tickForeground]);

  // --- Quando o remoto fica pronto, confirma "precisa redefinir senha" no servidor ---
  useEffect(() => {
    if (!remotoPronto || !userIdAtual) return;
    let ativo = true;
    (async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('precisa_redefinir_senha')
        .eq('id', userIdAtual)
        .maybeSingle();
      // Só sobrescreve com resposta REAL do servidor. Antes, uma falha de rede virava
      // "false" e liberava quem deveria trocar a senha.
      if (!ativo || error || !data) return;
      setPrecisaRedefinirSenha(!!data.precisa_redefinir_senha);
    })();
    return () => {
      ativo = false;
    };
  }, [remotoPronto, userIdAtual]);

  // ============================================================
  // `offline` DERIVADO
  // ============================================================
  const dentroDaJanela = useMemo(
    () => estaDentroDaJanelaAgendada(horarioSync),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [horarioSync, tickMinuto]
  );

  const offline = useMemo(() => {
    if (!session) return false;
    if (!remotoPronto) return true; // sem token remoto confirmado, o backend não é utilizável
    return !deveExibirOnline({
      modo: modoSync,
      netConectado,
      sincronizandoAgora,
      dentroDaJanelaAgendada: dentroDaJanela,
    });
  }, [session, remotoPronto, modoSync, netConectado, sincronizandoAgora, dentroDaJanela]);

  // ============================================================
  // REAUTENTICAÇÃO MANUAL (só quando o token morreu de vez)
  // ============================================================
  async function reautenticarComSenha(senha: string): Promise<{ error?: string }> {
    const atual = sessionRef.current;
    const email = atual?.user?.email;
    if (!atual || !email) return { error: 'Sessão não encontrada.' };
    if (!netRef.current) return { error: 'Sem conexão com a internet no momento.' };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      return {
        error: isErroDeRede(error)
          ? 'Conexão instável. Tente novamente.'
          : traduzirErroLogin(error.message),
      };
    }
    if (!data.session) return { error: 'Não foi possível autenticar.' };

    senhaMemoriaRef.current = senha;
    const cred = await getCredencialSalva(email);
    await salvarCredencialLocal({
      userId: data.user.id,
      email,
      cpf: cred?.cpf,
      senha, // a senha pode ter mudado: mantém o hash do vault coerente
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      empresaId: cred?.empresaId ?? null,
      ownerId: cred?.ownerId ?? null,
    });

    reauthAdiadaRef.current = false;
    setReautenticacaoPendente(false);
    adotarSessaoRemota(data.session);
    return {};
  }

  function adiarReautenticacao() {
    reauthAdiadaRef.current = true; // volta a perguntar na próxima reconexão/foreground
    setReautenticacaoPendente(false);
  }

  // ============================================================
  // AÇÕES QUE EXIGEM ONLINE
  // ============================================================
  async function garantirOnline(): Promise<ResultadoOnline> {
    if (!sessionRef.current) return { ok: false, motivo: 'sessao' };

    // "Sempre offline": escolha explícita do usuário em Configurações.
    if ((await getModoSync()) === 'offline') return { ok: false, motivo: 'modo-offline' };

    const net = await estaConectado(); // requisição real, não só o NetInfo
    if (net !== netRef.current) {
      netRef.current = net;
      setNetConectado(net);
    }
    if (!net) return { ok: false, motivo: 'sem-internet' };

    if (remotoProntoRef.current) return { ok: true };

    // Há internet, mas o token remoto ainda não foi reidratado: faz agora.
    const r = await renovarSessaoSilenciosa();
    if (r === 'ok') return { ok: true };
    return { ok: false, motivo: r === 'rede' ? 'sem-internet' : 'sessao' };
  }

  // ============================================================
  // CADASTRO / PERFIL
  // ============================================================
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

  async function buscarEmailPorCpf(cpf: string): Promise<{
    email?: string;
    opcoes?: OpcaoEmpresa[];
    error?: string;
    redeIndisponivel?: boolean;
  }> {
    const cpfLimpo = cpf.replace(/\D/g, '');

    const { data, error } = await supabase.functions.invoke('buscar-email-por-cpf', {
      body: { cpf: cpfLimpo },
    });

    if (error) {
      // Falha de rede → deixa o chamador cair para a busca local (offline).
      if (isErroDeRede(error)) return { redeIndisponivel: true };

      // A função respondeu com erro de negócio (ex.: 404 "CPF não encontrado").
      // Antes tudo virava "Verifique sua conexão", mesmo com internet perfeita.
      let mensagem = 'Erro ao buscar CPF.';
      try {
        const contexto = (error as any)?.context;
        if (contexto && typeof contexto.json === 'function') {
          const corpo = await contexto.json();
          if (corpo?.error) mensagem = corpo.error;
        }
      } catch {
        // mantém a mensagem genérica
      }
      return { error: mensagem };
    }

    if (data?.error) return { error: data.error };
    if (data?.opcoes) return { opcoes: data.opcoes };
    return { email: data.email };
  }

  // ============================================================
  // LOGIN
  // ============================================================
  async function signInOnline(email: string, senha: string): Promise<ResultadoAuth> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      // O supabase-js NÃO lança em falha de rede: devolve { error }. Antes isso virava
      // "Network request failed" na tela em vez de cair no login offline.
      if (isErroDeRede(error)) return { redeIndisponivel: true };
      return { error: traduzirErroLogin(error.message) };
    }
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

    if (perfilCheckError) {
      // A sessão do client já foi criada; desfaz para não ficar "meio logado".
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      if (isErroDeRede(perfilCheckError)) return { redeIndisponivel: true };
      return { error: perfilCheckError.message };
    }

    let empresaIdLocal: string | null = perfilExistente?.empresa_id ?? null;
    let nome = perfilExistente?.nome ?? email.split('@')[0];
    let papelId = perfilExistente?.papel_id ?? PAPEL_ID.ADMIN;
    const cpf: string | undefined = (perfilExistente as any)?.cpf ?? undefined;
    let empresaTipoLocal: string | null = null;
    // BUG corrigido: antes o cache usava a variável de ESTADO `precisaRedefinirSenha`
    // (valor velho do render anterior) em vez do valor que acabou de vir do servidor.
    let precisaRedefinir = !!(perfilExistente as any)?.precisa_redefinir_senha;

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
      precisaRedefinir = false;
    }

    let ownerId = userId;
    if (empresaIdLocal) {
      const { data: empresa } = await tempClient
        .from('empresas')
        .select('owner_id, tipo')
        .eq('id', empresaIdLocal)
        .maybeSingle();
      ownerId = (empresa as any)?.owner_id ?? userId;
      empresaTipoLocal = (empresa as any)?.tipo ?? empresaTipoLocal;
    }

    try {
      await sincronizarRelogioServidor();
    } catch (e) {
      console.log('Falha ao sincronizar relógio no login (não crítico):', e);
    }

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
      precisaRedefinirSenha: precisaRedefinir,
    });

    await definirSessaoAtiva(email);
    senhaMemoriaRef.current = senha;
    reauthAdiadaRef.current = false;
    setReautenticacaoPendente(false);

    setPrecisaRedefinirSenha(precisaRedefinir);
    setEmpresaId(empresaIdLocal);
    setEmpresaTipo(empresaTipoLocal);
    aplicarSessao(data.session);
    marcarRemotoPronto(true);

    // Pull inicial: já com a sessão estabelecida, fora do fluxo de decisão do login
    // (não pode mais causar fallback para offline por demora).
    try {
      await comTimeout(
        (async () => {
          await baixarLotesDoServidor(empresaIdLocal ?? '');
          await baixarFaixaConforto(empresaIdLocal ?? '');
        })(),
        12_000
      );
    } catch (e) {
      console.log('Pull inicial de lotes falhou (será tentado novamente pelo auto-sync):', e);
    }

    return {};
  }

  async function signInOffline(email: string, senha: string): Promise<ResultadoAuth> {
    const credencial = await validarCredencialLocal(email, senha);

    if (!credencial) {
      const existe = await getCredencialSalva(email);
      return {
        error: existe
          ? 'Senha incorreta.'
          : 'Não foi possível validar suas credenciais offline. Conecte-se à internet ao menos uma vez neste aparelho para habilitar o acesso sem conexão.',
      };
    }

    // IMPORTANTE: NÃO chamamos supabase.auth.setSession() aqui. Com o access token
    // expirado (o caso normal: 1h de validade) ele tenta renovar na rede, com retries e
    // backoff — travava o login offline por vários segundos e ainda falhava. A sessão
    // remota é reidratada depois, em silêncio, pelo efeito de renovação.
    const persistida = await lerSessaoPersistidaDoClient();
    const sessaoLocal =
      persistida && persistida.user.id === credencial.userId
        ? persistida // pode ter um refresh_token mais novo que o do vault
        : montarSessaoOffline({
            userId: credencial.userId,
            email: credencial.email,
            accessToken: credencial.accessToken,
            refreshToken: credencial.refreshToken,
          });

    const perfilCache = await getPerfilCache(credencial.userId);
    setPrecisaRedefinirSenha(!!perfilCache?.precisaRedefinirSenha);
    setEmpresaId(perfilCache?.empresaId ?? credencial.empresaId ?? null);
    setEmpresaTipo(perfilCache?.empresaTipo ?? null);

    await definirSessaoAtiva(credencial.email);
    senhaMemoriaRef.current = senha; // permite o login silencioso quando a internet voltar
    reauthAdiadaRef.current = false;
    setReautenticacaoPendente(false);

    aplicarSessao(sessaoLocal);
    marcarRemotoPronto(false);
    setCarregandoSessao(false);

    return {};
  }

  async function signIn(email: string, senha: string): Promise<{ error?: string }> {
    loginEmAndamentoRef.current = true;
    try {
      const modo = await getModoSync();

      // "Sempre offline": vai direto para a validação local.
      if (modo === 'offline') return await signInOffline(email, senha);

      if (!(await estaConectado())) return await signInOffline(email, senha);

      let resultado: ResultadoAuth;
      try {
        resultado = await comTimeout(signInOnline(email, senha), 20_000);
      } catch (e: any) {
        console.log('signInOnline expirou/falhou, tentando offline:', e?.message);
        resultado = { redeIndisponivel: true };
      }

      if (!resultado.redeIndisponivel) return { error: resultado.error };

      // Rede caiu/oscilou no meio do login: fallback transparente para o vault.
      const offlineRes = await signInOffline(email, senha);
      if (!offlineRes.error) return {};
      return { error: offlineRes.error };
    } finally {
      loginEmAndamentoRef.current = false;
    }
  }

  async function signInComCpf(
    cpf: string,
    senha: string
  ): Promise<{ error?: string; opcoes?: OpcaoEmpresa[] }> {
    const modo = await getModoSync();
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (modo !== 'offline' && (await estaConectado())) {
      try {
        const resultado = await comTimeout(buscarEmailPorCpf(cpfLimpo), 15_000);

        if (resultado.opcoes) return { opcoes: resultado.opcoes };
        if (resultado.email) return await signIn(resultado.email, senha);
        if (resultado.error && !resultado.redeIndisponivel) return { error: resultado.error };
        // redeIndisponivel → segue para a busca local abaixo
      } catch (e: any) {
        console.log('buscarEmailPorCpf expirou/falhou, tentando offline:', e?.message);
      }
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

    if (error) {
      let mensagem = 'Erro ao cadastrar. Verifique sua conexão.';

      try {
        const contexto = (error as any)?.context;
        if (contexto && typeof contexto.json === 'function') {
          const corpo = await contexto.json();
          if (corpo?.error) mensagem = corpo.error;
        }
      } catch {
        // mantém a mensagem genérica de conexão
      }

      if (mensagem.includes('uq_empresas_cpf_cnpj')) {
        mensagem = 'Já existe uma empresa cadastrada com esse CPF ou CNPJ.';
      } else if (mensagem.includes('uq_usuarios_cpf') || mensagem.includes('cpf')) {
        mensagem = 'Já existe um usuário cadastrado com esse CPF.';
      } else if (mensagem.toLowerCase().includes('email')) {
        mensagem = 'Já existe um cadastro com esse e-mail.';
      }

      return { error: mensagem };
    }

    if (data?.error) {
      let mensagem = data.error;
      if (mensagem.includes('uq_empresas_cpf_cnpj')) {
        mensagem = 'Já existe uma empresa cadastrada com esse CPF ou CNPJ.';
      }
      return { error: mensagem };
    }

    loginEmAndamentoRef.current = true;
    try {
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

      await salvarPerfilCache({
        id: userId,
        nome: params.nomeUsuario,
        empresaId: empresaIdNovo,
        papelId: PAPEL_ID.ADMIN,
        ownerId: userId,
        empresaTipo: params.tipoEmpresa,
        precisaRedefinirSenha: false,
      });

      await definirSessaoAtiva(emailSintetico);
      senhaMemoriaRef.current = params.senha;
      reauthAdiadaRef.current = false;

      setPrecisaRedefinirSenha(false);
      setEmpresaId(empresaIdNovo);
      setEmpresaTipo(params.tipoEmpresa);
      aplicarSessao(loginData.session);
      marcarRemotoPronto(true);

      try {
        await comTimeout(
          (async () => {
            await baixarLotesDoServidor(empresaIdNovo);
            await baixarFaixaConforto(empresaIdNovo);
          })(),
          12_000
        );
      } catch (e) {
        console.log('Pull inicial de lotes falhou:', e);
      }

      return {};
    } finally {
      loginEmAndamentoRef.current = false;
    }
  }

  async function atualizarSenhaPropria(novaSenha: string) {
    if (novaSenha.length < 6) {
      return { error: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    if (!remotoProntoRef.current) {
      const r = await renovarSessaoSilenciosa();
      if (r !== 'ok') return { error: 'Conecte-se à internet para alterar a senha.' };
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      return {
        error: isErroDeRede(error) ? 'Conexão instável. Tente novamente.' : error.message,
      };
    }

    const atual = sessionRef.current;
    const userId = atual?.user?.id;
    if (userId) {
      await supabase.from('perfis').update({ precisa_redefinir_senha: false }).eq('id', userId);
      // Sem isto, um reinício offline voltava a exigir a troca de senha (cache antigo).
      const cache = await getPerfilCache(userId);
      if (cache) await salvarPerfilCache({ ...cache, precisaRedefinirSenha: false });
    }

    // Mantém o vault coerente com a NOVA senha; antes o login offline só aceitava a antiga.
    try {
      const email = atual?.user?.email;
      const { data } = await supabase.auth.getSession();
      if (email && data.session) {
        const cred = await getCredencialSalva(email);
        await salvarCredencialLocal({
          userId: data.session.user.id,
          email,
          cpf: cred?.cpf,
          senha: novaSenha,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          empresaId: cred?.empresaId ?? null,
          ownerId: cred?.ownerId ?? null,
        });
      }
    } catch (e) {
      console.log('Falha ao atualizar vault com a nova senha:', e);
    }

    senhaMemoriaRef.current = novaSenha;
    setPrecisaRedefinirSenha(false);
    return {};
  }

  async function signOut() {
    saindoRef.current = true;
    sessionRef.current = null; // impede a renovação silenciosa de "desfazer" o logout
    try {
      // scope 'local': só este aparelho, SEM revogar o refresh_token no servidor.
      // (O padrão do supabase-js é 'global', que derruba TODOS os aparelhos do usuário.)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.log('signOut local falhou (ignorado):', e);
    }
    await limparSessaoAtiva().catch(() => {});
    senhaMemoriaRef.current = null;
    aplicarSessao(null);
    marcarRemotoPronto(false);
    setReautenticacaoPendente(false);
    setPrecisaRedefinirSenha(false);
    setEmpresaId(null);
    setEmpresaTipo(null);
    saindoRef.current = false;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userId: session?.user?.id ?? null,
        offline,
        remotoPronto,
        carregandoSessao,
        precisaRedefinirSenha,
        empresaId,
        empresaTipo,
        reautenticacaoPendente,
        reautenticarComSenha,
        adiarReautenticacao,
        garantirOnline,
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
