import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://ozjwxrtqeejqoncaslgb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_hV0753nccS71_5OYKv2PbA_6pG81BED';

// Mesma chave que o supabase-js usa por padrão (não muda nada nas sessões já instaladas).
export const SUPABASE_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    storageKey: SUPABASE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Recomendação oficial do supabase-js para React Native: o auto-refresh só deve rodar com
// o app em primeiro plano (em background o JS é suspenso e os timers ficam inconsistentes).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// REMOVIDO: o onAuthStateChange que chamava emitSessaoInvalida() em SIGNED_OUT /
// TOKEN_REFRESHED sem sessão. O supabase-js emite SIGNED_OUT sempre que um refresh falha
// de forma definitiva — isso derrubava o usuário (e o login offline junto). Quem trata
// os eventos de auth agora é o AuthContext, que sabe distinguir "caiu a rede" de
// "token realmente morto".
