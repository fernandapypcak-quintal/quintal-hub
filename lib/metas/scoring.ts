// lib/metas/scoring.ts
//
// Regra de pontuação: BINÁRIA por indicador. Bateu a meta -> ganha o
// peso cheio do indicador. Não bateu -> 0 pontos naquele indicador.
//
//   CMV            -> bate se real <= meta   (custo menor é melhor)
//   Custo Folha     -> bate se real <= meta
//   Custo Freela    -> bate se real <= meta
//   NPS             -> bate se real >= meta   (meta fixa 85)
//   Bandas          -> bate se arrecadação - custo do artista > 0
//   Faturamento     -> bate se real >= meta

export type IndicadorKey = 'cmv' | 'custo_folha' | 'custo_freela' | 'nps' | 'bandas' | 'faturamento'

export const PESOS_PTS: Record<IndicadorKey, number> = {
  cmv: 30,
  custo_folha: 10,
  custo_freela: 10,
  nps: 10,
  bandas: 10,
  faturamento: 30,
}

export const TOTAL_PTS_POSSIVEL = Object.values(PESOS_PTS).reduce((a, b) => a + b, 0) // 100

export interface InputIndicador {
  indicador: IndicadorKey
  meta: number
  real: number
  /** só usado em 'bandas': custo do artista, comparado com `real` = arrecadação */
  custoArtista?: number
}

export interface ResultadoIndicador extends InputIndicador {
  bateuMeta: boolean
  delta: number
  pontos: number
}

export interface ResultadoUnidade {
  unidade: string // UnitId de lib/units.ts
  mesRef: string // 'YYYY-MM-01'
  indicadores: ResultadoIndicador[]
  pontosTotais: number
  pontosPossiveis: number
}

export function calcularBateuMeta(input: InputIndicador): boolean {
  const { indicador, meta, real, custoArtista } = input
  switch (indicador) {
    case 'cmv':
    case 'custo_folha':
    case 'custo_freela':
      return real <= meta
    case 'nps':
    case 'faturamento':
      return real >= meta
    case 'bandas':
      return real - (custoArtista ?? 0) > 0
    default:
      return false
  }
}

export function calcularDelta(input: InputIndicador): number {
  if (input.indicador === 'bandas') return input.real - (input.custoArtista ?? 0)
  return input.real - input.meta
}

export function calcularResultadoIndicador(input: InputIndicador): ResultadoIndicador {
  const bateuMeta = calcularBateuMeta(input)
  return {
    ...input,
    bateuMeta,
    delta: calcularDelta(input),
    pontos: bateuMeta ? PESOS_PTS[input.indicador] : 0,
  }
}

export function calcularResultadoUnidade(unidade: string, mesRef: string, inputs: InputIndicador[]): ResultadoUnidade {
  const indicadores = inputs.map(calcularResultadoIndicador)
  return {
    unidade,
    mesRef,
    indicadores,
    pontosTotais: indicadores.reduce((soma, r) => soma + r.pontos, 0),
    pontosPossiveis: TOTAL_PTS_POSSIVEL,
  }
}

/** Pontuação consolidada do gerente: média dos pontos das unidades da carteira dele */
export function calcularPontosMediaGerente(unidades: ResultadoUnidade[]): number {
  if (unidades.length === 0) return 0
  return unidades.reduce((acc, u) => acc + u.pontosTotais, 0) / unidades.length
}
