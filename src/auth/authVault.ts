// src/auth/authVault.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// ---------- Wrapper multiplataforma (web usa localStorage) ----------

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ---------------------------------------------------------------------

const INDICE_KEY = 'gestaoavi_vault_indice';

type CredencialSalva = {
  userId: string;
  email: string;
  cpf?: string;
  senhaHash: string;
  accessToken: string;
  refreshToken: string;
  empresaId: string | null;
  ownerId: string | null;
  ultimoLoginOnline: string;
};

async function hashSenha(senha: string, email: string): Promise<string> {
  const emailNorm = email.trim().toLowerCase();
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${emailNorm}::${senha}`
  );
}

function chaveDoEmail(email: string): string {
  const limpo = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `gestaoavi_cred_${limpo}`;
}

async function getIndice(): Promise<string[]> {
  const raw = await getItem(INDICE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function adicionarAoIndice(email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  const indice = await getIndice();
  if (!indice.includes(emailNorm)) {
    indice.push(emailNorm);
    await setItem(INDICE_KEY, JSON.stringify(indice));
  }
}

export async function salvarCredencialLocal(params: {
  userId: string;
  email: string;
  cpf?: string;
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

  await setItem(chaveDoEmail(emailNorm), JSON.stringify(credencial));
  await adicionarAoIndice(emailNorm);
}

export async function buscarEmailLocalPorCpf(cpf: string): Promise<string[]> {
  const indice = await getIndice();
  const emailsEncontrados: string[] = [];

  for (const email of indice) {
    const raw = await getItem(chaveDoEmail(email));
    if (raw) {
      const cred: CredencialSalva = JSON.parse(raw);
      if (cred.cpf === cpf) emailsEncontrados.push(cred.email);
    }
  }

  return emailsEncontrados;
}

export async function validarCredencialLocal(
  email: string,
  senha: string
): Promise<CredencialSalva | null> {
  const emailNorm = email.trim().toLowerCase();
  const raw = await getItem(chaveDoEmail(emailNorm));
  if (!raw) return null;

  const credencial: CredencialSalva = JSON.parse(raw);
  const senhaHash = await hashSenha(senha, emailNorm);

  if (senhaHash !== credencial.senhaHash) return null;

  return credencial;
}

export async function getCredencialSalva(email: string): Promise<CredencialSalva | null> {
  const emailNorm = email.trim().toLowerCase();
  const raw = await getItem(chaveDoEmail(emailNorm));
  return raw ? JSON.parse(raw) : null;
}

export async function listarEmailsSalvos(): Promise<string[]> {
  return getIndice();
}

export async function removerCredencialLocal(email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  await deleteItem(chaveDoEmail(emailNorm));

  const indice = await getIndice();
  const novoIndice = indice.filter((e) => e !== emailNorm);
  await setItem(INDICE_KEY, JSON.stringify(novoIndice));
}

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

  await setItem(chaveDoEmail(email), JSON.stringify(atualizada));
}
