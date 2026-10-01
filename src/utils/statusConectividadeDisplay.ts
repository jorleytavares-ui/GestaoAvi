// src/utils/statusConectividadeDisplay.ts
import { ModoSync } from '../storage/syncPrefs';

/**
 * Decide se o badge deve mostrar "Online" ou "Offline",
 * respeitando a política de sincronização escolhida pelo usuário
 * — não apenas a conectividade real do aparelho.
 */
export function deveExibirOnline(params: {
  modo: ModoSync;
  netConectado: boolean;
  sincronizandoAgora: boolean;
  dentroDaJanelaAgendada: boolean; // só relevante para modo 'horario'
}): boolean {
  const { modo, netConectado, sincronizandoAgora, dentroDaJanelaAgendada } = params;

  // "Sempre offline": nunca mostra Online, mesmo revalidando licença em background.
  if (modo === 'offline') return false;

  // "Manual": só fica Online durante a sincronização manual ativa.
  if (modo === 'manual') return sincronizandoAgora && netConectado;

  // "Agendada": só fica Online dentro da janela do horário configurado.
  if (modo === 'horario') return dentroDaJanelaAgendada && netConectado;

  // "Sempre online" e "Automática": refletem a conectividade real.
  return netConectado;
}
