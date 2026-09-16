// src/storage/licencaCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StatusLicenca = 'trial' | 'ativa' | 'expirada' | 'pendente';

export type LicencaCache = {
  empresaId: string;
  status: StatusLicenca;
  limiteLotes: number;
  lotesGerados: number;
  trialInicio: string;
  trialDias: number;
  expiraEm: string | null;

  // Plano
  planoId: string | null;
  planoNome: string | null;
  planoDescricao: string | null;
  tipoLimite: string | null;

  // Limites do plano
  usaLimiteLotes: boolean | null;
  usaLimiteFrangos: boolean | null;
  limiteFrangos: number | null;
  frangosUtilizados: number | null;

  // Período (se aplicável)
  usaPeriodo: boolean | null;
  dataInicial: string | null;
  dataFinal: string | null;

  // Asaas / cobrança
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  cobrancaId: string | null;
  pagamentoStatus: string | null;
  valorPago: number | null;

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

export async function limparLicencaCache(empresaId: string): Promise<void> {
  await AsyncStorage.removeItem(chave(empresaId));
}
