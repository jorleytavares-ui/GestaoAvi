export const LINHAGENS = ['Cobb 500', 'Cobb 700', 'Ross 308', 'Ross 708', 'Hubbard', 'Outra'];
export const FASES_RACAO = ['Pré-Inicial', 'Inicial', 'Crescimento 1', 'Crescimento 2', 'Final'];
export const MOTIVOS_DESCARTE = ['Refugo', 'Problema locomotor', 'Caquético'];
export const LABEL_SEXAGEM: Record<string, string> = { misto: 'Misto', femea: 'Fêmea', macho: 'Macho' };

export const ITENS_AVALIACAO_TECNICA = [
  { chave: 'condicaoPinteira', label: 'Condição na pinteira no alojamento' },
  { chave: 'usoPapelRecebimento', label: 'Uso de papel no recebimento' },
  { chave: 'confortoTermico', label: 'Conforto térmico' },
  { chave: 'sistemaAquecimento', label: 'Sistema de aquecimento' },
  { chave: 'cloracaoAgua', label: 'Cloração da água' },
  { chave: 'qualidadeCama', label: 'Qualidade da cama' },
  { chave: 'organizacaoInternaExterna', label: 'Organização interna e externa' },
  { chave: 'ventilacaoMinima', label: 'Ventilação mínima' },
  { chave: 'iluminacao', label: 'Iluminação' },
  { chave: 'comedouros', label: 'Comedouros' },
  { chave: 'bebedouros', label: 'Bebedouros' },
  { chave: 'ventiladoresExaustores', label: 'Ventiladores / exaustores' },
  { chave: 'nebulizacao', label: 'Nebulização' },
  { chave: 'limpezaCaixaAgua', label: "Limpeza da caixa d'água" },
  { chave: 'limpezaCondicoesSilo', label: 'Limpeza e condições do silo' },
  { chave: 'controleCascudinho', label: 'Controle de cascudinho' },
  { chave: 'controleRoedores', label: 'Controle de roedores' },
  { chave: 'gasAmonia', label: 'Gás amônia' },
  { chave: 'compostagem', label: 'Compostagem' },
];

export const DEFAULT_FAIXA_CONFORTO = [
  { idade: 0, tempMin: 32, tempMax: 35 },
  { idade: 7, tempMin: 29, tempMax: 32 },
  { idade: 14, tempMin: 26, tempMax: 29 },
  { idade: 21, tempMin: 23, tempMax: 26 },
  { idade: 28, tempMin: 21, tempMax: 24 },
  { idade: 35, tempMin: 20, tempMax: 23 },
  { idade: 42, tempMin: 20, tempMax: 22 },
  { idade: 56, tempMin: 20, tempMax: 22 },
];

export const DEFAULT_PESO_SEXAGEM = {
  misto: [
    { idade: 0, pesoG: 42 }, { idade: 4, pesoG: 112 }, { idade: 7, pesoG: 202 }, { idade: 14, pesoG: 570 },
    { idade: 21, pesoG: 1116 }, { idade: 28, pesoG: 1783 }, { idade: 35, pesoG: 2521 }, { idade: 42, pesoG: 3278 },
  ],
  femea: [
    { idade: 0, pesoG: 42 }, { idade: 4, pesoG: 110 }, { idade: 7, pesoG: 199 }, { idade: 14, pesoG: 537 },
    { idade: 21, pesoG: 1043 }, { idade: 28, pesoG: 1662 }, { idade: 35, pesoG: 2348 }, { idade: 42, pesoG: 3052 },
  ],
  macho: [
    { idade: 0, pesoG: 42 }, { idade: 4, pesoG: 114 }, { idade: 7, pesoG: 205 }, { idade: 14, pesoG: 603 },
    { idade: 21, pesoG: 1284 }, { idade: 28, pesoG: 1904 }, { idade: 35, pesoG: 2694 }, { idade: 42, pesoG: 3503 },
  ],
};
