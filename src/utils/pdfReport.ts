import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { computeIndices, daysBetween, todayStr, fmt, fmtDateBR, Lote } from './calculations';

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

export async function exportarRelatorioPdf(lote: Lote) {
  try {
    const idx = computeIndices(lote);
    const dataRef = lote.status === 'encerrado' && lote.encerramento ? lote.encerramento.data : todayStr();
    const idade = daysBetween(lote.dataAlojamento, dataRef);
    const nomeGalpao = (id: string) => lote.galpoes.find((g) => g.id === id)?.nome ?? id;

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
      .map((a) => [
        fmtDateBR(a.data),
        nomeGalpao(a.galpaoId),
        a.uniformidade !== null && a.uniformidade !== undefined ? `${fmt(a.uniformidade, 0)}%` : '—',
        a.escoreCama ?? '—',
        a.escoreFezes ?? '—',
        a.observacoes || '—',
      ]);

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

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #1a1a1a; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 14px; color: #666; margin-top: 0; font-weight: normal; }
            h3 { font-size: 15px; margin-bottom: 6px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
            .section { margin-top: 24px; page-break-inside: avoid; }
            .grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
            .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px 16px; min-width: 130px; }
            .card .label { font-size: 11px; color: #888; text-transform: uppercase; }
            .card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            td { padding: 6px 4px; border-bottom: 1px solid #eee; font-size: 12px; }
            td.label { color: #666; }
            td.value { text-align: right; font-weight: 600; }
            td.th { font-weight: 700; background: #f3f4f6; text-align: left; }
            .tabela-registros td { text-align: left; }
            .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
            .assinatura { margin-top: 48px; display: flex; justify-content: space-between; }
            .assinatura .linha { border-top: 1px solid #333; width: 45%; text-align: center; padding-top: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Relatório do Lote ${lote.numero ?? ''}</h1>
          <h2>Linhagem: ${lote.linhagem} — Sexagem: ${lote.sexagem} — Alojamento: ${fmtDateBR(lote.dataAlojamento)}</h2>
          <h2>Gerado em ${new Date().toLocaleDateString('pt-BR')} — Status: ${lote.status}</h2>

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
          ${tabelaGenerica('Avaliações Técnicas', linhasAvaliacao)}
          ${tabelaGenerica('Medicamentos Terapêuticos', linhasMedicamentos)}
          ${tabelaGenerica('Produtos Químicos', linhasQuimicos)}
          ${secaoAbate}

          <div class="assinatura">
            <div class="linha">Responsável Técnico</div>
            <div class="linha">Produtor</div>
          </div>

          <div class="footer">Relatório gerado automaticamente pelo app em ${new Date().toLocaleString('pt-BR')}.</div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório do Lote ${lote.numero ?? ''}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF gerado', `Arquivo salvo em: ${uri}`);
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    Alert.alert('Erro', 'Não foi possível gerar o relatório em PDF.');
  }
}
