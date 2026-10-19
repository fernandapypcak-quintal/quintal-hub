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

// ── v27 ──────────────────────────────────────────────────────
// R$ curto com 1 casa: R$ 21,2k · R$ 1,5M (abaixo de mil mostra inteiro)
export function fmtK(valor) {
  const v = Number(valor) || 0
  const a = Math.abs(v)
  const s = v < 0 ? '-' : ''
  if (a >= 1e6) return `${s}R$ ${(a / 1e6).toFixed(1).replace('.', ',')}M`
  if (a >= 1e3) return `${s}R$ ${(a / 1e3).toFixed(1).replace('.', ',')}k`
  return `${s}R$ ${Math.round(a)}`
}

const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
// '2026-09' → 'Set/26'
export function mesISOLabel(mes) {
  if (!mes || mes.length < 7) return mes || ''
  const [a, m] = mes.split('-')
  return `${MESES_CURTOS[parseInt(m) - 1]}/${a.substring(2)}`
}
// 'Set/26' → '2026-09'
export function mesLabelISO(label) {
  const m = /^([A-Za-zÀ-ú]{3})\/(\d{2})$/.exec(String(label || ''))
  if (!m) return ''
  const i = MESES_CURTOS.indexOf(m[1])
  return i < 0 ? '' : `20${m[2]}-${String(i + 1).padStart(2, '0')}`
}
// mês anterior de '2026-09' → '2026-08'
export function mesAnteriorISO(mes) {
  if (!mes) return ''
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}
// '2026-10-05' → '05/10'
export function fmtDiaMes(str) {
  if (!str || str.length < 10) return str || '—'
  return `${str.substring(8, 10)}/${str.substring(5, 7)}`
}
// +7,4% (vírgula, como no resto do HUB)
export function fmtPctBR(pct) {
  const sinal = pct > 0 ? '+' : ''
  return `${sinal}${pct.toFixed(1).replace('.', ',')}%`
}

const MESES_NOME = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
// '2026-09' → 'setembro'
export function mesNome(mes) {
  if (!mes || mes.length < 7) return ''
  return MESES_NOME[parseInt(mes.substring(5, 7)) - 1] || ''
}
// '2026-09' → 'Setembro/26'
export function mesNomeCurto(mes) {
  const n = mesNome(mes)
  return n ? `${n[0].toUpperCase()}${n.slice(1)}/${mes.substring(2, 4)}` : mes
}
