// lib/metas/scoring.ts
//
// Pontuação do regional, calculada sobre o Total (agregado) da carteira
// em cada indicador. As regras (indicadores, pesos, direção, agregação,
// críticas) vêm da vigência do mês — ver lib/metas/config.ts.
//
// Cada indicador vale o peso cheio se o Total bateu a meta, 0 se não.
//   direcao 'menor' → bate se real ≤ meta  (custos)
//   direcao 'maior' → bate se real ≥ meta  (faturamento, NPS)
//   direcao 'saldo' → bate se real − custoArtista > 0  (legado Bandas)
//
// Agregação do Total: 'media' das unidades (%) ou 'soma' (R$).

import type { IndicadorConfig, IndicadorKey, RegraCriticas, TipoAgregacao, VigenciaMetas } from './config'
import { totalPontosPossiveis } from './config'

export type { IndicadorKey, TipoAgregacao } from './config'

export interface InputIndicador {
  indicador: IndicadorKey
  meta: number | null
  real: number | null
  /** só usado em direcao 'saldo' (Bandas): custo do artista, comparado com `real` = arrecadação */
  custoArtista?: number
}

export interface LinhaIndicador extends InputIndicador {
  delta: number | null
}

export interface ResultadoIndicadorGerente extends InputIndicador {
  bateuMeta: boolean
  semDado: boolean
  delta: number | null
  pontos: number
}

export interface ResultadoUnidade {
  unidade: string // UnitId de lib/units.ts
  mesRef: string
  indicadores: LinhaIndicador[]
}

export type StatusIndicador = 'bateu' | 'nao_bateu' | 'sem_dado'

export interface PontuacaoIndicadorUnidade {
  indicador: IndicadorKey
  status: StatusIndicador
  pontos: number
  pesoPts: number
  meta: number | null
  real: number | null
  custoArtista: number | null
  delta: number | null
}

export interface PontuacaoUnidade {
  unidade: string
  indicadores: Record<IndicadorKey, PontuacaoIndicadorUnidade>
  pontosTotais: number
  /** soma dos pesos dos indicadores que têm dado — teto real da unidade no período */
  pontosComDado: number
  pontosPossiveis: number
  qtdBateu: number
  /** nº de indicadores com dado e meta no período (denominador do "x/y batidas") */
  qtdComDado: number
}

export interface StatusCritica {
  unidade: string
  pontos: number
  qtdBateu: number
  qtdComDado: number
  /** null quando não há regra definida */
  ok: boolean | null
}

export interface ResultadoGerente {
  gerenteId: string
  gerenteNome: string
  mesRef: string
  unidades: ResultadoUnidade[]
  totalIndicadores: ResultadoIndicadorGerente[]
  /** pontos dos indicadores, antes da regra das críticas */
  pontosIndicadores: number
  /** pontos finais (após regra das críticas, se houver) */
  pontosTotais: number
  pontosPossiveis: number
  criticas: StatusCritica[]
  /** null = sem regra; true = cumpriu; false = não cumpriu (pontos ajustados) */
  criticasOk: boolean | null
}

function indicadorPorKey(v: VigenciaMetas, key: IndicadorKey): IndicadorConfig | undefined {
  return v.indicadores.find((i) => i.key === key)
}

function temMeta(cfg: IndicadorConfig, linha: InputIndicador): boolean {
  if (cfg.direcao === 'saldo') return true
  return linha.meta != null && linha.meta > 0
}

function temReal(cfg: IndicadorConfig, linha: InputIndicador): boolean {
  if (cfg.direcao === 'saldo') return linha.real != null || linha.custoArtista != null
  return linha.real != null
}

function bateu(cfg: IndicadorConfig, meta: number, real: number, custoArtista: number): boolean {
  if (cfg.direcao === 'saldo') return real - custoArtista > 0
  if (cfg.direcao === 'menor') return real <= meta
  return real >= meta
}

function calcularDelta(cfg: IndicadorConfig | undefined, input: InputIndicador): number | null {
  if (cfg?.direcao === 'saldo') return (input.real ?? 0) - (input.custoArtista ?? 0)
  if (input.real == null || input.meta == null) return null
  return input.real - input.meta
}

export function calcularResultadoUnidade(
  v: VigenciaMetas,
  unidade: string,
  mesRef: string,
  inputs: InputIndicador[]
): ResultadoUnidade {
  return {
    unidade,
    mesRef,
    indicadores: inputs.map((i) => ({ ...i, delta: calcularDelta(indicadorPorKey(v, i.indicador), i) })),
  }
}

export function agregar(tipo: TipoAgregacao, valores: (number | null | undefined)[]): number | null {
  const validos = valores.filter((x): x is number => x != null && !Number.isNaN(x))
  if (validos.length === 0) return null
  const soma = validos.reduce((a, b) => a + b, 0)
  return tipo === 'media' ? soma / validos.length : soma
}

// -------------------------------------------------------------------
// Pontuação POR UNIDADE — matriz, ranking e regra das críticas.
// Indicador sem lançamento ou sem meta vira 'sem_dado'.
// -------------------------------------------------------------------
export function pontuarUnidade(v: VigenciaMetas, resultado: ResultadoUnidade): PontuacaoUnidade {
  const indicadores = {} as Record<IndicadorKey, PontuacaoIndicadorUnidade>
  let pontosTotais = 0
  let pontosComDado = 0
  let qtdBateu = 0
  let qtdComDado = 0

  v.indicadores.forEach((cfg) => {
    const linha = resultado.indicadores.find((i) => i.indicador === cfg.key)
    const pesoPts = cfg.peso

    if (!linha || !temMeta(cfg, linha) || !temReal(cfg, linha)) {
      indicadores[cfg.key] = {
        indicador: cfg.key,
        status: 'sem_dado',
        pontos: 0,
        pesoPts,
        meta: linha?.meta ?? null,
        real: linha?.real ?? null,
        custoArtista: linha?.custoArtista ?? null,
        delta: null,
      }
      return
    }

    const ok = bateu(cfg, linha.meta ?? 0, linha.real ?? 0, linha.custoArtista ?? 0)
    const pontos = ok ? pesoPts : 0
    pontosTotais += pontos
    pontosComDado += pesoPts
    qtdComDado += 1
    if (ok) qtdBateu += 1

    indicadores[cfg.key] = {
      indicador: cfg.key,
      status: ok ? 'bateu' : 'nao_bateu',
      pontos,
      pesoPts,
      meta: linha.meta,
      real: linha.real,
      custoArtista: linha.custoArtista ?? null,
      delta: linha.delta,
    }
  })

  return {
    unidade: resultado.unidade,
    indicadores,
    pontosTotais,
    pontosComDado,
    pontosPossiveis: totalPontosPossiveis(v),
    qtdBateu,
    qtdComDado,
  }
}

function avaliarCritica(regra: RegraCriticas, p: PontuacaoUnidade): boolean | null {
  if (!regra) return null
  if (regra.tipo === 'todas_criticas') return p.pontosTotais >= regra.minimoPontos
  return null
}

/** Agrega as unidades da carteira, pontua cada indicador uma vez (nível Total) e aplica a regra das críticas. */
export function calcularResultadoGerente(
  v: VigenciaMetas,
  gerenteId: string,
  gerenteNome: string,
  mesRef: string,
  unidades: ResultadoUnidade[]
): ResultadoGerente {
  const totalIndicadores: ResultadoIndicadorGerente[] = v.indicadores.map((cfg) => {
    const linhas = unidades
      .map((u) => u.indicadores.find((i) => i.indicador === cfg.key))
      .filter((l): l is LinhaIndicador => !!l)

    const meta = agregar(cfg.agregacao, linhas.map((l) => l.meta))
    const real = agregar(cfg.agregacao, linhas.map((l) => l.real))
    const custoArtista = cfg.direcao === 'saldo' ? agregar(cfg.agregacao, linhas.map((l) => l.custoArtista)) ?? 0 : undefined
    const input: InputIndicador = { indicador: cfg.key, meta, real, custoArtista }

    const semDado = linhas.length === 0 || !temMeta(cfg, input) || !temReal(cfg, input)
    const bateuMeta = !semDado && bateu(cfg, meta ?? 0, real ?? 0, custoArtista ?? 0)

    return {
      ...input,
      semDado,
      bateuMeta,
      delta: semDado ? null : calcularDelta(cfg, input),
      pontos: bateuMeta ? cfg.peso : 0,
    }
  })

  const pontosIndicadores = totalIndicadores.reduce((s, r) => s + r.pontos, 0)

  const criticas: StatusCritica[] = unidades
    .filter((u) => (v.unidadesCriticas as string[]).includes(u.unidade))
    .map((u) => {
      const p = pontuarUnidade(v, u)
      return { unidade: u.unidade, pontos: p.pontosTotais, qtdBateu: p.qtdBateu, qtdComDado: p.qtdComDado, ok: avaliarCritica(v.regraCriticas, p) }
    })

  let criticasOk: boolean | null = null
  let pontosTotais = pontosIndicadores
  if (v.regraCriticas && criticas.length > 0) {
    criticasOk = criticas.every((c) => c.ok)
    if (!criticasOk) {
      const ef = v.regraCriticas.efeito
      pontosTotais = ef.tipo === 'zera' ? 0 : Math.round(pontosIndicadores * ef.fator)
    }
  }

  return {
    gerenteId,
    gerenteNome,
    mesRef,
    unidades,
    totalIndicadores,
    pontosIndicadores,
    pontosTotais,
    pontosPossiveis: totalPontosPossiveis(v),
    criticas,
    criticasOk,
  }
}

/** Desvio % do primeiro indicador de faturamento com meta — critério de desempate. */
function desvioFaturamento(p: PontuacaoUnidade): number {
  const f = p.indicadores.faturamento ?? p.indicadores.fat_salao ?? p.indicadores.fat_delivery
  return f && f.meta && f.real != null ? f.real / f.meta - 1 : -Infinity
}

/**
 * Ordenação da visão por unidade: mais metas batidas primeiro;
 * empate → menos metas furadas; depois desvio de faturamento.
 */
export function compararPorMetasBatidas(a: PontuacaoUnidade, b: PontuacaoUnidade): number {
  if (b.qtdBateu !== a.qtdBateu) return b.qtdBateu - a.qtdBateu
  const furadasA = a.qtdComDado - a.qtdBateu
  const furadasB = b.qtdComDado - b.qtdBateu
  if (furadasA !== furadasB) return furadasA - furadasB
  return desvioFaturamento(b) - desvioFaturamento(a)
}
