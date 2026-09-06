// src/auth/authVault.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// SecureStore só aceita chaves alfanuméricas + . _ -
// Por isso, criamos uma chave segura a partir do e-mail (hash), 
// e mantemos um índice separado com a lista de e-mails salvos.

const INDICE_KEY = 'gestaoavi_vault_indice';

type CredencialSalva = {
  userId: string;
  email: string;
  cpf?: string; // ✅ novo campo
  senhaHash: string;
  accessToken: string;
  refreshToken: string;
  empresaId: string | null;
  ownerId: string | null;
  ultimoLoginOnline: string;
};

// ---------- Utils ----------

/**
 * Gera o hash da senha usando o e-mail normalizado como "salt".
 * Isso evita que hashes de senhas iguais entre usuários diferentes
 * fiquem idênticos no armazenamento (proteção contra rainbow tables).
 */
async function hashSenha(senha: string, email: string): Promise<string> {
  const emailNorm = email.trim().toLowerCase();
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${emailNorm}::${senha}`
  );
}

function chaveDoEmail(email: string): string {
  // Transforma o e-mail numa chave segura para o SecureStore
  const limpo = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `gestaoavi_cred_${limpo}`;
}

// ---------- Índice de e-mails salvos no aparelho ----------

async function getIndice(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(INDICE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function adicionarAoIndice(email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  const indice = await getIndice();
  if (!indice.includes(emailNorm)) {
    indice.push(emailNorm);
    await SecureStore.setItemAsync(INDICE_KEY, JSON.stringify(indice));
  }
}

// ---------- API pública do cofre ----------

/**
 * Salva ou atualiza as credenciais de um usuário no cofre local.
 * Deve ser chamado sempre após um login online bem-sucedido.
 */
export async function salvarCredencialLocal(params: {
  userId: string;
  email: string;
  cpf?: string; // ✅
  senha: string;
  accessToken: string;
  refreshToken: string;
  empresaId: string | null;
  ownerId: string | null;
}): Promise<void> {
  const emailNorm = params.email.trim().toLowerCase();
  const senhaHash = await hashSenha(params.senha, emailNorm);

  const credencial: CredencialSalva = {
    userId: params.userId,
    email: emailNorm,
    cpf: params.cpf?.replace(/\D/g, ''),
    senhaHash,
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    empresaId: params.empresaId,
    ownerId: params.ownerId,
    ultimoLoginOnline: new Date().toISOString(),
  };

  await SecureStore.setItemAsync(chaveDoEmail(emailNorm), JSON.stringify(credencial));
  await adicionarAoIndice(emailNorm);
}

// Retorna todos os e-mails salvos localmente vinculados a esse CPF
export async function buscarEmailLocalPorCpf(cpf: string): Promise<string[]> {
  const indice = await getIndice();
  const emailsEncontrados: string[] = [];

  for (const email of indice) {
    const raw = await SecureStore.getItemAsync(chaveDoEmail(email));
    if (raw) {
      const cred: CredencialSalva = JSON.parse(raw);
      if (cred.cpf === cpf) emailsEncontrados.push(cred.email);
    }
  }

  return emailsEncontrados;
}


/**
 * Verifica se existe uma credencial local para esse e-mail,
 * e se a senha digitada bate com o hash salvo.
 * Retorna a credencial completa se válida, ou null se inválida/inexistente.
 */
export async function validarCredencialLocal(
  email: string,
  senha: string
): Promise<CredencialSalva | null> {
  const emailNorm = email.trim().toLowerCase();
  const raw = await SecureStore.getItemAsync(chaveDoEmail(emailNorm));
  if (!raw) return null;

  const credencial: CredencialSalva = JSON.parse(raw);
  const senhaHash = await hashSenha(senha, emailNorm); // ✅ salt = e-mail

  if (senhaHash !== credencial.senhaHash) return null;

  return credencial;
}

/**
 * Retorna a credencial salva de um e-mail, sem validar senha.
 * Útil para saber se o e-mail já tem cadastro local (ex: exibir sugestão).
 */
export async function getCredencialSalva(email: string): Promise<CredencialSalva | null> {
  const emailNorm = email.trim().toLowerCase();
  const raw = await SecureStore.getItemAsync(chaveDoEmail(emailNorm));
  return raw ? JSON.parse(raw) : null;
}

/**
 * Lista todos os e-mails que já logaram nesse aparelho (para telas de seleção rápida, opcional).
 */
export async function listarEmailsSalvos(): Promise<string[]> {
  return getIndice();
}

/**
 * Remove a credencial de um e-mail específico do cofre (não usado no "Sair" comum,
 * apenas se o usuário explicitamente quiser remover o acesso offline daquele e-mail).
 */
export async function removerCredencialLocal(email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  await SecureStore.deleteItemAsync(chaveDoEmail(emailNorm));

  const indice = await getIndice();
  const novoIndice = indice.filter((e) => e !== emailNorm);
  await SecureStore.setItemAsync(INDICE_KEY, JSON.stringify(novoIndice));
}

/**
 * Atualiza apenas os tokens de uma credencial já salva (usado após refresh de sessão online).
 */
export async function atualizarTokensLocal(
  email: string,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const credencial = await getCredencialSalva(email);
  if (!credencial) return;

  const atualizada: CredencialSalva = {
    ...credencial,
    accessToken,
    refreshToken,
    ultimoLoginOnline: new Date().toISOString(),
  };

  await SecureStore.setItemAsync(chaveDoEmail(email), JSON.stringify(atualizada));
}
