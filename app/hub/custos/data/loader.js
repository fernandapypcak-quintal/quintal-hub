import { APPS_SCRIPT_URL } from './config.js'

const USE_MOCK = false

async function fetchTipo(tipo) {
  const url = `${APPS_SCRIPT_URL}?tipo=${tipo}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(url, { method:'GET', signal:controller.signal, redirect:'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) { console.warn(`[loader] ${tipo}:`, data.erro); return [] }
    return Array.isArray(data) ? data : []
  } catch(e) {
    clearTimeout(timer)
    console.error(`[loader] fetchTipo(${tipo}) falhou:`, e.message)
    return []
  }
}

// Parsers
const parseContas = rows => rows.map((r,i) => ({
  id: i+1, nome: r.nome||r.descricao||'', fornecedor: r.fornecedor||'',
  valor: Number(r.valor||0), vencimento: r.vencimento||r.vencto||'',
  status: (r.status||'pago').toLowerCase(), categoria: r.categoria||'',
  tipo: r.tipo||'Fixo', centro: r.centro||r.unidade||'', observacao: r.observacao||'',
}))

// historico_unificado: { mes, loja, tipo, total_realizado }
const parseHistoricoUnificado = rows => rows.map(r => ({
  mes:             r.mes      || r.mes_label || '',
  loja:            r.loja     || r.unidade   || '',
  tipo:            r.tipo     || '',
  total_realizado: Number(r.total_realizado  || 0),
}))

// historico_cat_unificado: { mes, loja, categoria, tipo, realizado }
const parseHistoricoCatUnificado = rows => rows.map(r => ({
  mes:       r.mes       || r.mes_label || '',
  loja:      r.loja      || r.unidade   || '',
  categoria: r.categoria || '',
  tipo:      r.tipo      || '',
  realizado: Number(r.realizado || 0),
}))

// historico_detalhe_todos: { mes, loja, categoria, subcategoria, tipo, realizado }
const parseHistoricoDetalheTodos = rows => (!rows||!Array.isArray(rows)) ? [] : rows.map(r => ({
  mes:          r.mes          || r.mes_label || '',
  loja:         r.loja         || r.unidade   || '',
  categoria:    r.categoria    || '',
  subcategoria: r.subcategoria || r.descricao || '',
  tipo:         r.tipo         || '',
  realizado:    Number(r.realizado || 0),
}))

// Mock fallback
async function getMock(tipo) {
  try {
    const { MOCK_CONTAS, MOCK_CUSTOS_FIXOS, MOCK_HISTORICO, MOCK_HISTORICO_CAT_FIXO } = await import('./mockData.js')
    const { MOCK_CUSTOS_VARIAVEIS, MOCK_HISTORICO_VARIAVEL, MOCK_HISTORICO_CAT_VARIAVEL } = await import('./mockDataVariavel.js')
    const map = {
      contas: MOCK_CONTAS,
      historico_unificado: [...MOCK_HISTORICO.map(h=>({...h,tipo:'Fixo'})), ...MOCK_HISTORICO_VARIAVEL.map(h=>({...h,tipo:'Variável'}))],
      historico_cat_unificado: [...MOCK_HISTORICO_CAT_FIXO.map(h=>({...h,tipo:'Fixo'})), ...MOCK_HISTORICO_CAT_VARIAVEL.map(h=>({...h,tipo:'Variável'}))],
      historico_detalhe_todos: [],
    }
    return map[tipo] || []
  } catch { return [] }
}

export async function loadContas() {
  if (USE_MOCK) return parseContas(await getMock('contas'))
  return parseContas(await fetchTipo('contas'))
}

// Carrega TUDO de uma vez — o filtro acontece no cliente
export async function loadHistoricoUnificado() {
  if (USE_MOCK) return parseHistoricoUnificado(await getMock('historico_unificado'))
  return parseHistoricoUnificado(await fetchTipo('historico_unificado'))
}

export async function loadHistoricoCatUnificado() {
  if (USE_MOCK) return parseHistoricoCatUnificado(await getMock('historico_cat_unificado'))
  return parseHistoricoCatUnificado(await fetchTipo('historico_cat_unificado'))
}

export async function loadHistoricoDetalheTodos() {
  if (USE_MOCK) return []
  return parseHistoricoDetalheTodos(await fetchTipo('historico_detalhe_todos'))
}
