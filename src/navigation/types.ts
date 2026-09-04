export type AuthStackParamList = {
  Login: undefined;
  Cadastro: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  NovoLote: undefined;
  DetalheLote: { loteId: string };
  EncerrarForm: { loteId: string };
  Configuracoes: undefined;
};


// src/navigation/types.ts
export type DetalheLoteTabParamList = {
  Resumo: { loteId: string };
  Racao: { loteId: string };
  Agua: { loteId: string };
  Pesagens: { loteId: string };
  Mortalidade: { loteId: string };
  Temperatura: { loteId: string };
  Sanidade: { loteId: string };
  Evolucao: { loteId: string };
  AvaliacaoTecnica: { loteId: string };
  Abate: { loteId: string };
  GraficoComparativo: { loteId: string };
};






