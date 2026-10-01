// src/storage/syncPrefs.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ModoSync = 'horario' | 'online' | 'intervalo' | 'offline' | 'manual';


const MODO_KEY = '@gestaoavi:syncModo';
const HORARIO_KEY = '@gestaoavi:syncHorario';        // "HH:mm" — usado no modo 'horario'
const INTERVALO_KEY = '@gestaoavi:syncIntervaloMin'; // minutos — usado no modo 'intervalo'
const ULTIMA_SYNC_KEY = '@gestaoavi:ultimaSyncTimestamp'; // ISO completo
const ULTIMA_SYNC_DATA_KEY = '@gestaoavi:ultimaSyncData'; // "YYYY-MM-DD" (p/ modo horário, 1x/dia)
const ULTIMA_LICENCA_CHECK_KEY = '@gestaoavi:ultimaLicencaCheck';

// Notifica quem depende do modo/horário (AuthContext) assim que o usuário salva a config,
// em vez de esperar o próximo polling.
type PrefsListener = () => void;
const prefsListeners: PrefsListener[] = [];

export function onSyncPrefsChange(fn: PrefsListener) {
  prefsListeners.push(fn);
  return () => {
    const idx = prefsListeners.indexOf(fn);
    if (idx >= 0) prefsListeners.splice(idx, 1);
  };
}

function emitSyncPrefsChange() {
  prefsListeners.forEach((fn) => fn());
}

export async function getModoSync(): Promise<ModoSync> {
  const v = await AsyncStorage.getItem(MODO_KEY);
  return (v as ModoSync) || 'online'; // padrão: sempre que estiver online
}

export async function setModoSync(modo: ModoSync): Promise<void> {
  await AsyncStorage.setItem(MODO_KEY, modo);
  emitSyncPrefsChange();
}

export async function getHorarioSync(): Promise<string | null> {
  return AsyncStorage.getItem(HORARIO_KEY);
}

export async function setHorarioSync(horario: string): Promise<void> {
  await AsyncStorage.setItem(HORARIO_KEY, horario);
  emitSyncPrefsChange();
}

export async function getIntervaloSyncMin(): Promise<number> {
  const v = await AsyncStorage.getItem(INTERVALO_KEY);
  return v ? Number(v) : 30; // padrão: 30 minutos
}

export async function setIntervaloSyncMin(minutos: number): Promise<void> {
  await AsyncStorage.setItem(INTERVALO_KEY, String(minutos));
}

export async function getUltimaSyncTimestamp(): Promise<string | null> {
  return AsyncStorage.getItem(ULTIMA_SYNC_KEY);
}

export async function setUltimaSyncTimestamp(): Promise<void> {
  await AsyncStorage.setItem(ULTIMA_SYNC_KEY, new Date().toISOString());
}

export async function getUltimaSyncData(): Promise<string | null> {
  return AsyncStorage.getItem(ULTIMA_SYNC_DATA_KEY);
}

export async function setUltimaSyncData(data: string): Promise<void> {
  await AsyncStorage.setItem(ULTIMA_SYNC_DATA_KEY, data);
}

export async function getUltimaLicencaCheck(): Promise<string | null> {
  return AsyncStorage.getItem(ULTIMA_LICENCA_CHECK_KEY);
}

export async function setUltimaLicencaCheck(): Promise<void> {
  await AsyncStorage.setItem(ULTIMA_LICENCA_CHECK_KEY, new Date().toISOString());
}
