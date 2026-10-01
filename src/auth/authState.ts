// src/auth/authState.ts
// Snapshot SÍNCRONO do usuário logado, para código que não é React (sync.ts etc.).
//
// Por que existe: antes, o sync.ts descobria o usuário via supabase.auth.getSession().
// Só que, com o token expirado e sem rede, o getSession() devolve "sem sessão" (e ainda
// demora vários segundos tentando renovar). Resultado: em login offline, salvar/sincronizar
// lotes falhava com "Usuário não autenticado". O AuthContext é a fonte da verdade da
// identidade; o client do Supabase é só o "transporte" quando há internet.

type UsuarioAtual = { id: string; email: string | null } | null;

let usuarioAtual: UsuarioAtual = null;

export function setUsuarioAtual(u: UsuarioAtual) {
  usuarioAtual = u;
}

export function getUsuarioAtualIdLocal(): string | null {
  return usuarioAtual?.id ?? null;
}
