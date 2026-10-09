// src/navigation/navigationRef.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateGlobal<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error — overload genérico do react-navigation
    navigationRef.navigate(name, params);
  } else {
    console.log('navigationRef ainda não está pronto para navegar.');
  }
}
