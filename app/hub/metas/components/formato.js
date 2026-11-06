// app/hub/metas/components/formato.js
// Formatação única do módulo de Metas — vírgula decimal, R$ compacto
// com 1 casa (R$ 21,2k / R$ 1,5M) e delta de % em pontos percentuais.
//
// Indicadores, pesos e regras vêm de lib/metas/config.ts (vigência do
// mês). As funções abaixo recebem o objeto do indicador (`cfg`).

const num1 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function fmtMoeda(v) {
  if (v == null || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  const sinal = v < 0 ? '-' : ''
  if (abs >= 1e6) return `${sinal}R$ ${num1(abs / 1e6)}M`
  if (abs >= 1e3) return `${sinal}R$ ${num1(abs / 1e3)}k`
  return `${sinal}R$ ${Math.round(abs).toLocaleString('pt-BR')}`
}

export function fmtValor(formato, v) {
  if (v == null || Number.isNaN(v)) return '—'
  if (formato === 'pct') return `${num1(v * 100)}%`
  if (formato === 'num') return num1(v)
  if (formato === 'moeda') return fmtMoeda(v)
  return String(v)
}

export function fmtDelta(formato, v) {
  if (v == null || Number.isNaN(v)) return '—'
  const s = v > 0 ? '+' : v < 0 ? '−' : ''
  const abs = Math.abs(v)
  if (formato === 'pct') return `${s}${num1(abs * 100)} p.p.`
  if (formato === 'num') return `${s}${num1(abs)}`
  return `${s}${fmtMoeda(abs)}`
}

export function deltaBom(cfg, delta) {
  if (delta == null) return null
  if (cfg.direcao === 'saldo') return delta > 0
  return cfg.direcao === 'menor' ? delta <= 0 : delta >= 0
}

/** Valor em destaque na célula/tile: o real (Bandas = saldo). */
export function valorPrincipal(cfg, ind) {
  if (!ind) return '—'
  if (cfg.direcao === 'saldo') {
    if (ind.real == null && ind.custoArtista == null) return '—'
    return fmtMoeda((ind.real ?? 0) - (ind.custoArtista ?? 0))
  }
  return fmtValor(cfg.formato, ind.real)
}

/** Meta formatada (Bandas mostra o custo do artista). */
export function valorMeta(cfg, ind) {
  if (cfg.direcao === 'saldo') return fmtMoeda(ind?.custoArtista)
  return fmtValor(cfg.formato, ind?.meta)
}

/** Rótulos de meta/real — Bandas (legado) tem semântica própria. */
export function rotulos(cfg) {
  return cfg.direcao === 'saldo'
    ? { meta: 'Custo artista', real: 'Arrecadação', principal: 'Saldo', delta: 'Saldo' }
    : { meta: 'Meta', real: 'Real', principal: 'Real', delta: 'Desvio' }
}

export const COR_STATUS = {
  bateu: { bg: 'bg-emerald-50', borda: 'border-emerald-200', texto: 'text-emerald-800', sub: 'text-emerald-700' },
  nao_bateu: { bg: 'bg-rose-50', borda: 'border-rose-200', texto: 'text-rose-800', sub: 'text-rose-700' },
  sem_dado: { bg: 'bg-zinc-50', borda: 'border-zinc-200 border-dashed', texto: 'text-zinc-400', sub: 'text-zinc-400' },
}

export function corPontuacao(pct) {
  return pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#E11D48'
}
