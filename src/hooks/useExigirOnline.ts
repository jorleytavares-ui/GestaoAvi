// src/hooks/useExigirOnline.ts
// Checagem única para qualquer ação que SÓ funciona online (menu, banner, etc.).
// Se não houver como falar com o servidor agora: volta para a Home e avisa o usuário.
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth, MotivoSemOnline } from '../auth/AuthContext';
import { alertaUniversal } from '../utils/alerta';

function mensagemSemOnline(recurso: string, motivo: MotivoSemOnline): string {
  switch (motivo) {
    case 'modo-offline':
      return `"${recurso}" precisa de internet, mas o app está no modo "Sempre offline". Altere o modo de sincronização em Configurações para usar este recurso.`;
    case 'sessao':
      return `Não foi possível validar sua sessão no servidor para abrir "${recurso}". Tente novamente em instantes.`;
    default:
      return `"${recurso}" só funciona com internet. Você está offline no momento — conecte-se e tente novamente.`;
  }
}

export function useExigirOnline() {
  const navigation = useNavigation<any>();
  const { garantirOnline } = useAuth();

  /**
   * @param recurso   nome mostrado no aviso (ex.: "Meu Plano")
   * @param aoBloquear callback opcional, chamado ANTES do aviso (ex.: fechar um menu aberto)
   * @returns true se pode prosseguir; false se bloqueou (aviso já exibido)
   */
  return useCallback(
    async (recurso: string, aoBloquear?: () => void): Promise<boolean> => {
      const resultado = await garantirOnline();
      if (resultado.ok) return true;

      aoBloquear?.();
      navigation.navigate('Home'); // se já está na Home, não faz nada
      alertaUniversal('Sem conexão', mensagemSemOnline(recurso, resultado.motivo));
      return false;
    },
    [garantirOnline, navigation]
  );
}
