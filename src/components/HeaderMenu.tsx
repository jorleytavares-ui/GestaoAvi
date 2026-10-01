// src/components/HeaderMenu.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { usePerfil } from '../hooks/usePerfil';
import { sincronizarTudo } from '../storage/sync';
import { getLotes } from '../storage/storage';
import { podeCadastrarUsuario, podeEditarEmpresa, podeGerenciarPlano } from '../constants/papeis';
import { useExigirOnline } from '../hooks/useExigirOnline';

export function HeaderMenu() {
  const [visivel, setVisivel] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [verificando, setVerificando] = useState(false); // checando a conexão após um clique
  const navigation = useNavigation<any>();
  const { signOut, userId, empresaTipo } = useAuth();
  const exigirOnlineBase = useExigirOnline();
  const { perfil, ownerId } = usePerfil();

  const isIntegracao = empresaTipo === 'Integracao';

  /** Se estiver offline: fecha o menu, volta para a Home e avisa. */
  function exigirOnline(recurso: string): Promise<boolean> {
    return exigirOnlineBase(recurso, () => setVisivel(false));
  }

  /** Navega para uma tela que só funciona online. */
  async function irParaTelaOnline(destino: string, recurso: string) {
    if (verificando) return; // evita toque duplo enquanto a conexão é verificada
    setVerificando(true);
    try {
      if (!(await exigirOnline(recurso))) return;
      setVisivel(false);
      navigation.navigate(destino);
    } finally {
      setVerificando(false);
    }
  }

  function irParaConfiguracoes() {
    setVisivel(false);
    navigation.navigate('Configuracoes');
  }

  function irParaSolicitacoesVinculo() {
    irParaTelaOnline('SolicitacoesVinculo', 'Solicitações de vínculo');
  }

  async function sair() {
    setVisivel(false);
    await signOut();
  }

  async function sincronizarAgora() {
    if (!perfil?.empresa_id || !ownerId || !userId) {
      Alert.alert('Aviso', 'Não foi possível identificar a empresa/usuário.');
      return;
    }

    setSincronizando(true);
    try {
      if (!(await exigirOnline('Sincronizar agora'))) return;

      const resultado = await sincronizarTudo(perfil.empresa_id, ownerId);
      const falhas = resultado?.push?.falhas ?? 0;

      if (falhas > 0) {
        const lotes = await getLotes(userId);
        const comErro = lotes.filter((l) => l.syncStatus === 'erro');
        const detalhes = comErro
          .map((l) => `Lote ${l.numero}: ${l.syncError ?? 'erro desconhecido'}`)
          .join('\n');

        Alert.alert(
          'Sincronização concluída',
          `${falhas} registro(s) não foram sincronizados.\n\n${detalhes}`
        );
      } else {
        Alert.alert('Sincronização concluída', 'Todos os dados foram sincronizados com sucesso.');
      }
    } catch (e: any) {
      Alert.alert('Erro ao sincronizar', e?.message ?? 'Verifique sua conexão e tente novamente.');
    } finally {
      setSincronizando(false);
      setVisivel(false);
    }
  }

  return (
    <View>
      <TouchableOpacity onPress={() => setVisivel(true)} style={styles.botaoMenu}>
        <Ionicons name="menu" size={26} color="#333" />
      </TouchableOpacity>

      <Modal
        visible={visivel}
        transparent
        animationType="fade"
        onRequestClose={() => setVisivel(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisivel(false)}
        >
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.item}
              onPress={sincronizarAgora}
              disabled={sincronizando || verificando}
            >
              {sincronizando ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <Ionicons name="sync-outline" size={20} color="#333" />
              )}
              <Text style={styles.itemTexto}>
                {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
              </Text>
            </TouchableOpacity>

            <View style={styles.separador} />

            <TouchableOpacity style={styles.item} onPress={irParaConfiguracoes}>
              <Ionicons name="settings-outline" size={20} color="#333" />
              <Text style={styles.itemTexto}>Configurações</Text>
            </TouchableOpacity>

            {podeCadastrarUsuario(perfil?.papelId) && (
              <>
                <View style={styles.separador} />
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => irParaTelaOnline('CadastroUsuario', 'Cadastro de Usuário')}
                  disabled={verificando}
                >
                  <Ionicons name="person-add-outline" size={20} color="#333" />
                  <Text style={styles.itemTexto}>Cadastro de Usuário</Text>
                </TouchableOpacity>
              </>
            )}

            {podeEditarEmpresa(perfil?.papelId) && (
              <>
                <View style={styles.separador} />
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => irParaTelaOnline('EditarEmpresa', 'Editar Empresa')}
                  disabled={verificando}
                >
                  <Ionicons name="business-outline" size={20} color="#333" />
                  <Text style={styles.itemTexto}>Editar Empresa</Text>
                </TouchableOpacity>
              </>
            )}

            {perfil?.papelId === 1 && (
              <>
                <View style={styles.separador} />
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => irParaTelaOnline('Planos', 'Cad. Planos (Admin)')}
                  disabled={verificando}
                >
                  <Ionicons name="pricetags-outline" size={20} color="#333" />
                  <Text style={styles.itemTexto}>Cad. Planos (Admin)</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ✅ "Meu Plano" restrito aos papéis 1 (Admin), 3 (Integrado) e 7 (Gestor) */}
            {podeGerenciarPlano(perfil?.papelId) && (
              <>
                <View style={styles.separador} />
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => irParaTelaOnline('EscolherPlano', 'Meu Plano')}
                  disabled={verificando}
                >
                  <Ionicons name="pricetags-outline" size={20} color="#333" />
                  <Text style={styles.itemTexto}>Meu Plano</Text>
                </TouchableOpacity>
              </>
            )}

            {isIntegracao && podeEditarEmpresa(perfil?.papelId) && (
              <>
                <View style={styles.separador} />
                <TouchableOpacity style={styles.item} onPress={irParaSolicitacoesVinculo} disabled={verificando}>
                  <Ionicons name="link-outline" size={20} color="#333" />
                  <Text style={styles.itemTexto}>Solicitações de vínculo</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.separador} />

            <TouchableOpacity style={styles.item} onPress={sair}>
              <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
              <Text style={[styles.itemTexto, { color: '#d32f2f' }]}>Sair</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  botaoMenu: { padding: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdown: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 220,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  itemTexto: { fontSize: 15, color: '#333' },
  separador: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
});
