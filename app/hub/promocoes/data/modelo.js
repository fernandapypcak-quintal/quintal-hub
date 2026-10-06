// app/hub/promocoes/data/modelo.js
// Funções puras de agregação do módulo de Promoções.
//
// Modelo:
//  - PACOTES (relatório de reservas/pacotes da ZIG) → faturamento e pessoas
//  - CONSUMO (Promoções Utilizadas) → usos × custo da ficha técnica = custo
//  - FATURAMENTO TOTAL da casa (mesma fonte do /hub/faturamento, canal CASA)
// Promoção individual = casamento pelo NOME normalizado entre pacote e
// promoção utilizada. O que não casa aparece sinalizado (e na Conferência).

import { CMV_META, CMV_CRITICO } from '@/lib/promocoesConfig'

export function chavePromo(nome) {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function chaveProduto(nome) {
  return String(nome || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function numero(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const s = String(v ?? '').replace(/[R$\s]/g, '')
  if (!s) return 0
  // "1.234,56" → 1234.56 ; "1234.56" → 1234.56
  const n = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return parseFloat(n) || 0
}

export function mesDe(v) {
  const s = String(v || '').trim()
  let m = s.match(/^(\d{4})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}`
  m = s.match(/^(\d{2})\/(\d{4})$/)
  if (m) return `${m[2]}-${m[1]}`
  return null
}

export function ultimoDiaDoMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return `${mes}-${String(d).padStart(2, '0')}`
}

export function mesAnterior(mes) {
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

// ── Acumuladores ────────────────────────────────────────────────────────────
export function novoAcc() {
  return {
    fat: 0, valor: 0, faturamentoZig: 0, emitido: 0,
    pessoas: 0, convidados: 0, nPacotes: 0,
    custo: 0, usos: 0, usosSemCusto: 0, desconto: 0, descontoSemCusto: 0,
    dias: new Set(),
  }
}

export function somarPacote(acc, p) {
  acc.fat += p.fat
  acc.valor += p.valor
  acc.faturamentoZig += p.faturamento
  acc.emitido += p.emitido
  acc.pessoas += p.pessoas
  acc.convidados += p.convidados
  acc.nPacotes += 1
  if (p.data) acc.dias.add(p.data)
}

export function somarConsumo(acc, c) {
  acc.usos += c.usos
  acc.desconto += c.desconto
  if (c.temCusto) acc.custo += c.custo
  else { acc.usosSemCusto += c.usos; acc.descontoSemCusto += c.desconto }
  if (c.data) acc.dias.add(c.data)
}

export function derivar(acc, fatTotal = null) {
  const cmv = acc.fat > 0 && acc.usos > 0 ? acc.custo / acc.fat : null
  return {
    ...acc,
    nDias: acc.dias.size,
    cmv,
    ticket: acc.pessoas > 0 ? acc.fat / acc.pessoas : null,
    margem: acc.fat - acc.custo,
    margemPessoa: acc.pessoas > 0 ? (acc.fat - acc.custo) / acc.pessoas : null,
    cobertura: acc.usos > 0 ? 1 - acc.usosSemCusto / acc.usos : null,
    fatTotal,
    peso: fatTotal ? acc.fat / fatTotal : null,
  }
}

// ── Filtro + agrupamento ───────────────────────────────────────────────────
// filtro: { units: Set|Array, mes?, meses?: Set, data?, categoria?, chave? }
function passa(r, f) {
  if (f.units && !f.units.has(r.unit)) return false
  if (f.mes && r.mes !== f.mes) return false
  if (f.meses && !f.meses.has(r.mes)) return false
  if (f.data && r.data !== f.data) return false
  if (f.categoria && r.categoria !== f.categoria) return false
  if (f.chave && r.chave !== f.chave) return false
  return true
}

function normFiltro(f) {
  return { ...f, units: f.units ? new Set(f.units) : null }
}

// Agrupa pacotes + consumo pela mesma função de chave. Devolve Map chave → acc
export function agrupar(pacotes, consumo, filtro, chaveFn) {
  const f = normFiltro(filtro)
  const mapa = new Map()
  const get = (k) => { if (!mapa.has(k)) mapa.set(k, novoAcc()); return mapa.get(k) }
  for (const p of pacotes) if (passa(p, f)) somarPacote(get(chaveFn(p, 'pacote')), p)
  for (const c of consumo) if (passa(c, f)) somarConsumo(get(chaveFn(c, 'consumo')), c)
  return mapa
}

export function total(pacotes, consumo, filtro) {
  return agrupar(pacotes, consumo, filtro, () => '_').get('_') || novoAcc()
}

// Faturamento total da casa no período (soma das unidades do filtro)
export function fatTotalPeriodo(fatTotal, units, { mes, data }) {
  let s = 0, achou = false
  for (const u of units) {
    const v = data ? fatTotal.dia?.[u]?.[data] : fatTotal.mes?.[u]?.[mes]
    if (v != null) { s += v; achou = true }
  }
  return achou ? s : null
}

// ── Status de rentabilidade ────────────────────────────────────────────────
export function statusPromo(d) {
  if (!d.fat && d.custo > 0) return { id: 'sem_receita', label: 'Sem receita casada', cor: '#71717a', bg: '#F4F4F0' }
  if (d.fat > 0 && !d.usos) return { id: 'sem_consumo', label: 'Sem consumo', cor: '#71717a', bg: '#F4F4F0' }
  if (d.cmv == null) return { id: 'na', label: '—', cor: '#a1a1aa', bg: 'transparent' }
  if (d.cmv <= CMV_META) return { id: 'ok', label: 'Rentável', cor: '#5f6b12', bg: '#f0f4e0' }
  if (d.cmv <= CMV_CRITICO) return { id: 'atencao', label: 'Atenção', cor: '#B45309', bg: '#FFFBEB' }
  return { id: 'critico', label: 'Crítico', cor: '#8C1414', bg: '#FEF2F2' }
}

export function corCmv(cmv) {
  if (cmv == null || !isFinite(cmv)) return '#a1a1aa'
  if (cmv <= CMV_META) return '#5f6b12'
  if (cmv <= CMV_CRITICO) return '#B45309'
  return '#8C1414'
}
