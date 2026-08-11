// lib/bonus/scoring.ts
//
// Meta de Bônus — parte COLETIVA (70% do bônus total; os outros 30% são
// individuais e não entram aqui). Diferente do módulo de Metas Regionais
// (que é bateu/não bateu), aqui cada indicador tem 3 faixas de meta —
// Meta cheia / Meta 80% / Meta 60% — e paga uma fração do peso conforme
// a faixa que o Real alcançar.
//
//   CMV             -> peso 0,10 — custo, menor é melhor
//   Custo c/ Pessoal -> peso 0,10 — custo, menor é melhor
//   LOL (Margem)    -> peso 0,40 — margem, maior é melhor
//   NPS             -> peso 0,10 — maior é melhor
//
// Faixas:
//   "menor_melhor" (custo): bate a faixa se Real <= limiar.
//     limiares crescem: Meta (mais apertado) < Meta 80% < Meta 60% (mais frouxo)
//   "maior_melhor" (margem/NPS): bate a faixa se Real >= limiar.
//     limiares decrescem: Meta (mais alto) > Meta 80% > Meta 60% (mais baixo)
//
// Pontos do indicador = peso * fração da faixa batida (1 / 0,8 / 0,6 / 0)
// Pontuação total = soma dos pontos, sobre o peso coletivo total (0,70)

export type IndicadorBonusKey = 'cmv' | 'custo_pessoal' | 'lol_margem' | 'nps'
export type DirecaoBonus = 'menor_melhor' | 'maior_melhor'
export type FaixaBonus = 'meta' | 'meta_80' | 'meta_60' | 'nao_atingiu' | 'pendente'

export interface IndicadorBonusConfig {
  key: IndicadorBonusKey
  label: string
  peso: number
  direcao: DirecaoBonus
}

export const INDICADORES_BONUS: IndicadorBonusConfig[] = [
  { key: 'cmv',            label: 'CMV',               peso: 0.10, direcao: 'menor_melhor' },
  { key: 'custo_pessoal',  label: 'Custo com Pessoal', peso: 0.10, direcao: 'menor_melhor' },
  { key: 'lol_margem',     label: 'LOL (Margem)',      peso: 0.40, direcao: 'maior_melhor' },
  { key: 'nps',            label: 'NPS',               peso: 0.10, direcao: 'maior_melhor' },
]

export const PESO_COLETIVO_TOTAL = INDICADORES_BONUS.reduce((soma, i) => soma + i.peso, 0) // 0.70

export interface LinhaBonusInput {
  indicador: IndicadorBonusKey
  meta: number | null
  meta80: number | null
  meta60: number | null
  real: number | null
  observacao?: string | null
}

export interface ResultadoIndicadorBonus extends LinhaBonusInput {
  config: IndicadorBonusConfig
  faixa: FaixaBonus
  fracao: number
  pontos: number
  gapProximaFaixa: number | null // em p.p. do próprio indicador, null se já bateu a meta cheia ou sem Real
}

export interface ResultadoBonusMes {
  mesRef: string
  indicadores: ResultadoIndicadorBonus[]
  pontosTotais: number
  pesoTotalColetivo: number
  percentualAtingido: number // pontosTotais / pesoTotalColetivo
}

function bateuLimiar(direcao: DirecaoBonus, real: number, limiar: number): boolean {
  return direcao === 'menor_melhor' ? real <= limiar : real >= limiar
}

export function calcularFaixaIndicador(
  config: IndicadorBonusConfig,
  input: LinhaBonusInput
): { faixa: FaixaBonus; fracao: number; gapProximaFaixa: number | null } {
  const { real, meta, meta80, meta60 } = input

  if (real == null || meta == null || meta80 == null || meta60 == null) {
    return { faixa: 'pendente', fracao: 0, gapProximaFaixa: null }
  }

  const sinal = config.direcao === 'menor_melhor' ? -1 : 1

  if (bateuLimiar(config.direcao, real, meta)) {
    return { faixa: 'meta', fracao: 1, gapProximaFaixa: null }
  }
  if (bateuLimiar(config.direcao, real, meta80)) {
    return { faixa: 'meta_80', fracao: 0.8, gapProximaFaixa: sinal * (meta - real) }
  }
  if (bateuLimiar(config.direcao, real, meta60)) {
    return { faixa: 'meta_60', fracao: 0.6, gapProximaFaixa: sinal * (meta80 - real) }
  }
  return { faixa: 'nao_atingiu', fracao: 0, gapProximaFaixa: sinal * (meta60 - real) }
}

export function calcularResultadoIndicador(
  config: IndicadorBonusConfig,
  input: LinhaBonusInput
): ResultadoIndicadorBonus {
  const { faixa, fracao, gapProximaFaixa } = calcularFaixaIndicador(config, input)
  return { ...input, config, faixa, fracao, pontos: config.peso * fracao, gapProximaFaixa }
}

export function calcularResultadoMes(mesRef: string, linhas: LinhaBonusInput[]): ResultadoBonusMes {
  const indicadores = INDICADORES_BONUS.map((config) => {
    const linha = linhas.find((l) => l.indicador === config.key)
    return calcularResultadoIndicador(config, linha ?? {
      indicador: config.key, meta: null, meta80: null, meta60: null, real: null,
    })
  })

  const pontosTotais = indicadores.reduce((soma, i) => soma + i.pontos, 0)

  return {
    mesRef,
    indicadores,
    pontosTotais,
    pesoTotalColetivo: PESO_COLETIVO_TOTAL,
    percentualAtingido: PESO_COLETIVO_TOTAL > 0 ? pontosTotais / PESO_COLETIVO_TOTAL : 0,
  }
}

export const FAIXA_LABEL: Record<FaixaBonus, string> = {
  meta: 'Meta cheia',
  meta_80: 'Faixa 80%',
  meta_60: 'Faixa 60%',
  nao_atingiu: 'Não atingiu',
  pendente: 'Pendente',
}

// ═══════════════════════════════════════════════════════════════════════
// Apuração SEMESTRAL (oficial) — regra de recuperação
//
// S1 = Jan-Jun. S2 = Jul-Dez... EXCETO se o indicador não bateu nenhuma
// faixa em S1: nesse caso o S2 passa a avaliar o acumulado Jan-Dez (ano
// inteiro), dando uma segunda chance de recuperar no fechamento do ano.
// A regra é por INDICADOR, não pro bônus como um todo — um indicador
// pode "recuperar" enquanto outro não, no mesmo semestre.
//
// O Real de cada janela é a MÉDIA SIMPLES dos meses incluídos (mesma
// convenção já usada em lib/metas/scoring.ts pra indicadores em %).
// Se quiser trocar pra acumulado "de verdade" (soma custo / soma ROB),
// dá pra fazer isso no DRE antes de lançar o Real mensal — aqui a
// agregação já assume que o que chega em Real já é comparável mês a mês.
// ═══════════════════════════════════════════════════════════════════════

export type JanelaS2 = 'jul_dez' | 'jan_dez'

export interface LimiaresIndicador {
  meta: number
  meta80: number
  meta60: number
}

export interface ResultadoIndicadorSemestral {
  config: IndicadorBonusConfig
  s1: ResultadoIndicadorBonus // Jan-Jun
  s2: ResultadoIndicadorBonus // Jul-Dez, ou Jan-Dez se recuperando
  s2Janela: JanelaS2
  recuperandoS1: boolean // true = S1 não bateu nenhuma faixa, S2 avalia o ano inteiro
  mesesLancadosS1: number // quantos dos 6 meses de S1 já têm Real lançado (de 0 a 6)
  mesesLancadosS2: number // quantos meses da janela de S2 já têm Real lançado
  totalMesesS2: number // tamanho da janela de S2 (6 se jul_dez, 12 se jan_dez)
}

export interface ResultadoSemestre {
  pontosTotais: number
  pesoTotalColetivo: number
  percentualAtingido: number
}

export interface ResultadoBonusAnual {
  ano: number
  indicadores: ResultadoIndicadorSemestral[]
  s1: ResultadoSemestre
  s2: ResultadoSemestre
}

const MESES_S1 = ['01', '02', '03', '04', '05', '06']
const MESES_S2 = ['07', '08', '09', '10', '11', '12']
const MESES_ANO = [...MESES_S1, ...MESES_S2]

function mediaSimples(valores: Array<number | null | undefined>): number | null {
  const validos = valores.filter((v): v is number => v != null)
  if (validos.length === 0) return null
  return validos.reduce((a, b) => a + b, 0) / validos.length
}

/**
 * @param realPorMesPorIndicador  ex: { cmv: { '01': 0.267, '02': 0.287, ... }, ... } — chave do mês em 'MM'
 * @param limiaresPorIndicador    Meta/Meta80/Meta60 vigentes no ano (mesmo valor usado em todos os meses)
 */
export function calcularResultadoAnual(
  ano: number,
  realPorMesPorIndicador: Record<string, Record<string, number | null | undefined>>,
  limiaresPorIndicador: Record<string, LimiaresIndicador>
): ResultadoBonusAnual {
  const indicadores: ResultadoIndicadorSemestral[] = INDICADORES_BONUS.map((config) => {
    const porMes = realPorMesPorIndicador[config.key] ?? {}
    const lim = limiaresPorIndicador[config.key]

    const realS1 = mediaSimples(MESES_S1.map((m) => porMes[m]))
    const resultadoS1 = calcularResultadoIndicador(config, {
      indicador: config.key,
      real: realS1,
      meta: lim?.meta ?? null,
      meta80: lim?.meta80 ?? null,
      meta60: lim?.meta60 ?? null,
    })

    const recuperandoS1 = resultadoS1.faixa === 'nao_atingiu'
    const s2Janela: JanelaS2 = recuperandoS1 ? 'jan_dez' : 'jul_dez'
    const mesesS2 = recuperandoS1 ? MESES_ANO : MESES_S2

    const realS2 = mediaSimples(mesesS2.map((m) => porMes[m]))
    const resultadoS2 = calcularResultadoIndicador(config, {
      indicador: config.key,
      real: realS2,
      meta: lim?.meta ?? null,
      meta80: lim?.meta80 ?? null,
      meta60: lim?.meta60 ?? null,
    })

    const contarLancados = (meses: string[]) => meses.filter((m) => porMes[m] != null).length

    return {
      config,
      s1: resultadoS1,
      s2: resultadoS2,
      s2Janela,
      recuperandoS1,
      mesesLancadosS1: contarLancados(MESES_S1),
      mesesLancadosS2: contarLancados(mesesS2),
      totalMesesS2: mesesS2.length,
    }
  })

  const somar = (chave: 's1' | 's2') => indicadores.reduce((soma, i) => soma + i[chave].pontos, 0)

  return {
    ano,
    indicadores,
    s1: {
      pontosTotais: somar('s1'),
      pesoTotalColetivo: PESO_COLETIVO_TOTAL,
      percentualAtingido: somar('s1') / PESO_COLETIVO_TOTAL,
    },
    s2: {
      pontosTotais: somar('s2'),
      pesoTotalColetivo: PESO_COLETIVO_TOTAL,
      percentualAtingido: somar('s2') / PESO_COLETIVO_TOTAL,
    },
  }
}
