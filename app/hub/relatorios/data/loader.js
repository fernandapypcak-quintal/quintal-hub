import { APPS_SCRIPT_URL } from './config.js'

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Devolve { ok, dados } em vez de só o array -- assim dá pra distinguir
// "deu certo e não tinha nada" de "falhou e por isso veio vazio". Isso é
// essencial pro dashboard nunca mostrar zero por engano quando na
// verdade é uma falha de rede/Apps Script.
async function fetchTipo(tipo) {
  const url = `${APPS_SCRIPT_URL}?tipo=${tipo}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) { console.warn(`[loader] ${tipo}:`, data.erro); return { ok: false, dados: [] } }
    return { ok: true, dados: Array.isArray(data) ? data : [] }
  } catch (e) {
    clearTimeout(timer)
    console.error(`[loader] fetchTipo(${tipo}) falhou:`, e.message)
    return { ok: false, dados: [] }
  }
}

// Busca as 5 abas numa unica chamada (tipo=tudo) -- evita chamadas
// concorrentes disputando lock/quota na mesma planilha, que e o que causava
// descontos/bonus_concedido sumirem aleatoriamente.
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

// Carrega os 5 relatórios. Tenta tipo=tudo (com 1 retry); se não rolar,
// cai pro modo sequencial (uma aba por vez, nunca em paralelo, pra não
// somar chamadas concorrentes em cima do que já pode estar sobrecarregado).
//
// IMPORTANTE: sempre devolve `sucesso` por tipo -- {descontos: true/false,
// ...} -- pra quem usa isso (useRelatorios.jsx) saber que tipos realmente
// vieram atualizados e quais falharam. Isso é o que permite ao HUB nunca
// zerar um relatório por causa de uma falha passageira: se falhou, quem
// chama simplesmente mantém os dados antigos daquele tipo em vez de
// substituir por um array vazio.
export async function loadTudo() {
  let raw = await fetchObjeto('tudo')

  if (!raw) {
    await esperar(4000)
    raw = await fetchObjeto('tudo')
  }

  if (raw) {
    return {
      dados: {
        descontos: parseDescontos(raw.descontos || []),
        estornos: parseEstornos(raw.estornos || []),
        contasAberto: parseContasAberto(raw.contas_aberto || []),
        bonusConcedido: parseBonusConcedido(raw.bonus_concedido || []),
        bonusUtilizado: parseBonusUtilizado(raw.bonus_utilizado || []),
      },
      sucesso: {
        descontos: true, estornos: true, contasAberto: true,
        bonusConcedido: true, bonusUtilizado: true,
      },
    }
  }

  console.warn('[loader] tudo falhou 2x -- caindo pro modo sequencial (uma aba por vez, evita sobrecarregar o Apps Script)')
  const descontosR = await fetchTipo('descontos')
  const estornosR = await fetchTipo('estornos')
  const contasR = await fetchTipo('contas_aberto')
  const bonusConcR = await fetchTipo('bonus_concedido')
  const bonusUtilR = await fetchTipo('bonus_utilizado')

  return {
    dados: {
      descontos: parseDescontos(descontosR.dados),
      estornos: parseEstornos(estornosR.dados),
      contasAberto: parseContasAberto(contasR.dados),
      bonusConcedido: parseBonusConcedido(bonusConcR.dados),
      bonusUtilizado: parseBonusUtilizado(bonusUtilR.dados),
    },
    sucesso: {
      descontos: descontosR.ok,
      estornos: estornosR.ok,
      contasAberto: contasR.ok,
      bonusConcedido: bonusConcR.ok,
      bonusUtilizado: bonusUtilR.ok,
    },
  }
}
