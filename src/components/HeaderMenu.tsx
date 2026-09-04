// src/components/HeaderMenu.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { usePerfil } from '../hooks/usePerfil';
import { sincronizarTudo } from '../storage/sync';
import { getLotes } from '../storage/storage';

export function HeaderMenu() {
  const [visivel, setVisivel] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const navigation = useNavigation<any>();
  const { signOut, userId } = useAuth(); // ✅ userId obtido aqui, no topo
  const { perfil, ownerId } = usePerfil();

  function irParaConfiguracoes() {
    setVisivel(false);
    navigation.navigate('Configuracoes');
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
      const resultado = await sincronizarTudo(perfil.empresa_id, ownerId);
      const falhas = resultado?.push?.falhas ?? 0;

      if (falhas > 0) {
        const lotes = await getLotes(userId); // ✅ usa a variável do topo
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
              disabled={sincronizando}
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
    minWidth: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  itemTexto: { fontSize: 15, color: '#333' },
  separador: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
});
