// src/storage/logoCache.ts
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function getKeyMeta(empresaId: string) {
  return `@gestaoavi:logo:meta:${empresaId}`;
}

function getPathLocal(empresaId: string) {
  return `${FileSystem.documentDirectory}logo_${empresaId}.png`;
}

interface LogoMeta {
  atualizadoEm: string | null;
  caminhoLocal: string;
}

async function getMeta(empresaId: string): Promise<LogoMeta | null> {
  const raw = await AsyncStorage.getItem(getKeyMeta(empresaId));
  return raw ? JSON.parse(raw) : null;
}

async function setMeta(empresaId: string, meta: LogoMeta): Promise<void> {
  await AsyncStorage.setItem(getKeyMeta(empresaId), JSON.stringify(meta));
}

/**
 * Compara o timestamp do servidor com o cache local; baixa o logo
 * novamente apenas se estiver desatualizado ou ausente.
 * No web não há FileSystem de arquivo local: a tela usa a URL remota direto.
 */
export async function sincronizarLogo(
  empresaId: string,
  logoUrl: string | null,
  logoAtualizadoEm: string | null
): Promise<void> {
  if (!logoUrl || Platform.OS === 'web') return;

  const metaAtual = await getMeta(empresaId);
  const precisaBaixar =
    !metaAtual ||
    !metaAtual.atualizadoEm ||
    (logoAtualizadoEm && logoAtualizadoEm > metaAtual.atualizadoEm);

  if (!precisaBaixar) return;

  try {
    const caminhoLocal = getPathLocal(empresaId);
    const resultado = await FileSystem.downloadAsync(logoUrl, caminhoLocal);
    if (resultado.status === 200) {
      await setMeta(empresaId, { atualizadoEm: logoAtualizadoEm, caminhoLocal });
    }
  } catch (e) {
    console.log('Erro ao baixar logo da empresa:', e);
  }
}

/**
 * Retorna o logo em base64 (pronto pra usar num <img src="data:..."/>), ou null.
 * No web, não há cache em arquivo — a tela deve usar a URL remota (perfil.logoUrl)
 * diretamente em vez de chamar esta função.
 */
export async function getLogoBase64(empresaId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const meta = await getMeta(empresaId);
  if (!meta) return null;

  const existe = await FileSystem.getInfoAsync(meta.caminhoLocal);
  if (!existe.exists) return null;

  try {
    const base64 = await FileSystem.readAsStringAsync(meta.caminhoLocal, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}
