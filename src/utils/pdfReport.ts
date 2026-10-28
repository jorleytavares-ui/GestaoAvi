import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import { computeIndices, daysBetween, todayStr, fmt, fmtDateBR, Lote } from './calculations';
import { ITENS_AVALIACAO_TECNICA } from './constants';
import { getWatermarkSrc, getWatermarkLogoSrc } from './watermark';


function tabelaGenerica(titulo: string, linhas: string[][]): string {
  if (!linhas.length) return '';
  const rows = linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `
    <div class="section">
      <h3>${titulo}</h3>
      <table class="tabela-registros">${rows}</table>
    </div>
  `;
}

function tabelaComHeader(titulo: string, header: string[], linhas: string[][]): string {
  if (!linhas.length) return '';
  const headerRow = `<tr>${header.map((h) => `<td class="th">${h}</td>`).join('')}</tr>`;
  const rows = linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `
    <div class="section">
      <h3>${titulo}</h3>
      <table class="tabela-registros">${headerRow}${rows}</table>
    </div>
  `;
}

// ============================================================
// Checklist de Remuneração — mesmas perguntas/pesos da aba
// ChecklistRemuneracaoTab.tsx
// ============================================================

const CR_QUALIFICADORES = [
  { id: 'q1', label: 'Assertividade de Peso (faixa de tolerância)' },
  { id: 'q2', label: 'Não mistura de ração / uso correto de medicamentos' },
  { id: 'q3', label: 'Biosseguridade mínima da granja' },
];

const CR_ESTRUTURAL = [
  { id: 'e1', peso: 40, label: 'Equipamentos de ambiência (OT_AGR_9038)' },
  { id: 'e2', peso: 10, label: 'Proteção de partes móveis (NR 10/12)' },
  { id: 'e3', peso: 10, label: 'Sistema de segurança/alarme contra sinistros' },
  { id: 'e4', peso: 20, label: 'DRs e instalações elétricas (NT_AGR_9003)' },
  { id: 'e5', peso: 20, label: 'Local de refeições/banheiro adequado para apanha' },
];

const CR_PROCEDIMENTOS = [
  { id: 'p1', peso: 20, label: 'Intervalo entre lotes (OT_AGR_9035)' },
  { id: 'p2', peso: 10, label: 'Área isenta de outras espécies/aves' },
  { id: 'p3', peso: 5, label: 'Ficha do lote preenchida e íntegra' },
  { id: 'p4', peso: 5, label: "Uso correto de EPI's" },
  { id: 'p5', peso: 10, label: 'Dimensionamento pinteira/cercado (OT_AGR_9037)' },
  { id: 'p6', peso: 20, label: 'Ambiência verão/inverno (OT_AGR_9038)' },
  { id: 'p7', peso: 5, label: 'Padrão de luz (OT_AGR_9107)' },
  { id: 'p8', peso: 15, label: 'Qualidade da água (OT_AGR_9043)' },
  { id: 'p9', peso: 10, label: 'Manejo adequado da cama' },
];

const CR_SUSTENTABILIDADE = [
  { id: 's1', peso: 15, label: 'Separação/destinação correta de resíduos' },
  { id: 's2', peso: 70, label: 'Energia alternativa (fotovoltaico/biogás) ≥80%' },
  { id: 's3', peso: 15, label: 'Bem-estar animal (5 Liberdades, OT_AGR_9044)' },
];

function crNotaBloco(itens: { id: string; peso: number }[], respostas: Record<string, boolean>): number {
  return itens.reduce((soma, item) => soma + (respostas[item.id] === true ? item.peso : 0), 0);
}

function crLinhasRespostas(itens: { id: string; label: string; peso?: number }[], respostas: Record<string, boolean>): string[][] {
  return itens.map((it) => [
    it.label,
    it.peso !== undefined ? `${fmt(it.peso, 0)}%` : '—',
    respostas[it.id] === true ? 'Sim' : respostas[it.id] === false ? 'Não' : '—',
  ]);
}

function montarSecaoChecklistRemuneracao(lote: Lote): string {
  const checklist = (lote as any).checklistRemuneracao;
  if (!checklist?.qualificadores) return '';

  const respQualif = checklist.qualificadores.respostas || {};
  const aprovado = !!checklist.qualificadores.aprovado;
  const finalizado = !!checklist.finalizado;

  const respEstrutural = checklist.estrutural?.respostas || {};
  const respProcedimentos = checklist.procedimentos?.respostas || {};
  const respSustentabilidade = checklist.sustentabilidade?.respostas || {};

  const notaEstrutural = crNotaBloco(CR_ESTRUTURAL, respEstrutural);
  const notaProcedimentos = crNotaBloco(CR_PROCEDIMENTOS, respProcedimentos);
  const notaSustentabilidade = crNotaBloco(CR_SUSTENTABILIDADE, respSustentabilidade);
  const avaliacaoFinal = notaEstrutural * 0.2 + notaProcedimentos * 0.45 + notaSustentabilidade * 0.35;

  const tabelaQualif = tabelaComHeader(
    'Itens Qualificadores',
    ['Pergunta', 'Peso', 'Resposta'],
    crLinhasRespostas(CR_QUALIFICADORES, respQualif)
  );

  const statusQualif = `
    <table style="margin-top:8px;">
      <tr><td class="label">Resultado</td><td class="value">${aprovado ? 'Aprovado' : 'Não aprovado'}</td></tr>
      <tr><td class="label">Data da avaliação</td><td class="value">${fmtDateBR(checklist.qualificadores.data)}</td></tr>
    </table>
  `;

  let blocosHtml = '';
  if (aprovado) {
    blocosHtml = `
      ${tabelaComHeader('Adequação Estrutural (peso 20%)', ['Pergunta', 'Peso', 'Resposta'], crLinhasRespostas(CR_ESTRUTURAL, respEstrutural))}
      ${tabelaComHeader('Adequação de Procedimentos (peso 45%)', ['Pergunta', 'Peso', 'Resposta'], crLinhasRespostas(CR_PROCEDIMENTOS, respProcedimentos))}
      ${tabelaComHeader('Adequação de Sustentabilidade (peso 35%)', ['Pergunta', 'Peso', 'Resposta'], crLinhasRespostas(CR_SUSTENTABILIDADE, respSustentabilidade))}

      <div class="section">
        <h3>Pontuação Obtida Total</h3>
        <table>
          <tr><td class="label">Adequação Estrutural (peso 20%)</td><td class="value">${fmt(notaEstrutural, 2)}%</td></tr>
          <tr><td class="label">Adequação de Procedimentos (peso 45%)</td><td class="value">${fmt(notaProcedimentos, 2)}%</td></tr>
          <tr><td class="label">Adequação de Sustentabilidade (peso 35%)</td><td class="value">${fmt(notaSustentabilidade, 2)}%</td></tr>
          <tr><td class="label" style="font-weight:700;">Avaliação Final (Pontuação Obtida)</td><td class="value" style="font-size:14px;">${fmt(avaliacaoFinal, 2)}%</td></tr>
          <tr><td class="label">Situação</td><td class="value">${finalizado ? `Finalizado em ${fmtDateBR(checklist.dataFinalizacao)}` : 'Em preenchimento'}</td></tr>
        </table>
      </div>
    `;
  } else {
    blocosHtml = `
      <div class="section">
        <p style="font-size:12.5px; color:#666;">
          O lote não foi aprovado nos Itens Qualificadores — o Ajuste de Procedimentos foi excluído, conforme regra do checklist.
        </p>
      </div>
    `;
  }

  return `
    <div class="section">
      <h3>CheckList de Remuneração</h3>
      ${tabelaQualif}
      ${statusQualif}
      ${blocosHtml}
    </div>
  `;
}

export async function exportarRelatorioPdf(lote: Lote, logoBase64?: string | null) {
  try {
    const idx = computeIndices(lote);
    const dataRef = lote.status === 'encerrado' && lote.encerramento ? lote.encerramento.data : todayStr();
    const idade = daysBetween(lote.dataAlojamento, dataRef);
    const nomeGalpao = (id: string) => lote.galpoes.find((g) => g.id === id)?.nome ?? id;

    // 👇 Marca d'água padrão do app (versão completa, para o fundo)
    const watermarkSrc = await getWatermarkSrc();

    // 👇 Versão pequena/comprimida da splash, usada como logo de fallback no cabeçalho
    //    (evita duplicar a imagem grande no HTML, o que travava a geração de PDF no Android)
    const watermarkLogoSrc = logoBase64 ? null : await getWatermarkLogoSrc();


    // ---------- Tabela de galpões ----------
    const linhasGalpoes = idx.statsGalpoes.map((s) => [
      s.galpao.nome,
      fmt(Number(s.galpao.quantidadeAlojada), 0),
      fmt(s.avesVivas, 0),
      fmt(s.mortalidade, 0),
      fmt(s.descartados, 0),
      s.pesoFinal !== null ? `${fmt(s.pesoFinal, 0)} g` : '—',
    ]);

    // ---------- Temperatura ----------
    const linhasTemp = (lote.temperaturas || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((t) => [fmtDateBR(t.data), nomeGalpao(t.galpaoId), fmt(t.tempMin, 1), fmt(t.tempMax, 1)]);

    // ---------- Mortalidade / Descarte ----------
    const linhasMort = (lote.mortalidades || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((m) => [
        fmtDateBR(m.data),
        nomeGalpao(m.galpaoId),
        fmt(Number(m.mortalidade), 0),
        fmt(Number(m.descartados || 0), 0),
      ]);

    // ---------- Água ----------
    const linhasAgua = (lote.aguas || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((a) => [fmtDateBR(a.data), nomeGalpao(a.galpaoId), `${fmt(Number(a.consumoM3), 2)} m³`]);

    // ---------- Pesagens ----------
    const linhasPesagem = (lote.pesagens || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((p) => [
        fmtDateBR(p.data),
        nomeGalpao(p.galpaoId),
        daysBetween(lote.dataAlojamento, p.data).toString(),
        p.pesoMedioG !== null && p.pesoMedioG !== undefined ? `${fmt(Number(p.pesoMedioG), 0)} g` : '—',
      ]);

    // ---------- Ração ----------
    const linhasRacao = (lote.racoes || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((r) => [fmtDateBR(r.data), nomeGalpao(r.galpaoId), `${fmt(Number(r.racaoKg), 0)} kg`]);

    // ---------- Estoque de ração ----------
    const linhasEstoque = (lote.estoquesRacao || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((e) => [
        fmtDateBR(e.data),
        nomeGalpao(e.galpaoId),
        `${fmt(e.estoqueSiloKg, 0)} kg`,
        `${fmt(e.estoqueEquipamentosKg, 0)} kg`,
      ]);

    // ---------- Avaliação Técnica ----------
    const linhasAvaliacao = (lote.avaliacoesTecnicas || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((a) => {
        const resumoItens = ITENS_AVALIACAO_TECNICA
          .filter((it) => a.itens?.[it.chave])
          .map((it) => `${it.label}: ${a.itens![it.chave]}`)
          .join(' | ');

        return [
          fmtDateBR(a.data),
          nomeGalpao(a.galpaoId),
          a.hora ?? '—',
          a.tecnico ?? '—',
          resumoItens || '—',
          a.orientacoes ?? '—',
        ];
      });

    // ---------- Medicamentos Terapêuticos ----------
    const linhasMedicamentos = (lote.medicamentosTerapeuticos || [])
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
      .map((m) => [
        fmtDateBR(m.dataInicio),
        m.dataFim ? fmtDateBR(m.dataFim) : '—',
        nomeGalpao(m.galpaoId),
        m.produto,
        m.principioAtivo || '—',
        m.dosagem || '—',
        m.viaAdministracao || '—',
        m.carenciaDias !== null && m.carenciaDias !== undefined ? `${m.carenciaDias} dias` : '—',
      ]);

    // ---------- Produtos Químicos ----------
    const linhasQuimicos = (lote.produtosQuimicos || [])
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((q) => [
        fmtDateBR(q.data),
        nomeGalpao(q.galpaoId),
        q.produto,
        q.finalidade || '—',
        q.quantidade !== null && q.quantidade !== undefined ? `${fmt(q.quantidade, 2)} ${q.unidade || ''}` : '—',
        q.responsavel || '—',
      ]);

    // ---------- Abate / Encerramento ----------
    let secaoAbate = '';
    if (lote.status === 'encerrado' && lote.encerramento) {
      const enc = lote.encerramento;
      const linhasAbate = (enc.porGalpao || []).map((p) => [
        nomeGalpao(p.galpaoId),
        `${fmt(p.pesoMedioFinalG, 0)} g`,
        p.qtdeAbatida !== null ? fmt(p.qtdeAbatida, 0) : '—',
        p.pesoRecebidoKg !== null ? `${fmt(p.pesoRecebidoKg, 0)} kg` : '—',
        p.condenadosTotal !== null ? fmt(p.condenadosTotal, 0) : '—',
      ]);
      secaoAbate = `
        <div class="section">
          <h3>Resultado de Abate</h3>
          <table class="tabela-registros">
            <tr><td class="th">Galpão</td><td class="th">Peso final</td><td class="th">Qtde abatida</td><td class="th">Peso recebido</td><td class="th">Condenados</td></tr>
            ${linhasAbate.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </table>
          <table style="margin-top:12px;">
            <tr><td class="label">Data de encerramento</td><td class="value">${fmtDateBR(enc.data)}</td></tr>
            <tr><td class="label">Peso médio projetado</td><td class="value">${enc.pesoMedioProjetadoG !== null && enc.pesoMedioProjetadoG !== undefined ? fmt(enc.pesoMedioProjetadoG, 0) + ' g' : '—'}</td></tr>
            <tr><td class="label">Condenados totais</td><td class="value">${idx.condenadosTotal !== null ? fmt(idx.condenadosTotal, 0) : '—'}</td></tr>
            <tr><td class="label">% de condenação</td><td class="value">${idx.percentualCondenacao !== null ? fmt(idx.percentualCondenacao, 2) + '%' : '—'}</td></tr>
            ${enc.obs ? `<tr><td class="label">Observações</td><td class="value">${enc.obs}</td></tr>` : ''}
          </table>
        </div>
      `;
    }

    // ---------- CheckList de Remuneração ----------
    const secaoChecklistRemuneracao = montarSecaoChecklistRemuneracao(lote);

    // 👇 Logo à esquerda; se não houver logo configurada, usa a versão pequena/colorida da splash
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" style="width:72px; height:72px; object-fit:contain; border-radius:8px;" />`
      : watermarkLogoSrc
      ? `<img src="${watermarkLogoSrc}" style="width:72px; height:72px; object-fit:contain; border-radius:8px;" />`
      : `<div style="width:72px; height:72px; border:1px dashed #ccc; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#999; text-align:center;">Sem logo</div>`;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              font-family: -apple-system, Helvetica, Arial, sans-serif;
              padding: 24px;
              color: #1a1a1a;
              position: relative;
              margin: 0;
            }
            body::before {
  content: '';
  display: ${watermarkSrc ? 'block' : 'none'};
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url('${watermarkSrc ?? ''}');
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 220px 233px;
  opacity: 0.08;
  z-index: 0;
}


            .conteudo {
              position: relative;
              z-index: 1;
            }
            .cabecalho { display: flex; align-items: center; justify-content: flex-start; gap: 16px; text-align: left; }
            h1 { font-size: 20px; margin-bottom: 4px; text-align: left; }
            h2 { font-size: 14px; color: #666; margin-top: 0; font-weight: normal; text-align: left; }
            h3 { font-size: 15px; margin-bottom: 6px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
            .section { margin-top: 24px; page-break-inside: avoid; }
            .grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
            .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px 16px; min-width: 130px; background: rgba(255,255,255,0.55); }
            .card .label { font-size: 11px; color: #888; text-transform: uppercase; }
            .card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; background: rgba(255,255,255,0.55); }
            td { padding: 6px 4px; border-bottom: 1px solid rgba(238,238,238,0.7); font-size: 12px; }
            td.label { color: #666; }
            td.value { text-align: right; font-weight: 600; }
            td.th { font-weight: 700; background: rgba(243,244,246,0.6); text-align: left; }
            .tabela-registros td { text-align: left; }
            .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
            .assinatura { margin-top: 48px; display: flex; justify-content: space-between; }
            .assinatura .linha { border-top: 1px solid #333; width: 45%; text-align: center; padding-top: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="conteudo">
            <div class="cabecalho">
              ${logoHtml}
              <div>
                <h1>Relatório do Lote ${lote.numero ?? ''}</h1>
                <h2>Linhagem: ${lote.linhagem} — Sexagem: ${lote.sexagem} — Alojamento: ${fmtDateBR(lote.dataAlojamento)}</h2>
                <h2>Gerado em ${new Date().toLocaleDateString('pt-BR')} — Status: ${lote.status}</h2>
              </div>
            </div>

            <div class="section grid">
              <div class="card"><div class="label">Idade</div><div class="value">${idade} dias</div></div>
              <div class="card"><div class="label">Viabilidade</div><div class="value">${fmt(idx.viabilidade, 1)}%</div></div>
              <div class="card"><div class="label">Peso médio</div><div class="value">${fmt(idx.pesoMedioAtualG, 0)} g</div></div>
              <div class="card"><div class="label">Conversão</div><div class="value">${fmt(idx.conversaoAlimentar, 3)}</div></div>
              <div class="card"><div class="label">GPD</div><div class="value">${fmt(idx.gpd, 1)} g/dia</div></div>
              <div class="card"><div class="label">IEP</div><div class="value">${fmt(idx.iep, 0)}</div></div>
            </div>

            <div class="section">
              <table>
                <tr><td class="label">Aves vivas</td><td class="value">${idx.avesVivas} / ${idx.quantidadeAlojadaTotal}</td></tr>
                <tr><td class="label">Mortalidade acumulada</td><td class="value">${idx.mortalidadeAcumulada}</td></tr>
                <tr><td class="label">Descartados acumulados</td><td class="value">${idx.descartadosAcumulados}</td></tr>
                <tr><td class="label">Ração acumulada</td><td class="value">${fmt(idx.racaoAcumuladaKg, 0)} kg</td></tr>
                <tr><td class="label">Água acumulada</td><td class="value">${fmt(idx.aguaAcumuladaL, 0)} L</td></tr>
              </table>
            </div>

            <div class="section">
              <h3>Detalhamento por Galpão</h3>
              <table class="tabela-registros">
                <tr><td class="th">Galpão</td><td class="th">Alojado</td><td class="th">Vivas</td><td class="th">Mortalidade</td><td class="th">Descarte</td><td class="th">Peso final</td></tr>
                ${linhasGalpoes.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
              </table>
            </div>

            ${tabelaGenerica('Temperatura', linhasTemp)}
            ${tabelaGenerica('Mortalidade e Descarte', linhasMort)}
            ${tabelaGenerica('Consumo de Água', linhasAgua)}
            ${tabelaGenerica('Pesagens', linhasPesagem)}
            ${tabelaGenerica('Consumo de Ração', linhasRacao)}
            ${tabelaGenerica('Estoque de Ração (Silo / Equipamentos)', linhasEstoque)}
            ${tabelaComHeader(
              'Avaliações Técnicas',
              ['Data', 'Galpão', 'Hora', 'Técnico', 'Itens Avaliados', 'Orientações'],
              linhasAvaliacao
            )}
            ${tabelaGenerica('Medicamentos Terapêuticos', linhasMedicamentos)}
            ${tabelaGenerica('Produtos Químicos', linhasQuimicos)}
            ${secaoAbate}
            ${secaoChecklistRemuneracao}

            <div class="assinatura">
              <div class="linha">Responsável Técnico</div>
              <div class="linha">Produtor</div>
            </div>

            <div class="footer">Relatório gerado automaticamente pelo app em ${new Date().toLocaleString('pt-BR')}.</div>
          </div>
        </body>
      </html>
    `;

    // 👇 Nome do arquivo final desejado (sanitizado para evitar caracteres inválidos)
    const numeroSanitizado = String(lote.numero ?? 'SemNumero').replace(/[^a-zA-Z0-9_-]/g, '');
    const nomeArquivo = `GestaoAvi-Lote${numeroSanitizado}`;

    // ---------- Geração do PDF (com suporte à Web) ----------
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        Alert.alert('Erro', 'Não foi possível abrir a janela de impressão. Verifique se o navegador não bloqueou pop-ups.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      // 👇 Sugere o nome do arquivo ao navegador (usado como padrão em "Salvar como PDF")
      printWindow.document.title = nomeArquivo;
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);

      return;
    }

    // ---------- Mobile: gera o PDF e renomeia o arquivo ----------
    const { uri } = await Print.printToFileAsync({ html });

    // Move/renomeia o arquivo gerado para o nome desejado, na mesma pasta de cache
    const novoUri = `${FileSystem.cacheDirectory}${nomeArquivo}.pdf`;

    // Remove um arquivo antigo com o mesmo nome, se existir (evita conflito)
    const existeArquivo = await FileSystem.getInfoAsync(novoUri);
    if (existeArquivo.exists) {
      await FileSystem.deleteAsync(novoUri, { idempotent: true });
    }

    await FileSystem.moveAsync({ from: uri, to: novoUri });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(novoUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório do Lote ${lote.numero ?? ''}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF gerado', `Arquivo salvo em: ${novoUri}`);
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    Alert.alert('Erro', 'Não foi possível gerar o relatório em PDF.');
  }
}
