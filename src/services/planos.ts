import { supabase } from '../lib/supabase';

export type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  eh_trial: boolean;
  usa_periodo: boolean;
  duracao_dias: number | null;
  usa_limite_lotes: boolean;
  limite_lotes: number | null;
  usa_limite_frangos: boolean;
  limite_frangos: number | null;
  valor: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PlanoInput = Omit<Plano, 'id' | 'created_at' | 'updated_at'>;

export async function listarPlanos(): Promise<{ data: Plano[]; error: string | null }> {
  const { data, error } = await supabase
    .from('planos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as Plano[]) ?? [], error: null };
}

export async function criarPlano(input: PlanoInput): Promise<{ error: string | null }> {
  const { error } = await supabase.from('planos').insert(input);
  return { error: error?.message ?? null };
}

export async function atualizarPlano(
  id: string,
  input: Partial<PlanoInput>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('planos')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function excluirPlano(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('planos').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function alternarAtivoPlano(
  id: string,
  ativo: boolean
): Promise<{ error: string | null }> {
  return atualizarPlano(id, { ativo });
}

export async function listarPlanosAtivos() {
  const { data, error } = await supabase
    .from('planos')
    .select('*')
    .eq('ativo', true)
    .order('valor', { ascending: true });

  if (error) throw error;
  return data;
}

