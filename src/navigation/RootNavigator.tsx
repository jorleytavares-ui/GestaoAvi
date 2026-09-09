// src/navigation/RootNavigator.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { NovoLoteScreen } from '../screens/NovoLoteScreen';
import { DetalheLoteScreen } from '../screens/DetalheLoteScreen';
import { EncerrarForm } from '../screens/EncerrarForm';
import { ConfiguracoesScreen } from '../screens/ConfiguracoesScreen';
import { LoginScreen } from '../auth/LoginScreen';
import { CadastroScreen } from '../auth/CadastroScreen';
import { useAuth } from '../auth/AuthContext';
import { useLicenca } from '../hooks/useLicenca';
import { LicencaBloqueadaScreen } from '../screens/LicencaBloqueadaScreen';
import type { RootStackParamList, AuthStackParamList } from './types';
import { COLORS } from '../theme/colors';
import { CadastroUsuarioScreen } from '../screens/CadastroUsuarioScreen';
import { TrocarSenhaObrigatoria } from '../screens/TrocarSenhaObrigatoria'; 
import { EditarEmpresaScreen } from '../screens/EditarEmpresaScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Cadastro" component={CadastroScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="NovoLote" component={NovoLoteScreen} />
      <Stack.Screen name="DetalheLote" component={DetalheLoteScreen} />
      <Stack.Screen name="EncerrarForm" component={EncerrarForm} options={{ title: 'Encerrar lote' }} />
      <Stack.Screen
  name="EditarEmpresa"
  component={EditarEmpresaScreen}
  options={{ headerShown: false }}
/>
      <Stack.Screen
        name="Configuracoes"
        component={ConfiguracoesScreen}
        options={{ headerShown: true, title: 'Configurações' }}
      />
      <Stack.Screen
        name="CadastroUsuario"
        component={CadastroUsuarioScreen}
        options={{ headerShown: true, title: 'Cadastro de Usuário' }}
      />
    </Stack.Navigator>
  );
}

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

// Intercepta o acesso ao app quando a licença estiver em situação bloqueante
// (expirada, relógio manipulado, ou offline sem nunca ter sincronizado a licença).
// O limite de lotes por plano NÃO é tratado aqui — isso é validado dentro do
// fluxo de criação de lote (NovoLoteScreen), pois não deve impedir o acesso
// às demais funcionalidades do app (consultar histórico, sincronizar, etc.).
function LicencaGate({ children }: { children: React.ReactNode }) {
  const { carregando, status, offlineSemCache, relogioSuspeito, recarregar } = useLicenca();

  if (carregando) {
    return <Loading />;
  }

  if (relogioSuspeito) {
    return (
      <LicencaBloqueadaScreen
        motivo="Detectamos uma alteração no relógio do aparelho. Conecte-se à internet para revalidar sua licença."
        onTentarNovamente={recarregar}
      />
    );
  }

  if (offlineSemCache) {
    return (
      <LicencaBloqueadaScreen
        motivo="Conecte-se à internet ao menos uma vez neste aparelho para validar sua licença."
        onTentarNovamente={recarregar}
      />
    );
  }

  if (status === 'expirada') {
    return (
      <LicencaBloqueadaScreen
        motivo="Sua licença expirou. Conecte-se à internet para renovar ou entre em contato com o suporte."
        onTentarNovamente={recarregar}
      />
    );
  }

  return <>{children}</>;
}

export function RootNavigator() {
  const { session, carregandoSessao, precisaRedefinirSenha } = useAuth(); // ✅ novo

  if (carregandoSessao) {
    return <Loading />;
  }

  if (!session) {
    return <AuthNavigator />;
  }

  // ✅ Bloqueia o acesso ao app até o usuário trocar a senha temporária
  if (precisaRedefinirSenha) {
    return <TrocarSenhaObrigatoria />;
  }

  return (
    <LicencaGate>
      <AppNavigator />
    </LicencaGate>
  );
}
