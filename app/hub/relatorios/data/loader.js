import { APPS_SCRIPT_URL } from './config.js'

async function fetchTipo(tipo) {
  const url = `${APPS_SCRIPT_URL}?tipo=${tipo}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) { console.warn(`[loader] ${tipo}:`, data.erro); return [] }
    return Array.isArray(data) ? data : []
  } catch (e) {
    clearTimeout(timer)
    console.error(`[loader] fetchTipo(${tipo}) falhou:`, e.message)
    return []
  }
}

// Busca as 5 abas numa unica chamada (tipo=tudo) -- evita 5 requests
// concorrentes disputando lock na mesma planilha, que e o que causava
// descontos/bonus_concedido sumirem aleatoriamente (a mesma race condition
// que ja resolvemos no dashboard de Custos).
async function fetchObjeto(tipo) {
  const url = `${APPS_SCRIPT_URL}?tipo=${tipo}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50000) // maior -- essa chamada faz tudo de uma vez
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) { console.warn(`[loader] ${tipo}:`, data.erro); return null }
    return data
  } catch (e) {
    clearTimeout(timer)
    console.error(`[loader] fetchObjeto(${tipo}) falhou:`, e.message)
    return null
  }
}

const num = (v) => Number(v || 0)

// Junta motivo/justificativa + categoria numa dimensão só, pra análises de
// pareto e rankings de "motivo de desconto/estorno/desperdício". Usa o campo
// "motivo_completo" já vindo pronto do Apps Script quando disponível
// (versões novas do Code.gs); se não vier (planilha ainda não regenerada),
// monta na hora a partir dos dois campos separados.
const concatMotivo = (motivoCompletoApi, motivo, categoria) => {
  if (motivoCompletoApi) return motivoCompletoApi
  const m = String(motivo || '').trim()
  const c = String(categoria || '').trim()
  if (m && c) return `${m} - ${c}`
  return m || c || '(sem motivo)'
}

// ── Parsers — convertem as chaves snake_case que vêm do Apps Script
// pra camelCase, e garantem tipos numéricos ──────────────────────

const parseDescontos = rows => rows.map(r => ({
  data: r.data || '',
  loja: r.loja || '',
  unidade: r.unidade || '',
  canal: r.canal || '',
  funcionario: r.funcionario || '',
  cliente: r.cliente_s || '',
  justificativa: r.justificativa || '',
  categoria: r.categoria || '',
  motivoCompleto: concatMotivo(r.motivo_completo, r.justificativa, r.categoria),
  produtos: r.produtos || '',
  percentual: num(r.percentual),
  valor: num(r.valor_r),
}))

const parseEstornos = rows => rows.map(r => ({
  data: r.data || '',
  loja: r.loja || '',
  unidade: r.unidade || '',
  canal: r.canal || '',
  produto: r.produto || '',
  categoria: r.categoria || '',
  tipo: r.tipo || '',
  estornadoPor: r.estornado_por || '',
  vendidoPor: r.vendido_por || '',
  motivo: r.motivo || '',
  // Estorno não tem "categoria do motivo" -- só o motivo (texto livre) e a
  // categoria do PRODUTO estornado, que são coisas diferentes. Por isso
  // aqui não concatena com categoria (diferente de Descontos).
  motivoCompleto: r.motivo_completo || r.motivo || '(sem motivo)',
  clientes: r.clientes || '',
  operacao: r.operacao || '',
  quantidade: num(r.quantidade) || 1,
  valorUnitario: num(r.valor_r),
}))

const parseContasAberto = rows => rows.map(r => ({
  loja: r.loja || '',
  unidade: r.unidade || '',
  canal: r.canal || '',
  nome: r.nome || '',
  cpf: r.cpf || '',
  telefone: r.telefone || '',
  abertoEmConta: num(r.aberto_em_conta),
  abertoEmServico: num(r.aberto_em_servico),
  totalEmAberto: num(r.total_em_aberto),
  pagoAposEvento: num(r.pago_apos_evento),
  aindaEmAberto: num(r.ainda_em_aberto),
}))

const parseBonusConcedido = rows => rows.map(r => ({
  loja: r.loja || '',
  unidade: r.unidade || '',
  canal: r.canal || '',
  cliente: r.cliente || '',
  dataConcessao: r.data_concessao || '',
  concedidoPor: r.concedido_por || '',
  motivo: r.motivo || '',
  categoria: r.categoria || '',
  motivoCompleto: concatMotivo(r.motivo_completo, r.motivo, r.categoria),
  valorRecebido: num(r.valor_recebido_r),
  valorGastoNoPeriodo: num(r.valor_gasto_no_periodo_r),
  valorGastoEmOutroPeriodo: num(r.valor_gasto_em_outro_periodo_r),
}))

const parseBonusUtilizado = rows => rows.map(r => ({
  loja: r.loja || '',
  unidade: r.unidade || '',
  canal: r.canal || '',
  cliente: r.cliente || '',
  concedidoEm: r.concedido_em || '',
  utilizadoEm: r.utilizado_em || '',
  concedidoPor: r.concedido_por || '',
  motivo: r.motivo || '',
  valorUtilizado: num(r.valor_utilizado_r),
}))

// Carrega os 5 relatórios numa chamada só (tipo=tudo). Se o Apps Script
// publicado ainda for uma versão anterior sem esse tipo, cai pro modo
// antigo (5 chamadas em paralelo) pra não deixar o dashboard vazio.
export async function loadTudo() {
  const raw = await fetchObjeto('tudo')

  if (!raw) {
    const [descontosRaw, estornosRaw, contasRaw, bonusConcRaw, bonusUtilRaw] = await Promise.all([
      fetchTipo('descontos'),
      fetchTipo('estornos'),
      fetchTipo('contas_aberto'),
      fetchTipo('bonus_concedido'),
      fetchTipo('bonus_utilizado'),
    ])
    return {
      descontos: parseDescontos(descontosRaw),
      estornos: parseEstornos(estornosRaw),
      contasAberto: parseContasAberto(contasRaw),
      bonusConcedido: parseBonusConcedido(bonusConcRaw),
      bonusUtilizado: parseBonusUtilizado(bonusUtilRaw),
    }
  }

  return {
    descontos: parseDescontos(raw.descontos || []),
    estornos: parseEstornos(raw.estornos || []),
    contasAberto: parseContasAberto(raw.contas_aberto || []),
    bonusConcedido: parseBonusConcedido(raw.bonus_concedido || []),
    bonusUtilizado: parseBonusUtilizado(raw.bonus_utilizado || []),
  }
}
