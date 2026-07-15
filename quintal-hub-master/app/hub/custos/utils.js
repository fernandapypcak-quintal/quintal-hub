export function fmt(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtPct(pct) {
  const sinal = pct > 0 ? '+' : ''
  return `${sinal}${pct.toFixed(1)}%`
}

export function fmtData(str) {
  if (!str) return '-'
  const d = new Date(str + 'T12:00:00')
  return d.toLocaleDateString('pt-BR')
}

export function diasAteVencimento(str) {
  if (!str) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const v = new Date(str + 'T12:00:00')
  return Math.round((v - hoje) / 86400000)
}
