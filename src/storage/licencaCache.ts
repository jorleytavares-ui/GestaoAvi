// src/storage/licencaCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StatusLicenca = 'trial' | 'ativa' | 'expirada';

export type LicencaCache = {
  empresaId: string;
  status: StatusLicenca;
  limiteLotes: number;
  lotesGerados: number;
  trialInicio: string;
  trialDias: number;
  expiraEm: string | null;
  atualizadoEm: string; // ISO — quando essa foto foi tirada do servidor
};

function chave(empresaId: string) {
  return `@gestaoavi:licencaCache:${empresaId}`;
}

export async function salvarLicencaCache(licenca: LicencaCache): Promise<void> {
  await AsyncStorage.setItem(chave(licenca.empresaId), JSON.stringify(licenca));
}

export async function getLicencaCache(empresaId: string): Promise<LicencaCache | null> {
  const raw = await AsyncStorage.getItem(chave(empresaId));
  return raw ? JSON.parse(raw) : null;
}
