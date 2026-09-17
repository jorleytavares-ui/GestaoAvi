import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import "./global.css";

import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { migrarIdsInvalidosDeLotes } from './src/storage/storage';

import { usePerfil } from './src/hooks/usePerfil';
import { useAutoSync } from './src/hooks/useAutoSync';

// 👇 fica DENTRO do AuthProvider, pois usa useAuth()
function AppInterno() {
  const { userId } = useAuth();
  const { perfil, ownerId } = usePerfil();
  useAutoSync(perfil?.empresa_id ?? null, ownerId);

  // ✅ Migração de IDs inválidos, agora isolada por usuário
  useEffect(() => {
    if (!userId) return;
    (async () => {
      await migrarIdsInvalidosDeLotes(userId);
    })();
  }, [userId]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
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
