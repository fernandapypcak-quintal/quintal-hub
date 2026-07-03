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

// Igual ao fetchTipo, mas devolve o objeto como veio (não força array) —
// usado pelo endpoint "tudo", que devolve { contas, historico_unificado, ... }
async function fetchObjeto(tipo) {
  const url = `${APPS_SCRIPT_URL}?tipo=${tipo}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 40000) // maior — essa chamada faz tudo de uma vez
  try {
    const res = await fetch(url, { method:'GET', signal:controller.signal, redirect:'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) { console.warn(`[loader] ${tipo}:`, data.erro); return null }
    return data
  } catch(e) {
    clearTimeout(timer)
    console.error(`[loader] fetchObjeto(${tipo}) falhou:`, e.message)
    return null
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

// historico_bu_unificado: { mes, loja, centro_custo, tipo, realizado }
const parseHistoricoBUUnificado = rows => (!rows||!Array.isArray(rows)) ? [] : rows.map(r => ({
  mes:          r.mes          || r.mes_label || '',
  loja:         r.loja         || r.unidade   || '',
  centro_custo: r.centro_custo || r.bu        || 'Revisar',
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

export async function loadHistoricoBUUnificado() {
  if (USE_MOCK) return []
  return parseHistoricoBUUnificado(await fetchTipo('historico_bu_unificado'))
}

// Carrega tudo numa chamada só (evita disparar 5 fetches paralelos pro
// mesmo Apps Script — o Web App enfileira/serializa execuções simultâneas
// que mexem na mesma planilha, e algumas estouravam o timeout do front).
export async function loadTudo() {
  if (USE_MOCK) {
    return {
      contas: await loadContas(),
      historicoRaw: await loadHistoricoUnificado(),
      historicoCatRaw: await loadHistoricoCatUnificado(),
      historicoDetRaw: await loadHistoricoDetalheTodos(),
      historicoBURaw: await loadHistoricoBUUnificado(),
    }
  }
  // "contas" fica fora do endpoint "tudo" de propósito — processa a aba
  // Baixas inteira (bem mais pesada) e é buscado em paralelo, separado,
  // pra não estourar o tempo de execução do Apps Script (limite de 30s em
  // conta pessoal do Google) numa execução só.
  const [raw, contasRows] = await Promise.all([
    fetchObjeto('tudo'),
    fetchTipo('contas'),
  ])

  if (!raw) {
    // fallback: endpoint "tudo" ainda não existe no Apps Script publicado —
    // volta pro modo antigo (chamadas separadas) pra não deixar o dashboard vazio
    const [h, hc, hd, hbu] = await Promise.all([
      loadHistoricoUnificado(), loadHistoricoCatUnificado(),
      loadHistoricoDetalheTodos(), loadHistoricoBUUnificado(),
    ])
    return { contas: parseContas(contasRows), historicoRaw: h, historicoCatRaw: hc, historicoDetRaw: hd, historicoBURaw: hbu }
  }
  return {
    contas:          parseContas(contasRows),
    historicoRaw:    parseHistoricoUnificado(raw.historico_unificado),
    historicoCatRaw: parseHistoricoCatUnificado(raw.historico_cat_unificado),
    historicoDetRaw: parseHistoricoDetalheTodos(raw.historico_detalhe_todos),
    historicoBURaw:  parseHistoricoBUUnificado(raw.historico_bu_unificado),
  }
}

// historico_bu_unificado tem o mesmo shape do detalhe — reaproveita o parser
const parseDetalheLancamentosBU = rows => (!rows||!Array.isArray(rows)) ? [] : rows.map(r => ({
  mes:          r.mes          || '',
  loja:         r.loja         || '',
  fornecedor:   r.fornecedor   || '',
  descricao:    r.descricao    || '',
  categoria:    r.categoria    || '',
  tipo:         r.tipo         || '',
  centro_custo: r.centro_custo || 'Revisar',
  valor:        Number(r.valor || 0),
  vencto:       r.vencto       || '',
  dt_baixa:     r.dt_baixa     || '',
}))

// Busca sob demanda (não faz parte do loadTudo) — só quando o usuário
// seleciona uma BU específica na página "Por BU", pra não pesar o
// carregamento inicial do dashboard.
export async function loadDetalheLancamentosPorBU({ centroCusto, mes, loja } = {}) {
  if (USE_MOCK) return []
  const params = new URLSearchParams({ tipo: 'detalhe_lancamentos_bu' })
  if (centroCusto) params.set('centro_custo', centroCusto)
  if (mes)         params.set('mes', mes)
  if (loja)        params.set('loja', loja)
  const url = `${APPS_SCRIPT_URL}?${params.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(url, { method:'GET', signal:controller.signal, redirect:'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) { console.warn('[loader] detalhe_lancamentos_bu:', data.erro); return [] }
    return parseDetalheLancamentosBU(Array.isArray(data) ? data : [])
  } catch(e) {
    clearTimeout(timer)
    console.error('[loader] loadDetalheLancamentosPorBU falhou:', e.message)
    return []
  }
}
