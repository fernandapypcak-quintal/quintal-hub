// lib/metas/scoring.ts
//
// Pontuação: passou a ser calculada no nível do GERENTE, sobre o Total
// (agregado) da carteira dele em cada categoria — não mais por unidade.
// Cada categoria vale o peso cheio (30/10/10/10/10/30) se o Total bateu
// a meta, 0 se não bateu. Soma das 6 categorias = pontuação do gerente
// (0 a 100).
//
// Agregação do Total, igual à planilha original:
//   % (CMV, Custo Folha, NPS)              -> MÉDIA das unidades
//   R$ (Custo Freela, Bandas, Faturamento) -> SOMA das unidades
//
//   CMV            -> bate se real <= meta   (custo menor é melhor)
//   Custo Folha     -> bate se real <= meta
//   Custo Freela    -> bate se real <= meta
//   NPS             -> bate se real >= meta   (meta fixa 85)
//   Bandas          -> bate se arrecadação - custo do artista > 0
//   Faturamento     -> bate se real >= meta

export type IndicadorKey = 'cmv' | 'custo_folha' | 'custo_freela' | 'nps' | 'bandas' | 'faturamento'
export type TipoAgregacao = 'media' | 'soma'

export const PESOS_PTS: Record<IndicadorKey, number> = {
  cmv: 30,
  custo_folha: 10,
  custo_freela: 10,
  nps: 10,
  bandas: 10,
  faturamento: 30,
}

export const TIPO_AGREGACAO: Record<IndicadorKey, TipoAgregacao> = {
  cmv: 'media',
  custo_folha: 'media',
  custo_freela: 'soma',
  nps: 'media',
  bandas: 'soma',
  faturamento: 'soma',
}

export const TOTAL_PTS_POSSIVEL = Object.values(PESOS_PTS).reduce((a, b) => a + b, 0) // 100

export interface InputIndicador {
  indicador: IndicadorKey
  meta: number
  real: number
  /** só usado em 'bandas': custo do artista, comparado com `real` = arrecadação */
  custoArtista?: number
}

export interface LinhaIndicador extends InputIndicador {
  delta: number
}

export interface ResultadoIndicadorGerente extends InputIndicador {
  bateuMeta: boolean
  delta: number
  pontos: number
}

export interface ResultadoUnidade {
  unidade: string // UnitId de lib/units.ts
  mesRef: string // 'YYYY-MM-01'
  indicadores: LinhaIndicador[]
}

export interface ResultadoGerente {
  gerenteId: string
  gerenteNome: string
  mesRef: string
  unidades: ResultadoUnidade[]
  totalIndicadores: ResultadoIndicadorGerente[]
  pontosTotais: number
  pontosPossiveis: number
}

function calcularDelta(input: InputIndicador): number {
  if (input.indicador === 'bandas') return input.real - (input.custoArtista ?? 0)
  return input.real - input.meta
}

export function calcularLinhaIndicador(input: InputIndicador): LinhaIndicador {
  return { ...input, delta: calcularDelta(input) }
}

export function calcularResultadoUnidade(unidade: string, mesRef: string, inputs: InputIndicador[]): ResultadoUnidade {
  return { unidade, mesRef, indicadores: inputs.map(calcularLinhaIndicador) }
}

function agregar(tipo: TipoAgregacao, valores: number[]): number {
  if (valores.length === 0) return 0
  const soma = valores.reduce((a, b) => a + b, 0)
  return tipo === 'media' ? soma / valores.length : soma
}

function bateuMetaTotal(indicador: IndicadorKey, meta: number, real: number, custoArtista: number): boolean {
  switch (indicador) {
    case 'cmv':
    case 'custo_folha':
    case 'custo_freela':
      return real <= meta
    case 'nps':
    case 'faturamento':
      return real >= meta
    case 'bandas':
      return real - custoArtista > 0
    default:
      return false
  }
}

/** Agrega as unidades da carteira do gerente e pontua cada categoria uma vez (nível Total). */
export function calcularResultadoGerente(
  gerenteId: string,
  gerenteNome: string,
  mesRef: string,
  unidades: ResultadoUnidade[]
): ResultadoGerente {
  const indicadoresPresentes = new Set<IndicadorKey>()
  unidades.forEach((u) => u.indicadores.forEach((i) => indicadoresPresentes.add(i.indicador)))

  const totalIndicadores: ResultadoIndicadorGerente[] = []

  indicadoresPresentes.forEach((indicador) => {
    const linhas = unidades
      .map((u) => u.indicadores.find((i) => i.indicador === indicador))
      .filter((l): l is LinhaIndicador => !!l)

    const tipo = TIPO_AGREGACAO[indicador]
    const meta = agregar(tipo, linhas.map((l) => l.meta))
    const real = agregar(tipo, linhas.map((l) => l.real))
    const custoArtista = agregar(tipo, linhas.map((l) => l.custoArtista ?? 0))

    const bateuMeta = bateuMetaTotal(indicador, meta, real, custoArtista)
    const delta = indicador === 'bandas' ? real - custoArtista : real - meta

    totalIndicadores.push({
      indicador,
      meta,
      real,
      custoArtista: indicador === 'bandas' ? custoArtista : undefined,
      bateuMeta,
      delta,
      pontos: bateuMeta ? PESOS_PTS[indicador] : 0,
    })
  })

  return {
    gerenteId,
    gerenteNome,
    mesRef,
    unidades,
    totalIndicadores,
    pontosTotais: totalIndicadores.reduce((soma, r) => soma + r.pontos, 0),
    pontosPossiveis: TOTAL_PTS_POSSIVEL,
  }
}
