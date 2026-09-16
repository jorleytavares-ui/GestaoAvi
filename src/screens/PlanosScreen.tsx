import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Pencil, Trash2, Power } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { TextField } from '../components/TextField';
import { alertaUniversal } from '../utils/alerta';
import {
  listarPlanos, criarPlano, atualizarPlano, excluirPlano,
  alternarAtivoPlano, Plano, PlanoInput,
} from '../services/planos';

const PLANO_VAZIO: PlanoInput = {
  nome: '',
  descricao: '',
  eh_trial: false,
  usa_periodo: false,
  duracao_dias: null,
  usa_limite_lotes: false,
  limite_lotes: null,
  usa_limite_frangos: false,
  limite_frangos: null,
  valor: null,
  ativo: true,
};

function Linha({ label, valor, onValueChange }: { label: string; valor: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ color: COLORS.ink, fontSize: 14 }}>{label}</Text>
      <Switch value={valor} onValueChange={onValueChange} trackColor={{ true: COLORS.primary }} />
    </View>
  );
}

export function PlanosScreen() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanoInput>(PLANO_VAZIO);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await listarPlanos();
    if (error) alertaUniversal('Erro', error);
    setPlanos(data);
    setCarregando(false);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function abrirNovo() {
    setEditandoId(null);
    setForm(PLANO_VAZIO);
    setModalVisivel(true);
  }

  function abrirEdicao(plano: Plano) {
    setEditandoId(plano.id);
    setForm({
      nome: plano.nome,
      descricao: plano.descricao ?? '',
      eh_trial: plano.eh_trial,
      usa_periodo: plano.usa_periodo,
      duracao_dias: plano.duracao_dias,
      usa_limite_lotes: plano.usa_limite_lotes,
      limite_lotes: plano.limite_lotes,
      usa_limite_frangos: plano.usa_limite_frangos,
      limite_frangos: plano.limite_frangos,
      valor: plano.valor,
      ativo: plano.ativo,
    });
    setModalVisivel(true);
  }

  function validar(): string | null {
    if (!form.nome.trim()) return 'Informe o nome do plano.';
    if (form.usa_periodo && !form.duracao_dias) return 'Informe a duração em dias.';
    if (form.usa_limite_lotes && !form.limite_lotes) return 'Informe o limite de lotes.';
    if (form.usa_limite_frangos && !form.limite_frangos) return 'Informe o limite de frangos.';
    if (form.valor === null || form.valor === undefined) return 'Informe o valor do plano.';
    return null;
  }

  async function salvar() {
    const erro = validar();
    if (erro) { alertaUniversal('Atenção', erro); return; }

    setSalvando(true);
    const payload: PlanoInput = {
      ...form,
      nome: form.nome.trim(),
      descricao: form.descricao?.trim() || null,
      duracao_dias: form.usa_periodo ? Number(form.duracao_dias) : null,
      limite_lotes: form.usa_limite_lotes ? Number(form.limite_lotes) : null,
      limite_frangos: form.usa_limite_frangos ? Number(form.limite_frangos) : null,
      valor: form.valor !== null ? Number(form.valor) : null,
    };

    const resultado = editandoId
      ? await atualizarPlano(editandoId, payload)
      : await criarPlano(payload);

    setSalvando(false);

    if (resultado.error) {
      alertaUniversal('Erro ao salvar', resultado.error);
      return;
    }
    setModalVisivel(false);
    carregar();
  }

  function confirmarExclusao(plano: Plano) {
    alertaUniversal(
      'Excluir plano',
      `Deseja excluir o plano "${plano.nome}"? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await excluirPlano(plano.id);
            if (error) alertaUniversal('Erro', error);
            else carregar();
          },
        },
      ]
    );
  }

  async function alternarAtivo(plano: Plano) {
    const { error } = await alternarAtivoPlano(plano.id, !plano.ativo);
    if (error) alertaUniversal('Erro', error);
    else carregar();
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {planos.length === 0 ? (
          <Text style={{ color: COLORS.inkSoft, textAlign: 'center', marginTop: 40 }}>
            Nenhum plano cadastrado.
          </Text>
        ) : (
          planos.map((plano) => (
            <View
              key={plano.id}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.line,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.ink }}>{plano.nome}</Text>
                <View
                  style={{
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                    backgroundColor: plano.ativo ? COLORS.primary : COLORS.inkSoft,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                    {plano.ativo ? 'Ativo' : 'Inativo'}
                  </Text>
                </View>
              </View>

              {plano.descricao ? (
                <Text style={{ color: COLORS.inkSoft, fontSize: 13, marginTop: 4 }}>{plano.descricao}</Text>
              ) : null}

              <View style={{ marginTop: 8, gap: 2 }}>
                {plano.eh_trial && <Text style={{ color: COLORS.accent, fontSize: 13 }}>Plano trial</Text>}
                {plano.usa_periodo && (
                  <Text style={{ color: COLORS.inkSoft, fontSize: 13 }}>Duração: {plano.duracao_dias} dias</Text>
                )}
                {plano.usa_limite_lotes && (
                  <Text style={{ color: COLORS.inkSoft, fontSize: 13 }}>Limite de lotes: {plano.limite_lotes}</Text>
                )}
                {plano.usa_limite_frangos && (
                  <Text style={{ color: COLORS.inkSoft, fontSize: 13 }}>Limite de frangos: {plano.limite_frangos}</Text>
                )}
                <Text style={{ color: COLORS.ink, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                  {plano.valor != null ? `R$ ${Number(plano.valor).toFixed(2)}` : '-'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => abrirEdicao(plano)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pencil size={16} color={COLORS.primary} />
                  <Text style={{ color: COLORS.primary, fontSize: 13 }}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => alternarAtivo(plano)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Power size={16} color={COLORS.accent} />
                  <Text style={{ color: COLORS.accent, fontSize: 13 }}>
                    {plano.ativo ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => confirmarExclusao(plano)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={16} color={COLORS.danger} />
                  <Text style={{ color: COLORS.danger, fontSize: 13 }}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={abrirNovo}
        style={{
          position: 'absolute', bottom: 24, right: 20,
          backgroundColor: COLORS.primary, borderRadius: 30,
          width: 58, height: 58, justifyContent: 'center', alignItems: 'center', elevation: 4,
        }}
      >
        <Plus size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisivel} animationType="slide" transparent onRequestClose={() => setModalVisivel(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ backgroundColor: COLORS.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 16 }}>
                {editandoId ? 'Editar plano' : 'Novo plano'}
              </Text>

              <View style={{ gap: 10 }}>
                <TextField label="Nome do plano" value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} />
                <TextField label="Descrição" value={form.descricao ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, descricao: v }))} />
                <TextField
                  label="Valor (R$)"
                  value={form.valor != null ? String(form.valor) : ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, valor: v ? Number(v.replace(',', '.')) : null }))}
                  keyboardType="decimal-pad"
                />

                <Linha label="Plano trial" valor={form.eh_trial} onValueChange={(v) => setForm((f) => ({ ...f, eh_trial: v }))} />
                <Linha label="Ativo" valor={form.ativo} onValueChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />

                <Linha
                  label="Usar período (dias)"
                  valor={form.usa_periodo}
                  onValueChange={(v) => setForm((f) => ({ ...f, usa_periodo: v }))}
                />
                {form.usa_periodo && (
                  <TextField
                    label="Duração (dias)"
                    value={form.duracao_dias != null ? String(form.duracao_dias) : ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, duracao_dias: v ? Number(v) : null }))}
                    keyboardType="numeric"
                  />
                )}

                <Linha
                  label="Limitar quantidade de lotes"
                  valor={form.usa_limite_lotes}
                  onValueChange={(v) => setForm((f) => ({ ...f, usa_limite_lotes: v }))}
                />
                {form.usa_limite_lotes && (
                  <TextField
                    label="Limite de lotes"
                    value={form.limite_lotes != null ? String(form.limite_lotes) : ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, limite_lotes: v ? Number(v) : null }))}
                    keyboardType="numeric"
                  />
                )}

                <Linha
                  label="Limitar quantidade de frangos"
                  valor={form.usa_limite_frangos}
                  onValueChange={(v) => setForm((f) => ({ ...f, usa_limite_frangos: v }))}
                />
                {form.usa_limite_frangos && (
                  <TextField
                    label="Limite de frangos"
                    value={form.limite_frangos != null ? String(form.limite_frangos) : ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, limite_frangos: v ? Number(v) : null }))}
                    keyboardType="numeric"
                  />
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => setModalVisivel(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.surfaceAlt }}
                >
                  <Text style={{ color: COLORS.inkSoft, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={salvar}
                  disabled={salvando}
                  style={{ flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary }}
                >
                  {salvando ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
