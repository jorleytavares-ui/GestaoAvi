import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import "./global.css";

import {
  ZillaSlab_600SemiBold,
  ZillaSlab_700Bold,
} from '@expo-google-fonts/zilla-slab';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

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
    ZillaSlab_600SemiBold,
    ZillaSlab_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    IBMPlexMono_600SemiBold,
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
