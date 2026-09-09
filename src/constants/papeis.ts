// src/constants/papeis.ts
export const PAPEL_ID = {
  ADMIN: 1,
  INTEGRADOR: 2,
  INTEGRADO: 3,
  GERENTE: 4,
  VETERINARIO: 5,
  GRANJEIRO: 6,
  GESTOR: 7,
} as const;

export type PapelId = typeof PAPEL_ID[keyof typeof PAPEL_ID];

export const PODE_CADASTRAR_USUARIO: PapelId[] = [
  PAPEL_ID.ADMIN,
  PAPEL_ID.INTEGRADOR,
  PAPEL_ID.INTEGRADO,
  PAPEL_ID.GERENTE,
];

export function podeCadastrarUsuario(papelId?: PapelId | null) {
  return !!papelId && PODE_CADASTRAR_USUARIO.includes(papelId);
}

export const PODE_EDITAR_EMPRESA: PapelId[] = [
  PAPEL_ID.ADMIN,
  PAPEL_ID.INTEGRADOR,
  PAPEL_ID.INTEGRADO,
];

export function podeEditarEmpresa(papelId?: PapelId | null) {
  return !!papelId && PODE_EDITAR_EMPRESA.includes(papelId);
}
