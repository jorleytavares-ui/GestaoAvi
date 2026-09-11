// src/services/empresas.ts
import { supabase } from '../lib/supabase'; // ajuste o caminho do seu client

export interface EmpresaVinculada {
  id: string;
  nome: string;
  codigo_parceiro: string | null;
}

export async function listarEmpresasVinculadas(empresaIdIntegracao: string) {
  return supabase
    .from('empresas')
    .select('id, nome, codigo_parceiro')
    .eq('codigo_integracao', empresaIdIntegracao)
    .eq('tipo', 'Integrado');
}
