// ============================================================
// Funções puras — portadas sem alteração de lógica do Artifact original
// ============================================================

import * as Crypto from 'expo-crypto';

export const uid = (): string => Crypto.randomUUID();

export const todayStr = (): string => new Date().toISOString().slice(0, 10);

export const fmtDateBR = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const daysBetween = (isoStart: string, isoEnd: string): number => {
  const start = new Date(isoStart + 'T00:00:00');
  const end = new Date(isoEnd + 'T00:00:00');
  return Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), 0);
};

export const dataMenosDias = (iso: string, dias: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

export const fmt = (
  n: number | null | undefined,
  digits: number = 0
): string =>
  n === null || n === undefined || Number.isNaN(n)
    ? '—'
    : n.toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

// ---------- Interpolação (peso padrão, faixa de conforto) ----------

export interface PontoPeso {
  idade: number;
  pesoG: number;
}

export function interpolarPeso(pontos: PontoPeso[], idade: number): number | null {
  if (!pontos || pontos.length === 0) return null;
  const ord = [...pontos].sort((a, b) => a.idade - b.idade);
  if (idade <= ord[0].idade) return ord[0].pesoG;
  if (idade >= ord[ord.length - 1].idade) return ord[ord.length - 1].pesoG;
  for (let i = 0; i < ord.length - 1; i++) {
    const a = ord[i],
      b = ord[i + 1];
    if (idade >= a.idade && idade <= b.idade) {
      const frac = (idade - a.idade) / (b.idade - a.idade || 1);
      return a.pesoG + (b.pesoG - a.pesoG) * frac;
    }
  }
  return null;
}

export function interpolarValor<T extends Record<string, any>>(
  pontos: T[],
  idade: number,
  campo: keyof T
): number | null {
  if (!pontos || pontos.length === 0) return null;
  const ord = [...pontos].sort((a, b) => a.idade - b.idade);
  if (idade <= ord[0].idade) return ord[0][campo];
  if (idade >= ord[ord.length - 1].idade) return ord[ord.length - 1][campo];
  for (let i = 0; i < ord.length - 1; i++) {
    const a = ord[i],
      b = ord[i + 1];
    if (idade >= a.idade && idade <= b.idade) {
      const frac = (idade - a.idade) / (b.idade - a.idade || 1);
      return a[campo] + (b[campo] - a[campo]) * frac;
    }
  }
  return null;
}

export interface PontoFaixaConforto {
  idade: number;
  tempMin: number;
  tempMax: number;
}

export function faixaConfortoNaIdade(
  pontos: PontoFaixaConforto[],
  idade: number
): { tempMin: number; tempMax: number } | null {
  const tempMin = interpolarValor(pontos, idade, 'tempMin');
  const tempMax = interpolarValor(pontos, idade, 'tempMax');
  return tempMin === null || tempMax === null ? null : { tempMin, tempMax };
}

// ---------- Tipos de dados do lote (baseados no uso das funções) ----------

export interface Galpao {
  id: string;
  nome: string;
  quantidadeAlojada: number | string;
  pesoMedioAlojadoG?: number | string | null;
  [key: string]: any;
}

export interface RegistroData {
  galpaoId: string;
  data: string;
  [key: string]: any;
}

export interface Pesagem extends RegistroData {
  pesoMedioG: number | string | null | undefined;
}

export interface Racao extends RegistroData {
  racaoKg: number | string;
  tipoRacao?: string | null;
  notaFiscalRacao?: string | null;
}


export interface Mortalidade {
  galpaoId: string;
  data: string;
  mortalidade: number;
  descartados: number;
  motivoDescarte?: string | null;
  obs?: string;
}

// ---------- Água ----------
export interface Agua extends RegistroData {
  id: string;
  galpaoId: string;
  data: string;
  leituraHidrometro: number;
  consumoM3: number;
  ppm: number | null;
  ph: number | null;
}

export const MOTIVOS_DESCARTE = ['Refugo', 'Problema locomotor', 'Caquético'];


export interface Encerramento {
  data: string;
  obs?: string;
  pesoMedioProjetadoG?: number | null;
  porGalpao?: Array<{
    galpaoId: string;
    pesoMedioFinalG: number;
    qtdeAbatida: number | null;
    pesoRecebidoKg: number | null;
    condenadosTotal: number | null;
  }>;
}



// ---------- Avaliação Técnica ----------
export interface AvaliacaoTecnica {
  id: string;
  galpaoId: string;
  data: string;
  hora?: string | null;
  tecnico?: string;
  itens?: Record<string, string>;
  orientacoes?: string;
}


// ---------- Medicamentos Terapêuticos ----------
export interface MedicamentoTerapeutico {
  id: string;
  galpaoId: string;
  dataInicio: string;
  dataFim?: string | null;
  produto: string;
  principioAtivo?: string;
  dosagem?: string;
  viaAdministracao?: 'agua' | 'racao' | 'injetavel' | 'outro';
  motivo?: string;
  carenciaDias?: number | null;
}

// ---------- Produtos Químicos (desinfecção/sanitização) ----------
export interface ProdutoQuimico {
  id: string;
  galpaoId: string;
  data: string;
  produto: string;
  finalidade?: 'desinfeccao' | 'higienizacao' | 'controle_pragas' | 'outro';
  quantidade?: number | null;
  unidade?: string;
  responsavel?: string;
}

// ---------- Estoque de Ração ----------
export interface EstoqueRacao {
  id: string;
  galpaoId: string;
  data: string;
  estoqueSiloKg: number;
  estoqueEquipamentosKg: number;
}

// ---------- Extensão da interface Lote ----------
export interface GeradoPor {
  nome: string;
  funcao: string;
}

export interface Lote {
  id: string;
  numero: string;
  linhagem: string;
  sexagem: string;
  dataAlojamento: string;
  galpoes: Galpao[];
  status: 'ativo' | 'encerrado';
  registros?: RegistroData[];
  racoes?: Racao[];
  pesagens?: Pesagem[];
  aguas?: Agua[];
horaLeituraAgua?: string | null;

  mortalidades?: Mortalidade[];
  temperaturas?: Array<RegistroData & { tempMin: number | null; tempMax: number | null }>;
  encerramento?: Encerramento | null;
  avaliacoesTecnicas?: AvaliacaoTecnica[];
  medicamentosTerapeuticos?: MedicamentoTerapeutico[];
  produtosQuimicos?: ProdutoQuimico[];
  estoquesRacao?: EstoqueRacao[];
  syncStatus?: 'pendente' | 'sincronizado' | 'erro';
  syncError?: string | null;
  syncUpdatedAt?: string | null;
  geradoPor?: GeradoPor | null;
  ownerId?: string;
  ownerNome?: string | null;
  liberado?: boolean;
  liberadoEm?: string | null;
  liberadoPor?: string | null;
  empresaId?: string | null;
  empresaNome?: string | null;
  [key: string]: any;
}


// ---------- Séries combinadas (todos os galpões do lote) ----------

export interface PontoPesoSerie {
  idade: number;
  peso: number;
}

export function pesoSerieCombinada(lote: Lote): PontoPesoSerie[] {
  const pesagens = lote.pesagens || [];
  const galpoes = lote.galpoes || [];
  const datas = Array.from(
    new Set(
      pesagens
        .filter(
          (r) => r.pesoMedioG !== null && r.pesoMedioG !== undefined && r.pesoMedioG !== ''
        )
        .map((r) => r.data)
    )
  ).sort();

  return datas
    .map((data) => {
      let totalPonderado = 0,
        totalAves = 0;
      galpoes.forEach((g) => {
        const regs = pesagens
          .filter(
            (r) =>
              r.galpaoId === g.id &&
              r.pesoMedioG !== null &&
              r.pesoMedioG !== undefined &&
              r.pesoMedioG !== '' &&
              r.data <= data
          )
          .sort((a, b) => a.data.localeCompare(b.data));
        if (regs.length) {
          const ultimo = regs[regs.length - 1];
          totalPonderado += Number(ultimo.pesoMedioG) * Number(g.quantidadeAlojada || 0);
          totalAves += Number(g.quantidadeAlojada || 0);
        }
      });
      return {
        idade: daysBetween(lote.dataAlojamento, data),
        peso: totalAves > 0 ? +(totalPonderado / totalAves).toFixed(1) : null,
      };
    })
    .filter((p): p is PontoPesoSerie => p.peso !== null);
}

export interface PontoConversaoSerie {
  idade: number;
  conversao: number;
}

export function conversaoAlimentarSerieCombinada(lote: Lote): PontoConversaoSerie[] {
  const galpoes = lote.galpoes || [];
  const racoes = lote.racoes || [];
  const mortalidades = lote.mortalidades || [];
  const pesagens = lote.pesagens || [];
  const datas = Array.from(
    new Set(
      pesagens
        .filter(
          (r) => r.pesoMedioG !== null && r.pesoMedioG !== undefined && r.pesoMedioG !== ''
        )
        .map((r) => r.data)
    )
  ).sort();

  return datas
    .map((data) => {
      const racaoAcumuladaKg = racoes
        .filter((r) => r.data <= data)
        .reduce((s, r) => s + (Number(r.racaoKg) || 0), 0);
      let pesoVivoTotalKg = 0;

      galpoes.forEach((g) => {
        const mortGalpao = mortalidades.filter((r) => r.galpaoId === g.id && r.data <= data);
        const mortalidade = mortGalpao.reduce((s, r) => s + (Number(r.mortalidade) || 0), 0);
        const descartados = mortGalpao.reduce((s, r) => s + (Number(r.descartados) || 0), 0);
        const avesVivas = Math.max(
          (Number(g.quantidadeAlojada) || 0) - mortalidade - descartados,
          0
        );

        const pesosGalpao = pesagens
          .filter(
            (r) =>
              r.galpaoId === g.id &&
              r.pesoMedioG !== null &&
              r.pesoMedioG !== undefined &&
              r.pesoMedioG !== '' &&
              r.data <= data
          )
          .sort((a, b) => a.data.localeCompare(b.data));
        if (pesosGalpao.length) {
          const ultimoPeso = Number(pesosGalpao[pesosGalpao.length - 1].pesoMedioG);
          pesoVivoTotalKg += (ultimoPeso / 1000) * avesVivas;
        }
      });
      const conversao =
        pesoVivoTotalKg > 0 ? +(racaoAcumuladaKg / pesoVivoTotalKg).toFixed(3) : null;
      return { idade: daysBetween(lote.dataAlojamento, data), conversao };
    })
    .filter((p): p is PontoConversaoSerie => p.conversao !== null);
}

export interface PontoMortalidadeSerie {
  idade: number;
  mortPct: number;
}

export function mortalidadeSerieCombinada(lote: Lote): PontoMortalidadeSerie[] {
  const mortalidades = lote.mortalidades || [];
  const totalAlojado = (lote.galpoes || []).reduce(
    (s, g) => s + Number(g.quantidadeAlojada || 0),
    0
  );
  const datas = Array.from(new Set(mortalidades.map((r) => r.data))).sort();
  let acumulada = 0;
  return datas.map((data) => {
    acumulada += mortalidades
      .filter((r) => r.data === data)
      .reduce((s, r) => s + (Number(r.mortalidade) || 0), 0);
    const viab = totalAlojado > 0 ? ((totalAlojado - acumulada) / totalAlojado) * 100 : 100;
    return { idade: daysBetween(lote.dataAlojamento, data), mortPct: +(100 - viab).toFixed(2) };
  });
}

export interface PontoRacaoSerie {
  idade: number;
  racao: number;
}

export function racaoSerieCombinada(lote: Lote): PontoRacaoSerie[] {
  const racoes = lote.racoes || [];
  const datas = Array.from(new Set(racoes.map((r) => r.data))).sort();
  return datas.map((data) => ({
    idade: daysBetween(lote.dataAlojamento, data),
    racao: racoes
      .filter((r) => r.data === data)
      .reduce((s, r) => s + (Number(r.racaoKg) || 0), 0),
  }));
}

// ---------- Conversão ajustada (descontando estoque) ----------

export interface ConversaoAjustadaResult {
  idade: number;
  racaoFornecidaKg: number;
  racaoConsumidaRealKg: number;
  avesVivas: number;
  pesoMedioG: number | null;
  pesoVivoTotalKg: number | null;   // <- faltava o "| null;" completo aqui
  conversaoAjustada: number | null;
}

// ---------- Conversão ajustada (descontando estoque) ----------

export function conversaoAjustadaNaData(
  lote: Lote,
  data: string,
  estoqueSiloKg: number | string,
  estoqueEquipamentosKg: number | string
): ConversaoAjustadaResult {
  const mortalidadesAteData = (lote.mortalidades || []).filter((r) => r.data <= data);
  const racaoFornecidaKg = (lote.racoes || [])
    .filter((r) => r.data <= data)
    .reduce((s, r) => s + (Number(r.racaoKg) || 0), 0);
  const racaoConsumidaRealKg = Math.max(
    racaoFornecidaKg - (Number(estoqueSiloKg) || 0) - (Number(estoqueEquipamentosKg) || 0),
    0
  );

  let avesVivas = 0;
  (lote.galpoes || []).forEach((g) => {
    const morteGalpao = mortalidadesAteData.filter((r) => r.galpaoId === g.id);
    const mortalidade = morteGalpao.reduce((s, r) => s + (Number(r.mortalidade) || 0), 0);
    const descartados = morteGalpao.reduce((s, r) => s + (Number(r.descartados) || 0), 0);
    avesVivas += Math.max((Number(g.quantidadeAlojada) || 0) - mortalidade - descartados, 0);
  });

  const idade = daysBetween(lote.dataAlojamento, data);
  const serie = pesoSerieCombinada(lote);
  const pontosAteIdade = serie.filter((p) => p.idade <= idade);
  const pesoMedioG = pontosAteIdade.length
    ? pontosAteIdade[pontosAteIdade.length - 1].peso
    : null;
  const pesoVivoTotalKg = pesoMedioG !== null ? (pesoMedioG / 1000) * avesVivas : null;
  const conversaoAjustada =
    pesoVivoTotalKg && pesoVivoTotalKg > 0 ? racaoConsumidaRealKg / pesoVivoTotalKg : null;

  return {
    idade,
    racaoFornecidaKg,
    racaoConsumidaRealKg,
    avesVivas,
    pesoMedioG,
    pesoVivoTotalKg,
    conversaoAjustada,
  };
}

// ---------- Funções por galpão individual ----------

export function pesoSerieGalpao(lote: Lote, galpaoId: string): PontoPesoSerie[] {
  return (lote.pesagens || [])
    .filter(
      (r) =>
        r.galpaoId === galpaoId &&
        r.pesoMedioG !== null &&
        r.pesoMedioG !== undefined &&
        r.pesoMedioG !== ''
    )
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((r) => ({
      idade: daysBetween(lote.dataAlojamento, r.data),
      peso: Number(r.pesoMedioG),
    }));
}

export function consumoMedioRecente(
  lote: Lote,
  galpaoId: string,
  diasJanela: number = 5
): number | null {
  const regs = (lote.racoes || [])
    .filter((r) => r.galpaoId === galpaoId)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, diasJanela);
  if (!regs.length) return null;
  const total = regs.reduce((s, r) => s + (Number(r.racaoKg) || 0), 0);
  return total / regs.length;
}

export function conversaoAjustadaGalpaoNaData(
  lote: Lote,
  galpaoId: string,
  data: string,
  estoqueSiloKg: number | string,
  estoqueEquipamentosKg: number | string
): ConversaoAjustadaResult {
  const galpao = (lote.galpoes || []).find((g) => g.id === galpaoId);
  const mortalidadesAteData = (lote.mortalidades || []).filter(
    (r) => r.galpaoId === galpaoId && r.data <= data
  );
  const racaoFornecidaKg = (lote.racoes || [])
    .filter((r) => r.galpaoId === galpaoId && r.data <= data)
    .reduce((s, r) => s + (Number(r.racaoKg) || 0), 0);
  const racaoConsumidaRealKg = Math.max(
    racaoFornecidaKg - (Number(estoqueSiloKg) || 0) - (Number(estoqueEquipamentosKg) || 0),
    0
  );

  const mortalidade = mortalidadesAteData.reduce((s, r) => s + (Number(r.mortalidade) || 0), 0);
  const descartados = mortalidadesAteData.reduce((s, r) => s + (Number(r.descartados) || 0), 0);
  const avesVivas = Math.max(
    (Number(galpao?.quantidadeAlojada) || 0) - mortalidade - descartados,
    0
  );

  const idade = daysBetween(lote.dataAlojamento, data);
  const serie = pesoSerieGalpao(lote, galpaoId);
  const pontosAteIdade = serie.filter((p) => p.idade <= idade);
  const pesoMedioG = pontosAteIdade.length
    ? pontosAteIdade[pontosAteIdade.length - 1].peso
    : null;
  const pesoVivoTotalKg = pesoMedioG !== null ? (pesoMedioG / 1000) * avesVivas : null;
  const conversaoAjustada =
    pesoVivoTotalKg && pesoVivoTotalKg > 0 ? racaoConsumidaRealKg / pesoVivoTotalKg : null;

  return {
    idade,
    racaoFornecidaKg,
    racaoConsumidaRealKg,
    avesVivas,
    pesoMedioG,
    pesoVivoTotalKg,
    conversaoAjustada,
  };
}

// ---------- Índices consolidados do lote ----------

export function computeIndices(lote: Lote) {
  const registrosSorted = [...(lote.registros || [])].sort((a, b) =>
    a.data.localeCompare(b.data)
  );
  const racoesSorted = [...(lote.racoes || [])].sort((a, b) => a.data.localeCompare(b.data));
  const pesagensSorted = [...(lote.pesagens || [])].sort((a, b) => a.data.localeCompare(b.data));
  const aguasSorted = [...(lote.aguas || [])].sort((a, b) => a.data.localeCompare(b.data));
  const mortalidadesSorted = [...(lote.mortalidades || [])].sort((a, b) =>
    a.data.localeCompare(b.data)
  );
  const temperaturasSorted = [...(lote.temperaturas || [])].sort((a, b) =>
    a.data.localeCompare(b.data)
  );
  const galpoes = lote.galpoes || [];
  const quantidadeAlojadaTotal = galpoes.reduce(
    (s, g) => s + (Number(g.quantidadeAlojada) || 0),
    0
  );
  const encerrado = lote.status === 'encerrado' && lote.encerramento;
  const dataRef = encerrado ? lote.encerramento!.data : todayStr();

  const statsGalpoes = galpoes.map((g) => {
    const regs = registrosSorted.filter((r) => r.galpaoId === g.id && r.data <= dataRef);
    const mortsGalpao = mortalidadesSorted.filter(
      (r) => r.galpaoId === g.id && r.data <= dataRef
    );
    const mortalidade = mortsGalpao.reduce((s, r) => s + (Number(r.mortalidade) || 0), 0);
    const descartados = mortsGalpao.reduce((s, r) => s + (Number(r.descartados) || 0), 0);
    const avesVivas = Math.max(
      (Number(g.quantidadeAlojada) || 0) - mortalidade - descartados,
      0
    );
    const racao = racoesSorted
      .filter((r) => r.galpaoId === g.id && r.data <= dataRef)
      .reduce((s, r) => s + (Number(r.racaoKg) || 0), 0);
    const agua = aguasSorted
      .filter((r) => r.galpaoId === g.id && r.data <= dataRef)
      .reduce((s, r) => s + (Number(r.consumoM3) || 0) * 1000, 0);
    const pesos = pesagensSorted.filter(
      (r) =>
        r.galpaoId === g.id &&
        r.data <= dataRef &&
        r.pesoMedioG !== null &&
        r.pesoMedioG !== undefined &&
        r.pesoMedioG !== ''
    );
    const ultimoPesoReg = pesos.length ? pesos[pesos.length - 1] : null;

    const fech = encerrado
      ? (lote.encerramento!.porGalpao || []).find((p) => p.galpaoId === g.id)
      : null;
    const pesoFinal =
      fech && fech.pesoMedioFinalG
        ? Number(fech.pesoMedioFinalG)
        : ultimoPesoReg
        ? Number(ultimoPesoReg.pesoMedioG)
        : null;
    const qtdeAbatida =
      fech && fech.qtdeAbatida !== null && fech.qtdeAbatida !== undefined
        ? Number(fech.qtdeAbatida)
        : avesVivas;
    const pesoRecebidoKg = fech && fech.pesoRecebidoKg ? Number(fech.pesoRecebidoKg) : null;
    const condenados =
      fech && fech.condenadosTotal !== null && fech.condenadosTotal !== undefined
        ? Number(fech.condenadosTotal)
        : null;

    return {
      galpao: g,
      mortalidade,
      descartados,
      avesVivas,
      racao,
      agua,
      ultimoPesoReg,
      pesoFinal,
      qtdeAbatida,
      pesoRecebidoKg,
      condenados,
    };
  });

  const mortalidadeAcumulada = statsGalpoes.reduce((s, x) => s + x.mortalidade, 0);
  const descartadosAcumulados = statsGalpoes.reduce((s, x) => s + x.descartados, 0);
  const avesVivas = statsGalpoes.reduce((s, x) => s + x.avesVivas, 0);
  const viabilidade = quantidadeAlojadaTotal > 0 ? (avesVivas / quantidadeAlojadaTotal) * 100 : 0;
  const racaoAcumuladaKg = statsGalpoes.reduce((s, x) => s + x.racao, 0);
  const aguaAcumuladaL = statsGalpoes.reduce((s, x) => s + x.agua, 0);

  let pesoVivoTotalKg = 0,
    avesComPeso = 0,
    temPeso = false;
  statsGalpoes.forEach((x) => {
    if (x.pesoRecebidoKg) {
      pesoVivoTotalKg += x.pesoRecebidoKg;
      avesComPeso += x.qtdeAbatida;
      temPeso = true;
    } else if (x.pesoFinal !== null) {
      pesoVivoTotalKg += (x.pesoFinal / 1000) * x.avesVivas;
      avesComPeso += x.avesVivas;
      temPeso = true;
    }
  });
  const pesoMedioAtualG =
    temPeso && avesComPeso > 0 ? (pesoVivoTotalKg * 1000) / avesComPeso : null;

  const pesoAlojadoNum = galpoes.reduce(
    (s, g) =>
      g.pesoMedioAlojadoG
        ? s + Number(g.pesoMedioAlojadoG) * Number(g.quantidadeAlojada || 0)
        : s,
    0
  );
  const pesoAlojadoDen = galpoes.reduce(
    (s, g) => (g.pesoMedioAlojadoG ? s + Number(g.quantidadeAlojada || 0) : s),
    0
  );
  const pesoAlojadoG = pesoAlojadoDen > 0 ? pesoAlojadoNum / pesoAlojadoDen : 0;

  const datasPeso = statsGalpoes
    .map((x) => (x.ultimoPesoReg ? x.ultimoPesoReg.data : null))
    .filter(Boolean) as string[];
  const dataReferenciaPeso = encerrado
    ? lote.encerramento!.data
    : datasPeso.length
    ? datasPeso.sort().slice(-1)[0]
    : todayStr();
  const idadeAtual = daysBetween(lote.dataAlojamento, dataRef);
  const idadeReferenciaPeso = daysBetween(lote.dataAlojamento, dataReferenciaPeso);

  const conversaoAlimentar =
    pesoVivoTotalKg && pesoVivoTotalKg > 0 ? racaoAcumuladaKg / pesoVivoTotalKg : null;
  const gpd =
    pesoMedioAtualG !== null && idadeReferenciaPeso > 0
      ? (pesoMedioAtualG - pesoAlojadoG) / idadeReferenciaPeso
      : null;
  const iep =
    pesoMedioAtualG !== null && conversaoAlimentar && idadeReferenciaPeso > 0
      ? ((viabilidade * (pesoMedioAtualG / 1000)) / (idadeReferenciaPeso * conversaoAlimentar)) *
        100
      : null;

  const qtdeAbatidaTotal = statsGalpoes.reduce((s, x) => s + (x.qtdeAbatida || 0), 0);
  const condenadosVals = statsGalpoes.map((x) => x.condenados).filter((v) => v !== null) as number[];
  const condenadosTotal = condenadosVals.length
    ? condenadosVals.reduce((s, v) => s + v, 0)
    : null;
  const percentualCondenacao =
    condenadosTotal !== null && qtdeAbatidaTotal > 0
      ? (condenadosTotal / qtdeAbatidaTotal) * 100
      : null;
  const pesoProjetadoG =
    encerrado && lote.encerramento!.pesoMedioProjetadoG
      ? Number(lote.encerramento!.pesoMedioProjetadoG)
      : null;
  const diffPesoProjetado =
    pesoProjetadoG !== null && pesoMedioAtualG !== null
      ? pesoMedioAtualG - pesoProjetadoG
      : null;

  return {
    registrosSorted,
    racoesSorted,
    pesagensSorted,
    aguasSorted,
    mortalidadesSorted,
    temperaturasSorted,
    statsGalpoes,
    quantidadeAlojadaTotal,
    mortalidadeAcumulada,
    descartadosAcumulados,
    perdasTotal: mortalidadeAcumulada + descartadosAcumulados,
    avesVivas,
    viabilidade,
    racaoAcumuladaKg,
    aguaAcumuladaL,
    pesoMedioAtualG,
    idadeAtual,
    idadeReferenciaPeso,
    pesoVivoTotalKg,
    conversaoAlimentar,
    gpd,
    iep,
    qtdeAbatida: qtdeAbatidaTotal,
    condenadosTotal,
    percentualCondenacao,
    pesoProjetadoG,
    diffPesoProjetado,
  };
}

// adicionar no final de calculations.ts
export const DEFAULT_FAIXA_CONFORTO: PontoFaixaConforto[] = [
  { idade: 0, tempMin: 32, tempMax: 35 },
  { idade: 7, tempMin: 29, tempMax: 32 },
  { idade: 14, tempMin: 26, tempMax: 29 },
  { idade: 21, tempMin: 23, tempMax: 26 },
  { idade: 28, tempMin: 21, tempMax: 24 },
  { idade: 35, tempMin: 20, tempMax: 23 },
  { idade: 42, tempMin: 20, tempMax: 22 },
  { idade: 56, tempMin: 20, tempMax: 22 },
];

