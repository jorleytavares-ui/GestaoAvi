// src/navigation/RootNavigator.tsx
import React, { useRef } from 'react';
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
import { usePerfil } from '../hooks/usePerfil';
import { LicencaBloqueadaScreen } from '../screens/LicencaBloqueadaScreen';
import type { RootStackParamList, AuthStackParamList } from './types';
import { COLORS } from '../theme/colors';
import { CadastroUsuarioScreen } from '../screens/CadastroUsuarioScreen';
import { TrocarSenhaObrigatoria } from '../screens/TrocarSenhaObrigatoria';
import { EditarEmpresaScreen } from '../screens/EditarEmpresaScreen';
import { SolicitacoesVinculoScreen } from '../screens/SolicitacoesVinculoScreen';
import { PlanosScreen } from '../screens/PlanosScreen';
import { EscolherPlanoScreen } from '../screens/EscolherPlanoScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';

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
      <Stack.Screen
        name="SolicitacoesVinculo"
        component={SolicitacoesVinculoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Planos"
        component={PlanosScreen}
        options={{ headerShown: true, title: 'Planos' }}
      />
      <Stack.Screen
  name="Checkout"
  component={CheckoutScreen}
  options={{ headerShown: true, title: 'Finalizar assinatura' }}
/>
      <Stack.Screen name="EscolherPlano" component={EscolherPlanoScreen} />
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

function LicencaGate({ children }: { children: React.ReactNode }) {
  const { perfil, carregandoPerfil } = usePerfil();
  const { carregando, status, offlineSemCache, relogioSuspeito, recarregar } = useLicenca();

  // Guarda a última decisão do gate. Quando o app volta a ficar online (login silencioso)
  // o perfil/licença são recarregados em segundo plano; durante essa recarga mostramos a
  // MESMA tela de antes em vez de <Loading/>. Antes, o spinner desmontava o navegador
  // inteiro e o usuário perdia a tela/formulário em que estava.
  const ultimoRef = useRef<React.ReactNode>(null);

  const admin = perfil?.papelId === 1;
  const emCarga = carregandoPerfil || (!admin && carregando);
  if (emCarga) {
    return <>{ultimoRef.current ?? <Loading />}</>;
  }

  let node: React.ReactNode;

  if (admin) {
    // Admin proprietário do app nunca é bloqueado por licença
    node = children;
  } else if (relogioSuspeito) {
    node = (
      <LicencaBloqueadaScreen
        motivo="Detectamos uma alteração no relógio do aparelho. Conecte-se à internet para revalidar sua licença."
        onTentarNovamente={recarregar}
      />
    );
  } else if (offlineSemCache) {
    node = (
      <LicencaBloqueadaScreen
        motivo="Conecte-se à internet ao menos uma vez neste aparelho para validar sua licença."
        onTentarNovamente={recarregar}
      />
    );
  } else if (status === 'expirada') {
    node = (
      <LicencaBloqueadaScreen
        motivo="Sua licença expirou. Conecte-se à internet para renovar ou entre em contato com o suporte."
        onTentarNovamente={recarregar}
      />
    );
  } else {
    node = children;
  }

  ultimoRef.current = node;
  return <>{node}</>;
}

export function RootNavigator() {
  const { session, carregandoSessao, precisaRedefinirSenha } = useAuth();

  if (carregandoSessao) {
    return <Loading />;
  }

  if (!session) {
    return <AuthNavigator />;
  }

  if (precisaRedefinirSenha) {
    return <TrocarSenhaObrigatoria />;
  }

  return (
    <LicencaGate>
      <AppNavigator />
    </LicencaGate>
  );
}
