// app/hub/metas/components/formato.js
// Formatação única do módulo de Metas — vírgula decimal, R$ compacto
// com 1 casa (R$ 21,2k / R$ 1,5M) e delta de % em pontos percentuais.

export const INDICADORES = [
  { key: 'cmv', label: 'CMV', curto: 'CMV', tipo: 'pct' },
  { key: 'custo_folha', label: 'Custo Folha', curto: 'Folha', tipo: 'pct' },
  { key: 'custo_freela', label: 'Custo Freela', curto: 'Freela', tipo: 'moeda' },
  { key: 'nps', label: 'NPS', curto: 'NPS', tipo: 'num' },
  { key: 'bandas', label: 'Bandas', curto: 'Bandas', tipo: 'moeda' },
  { key: 'faturamento', label: 'Faturamento', curto: 'Fat.', tipo: 'moeda' },
]

// Custo: real abaixo da meta é bom.
export const MENOR_MELHOR = new Set(['cmv', 'custo_folha', 'custo_freela'])

const num1 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function fmtMoeda(v) {
  if (v == null || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  const sinal = v < 0 ? '-' : ''
  if (abs >= 1e6) return `${sinal}R$ ${num1(abs / 1e6)}M`
  if (abs >= 1e3) return `${sinal}R$ ${num1(abs / 1e3)}k`
  return `${sinal}R$ ${Math.round(abs).toLocaleString('pt-BR')}`
}

export function fmtValor(tipo, v) {
  if (v == null || Number.isNaN(v)) return '—'
  if (tipo === 'pct') return `${num1(v * 100)}%`
  if (tipo === 'num') return num1(v)
  if (tipo === 'moeda') return fmtMoeda(v)
  return String(v)
}

export function fmtDelta(tipo, v) {
  if (v == null || Number.isNaN(v)) return '—'
  const s = v > 0 ? '+' : v < 0 ? '−' : ''
  const abs = Math.abs(v)
  if (tipo === 'pct') return `${s}${num1(abs * 100)} p.p.`
  if (tipo === 'num') return `${s}${num1(abs)}`
  return `${s}${fmtMoeda(abs)}`
}

export function deltaBom(indicador, delta) {
  if (delta == null) return null
  if (indicador === 'bandas') return delta > 0
  return MENOR_MELHOR.has(indicador) ? delta <= 0 : delta >= 0
}

/** Valor que aparece "em destaque" na célula/tile: o real (Bandas = saldo). */
export function valorPrincipal(indicador, tipo, ind) {
  if (!ind) return '—'
  if (indicador === 'bandas') {
    if (ind.real == null && ind.custoArtista == null) return '—'
    return fmtMoeda((ind.real ?? 0) - (ind.custoArtista ?? 0))
  }
  return fmtValor(tipo, ind.real)
}

/** Rótulos de meta/real — Bandas tem semântica própria. */
export function rotulos(indicador) {
  return indicador === 'bandas'
    ? { meta: 'Custo artista', real: 'Arrecadação', principal: 'Saldo' }
    : { meta: 'Meta', real: 'Real', principal: 'Real' }
}

export const COR_STATUS = {
  bateu: { bg: 'bg-emerald-50', borda: 'border-emerald-200', texto: 'text-emerald-800', sub: 'text-emerald-700' },
  nao_bateu: { bg: 'bg-rose-50', borda: 'border-rose-200', texto: 'text-rose-800', sub: 'text-rose-700' },
  sem_dado: { bg: 'bg-zinc-50', borda: 'border-zinc-200 border-dashed', texto: 'text-zinc-400', sub: 'text-zinc-400' },
}

export const GERENTE_COLORS = { marco: '#97A624', andre: '#0284C7', keylla: '#7C3AED' }

export function corPontuacao(pct) {
  return pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#E11D48'
}
