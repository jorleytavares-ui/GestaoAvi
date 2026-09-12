// src/services/empresas.ts
import { supabase } from '../lib/supabase'; 


export type VinculoStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface EmpresaVinculada {
  id: string;
  nome: string;
  codigo_parceiro: string | null;
  vinculo_status: VinculoStatus | null;
  status_em: string | null;
  status_por: string | null;
}

// ---------- Lista empresas já APROVADAS (usado nos filtros/listagens) ----------
export async function listarEmpresasVinculadas(empresaIdIntegracao: string) {
  return supabase
    .from('empresas')
    .select('id, nome, codigo_parceiro, vinculo_status, status_em, status_por')
    .eq('codigo_integracao', empresaIdIntegracao)
    .eq('tipo', 'Integrado')
    .eq('vinculo_status', 'aprovado');
}

// ---------- Lista solicitações PENDENTES (para a tela de aprovação) ----------
export async function listarSolicitacoesPendentes(empresaIdIntegracao: string) {
  return supabase
    .from('empresas')
    .select('id, nome, codigo_parceiro, vinculo_status, status_em, status_por')
    .eq('codigo_integracao', empresaIdIntegracao)
    .eq('tipo', 'Integrado')
    .eq('vinculo_status', 'pendente');
}

// ---------- Aprovar vínculo ----------
export async function aprovarVinculo(empresaId: string, userId: string) {
  const { data, error } = await supabase
    .from('empresas')
    .update({
      vinculo_status: 'aprovado',
      status_em: new Date().toISOString(),
      status_por: userId,
    })
    .eq('id', empresaId)
    .select() // 👈 força retorno da linha afetada
    .maybeSingle();

  if (!error && !data) {
    return { data, error: { message: 'Nenhuma linha foi atualizada. Verifique as permissões (RLS).' } };
  }

  return { data, error };
}

// ---------- Rejeitar vínculo ----------
export async function rejeitarVinculo(empresaId: string, userId: string) {
  return supabase
    .from('empresas')
    .update({
      vinculo_status: 'rejeitado',
      status_em: new Date().toISOString(),
      status_por: userId,
      codigo_integracao: null, // 👈 libera para nova tentativa
    })
    .eq('id', empresaId)
    .select()
    .maybeSingle();
}



// ---------- Consulta o status do próprio vínculo (usado pela empresa Integrado) ----------
export async function buscarStatusVinculo(empresaId: string) {
  return supabase
    .from('empresas')
    .select('vinculo_status, status_em, status_por, codigo_integracao')
    .eq('id', empresaId)
    .maybeSingle();
}
