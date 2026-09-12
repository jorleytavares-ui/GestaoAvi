// src/utils/alerta.ts
import { Alert, Platform } from 'react-native';

type Botao = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export function alertaUniversal(
  titulo: string,
  mensagem?: string,
  botoes?: Botao[]
) {
  // Mobile: comportamento nativo, sem alterações
  if (Platform.OS !== 'web') {
    Alert.alert(titulo, mensagem, botoes);
    return;
  }

  const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;

  // Caso 1: sem botões ou só 1 botão -> window.alert
  if (!botoes || botoes.length <= 1) {
    window.alert(texto);
    botoes?.[0]?.onPress?.();
    return;
  }

  // Caso 2: 2 botões -> window.confirm (Cancelar / Confirmar)
  if (botoes.length === 2) {
    const cancelar = botoes.find((b) => b.style === 'cancel') ?? botoes[0];
    const confirmar = botoes.find((b) => b !== cancelar) ?? botoes[1];

    const ok = window.confirm(texto);
    if (ok) confirmar.onPress?.();
    else cancelar.onPress?.();
    return;
  }

  // Caso 3: 3+ botões -> window não suporta, cai no primeiro que não seja "cancel"
  window.alert(texto + '\n\n(Escolha indisponível no navegador — ação padrão aplicada)');
  const padrao = botoes.find((b) => b.style !== 'cancel') ?? botoes[0];
  padrao.onPress?.();
}
