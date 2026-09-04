// src/storage/perfilCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type PerfilCache = {
  id: string;
  nome: string;
  empresaId: string;
  papel: string;
  ownerId: string;
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
