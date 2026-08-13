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
// Apuração SEMESTRAL (oficial) — S1 e S2 são sempre PUROS
//
// S1 = Jan-Jun (acumulado só desses 6 meses). S2 = Jul-Dez (acumulado só
// desses 6 meses). Nenhum dos dois absorve o outro — são duas fotos
// independentes do ano.
//
// Se um indicador não bateu nenhuma faixa em S1 (`recuperandoS1 = true`),
// isso NÃO muda o número de S2 — é só um sinalizador pra UI apontar pra
// visão "Acumulado do Ano" (Jan-Dez, ver calcularAcumuladoAno mais abaixo),
// que é onde a recuperação de fato aparece, porque ali sim os 12 meses
// entram juntos na mesma conta.
//
// A regra é por INDICADOR, não pro bônus como um todo — um indicador
// pode não bater em S1 enquanto outro bate, no mesmo semestre.
//
// O Real de cada janela (S1, S2, ou o acumulado do ano) é o ACUMULADO DE
// VERDADE do período: soma dos numeradores ÷ soma dos denominadores dos
// meses incluídos — não a média das médias mensais. Isso é o que a
// Fernanda validou com o DRE:
//   CMV / Custo c/ Pessoal -> numerador = custo do mês (R$), denominador = ROB do mês (R$)
//   LOL (Margem)           -> numerador = LOL líquido do mês (R$), denominador = ROB do mês (R$)
//   NPS                    -> numerador = Promotores - Detratores do mês, denominador = respondentes do mês
//
// Se algum mês da janela não tiver numerador/denominador lançado (só
// Real), a agregação daquele indicador/janela cai pra MÉDIA SIMPLES dos
// Real disponíveis, como fallback — e isso fica marcado explicitamente
// (`metodologia: 'media_fallback'`) pra nunca passar por acumulado sem ser.
// ═══════════════════════════════════════════════════════════════════════

export type JanelaS2 = 'jul_dez' | 'jan_dez'
export type MetodologiaAgregacao = 'acumulado' | 'media_fallback'

export interface LimiaresIndicador {
  meta: number
  meta80: number
  meta60: number
}

export interface DadosMesIndicador {
  real: number | null | undefined
  numerador: number | null | undefined
  denominador: number | null | undefined
}

export interface ResultadoIndicadorSemestral {
  config: IndicadorBonusConfig
  s1: ResultadoIndicadorBonus // Jan-Jun, sempre puro
  s2: ResultadoIndicadorBonus // Jul-Dez, sempre puro (nunca absorve S1)
  s2Janela: JanelaS2 // sempre 'jul_dez' — mantido pra compatibilidade, não muda mais
  recuperandoS1: boolean // true = S1 não bateu nenhuma faixa; consulte a visão "Acumulado do Ano" pra ver a recuperação
  mesesLancadosS1: number // quantos dos 6 meses de S1 já têm Real lançado (de 0 a 6)
  mesesLancadosS2: number // quantos dos 6 meses de S2 já têm Real lançado (de 0 a 6)
  totalMesesS2: number // sempre 6
  metodologiaS1: MetodologiaAgregacao
  metodologiaS2: MetodologiaAgregacao
  s1ValorAbsoluto: number | null // soma do numerador em S1 (ex: LOL em R$) — null se metodologia = média fallback
  s2ValorAbsoluto: number | null // idem pra S2
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
 * Acumulado real (soma numerador / soma denominador) sobre os meses
 * informados. Só usa acumulado se TODOS os meses da janela tiverem
 * numerador E denominador lançados — senão cai pra média simples do
 * Real disponível (fallback), e avisa qual dos dois foi usado.
 */
function agregarPeriodo(meses: string[], porMes: Record<string, DadosMesIndicador>): {
  valor: number | null
  metodologia: MetodologiaAgregacao
  somaNumerador: number | null // soma bruta do numerador (ex: R$ de LOL) — só quando 'acumulado'
} {
  const entradas = meses.map((m) => porMes[m]).filter((e): e is DadosMesIndicador => e != null)
  const todasComVolume = entradas.length > 0 && entradas.every(
    (e) => e.numerador != null && e.denominador != null && e.denominador !== 0
  )

  if (todasComVolume) {
    const somaNum = entradas.reduce((a, e) => a + (e.numerador as number), 0)
    const somaDen = entradas.reduce((a, e) => a + (e.denominador as number), 0)
    return { valor: somaDen !== 0 ? somaNum / somaDen : null, metodologia: 'acumulado', somaNumerador: somaNum }
  }

  return { valor: mediaSimples(entradas.map((e) => e.real)), metodologia: 'media_fallback', somaNumerador: null }
}

/**
 * @param dadosPorMesPorIndicador  ex: { cmv: { '01': { real, numerador, denominador }, ... }, ... } — chave do mês em 'MM'
 * @param limiaresPorIndicador     Meta/Meta80/Meta60 vigentes no ano (mesmo valor usado em todos os meses)
 */
export function calcularResultadoAnual(
  ano: number,
  dadosPorMesPorIndicador: Record<string, Record<string, DadosMesIndicador>>,
  limiaresPorIndicador: Record<string, LimiaresIndicador>
): ResultadoBonusAnual {
  const indicadores: ResultadoIndicadorSemestral[] = INDICADORES_BONUS.map((config) => {
    const porMes = dadosPorMesPorIndicador[config.key] ?? {}
    const lim = limiaresPorIndicador[config.key]

    const { valor: realS1, metodologia: metodologiaS1, somaNumerador: numS1 } = agregarPeriodo(MESES_S1, porMes)
    const resultadoS1 = calcularResultadoIndicador(config, {
      indicador: config.key,
      real: realS1,
      meta: lim?.meta ?? null,
      meta80: lim?.meta80 ?? null,
      meta60: lim?.meta60 ?? null,
    })

    const recuperandoS1 = resultadoS1.faixa === 'nao_atingiu'
    // S2 é SEMPRE Jul-Dez, sozinho — nunca absorve os meses de S1.
    // Se o indicador não bateu em S1, quem conta a história de recuperação
    // é a visão "Acumulado do Ano" (Jan-Dez), não este card — por isso
    // `recuperandoS1` fica só como sinalizador pra UI apontar pra lá.
    const s2Janela: JanelaS2 = 'jul_dez'
    const mesesS2 = MESES_S2

    const { valor: realS2, metodologia: metodologiaS2, somaNumerador: numS2 } = agregarPeriodo(mesesS2, porMes)
    const resultadoS2 = calcularResultadoIndicador(config, {
      indicador: config.key,
      real: realS2,
      meta: lim?.meta ?? null,
      meta80: lim?.meta80 ?? null,
      meta60: lim?.meta60 ?? null,
    })

    const contarLancados = (meses: string[]) => meses.filter((m) => porMes[m]?.real != null).length

    return {
      config,
      s1: resultadoS1,
      s2: resultadoS2,
      s2Janela,
      recuperandoS1,
      mesesLancadosS1: contarLancados(MESES_S1),
      mesesLancadosS2: contarLancados(mesesS2),
      totalMesesS2: mesesS2.length,
      metodologiaS1,
      metodologiaS2,
      s1ValorAbsoluto: numS1,
      s2ValorAbsoluto: numS2,
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

// ═══════════════════════════════════════════════════════════════════════
// Visão "Acumulado do Ano" — segunda visão, mais simples: acumulado
// Jan-Dez direto (soma numerador / soma denominador de todos os meses
// lançados no ano), SEM a divisão em S1/S2 e SEM a regra de recuperação.
// É o número "cru" do ano até agora, útil pra acompanhar a tendência
// sem misturar com a mecânica de pagamento do bônus.
// ═══════════════════════════════════════════════════════════════════════

export interface ResultadoIndicadorAcumuladoAno {
  config: IndicadorBonusConfig
  resultado: ResultadoIndicadorBonus
  metodologia: MetodologiaAgregacao
  mesesLancados: number
  valorAbsoluto: number | null
}

export interface ResultadoAcumuladoAno {
  ano: number
  indicadores: ResultadoIndicadorAcumuladoAno[]
  pontosTotais: number
  pesoTotalColetivo: number
  percentualAtingido: number
  mesesLancados: number // mínimo entre os indicadores
}

export function calcularAcumuladoAno(
  ano: number,
  dadosPorMesPorIndicador: Record<string, Record<string, DadosMesIndicador>>,
  limiaresPorIndicador: Record<string, LimiaresIndicador>
): ResultadoAcumuladoAno {
  const indicadores: ResultadoIndicadorAcumuladoAno[] = INDICADORES_BONUS.map((config) => {
    const porMes = dadosPorMesPorIndicador[config.key] ?? {}
    const lim = limiaresPorIndicador[config.key]

    const { valor: real, metodologia, somaNumerador } = agregarPeriodo(MESES_ANO, porMes)
    const resultado = calcularResultadoIndicador(config, {
      indicador: config.key,
      real,
      meta: lim?.meta ?? null,
      meta80: lim?.meta80 ?? null,
      meta60: lim?.meta60 ?? null,
    })

    const mesesLancados = MESES_ANO.filter((m) => porMes[m]?.real != null).length

    return { config, resultado, metodologia, mesesLancados, valorAbsoluto: somaNumerador }
  })

  const pontosTotais = indicadores.reduce((soma, i) => soma + i.resultado.pontos, 0)

  return {
    ano,
    indicadores,
    pontosTotais,
    pesoTotalColetivo: PESO_COLETIVO_TOTAL,
    percentualAtingido: pontosTotais / PESO_COLETIVO_TOTAL,
    mesesLancados: Math.min(...indicadores.map((i) => i.mesesLancados)),
  }
}
