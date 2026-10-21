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
    const nfObj = await fetchObjeto('nf_resumo')
    const busRows = await fetchTipo('bus')
    return { contas: parseContas(contasRows), historicoRaw: h, historicoCatRaw: hc, historicoDetRaw: hd, historicoBURaw: hbu,
             nfResumo: parseNFResumo(nfObj), bus: busRows }
  }
  return {
    contas:          parseContas(contasRows),
    historicoRaw:    parseHistoricoUnificado(raw.historico_unificado),
    historicoCatRaw: parseHistoricoCatUnificado(raw.historico_cat_unificado),
    historicoDetRaw: parseHistoricoDetalheTodos(raw.historico_detalhe_todos),
    historicoBURaw:  parseHistoricoBUUnificado(raw.historico_bu_unificado),
    // v27 — NFs (vem no mesmo "tudo", já cacheado no Apps Script)
    nfResumo:        parseNFResumo(raw.nf_resumo),
    bus:             Array.isArray(raw.bus) ? raw.bus : [],
  }
}

// ══════════════════════════════════════════════════════════════
// v27 — NFs de entrada (MTR090) × pagamentos
// ══════════════════════════════════════════════════════════════
function parseNFResumo(r) {
  if (!r || typeof r !== 'object' || r.erro) return null
  const arr = x => Array.isArray(x) ? x : []
  const num = x => Number(x || 0)
  return {
    meses:        arr(r.meses),
    entrou:       arr(r.entrou).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    pago:         arr(r.pago).map(e => ({ ...e, valor: num(e.valor), valor_com_nf: num(e.valor_com_nf), qtd: num(e.qtd) })),
    pago_tipo:    arr(r.pago_tipo).map(e => ({ ...e, valor: num(e.valor) })),
    pago_cat:     arr(r.pago_cat).map(e => ({ ...e, valor: num(e.valor) })),
    caixa_fora:   arr(r.caixa_fora).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    a_pagar_mes:  arr(r.a_pagar_mes).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    aberto_desde: r.aberto_desde || '',
    mes_atual:    r.mes_atual || '',
    aberto:       arr(r.aberto).map(e => ({ ...e, valor: num(e.valor), vencido: num(e.vencido), qtd: num(e.qtd), qtd_vencido: num(e.qtd_vencido) })),
    agenda:       arr(r.agenda).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    pago_sem_nf:  arr(r.pago_sem_nf).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    fornecedores: arr(r.fornecedores).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    prazos:       arr(r.prazos),
    sem_baixa:    num(r.sem_baixa),
    qtd_sem_baixa: num(r.qtd_sem_baixa),
    baixas_ate:   r.baixas_ate || '',
    atualizado_em: r.atualizado_em || '',
  }
}

async function fetchComParametros(params, timeoutMs = 30000) {
  const url = `${APPS_SCRIPT_URL}?${new URLSearchParams(params).toString()}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method:'GET', signal:controller.signal, redirect:'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) throw new Error(data.erro)
    return data
  } catch (e) {
    clearTimeout(timer)
    throw new Error(e.name === 'AbortError' ? 'O Apps Script demorou demais pra responder. Tenta de novo.' : e.message)
  }
}

// Lista de notas. filtros: { mes: '2026-09', bu, status: 'aberto'|'Paga'|'Vencida'..., fornecedor }
export async function loadNFLista(filtros = {}) {
  const p = { tipo: 'nf_lista' }
  Object.entries(filtros).forEach(([k, v]) => { if (v && v !== 'Todas') p[k] = v })
  const data = await fetchComParametros(p)
  return Array.isArray(data) ? data : []
}

// v27.2 — página "Minha área": tudo da BU (leve)
export async function loadGestor(bu) {
  const d = await fetchComParametros({ tipo: 'gestor', bu })
  const arr = x => Array.isArray(x) ? x : []
  const num = x => Number(x || 0)
  return {
    bu: d.bu || bu, info: d.info || null,
    meses: arr(d.meses), baixas_ate: d.baixas_ate || '', atualizado_em: d.atualizado_em || '',
    entrou: arr(d.entrou).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    pago: arr(d.pago).map(e => ({ ...e, valor: num(e.valor), valor_com_nf: num(e.valor_com_nf), qtd: num(e.qtd) })),
    pago_tipo: arr(d.pago_tipo).map(e => ({ ...e, valor: num(e.valor) })),
    pago_cat: arr(d.pago_cat).map(e => ({ ...e, valor: num(e.valor) })),
    revisar_cat: arr(d.revisar_cat).map(e => ({ ...e, valor: num(e.valor) })),
    aberto: arr(d.aberto).map(e => ({ ...e, valor: num(e.valor), vencido: num(e.vencido), qtd: num(e.qtd), qtd_vencido: num(e.qtd_vencido) })),
    a_pagar_mes: arr(d.a_pagar_mes).map(e => ({ ...e, valor: num(e.valor), qtd: num(e.qtd) })),
    aberto_desde: d.aberto_desde || '', mes_atual: d.mes_atual || '',
  }
}

// v27.2 — contas pagas de uma BU no mês (data do pagamento). mes: '2026-09'
export async function loadPagamentosBU({ bu, mes }) {
  const d = await fetchComParametros({ tipo: 'pagamentos_bu', bu, mes })
  return Array.isArray(d) ? d.map(r => ({ ...r, valor: Number(r.valor || 0) })) : []
}

// v27.5 — o que saiu do caixa e não é custo das áreas (impostos, aplicações...). mes: '2026-09'
export async function loadPagamentosFora({ mes, grupo }) {
  const p = { tipo: 'pagamentos_fora', mes }
  if (grupo) p.grupo = grupo
  const d = await fetchComParametros(p)
  return Array.isArray(d) ? d.map(r => ({ ...r, valor: Number(r.valor || 0) })) : []
}

// v27.7 — DRE de custos (área > tipo de gasto > fornecedor). bu vazio = todas
export async function loadDRE({ bu } = {}) {
  const p = { tipo: 'dre' }
  if (bu && bu !== 'Todas') p.bu = bu
  const d = await fetchComParametros(p, 45000)
  const arr = x => Array.isArray(x) ? x : []
  return {
    meses: arr(d.meses), mes_atual: d.mes_atual || '', baixas_ate: d.baixas_ate || '',
    pago: arr(d.pago).map(r => ({ ...r, valor: Number(r.valor || 0) })),
    a_pagar: arr(d.a_pagar).map(r => ({ ...r, valor: Number(r.valor || 0), qtd: Number(r.qtd || 0) })),
  }
}

// Tela de conciliação. mes: '2026-09' (vazio = tudo)
export async function loadConciliacao(mes) {
  const p = { tipo: 'conciliacao' }
  if (mes) p.mes = mes
  const data = await fetchComParametros(p, 45000)
  const arr = x => Array.isArray(x) ? x : []
  return {
    nf_vencidas:  arr(data && data.nf_vencidas),
    nf_sem_baixa: arr(data && data.nf_sem_baixa),
    divergencias: arr(data && data.divergencias),
    conflitos_bu: arr(data && data.conflitos_bu),
    pago_sem_nf:  arr(data && data.pago_sem_nf),
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
  com_nf:       r.com_nf ? 1 : 0,
}))

// Registra a divergência de BU reportada pelo gestor (ex: "esse fornecedor
// não é da minha BU, acho que é de tal BU"). Fica pendente de revisão numa
// aba separada da planilha — não reclassifica nada sozinho.
export async function reportarDivergenciaBU({ fornecedor, descricao, buAtual, buSugerido, mes, loja, valor, observacao, origem, codFor } = {}) {
  const params = new URLSearchParams({ tipo: 'registrar_divergencia_bu' })
  if (origem)      params.set('origem', origem)        // 'nota' | 'pagamento'
  if (codFor)      params.set('cod_for', codFor)
  if (fornecedor)  params.set('fornecedor', fornecedor)
  if (descricao)   params.set('descricao', descricao)
  if (buAtual)      params.set('bu_atual', buAtual)
  if (buSugerido)   params.set('bu_sugerido', buSugerido)
  if (mes)         params.set('mes', mes)
  if (loja)        params.set('loja', loja)
  if (valor !== undefined) params.set('valor', valor)
  if (observacao)  params.set('observacao', observacao)
  const url = `${APPS_SCRIPT_URL}?${params.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, { method:'GET', signal:controller.signal, redirect:'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) throw new Error(data.erro)
    return data && data.ok === true
  } catch(e) {
    clearTimeout(timer)
    console.error('[loader] reportarDivergenciaBU falhou:', e.message)
    return false
  }
}

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
