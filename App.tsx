import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import * as Updates from 'expo-updates';
import "./global.css";

import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { migrarIdsInvalidosDeLotes } from './src/storage/storage';

import { usePerfil } from './src/hooks/usePerfil';
import { useAutoSync } from './src/hooks/useAutoSync';
import { PromptSenhaModal } from './src/components/PromptSenhaModal';
import { Alert } from 'react-native';

// 👇 fica DENTRO do AuthProvider, pois usa useAuth()
function AppInterno() {
  const { userId, reautenticacaoPendente, reautenticarComSenha, adiarReautenticacao } = useAuth();
  const [reautenticando, setReautenticando] = React.useState(false);
  const { perfil, ownerId } = usePerfil();
  useAutoSync(perfil?.empresa_id ?? null, ownerId);

  // ✅ Migração de IDs inválidos, agora isolada por usuário
  useEffect(() => {
    if (!userId) return;
    (async () => {
      await migrarIdsInvalidosDeLotes(userId);
    })();
  }, [userId]);

  async function confirmarReautenticacao(senha: string) {
    setReautenticando(true);
    const { error } = await reautenticarComSenha(senha);
    setReautenticando(false);
    if (error) Alert.alert('Não foi possível entrar', error);
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>

      {/* Só aparece no caso raro em que o token remoto morreu de vez (senha trocada em outro
          aparelho, sessão revogada) e não há senha em memória. O usuário continua trabalhando
          offline por baixo; a tela atual NÃO é derrubada. */}
      <PromptSenhaModal
        visible={reautenticacaoPendente}
        titulo="Reconectar ao servidor"
        descricao="Sua sessão online expirou. Digite sua senha para voltar a sincronizar. Você pode continuar trabalhando offline."
        onCancelar={adiarReautenticacao}
        onConfirmar={confirmarReautenticacao}
        carregando={reautenticando}
      />
    </SafeAreaProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ZillaSlab_600SemiBold: require('./assets/fonts/ZillaSlab_600SemiBold.ttf'),
    ZillaSlab_700Bold: require('./assets/fonts/ZillaSlab_700Bold.ttf'),
    WorkSans_400Regular: require('./assets/fonts/WorkSans_400Regular.ttf'),
    WorkSans_500Medium: require('./assets/fonts/WorkSans_500Medium.ttf'),
    WorkSans_600SemiBold: require('./assets/fonts/WorkSans_600SemiBold.ttf'),
    WorkSans_700Bold: require('./assets/fonts/WorkSans_700Bold.ttf'),
    IBMPlexMono_600SemiBold: require('./assets/fonts/IBMPlexMono_600SemiBold.ttf'),
  });

  // ✅ Checa e aplica atualizações OTA na mesma sessão (sem precisar reabrir 2x)
  useEffect(() => {
    async function checarAtualizacao() {
      if (__DEV__) return; // não faz nada no Expo Go / modo dev
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('Erro ao checar atualização:', e);
      }
    }
    checarAtualizacao();
  }, []);

  console.log('fontsLoaded:', fontsLoaded, 'fontError:', fontError);

  if (fontError) {
    console.error('Erro ao carregar fontes:', fontError);
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center' }}>
        <Text style={{ color: 'white' }}>Carregando fontes...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppInterno />
    </AuthProvider>
  );
}
