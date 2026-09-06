// src/services/usuarios.ts
import { supabase } from '../lib/supabase';

export async function cadastrarUsuario(params: {
  nome: string;
  cpf: string;
  emailContato?: string;
  senha: string;
  telefone: string;
  empresa_id: string;
  papel_id: number;
}) {
  const { data, error } = await supabase.functions.invoke('cadastrar-usuario', {
    body: params,
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { success: true, userId: data.userId };
}

// ✅ Lista os funcionários de uma empresa
export async function listarUsuarios(empresaId: string) {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, cpf, telefone, email_contato, papel_id, precisa_redefinir_senha')
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

// ✅ Atualiza dados de um funcionário já cadastrado (nome, telefone, e-mail, papel)
export async function atualizarUsuario(params: {
  id: string;
  nome: string;
  telefone: string;
  emailContato?: string;
  papel_id: number;
}) {
  const { error } = await supabase
    .from('perfis')
    .update({
      nome: params.nome,
      telefone: params.telefone,
      email_contato: params.emailContato ?? null,
      papel_id: params.papel_id,
    })
    .eq('id', params.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ✅ Força redefinição de senha no próximo login (marca flag + Edge Function troca senha temporária)
export async function redefinirSenhaUsuario(params: {
  userId: string;
  novaSenhaTemporaria: string;
}) {
  const { data, error } = await supabase.functions.invoke('redefinir-senha-usuario', {
    body: params,
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { success: true };
}
