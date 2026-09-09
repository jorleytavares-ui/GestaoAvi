// src/storage/perfilCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PapelId } from '../constants/papeis';

type PerfilCache = {
  id: string;
  nome: string;
  empresaId: string;
  papelId: PapelId;
  ownerId: string;
  empresaTipo?: string;
  precisaRedefinirSenha: boolean; // 👈 apenas o tipo, sem lógica aqui
};

function chave(userId: string) {
  return `@gestaoavi:perfilCache:${userId}`;
}

export async function salvarPerfilCache(perfil: PerfilCache): Promise<void> {
  await AsyncStorage.setItem(chave(perfil.id), JSON.stringify(perfil));
}

export async function getPerfilCache(userId: string): Promise<PerfilCache | null> {
  const raw = await AsyncStorage.getItem(chave(userId));
  return raw ? JSON.parse(raw) : null;
}
