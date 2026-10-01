// src/auth/authSessionEvents.ts
//
// ATENÇÃO — mudança de semântica:
// "sessão inválida" agora significa "a sessão REMOTA (token do Supabase) precisa ser
// revalidada", e NÃO "deslogue o usuário". O AuthContext reage tentando renovar o token
// em silêncio; o usuário só é incomodado se a renovação for definitivamente impossível.

type Listener = () => void;
const listeners: Listener[] = [];

export function onSessaoInvalida(fn: Listener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function emitSessaoInvalida() {
  listeners.forEach((fn) => fn());
}

/**
 * Erro de REDE / transitório (sem internet real, timeout, gateway, 5xx, 429).
 * Nesses casos NUNCA se deve deslogar, apagar credencial local ou dar o token como morto:
 * o app só continua offline e tenta de novo depois.
 *
 * Obs.: o supabase-js NÃO lança exceção em falha de rede — ele devolve { error } com
 * name === 'AuthRetryableFetchError' (auth) ou 'FunctionsFetchError' (edge functions), e o
 * postgrest devolve message "TypeError: Network request failed". Quem só usa try/catch
 * nunca enxerga esses casos.
 */
export function isErroDeRede(error: any): boolean {
  if (!error) return false;
  const name = String(error?.name ?? '');
  const msg = String(error?.message ?? error ?? '').toLowerCase();
  const status = Number(error?.status);

  if (
    name === 'AuthRetryableFetchError' ||
    name === 'FunctionsFetchError' ||
    name === 'FunctionsRelayError' ||
    name === 'AbortError'
  ) {
    return true;
  }
  if (status === 0 || status === 429 || status >= 500) return true;

  return (
    msg === 'timeout' ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('internet') ||
    msg.includes('unable to resolve host')
  );
}

/**
 * Token de acesso (JWT) expirado/rejeitado pelo servidor.
 * Antes este helper casava com qualquer mensagem contendo "invalid", "expired" ou
 * "refresh" — ou seja, um simples "invalid input syntax for type uuid" do Postgres
 * derrubava a sessão. Agora é restrito a erros reais de JWT/401.
 *
 * Consequência esperada: renovar o token e tentar de novo — não deslogar.
 */
export function isErroTokenInvalido(error: any): boolean {
  if (!error || isErroDeRede(error)) return false;
  const status = Number(error?.status ?? error?.statusCode);
  const code = String(error?.code ?? '').toUpperCase();
  const msg = String(error?.message ?? '').toLowerCase();

  if (status === 401) return true;
  if (code === 'PGRST301' || code === 'PGRST303') return true; // JWT expirado / claims inválidas
  return (
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid refresh token') ||
    msg.includes('refresh token not found')
  );
}
