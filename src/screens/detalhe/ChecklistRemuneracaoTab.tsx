// src/screens/detalhe/ChecklistRemuneracaoTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CheckCircle2, Lock } from 'lucide-react-native';

import { COLORS } from '../../theme/colors';
import { SalvarButton } from '../../components/registros/SalvarButton';
import { useAuth } from '../../auth/AuthContext';
import { alertaUniversal } from '../../utils/alerta';
import { fmt, fmtDateBR, Lote } from '../../utils/calculations';
import {
  getLoteById,
  setChecklistQualificadores,
  finalizarChecklistRemuneracao,
} from '../../storage/storage';

// ---------- Perguntas e pesos (fixos) ----------

const QUALIFICADORES = [
  {
    id: 'q1',
    label:
      'Assertividade Peso: O peso médio informado pelo Integrado, em relação ao peso médio real do lote, está dentro da faixa estabelecida, com limite inferior e superior de 50 gramas no frango griller e de 100 gramas no frango pesado?',
  },
  {
    id: 'q2',
    label:
      'Cumpre os procedimentos para garantir a não mistura de ração (limpeza e esgotamento de silos) e uso de medicamentos somente quando indicados pela Empresa?',
  },
  {
    id: 'q3',
    label:
      'A granja apresenta condições mínimas de biosseguridade: cerca, portaria, tela malha 2, arco de desinfecção, compostagem e ciclo de água fechado? Todos estão em funcionamento e bom estado de conservação?',
  },
];

const ESTRUTURAL = [
  {
    id: 'e1',
    peso: 40,
    label:
      'Possui equipamentos que permitam fornecer ambiência adequada às aves (ventiladores, exaustores, nebulizadores, painel de controle, nº lâmpadas suficientes, vedação, cortinas, forração, fornalha), de acordo com OT_AGR_9038?',
  },
  {
    id: 'e2',
    peso: 10,
    label:
      'Possui proteção de partes móveis em ventiladores/exaustores, máquinas e demais equipamentos, conforme NR 10 e NR 12?',
  },
  {
    id: 'e3',
    peso: 10,
    label:
      'Possui sistema de segurança para casos de sinistros, em queda de energia e desvio de temperatura (alarme, desarme de cortina ou geradores)?',
  },
  {
    id: 'e4',
    peso: 20,
    label:
      'Possui DRs por grupos de equipamentos e garante o bom funcionamento dos mesmos, de acordo com o padrão de Segurança das Instalações Elétricas: NT_AGR_9003?',
  },
  {
    id: 'e5',
    peso: 20,
    label:
      'Possui local para refeições adequado com mesa, assentos suficientes, água potável, papel toalha e banheiro com lixeiras e canos para carregamento suficientes para uso das equipes de apanha?',
  },
];

const PROCEDIMENTOS = [
  {
    id: 'p1',
    peso: 20,
    label:
      'Executa todos procedimentos de intervalo entre lotes (limpeza, desinfecção, controle de vetores e fermentação de cama), de acordo com a OT_AGR_9035?',
  },
  {
    id: 'p2',
    peso: 10,
    label:
      'A área de biosseguridade está isenta de animais de outras espécies, assim como não possui outras aves sendo criadas na mesma propriedade?',
  },
  {
    id: 'p3',
    peso: 5,
    label:
      'A ficha de acompanhamento do lote está adequadamente preenchida e assinada (sem rasuras e espaços em branco, está íntegra)? Possui todos os registros necessários exigidos por clientes?',
  },
  {
    id: 'p4',
    peso: 5,
    label:
      "Há utilização de EPI's adequados para atividade de produção (luvas, máscaras, óculos e botas) e segue as orientações de segurança?",
  },
  {
    id: 'p5',
    peso: 10,
    label:
      'No alojamento, o dimensionamento da pinteira, abertura de cercado e uso das cercas divisórias estão de acordo com OT_AGR_9037?',
  },
  {
    id: 'p6',
    peso: 20,
    label:
      'Executa todos procedimentos para manter uma boa ambiência de verão e inverno, visando conforto das aves, de acordo com a OT_AGR_9038?',
  },
  {
    id: 'p7',
    peso: 5,
    label: 'Cumpre padrão de luz orientado pela Empresa, de acordo com a OT_AGR_9107?',
  },
  {
    id: 'p8',
    peso: 15,
    label: 'Fornece água com o padrão de qualidade previsto na OT_AGR_9043?',
  },
  {
    id: 'p9',
    peso: 10,
    label: 'Mantém a cama manejada adequadamente, de forma a estar macia, livre de umidade e torrões?',
  },
];

const SUSTENTABILIDADE = [
  {
    id: 's1',
    peso: 15,
    label:
      'Possui separação, identificação e destinação correta de resíduos da produção (papéis, plásticos, resíduos classe I, aves mortas)?',
  },
  {
    id: 's2',
    peso: 70,
    label: 'Possui fonte de energia alternativa (fotovoltaico ou biogás) que atende 80% da demanda da atividade?',
  },
  {
    id: 's3',
    peso: 15,
    label: 'Cumpre as regras de bem estar animal (5 Liberdades), de acordo com a OT_AGR_9044?',
  },
];

// ---------- Helpers ----------

function notaBloco(itens: { id: string; peso: number }[], respostas: Record<string, boolean>): number {
  return itens.reduce((soma, item) => soma + (respostas[item.id] === true ? item.peso : 0), 0);
}

// ---------- Toggle Sim/Não ----------

function SimNaoToggle({
  label,
  peso,
  value,
  onChange,
  disabled,
}: {
  label: string;
  peso?: number;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.pergLinha}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={styles.pergTexto}>{label}</Text>
        {peso !== undefined && <Text style={styles.pergPeso}>Peso: {fmt(peso, 2)}%</Text>}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable
          disabled={disabled}
          onPress={() => onChange(true)}
          style={[
            styles.botaoToggle,
            value === true && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
            disabled && { opacity: 0.5 },
          ]}
        >
          <Text style={[styles.botaoToggleTexto, value === true && { color: '#fff' }]}>Sim</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => onChange(false)}
          style={[
            styles.botaoToggle,
            value === false && { backgroundColor: COLORS.alert ?? '#A6432B', borderColor: COLORS.alert ?? '#A6432B' },
            disabled && { opacity: 0.5 },
          ]}
        >
          <Text style={[styles.botaoToggleTexto, value === false && { color: '#fff' }]}>Não</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ChecklistRemuneracaoTab({ route }: any) {
  const { loteId } = route.params;
  const { userId } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);

  const [respQualif, setRespQualif] = useState<Record<string, boolean>>({});
  const [respEstrutural, setRespEstrutural] = useState<Record<string, boolean>>({});
  const [respProcedimentos, setRespProcedimentos] = useState<Record<string, boolean>>({});
  const [respSustentabilidade, setRespSustentabilidade] = useState<Record<string, boolean>>({});
  const [salvandoQualif, setSalvandoQualif] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const carregar = useCallback(() => {
    if (!userId) return;
    getLoteById(userId, loteId).then((l) => {
      if (!l) return;
      setLote(l);
      const checklist = (l as any).checklistRemuneracao;
      if (checklist) {
        setRespQualif(checklist.qualificadores?.respostas || {});
        setRespEstrutural(checklist.estrutural?.respostas || {});
        setRespProcedimentos(checklist.procedimentos?.respostas || {});
        setRespSustentabilidade(checklist.sustentabilidade?.respostas || {});
      }
    });
  }, [loteId, userId]);

  useFocusEffect(carregar);

  if (!lote) return null;

  const checklist = (lote as any).checklistRemuneracao;
  const finalizado = !!checklist?.finalizado;
  const aprovadoQualificadores = !!checklist?.qualificadores?.aprovado;

  const todasQualifRespondidas = QUALIFICADORES.every((q) => respQualif[q.id] !== undefined);

  const notaEstrutural = finalizado
    ? notaBloco(ESTRUTURAL, checklist.estrutural?.respostas || {})
    : notaBloco(ESTRUTURAL, respEstrutural);
  const notaProcedimentos = finalizado
    ? notaBloco(PROCEDIMENTOS, checklist.procedimentos?.respostas || {})
    : notaBloco(PROCEDIMENTOS, respProcedimentos);
  const notaSustentabilidade = finalizado
    ? notaBloco(SUSTENTABILIDADE, checklist.sustentabilidade?.respostas || {})
    : notaBloco(SUSTENTABILIDADE, respSustentabilidade);

  const avaliacaoFinal =
    notaEstrutural * 0.2 + notaProcedimentos * 0.45 + notaSustentabilidade * 0.35;

  const todosBlocosCompletos =
    ESTRUTURAL.every((i) => respEstrutural[i.id] !== undefined) &&
    PROCEDIMENTOS.every((i) => respProcedimentos[i.id] !== undefined) &&
    SUSTENTABILIDADE.every((i) => respSustentabilidade[i.id] !== undefined);

  const salvarQualificadores = async () => {
    if (!userId) return;
    if (!todasQualifRespondidas) {
      alertaUniversal('Atenção', 'Responda todos os itens qualificadores antes de salvar.');
      return;
    }
    setSalvandoQualif(true);
    try {
      await setChecklistQualificadores(userId, loteId, respQualif);
      carregar();
      const aprovou = QUALIFICADORES.every((q) => respQualif[q.id] === true);
      alertaUniversal(
        aprovou ? 'Lote aprovado' : 'Lote não aprovado',
        aprovou
          ? 'O lote foi aprovado nos itens qualificadores. Prossiga com os demais blocos.'
          : 'Um ou mais itens qualificadores foram respondidos como "Não". O lote está excluído do ajuste de procedimentos.'
      );
    } catch (e: any) {
      alertaUniversal('Erro ao salvar', e.message);
    } finally {
      setSalvandoQualif(false);
    }
  };

  const finalizar = () => {
    if (!todosBlocosCompletos) {
      alertaUniversal('Atenção', 'Responda todos os itens dos 3 blocos antes de finalizar.');
      return;
    }
    alertaUniversal(
      'Finalizar avaliação',
      'Após finalizar, o checklist não poderá mais ser editado. Confirma a finalização?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            setFinalizando(true);
            try {
              await finalizarChecklistRemuneracao(userId, loteId, {
                estrutural: respEstrutural,
                procedimentos: respProcedimentos,
                sustentabilidade: respSustentabilidade,
              });
              carregar();
              alertaUniversal('Sucesso', 'Checklist de remuneração finalizado.');
            } catch (e: any) {
              alertaUniversal('Erro ao finalizar', e.message);
            } finally {
              setFinalizando(false);
            }
          },
        },
      ]
    );
  };

  const blocosDesabilitados = !aprovadoQualificadores || finalizado;

  return (
    <View>
      {/* Card 1 — Itens Qualificadores */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Itens Qualificadores</Text>
        <Text style={styles.subtitulo}>
          Qualquer resposta "Não" exclui o lote do Ajuste de Procedimentos, permanecendo apenas o ajuste
          para Adequação Estrutural e de Sustentabilidade.
        </Text>

        {QUALIFICADORES.map((q) => (
          <SimNaoToggle
            key={q.id}
            label={q.label}
            value={respQualif[q.id]}
            disabled={finalizado}
            onChange={(v) => setRespQualif({ ...respQualif, [q.id]: v })}
          />
        ))}

        {checklist?.qualificadores && (
          <View style={styles.resultadoBox}>
            {aprovadoQualificadores ? (
              <View style={styles.linhaResultado}>
                <CheckCircle2 size={16} color={COLORS.primary} />
                <Text style={[styles.resultadoTexto, { color: COLORS.primary }]}>
                  Aprovado para o Ajuste de Procedimentos ({fmtDateBR(checklist.qualificadores.data)})
                </Text>
              </View>
            ) : (
              <Text style={[styles.resultadoTexto, { color: COLORS.alert ?? '#A6432B' }]}>
                Lote não aprovado — Ajuste de Procedimentos excluído ({fmtDateBR(checklist.qualificadores.data)})
              </Text>
            )}
          </View>
        )}

        {!finalizado && (
          <SalvarButton onPress={salvarQualificadores} loading={salvandoQualif} label="Salvar itens qualificadores" />
        )}
      </View>

      {/* Card 2 — Adequação Estrutural */}
      <View style={[styles.card, blocosDesabilitados && styles.cardDesabilitado]}>
        <View style={styles.cabecalhoCard}>
          <Text style={styles.titulo}>Avaliação da Adequação Estrutural</Text>
          {blocosDesabilitados && !finalizado && <Lock size={16} color={COLORS.inkSoft} />}
        </View>

        {ESTRUTURAL.map((i) => (
          <SimNaoToggle
            key={i.id}
            label={i.label}
            peso={i.peso}
            value={respEstrutural[i.id]}
            disabled={blocosDesabilitados}
            onChange={(v) => setRespEstrutural({ ...respEstrutural, [i.id]: v })}
          />
        ))}

        <View style={styles.rodapeBloco}>
          <Text style={styles.rodapeLabel}>AE - Nível de Adequação Estrutural obtida no lote</Text>
          <Text style={styles.rodapeValor}>{fmt(notaEstrutural, 2)}%</Text>
        </View>
      </View>

      {/* Card 3 — Adequação de Procedimentos */}
      <View style={[styles.card, blocosDesabilitados && styles.cardDesabilitado]}>
        <View style={styles.cabecalhoCard}>
          <Text style={styles.titulo}>Avaliação da Adequação de Procedimentos</Text>
          {blocosDesabilitados && !finalizado && <Lock size={16} color={COLORS.inkSoft} />}
        </View>

        {PROCEDIMENTOS.map((i) => (
          <SimNaoToggle
            key={i.id}
            label={i.label}
            peso={i.peso}
            value={respProcedimentos[i.id]}
            disabled={blocosDesabilitados}
            onChange={(v) => setRespProcedimentos({ ...respProcedimentos, [i.id]: v })}
          />
        ))}

        <View style={styles.rodapeBloco}>
          <Text style={styles.rodapeLabel}>AP - Nível de Adequação de Procedimentos obtida no lote</Text>
          <Text style={styles.rodapeValor}>{fmt(notaProcedimentos, 2)}%</Text>
        </View>
      </View>

      {/* Card 4 — Adequação de Sustentabilidade */}
      <View style={[styles.card, blocosDesabilitados && styles.cardDesabilitado]}>
        <View style={styles.cabecalhoCard}>
          <Text style={styles.titulo}>Avaliação da Adequação de Sustentabilidade</Text>
          {blocosDesabilitados && !finalizado && <Lock size={16} color={COLORS.inkSoft} />}
        </View>

        {SUSTENTABILIDADE.map((i) => (
          <SimNaoToggle
            key={i.id}
            label={i.label}
            peso={i.peso}
            value={respSustentabilidade[i.id]}
            disabled={blocosDesabilitados}
            onChange={(v) => setRespSustentabilidade({ ...respSustentabilidade, [i.id]: v })}
          />
        ))}

        <View style={styles.rodapeBloco}>
          <Text style={styles.rodapeLabel}>AS - Nível de Adequação de Sustentabilidade obtida no lote</Text>
          <Text style={styles.rodapeValor}>{fmt(notaSustentabilidade, 2)}%</Text>
        </View>
      </View>

      {/* Card 5 — Pontuação Obtida Total */}
      <View style={styles.card}>
        <Text style={styles.titulo}>Pontuação Obtida Total</Text>

        <View style={styles.linhaInfo}>
          <Text style={styles.infoLabel}>Adequação Estrutural (peso 20%)</Text>
          <Text style={styles.infoValor}>{fmt(notaEstrutural, 2)}%</Text>
        </View>
        <View style={styles.linhaInfo}>
          <Text style={styles.infoLabel}>Adequação de Procedimentos (peso 45%)</Text>
          <Text style={styles.infoValor}>{fmt(notaProcedimentos, 2)}%</Text>
        </View>
        <View style={styles.linhaInfo}>
          <Text style={styles.infoLabel}>Adequação de Sustentabilidade (peso 35%)</Text>
          <Text style={styles.infoValor}>{fmt(notaSustentabilidade, 2)}%</Text>
        </View>

        <View style={styles.divisor} />

        <View style={styles.linhaInfo}>
          <Text style={[styles.infoLabel, { fontWeight: '700', color: COLORS.ink }]}>
            Avaliação Final (Pontuação Obtida)
          </Text>
          <Text style={[styles.infoValor, { fontSize: 16, color: COLORS.primary }]}>
            {fmt(avaliacaoFinal, 2)}%
          </Text>
        </View>

        {finalizado ? (
          <View style={styles.resultadoBox}>
            <View style={styles.linhaResultado}>
              <CheckCircle2 size={16} color={COLORS.primary} />
              <Text style={[styles.resultadoTexto, { color: COLORS.primary }]}>
                Checklist finalizado em {fmtDateBR(checklist.dataFinalizacao)}
              </Text>
            </View>
          </View>
        ) : (
          aprovadoQualificadores && (
            <SalvarButton onPress={finalizar} loading={finalizando} label="Finalizar avaliação" />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardDesabilitado: {
    opacity: 0.55,
  },
  cabecalhoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  subtitulo: { fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 10 },
  pergLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  pergTexto: { fontSize: 12.5, color: COLORS.ink, lineHeight: 17 },
  pergPeso: { fontSize: 11, color: COLORS.inkSoft, marginTop: 4, fontWeight: '600' },
  botaoToggle: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  botaoToggleTexto: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSoft },
  rodapeBloco: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  rodapeLabel: { fontSize: 12.5, fontWeight: '600', color: COLORS.inkSoft, flex: 1, paddingRight: 8 },
  rodapeValor: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  resultadoBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  linhaResultado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultadoTexto: { fontSize: 12.5, fontWeight: '600' },
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoLabel: { fontSize: 13, color: COLORS.inkSoft, flex: 1, paddingRight: 8 },
  infoValor: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  divisor: { height: 1, backgroundColor: COLORS.line, marginVertical: 8 },
});