import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lote, uid, Encerramento } from '../utils/calculations';
import { DEFAULT_PESO_SEXAGEM, PontoPesoPadrao, Sexagem } from '../data/padraoSexagem';
import { DEFAULT_FAIXA_CONFORTO, PontoFaixaConforto } from '../utils/calculations'; // ajuste se vier de outro lugar


interface PadroesPersistidos {
  [sexagem: string]: PontoPesoPadrao[];
}

// ---------- Chaves dinâmicas por usuário ----------
function getKeyLotes(userId: string) {
  return `@gestaoavi:lotes:${userId}`;
}
function getKeyPadroes(userId: string) {
  return `@gestaoavi:padroes-linhagem-frango:${userId}`;
}
function getKeyFaixaConforto(userId: string) {
  return `@gestaoavi:faixa-conforto-temperatura-frango:${userId}`;
}

function normalizarTemperaturas(lote: Lote): Lote {
  if (!lote.temperaturas?.length) return lote;
  let mudou = false;
  const temperaturas = lote.temperaturas.map((t: any) => {
    if (!t.id) {
      mudou = true;
      return { ...t, id: uid() };
    }
    return t;
  });
  return mudou ? { ...lote, temperaturas } : lote;
}

// ---------- Lotes ----------

export async function getLotes(userId: string): Promise<Lote[]> {
  const raw = await AsyncStorage.getItem(getKeyLotes(userId));
  const lotes: Lote[] = raw ? JSON.parse(raw) : [];
  const lotesNormalizados = lotes.map(normalizarTemperaturas);
  const houveMudanca = lotesNormalizados.some((l, i) => l !== lotes[i]);
  if (houveMudanca) {
    await AsyncStorage.setItem(getKeyLotes(userId), JSON.stringify(lotesNormalizados));
  }
  return lotesNormalizados;
}

export async function getLoteById(userId: string, id: string): Promise<Lote | undefined> {
  const lotes = await getLotes(userId);
  return lotes.find((l) => l.id === id);
}

export async function upsertLote(userId: string, lote: Lote): Promise<void> {
  const lotes = await getLotes(userId);
  const idx = lotes.findIndex((l) => l.id === lote.id);
  const loteComSync: Lote = { ...lote, syncStatus: lote.syncStatus ?? 'pendente' };
  if (idx >= 0) lotes[idx] = loteComSync;
  else lotes.push(loteComSync);
  await AsyncStorage.setItem(getKeyLotes(userId), JSON.stringify(lotes));
}

async function updateLote(
  userId: string,
  loteId: string,
  updater: (lote: Lote) => Lote
): Promise<Lote | undefined> {
  const lotes = await getLotes(userId);
  const idx = lotes.findIndex((l) => l.id === loteId);
  if (idx < 0) return undefined;

  if (lotes[idx].status === 'encerrado') {
    throw new Error('Este lote está encerrado e não aceita novos registros.');
  }

  const atualizado = updater(lotes[idx]);
  lotes[idx] = { ...atualizado, syncStatus: 'pendente' }; // volta pra fila a cada alteração
  await AsyncStorage.setItem(getKeyLotes(userId), JSON.stringify(lotes));
  return lotes[idx];
}

// ---------- Temperatura ----------
export async function addTemperatura(
  userId: string,
  loteId: string,
  registro: { galpaoId: string; data: string; tempMin: number | null; tempMax: number | null }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const temperaturas = [...(lote.temperaturas || [])];
    const idxExistente = temperaturas.findIndex(
      (r) => r.galpaoId === registro.galpaoId && r.data === registro.data
    );
    if (idxExistente >= 0) {
      temperaturas[idxExistente] = { ...temperaturas[idxExistente], ...registro };
    } else {
      temperaturas.push({ id: uid(), ...registro });
    }
    return { ...lote, temperaturas };
  });
}

export async function removeTemperatura(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const temperaturas = (lote.temperaturas || []).filter((r: any) => r.id !== id);
    return { ...lote, temperaturas } as Lote;
  });
}

// ---------- Ração ----------
export async function addRacao(
  userId: string,
  loteId: string,
  registro: {
    galpaoId: string;
    data: string;
    racaoKg: number;
    tipoRacao?: string | null;
    notaFiscalRacao?: string | null;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const racoes = [...(lote.racoes || [])];
    const novoRegistro = {
      id: uid(),
      ...registro,
      tipoRacao: registro.tipoRacao || null,
      notaFiscalRacao: registro.notaFiscalRacao || null,
    };
    racoes.push(novoRegistro);
    return { ...lote, racoes };
  });
}

export async function removeRacao(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const racoes = (lote.racoes || []).filter((r: any) => r.id !== id);
    return { ...lote, racoes } as Lote;
  });
}

// ---------- Estoque de ração (conversão ajustada) ----------
export async function addEstoqueRacao(
  userId: string,
  loteId: string,
  registro: {
    galpaoId: string;
    data: string;
    estoqueSiloKg: number;
    estoqueEquipamentosKg: number;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const estoquesRacao = [...((lote as any).estoquesRacao || []), { id: uid(), ...registro }];
    return { ...lote, estoquesRacao } as Lote;
  });
}

export async function removeEstoqueRacao(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const estoquesRacao = ((lote as any).estoquesRacao || []).filter((e: any) => e.id !== id);
    return { ...lote, estoquesRacao } as Lote;
  });
}

// ---------- Água ----------
export async function addAgua(
  userId: string,
  loteId: string,
  registro: {
    id: string;
    galpaoId: string;
    data: string;
    leituraHidrometro: number;
    consumoM3: number;
    ppm: number | null;
    ph: number | null;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const aguas = [...(lote.aguas || [])];
    const idxExistente = aguas.findIndex(
      (r) => r.galpaoId === registro.galpaoId && r.data === registro.data
    );
    if (idxExistente >= 0) aguas[idxExistente] = { ...registro };
    else aguas.push({ ...registro });
    return { ...lote, aguas };
  });
}

export async function removeAgua(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const aguas = (lote.aguas || []).filter((r: any) => r.id !== id);
    return { ...lote, aguas } as Lote;
  });
}

export async function setHoraLeituraAgua(
  userId: string,
  loteId: string,
  hora: string | null
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => ({ ...lote, horaLeituraAgua: hora } as Lote));
}


// ---------- Mortalidade ----------
export async function addMortalidade(
  userId: string,
  loteId: string,
  registro: {
    galpaoId: string;
    data: string;
    mortalidade: number;
    descartados: number;
    motivoDescarte?: string;
    obs?: string;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const mortalidades = [...(lote.mortalidades || [])];
    const idxExistente = mortalidades.findIndex(
      (r) => r.galpaoId === registro.galpaoId && r.data === registro.data
    );
    if (idxExistente >= 0) mortalidades[idxExistente] = { ...registro };
    else mortalidades.push({ ...registro });
    return { ...lote, mortalidades };
  });
}


export async function removeMortalidade(
  userId: string,
  loteId: string,
  galpaoId: string,
  data: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const mortalidades = (lote.mortalidades || []).filter(
      (r) => !(r.galpaoId === galpaoId && r.data === data)
    );
    return { ...lote, mortalidades };
  });
}

// ---------- Pesagem ----------
export async function addPesagem(
  userId: string,
  loteId: string,
  registro: {
    galpaoId: string;
    data: string;
    pesoMedioG: number;
    pesagens?: { qtdAves: number; pesoRegistradoKg: number; descontosKg: number }[];
    pesagemQtdAves?: number;
    pesagemPesoRegistradoKg?: number;
    pesagemDescontosKg?: number;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const pesagens = [...(lote.pesagens || [])];
    const idxExistente = pesagens.findIndex(
      (r) => r.galpaoId === registro.galpaoId && r.data === registro.data
    );
    const novoRegistro = { id: uid(), ...registro };
    if (idxExistente >= 0) pesagens[idxExistente] = { ...pesagens[idxExistente], ...novoRegistro };
    else pesagens.push(novoRegistro);
    return { ...lote, pesagens };
  });
}

export async function removePesagem(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const pesagens = (lote.pesagens || []).filter((r: any) => r.id !== id);
    return { ...lote, pesagens } as Lote;
  });
}

// ---------- Padrões de peso (por usuário) ----------
export async function getPadraoPeso(userId: string, sexagem: Sexagem): Promise<PontoPesoPadrao[]> {
  try {
    const raw = await AsyncStorage.getItem(getKeyPadroes(userId));
    const dados: PadroesPersistidos = raw ? JSON.parse(raw) : {};
    return dados[sexagem] && dados[sexagem].length ? dados[sexagem] : DEFAULT_PESO_SEXAGEM[sexagem];
  } catch {
    return DEFAULT_PESO_SEXAGEM[sexagem];
  }
}

export async function salvarPadraoPeso(
  userId: string,
  sexagem: Sexagem,
  pontos: PontoPesoPadrao[]
): Promise<void> {
  const raw = await AsyncStorage.getItem(getKeyPadroes(userId));
  const dados: PadroesPersistidos = raw ? JSON.parse(raw) : {};
  dados[sexagem] = pontos;
  await AsyncStorage.setItem(getKeyPadroes(userId), JSON.stringify(dados));
}

// ---------- Encerramento ----------
export async function encerrarLote(
  userId: string,
  loteId: string,
  encerramento: Encerramento
): Promise<Lote | null> {
  const lote = await updateLote(userId, loteId, (lote) => ({
    ...lote,
    status: 'encerrado',
    encerramento,
  }));
  return lote ?? null;
}

// ---------- Avaliação Técnica ----------
export async function addAvaliacaoTecnica(
  userId: string,
  loteId: string,
  registro: {
    id: string;
    galpaoId: string;
    data: string;
    hora: string | null;
    tecnico: string;
    itens: Record<string, string>;
    orientacoes: string;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const avaliacoesTecnicas = [...((lote as any).avaliacoesTecnicas || []), registro];
    return { ...lote, avaliacoesTecnicas } as Lote;
  });
}

export async function removeAvaliacaoTecnica(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const avaliacoesTecnicas = ((lote as any).avaliacoesTecnicas || []).filter((a: any) => a.id !== id);
    return { ...lote, avaliacoesTecnicas } as Lote;
  });
}

// ---------- Medicamentos terapêuticos ----------
export async function addMedicamentoTerapeutico(
  userId: string,
  loteId: string,
  registro: {
    id: string;
    galpaoId: string | null;
    data: string;
    produto: string;
    quantidade: string;
    partida: string;
    dose: string;
    dataInicioAdministracao: string | null;
    dataTerminoAdministracao: string | null;
    periodoCarencia: string;
    medicoVeterinario: string;
    execucoes: { id: string; responsavel: string; data: string }[];
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const medicamentosTerapeuticos = [...((lote as any).medicamentosTerapeuticos || []), registro];
    return { ...lote, medicamentosTerapeuticos } as Lote;
  });
}

export async function removeMedicamentoTerapeutico(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const medicamentosTerapeuticos = ((lote as any).medicamentosTerapeuticos || []).filter(
      (m: any) => m.id !== id
    );
    return { ...lote, medicamentosTerapeuticos } as Lote;
  });
}

export async function addExecucaoMedicamento(
  userId: string,
  loteId: string,
  medicamentoId: string,
  execucao: { id: string; responsavel: string; data: string }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const medicamentosTerapeuticos = ((lote as any).medicamentosTerapeuticos || []).map((m: any) =>
      m.id === medicamentoId ? { ...m, execucoes: [...(m.execucoes || []), execucao] } : m
    );
    return { ...lote, medicamentosTerapeuticos } as Lote;
  });
}

export async function removeExecucaoMedicamento(
  userId: string,
  loteId: string,
  medicamentoId: string,
  execucaoId: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const medicamentosTerapeuticos = ((lote as any).medicamentosTerapeuticos || []).map((m: any) =>
      m.id === medicamentoId
        ? { ...m, execucoes: (m.execucoes || []).filter((e: any) => e.id !== execucaoId) }
        : m
    );
    return { ...lote, medicamentosTerapeuticos } as Lote;
  });
}

// ---------- Produtos químicos ----------
export async function addProdutoQuimico(
  userId: string,
  loteId: string,
  registro: {
    id: string;
    galpaoId: string | null;
    data: string;
    produto: string;
    quantidadeFrasco: string;
    partida: string;
    diluicao: string;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const produtosQuimicos = [...((lote as any).produtosQuimicos || []), registro];
    return { ...lote, produtosQuimicos } as Lote;
  });
}

export async function removeProdutoQuimico(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const produtosQuimicos = ((lote as any).produtosQuimicos || []).filter((p: any) => p.id !== id);
    return { ...lote, produtosQuimicos } as Lote;
  });
}

// ---------- Abate: saída das aves ----------
export async function setSaidaAves(
  userId: string,
  loteId: string,
  lista: { galpaoId: string; data: string; hora: string }[]
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => ({ ...lote, saidaAves: lista } as Lote));
}

// ---------- Abate: retirada de ração ----------
export async function setRetiradaSilo(
  userId: string,
  loteId: string,
  lista: { galpaoId: string; data: string; hora: string }[]
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => ({ ...lote, retiradaSilo: lista } as Lote));
}

export async function setRetiradaLinha(
  userId: string,
  loteId: string,
  lista: { galpaoId: string; data: string; horaSubirLinhas: string }[]
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => ({ ...lote, retiradaLinha: lista } as Lote));
}

// ---------- Abate: embarque ----------
export async function addEmbarque(
  userId: string,
  loteId: string,
  registro: {
    id: string;
    galpaoId: string;
    data: string;
    hora: string | null;
    portaAviario: string;
    numCaixas: number | null;
    caixasVazias: number | null;
    placaCaminhao: string;
  }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const embarques = [...((lote as any).embarques || []), registro];
    return { ...lote, embarques } as Lote;
  });
}

export async function removeEmbarque(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const embarques = ((lote as any).embarques || []).filter((e: any) => e.id !== id);
    return { ...lote, embarques } as Lote;
  });
}

// ---------- Abate: sobras de aves ----------
export async function setSobrasAves(
  userId: string,
  loteId: string,
  lista: { galpaoId: string; mortas: number; vivas: number; aleijados: number; refugos: number }[]
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => ({ ...lote, sobrasAves: lista } as Lote));
}

// ---------- Abate: medicamentos ----------
export async function addMedicamentoAbate(
  userId: string,
  loteId: string,
  registro: { id: string; medicamento: string; dataInicio: string | null; dataFim: string | null; dosagem: string }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const medicamentosAbate = [...((lote as any).medicamentosAbate || []), registro];
    return { ...lote, medicamentosAbate } as Lote;
  });
}

export async function removeMedicamentoAbate(
  userId: string,
  loteId: string,
  id: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => {
    const medicamentosAbate = ((lote as any).medicamentosAbate || []).filter((m: any) => m.id !== id);
    return { ...lote, medicamentosAbate } as Lote;
  });
}

// ---------- Abate: observação ----------
export async function setObservacaoAbate(
  userId: string,
  loteId: string,
  valor: string
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => ({ ...lote, observacaoAbate: valor || '' } as Lote));
}

// ---------- Faixa de conforto (por usuário) ----------
// ---------- Faixa de conforto (por usuário/dispositivo, com marca de pendência) ----------
function getKeyFaixaConfortoPendente(userId: string) {
  return `@gestaoavi:faixaConforto:pendente:${userId}`;
}

export async function getFaixaConforto(userId: string): Promise<PontoFaixaConforto[]> {
  try {
    const raw = await AsyncStorage.getItem(getKeyFaixaConforto(userId));
    return raw ? JSON.parse(raw) : DEFAULT_FAIXA_CONFORTO;
  } catch {
    return DEFAULT_FAIXA_CONFORTO;
  }
}

export async function setFaixaConforto(
  userId: string,
  pontos: PontoFaixaConforto[]
): Promise<void> {
  // 1) salva local imediatamente (funciona offline)
  await AsyncStorage.setItem(getKeyFaixaConforto(userId), JSON.stringify(pontos));

  // 2) marca como pendente de sync — a sincronização real (push para Supabase)
  // acontece em sync.ts, dentro de sincronizarTudo(), via enviarFaixaConfortoPendente().
  await AsyncStorage.setItem(getKeyFaixaConfortoPendente(userId), 'true');
}

export async function isFaixaConfortoPendente(userId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(getKeyFaixaConfortoPendente(userId));
  return v === 'true';
}

export async function limparFaixaConfortoPendente(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getKeyFaixaConfortoPendente(userId));
}

// Usado pelo pull: sobrescreve o valor local com o que veio do servidor
export async function salvarFaixaConfortoLocal(
  userId: string,
  pontos: PontoFaixaConforto[]
): Promise<void> {
  await AsyncStorage.setItem(getKeyFaixaConforto(userId), JSON.stringify(pontos));
}


// ---------- Migração de IDs inválidos ----------
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function migrarIdsInvalidosDeLotes(userId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(getKeyLotes(userId));
  if (!raw) return;

  const lotes: Lote[] = JSON.parse(raw);
  let alterado = false;

  const lotesCorrigidos = lotes.map((lote) => {
    if (!UUID_REGEX.test(lote.id)) {
      alterado = true;
      return { ...lote, id: uid(), syncStatus: 'pendente' as const };
    }
    return lote;
  });

  if (alterado) {
    await AsyncStorage.setItem(getKeyLotes(userId), JSON.stringify(lotesCorrigidos));
  }
}

// ---------- Exclusões pendentes de sincronização ----------
function getKeyExclusoesPendentes(userId: string) {
  return `@gestaoavi:exclusoes-pendentes:${userId}`;
}

export async function addExclusaoPendente(userId: string, loteId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(getKeyExclusoesPendentes(userId));
  const lista: string[] = raw ? JSON.parse(raw) : [];
  if (!lista.includes(loteId)) {
    lista.push(loteId);
    await AsyncStorage.setItem(getKeyExclusoesPendentes(userId), JSON.stringify(lista));
  }
}

export async function getExclusoesPendentes(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(getKeyExclusoesPendentes(userId));
  return raw ? JSON.parse(raw) : [];
}

export async function limparExclusaoPendente(userId: string, loteId: string): Promise<void> {
  const lista = await getExclusoesPendentes(userId);
  const nova = lista.filter((id) => id !== loteId);
  await AsyncStorage.setItem(getKeyExclusoesPendentes(userId), JSON.stringify(nova));
}


export async function deleteLoteLocal(userId: string, loteId: string): Promise<void> {
  const lotes = await getLotes(userId);
  const lote = lotes.find((l) => l.id === loteId);

  if (!lote) return;

  // Só o proprietário pode excluir. Se ownerId não estiver definido ainda
  // (lote criado localmente e nunca sincronizado), consideramos o próprio
  // usuário como owner implícito.
  if (lote.ownerId && lote.ownerId !== userId) {
    throw new Error('Apenas o proprietário deste lote pode excluí-lo.');
  }

  const novos = lotes.filter((l) => l.id !== loteId);
  await AsyncStorage.setItem(getKeyLotes(userId), JSON.stringify(novos));
  await addExclusaoPendente(userId, loteId);
}

export async function setGeradoPor(
  userId: string,
  loteId: string,
  geradoPor: { nome: string; funcao: string }
): Promise<Lote | undefined> {
  return updateLote(userId, loteId, (lote) => ({ ...lote, geradoPor } as Lote));
}



