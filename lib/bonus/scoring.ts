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
