// src/auth/sessaoLocal.ts
// Leitura da sessão SEM tocar na rede.
//
// supabase.auth.getSession() com access token expirado tenta renovar (com retries e
// backoff de vários segundos) e, sem internet, devolve session = null. Para abrir o app
// offline instantaneamente, lemos o que o próprio supabase-js persistiu no AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { SUPABASE_STORAGE_KEY } from '../lib/supabase';

export async function lerSessaoPersistidaDoClient(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s?.access_token && s?.refresh_token && s?.user?.id) return s as Session;
    return null;
  } catch {
    return null;
  }
}

/** Sessão "local": só identifica o usuário no app. Não vale como token no servidor. */
export function montarSessaoOffline(params: {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}): Session {
  return {
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: params.userId,
      email: params.email,
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '',
    },
  } as unknown as Session;
}
