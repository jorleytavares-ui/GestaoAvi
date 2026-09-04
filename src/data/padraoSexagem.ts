export interface PontoPesoPadrao {
  idade: number;
  pesoG: number;
}

export type Sexagem = 'misto' | 'femea' | 'macho';

export const LABEL_SEXAGEM: Record<Sexagem, string> = {
  misto: 'Misto',
  femea: 'Fêmea',
  macho: 'Macho',
};

export const DEFAULT_PESO_SEXAGEM: Record<Sexagem, PontoPesoPadrao[]> = {
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
