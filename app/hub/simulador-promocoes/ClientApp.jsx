'use client'

// Simulador de CMV de promoções — v3 (out/2026)
//
//  - Pacote real: consumo por pessoa EXATO, a partir das reservas com o "Mais detalhes"
//    da ZIG (tudo que as pessoas da reserva consumiram ÷ pessoas). Só cai pra estimativa
//    (relatório de promoções ÷ pessoas de reservas de mesmo nome) quando não há detalhe —
//    e aí avisa, porque costuma superestimar (consumo fora de reserva entra no custo).
//  - Consumo por pessoa POR CATEGORIA: define "quantos espetos / bebidas / sobremesas por
//    pessoa" e o simulador distribui entre os itens do pacote. Dá pra puxar de um pacote
//    real ou da média de todos os pacotes.
//  - Itens novos entram com o consumo médio real por pessoa (não mais 1 de cada, que
//    deixava o CMV lá em cima).
//  - Montar do zero: seleção múltipla e "todos da categoria".

import { useState, useMemo, useEffect } from 'react'
import { Plus, Minus, Trash2, Search, Save, X, Flame, TrendingDown, TrendingUp, ChefHat, History, PenLine, BookOpen, Check, Users, CheckSquare, Square } from 'lucide-react'
import PRODUTOS_FALLBACK from '@/lib/catalogoFallback.json'
import { CMV_META, CMV_CRITICO } from '@/lib/promocoesConfig'
import { chaveProduto, chavePromo, ultimoDiaDoMes, categorizarPromocao } from '../promocoes/data/modelo'

function normalizar(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function num(v, padrao = 0) {
  let s = String(v ?? '').trim()
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isFinite(n) ? n : padrao
}

function formatR$(v) {
  if (!isFinite(v)) return 'R$ 0,0'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function formatPct(v) {
  if (!isFinite(v)) return '—'
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

function formatQtd(v) {
  return (Math.round(v * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const mesLabel = (m) => { const [a, mm] = m.split('-'); return `${MESES[+mm - 1]}/${a.slice(2)}` }
const dataBR = (d) => (d ? d.split('-').reverse().join('/') : '—')

// mesmo critério de filtro do dashboard (casa + mês / meses / dia)
function noFiltro(r, f) {
  if (f.units && !f.units.includes(r.unit)) return false
  if (f.data) return r.data === f.data
  if (f.mes) return r.mes === f.mes
  if (f.meses) return f.meses.has(r.mes)
  return true
}

function statusCmv(cmvPct) {
  if (!isFinite(cmvPct)) return { label: '—', cor: '#71717a', bg: '#F4F4F0', border: '#E8E8E2' }
  if (cmvPct > CMV_CRITICO) return { label: 'CRÍTICO', cor: '#8C1414', bg: '#FEF2F2', border: '#FEE2E2' }
  if (cmvPct > CMV_META) return { label: 'ATENÇÃO', cor: '#B45309', bg: '#FFFBEB', border: '#FEF3C7' }
  return { label: 'OK', cor: '#5f6b12', bg: '#f0f4e0', border: '#DCE7B0' }
}

function itemDoCatalogo(catalogoPorChave, nome, fallbackCategoria) {
  const c = catalogoPorChave.get(chaveProduto(nome))
  return {
    key: chaveProduto(nome),
    produto: c ? c.produto : String(nome || '').trim(),
    categoria: c?.categoria || fallbackCategoria || 'OUTROS',
    custo: c?.custo ?? 0,
    preco: c?.preco ?? 0,
    semFicha: !c,
    qtd: 1,
    qtdTexto: undefined, custoTexto: undefined, precoTexto: undefined,
  }
}

// Cardápios fixos — pacotes "à vontade" com lista de itens pronta (baseado
// no material de marketing recebido). Preço sugerido é opcional; a
// quantidade de cada item entra como 1 por padrão, editável ao carregar.
const CARDAPIOS_PADRAO = [
  {
    id: "festival-cerveja-e-churrasco",
    base: ["cerveja e churrasco", "chopp e churrasco"], // promoção/pacote real usado como referência de consumo
    nome: "Festival Cerveja e Churrasco à Vontade",
    precoSugerido: 99.99,
    itens: [
      "BOVINO", "CALABRESA S/ PIMENTA", "CALABRESA C/ PIMENTA", "CORACAO", "FRANGO", "KAFTA",
      "PAO DE ALHO", "SALSICHAO", "PANCETA",
      "ORIGINAL 600", "CERVEJA SPATEN", "BUDWEISER ZERO", "STELLA 550",
      "AGUA S/ GAS", "AGUA C/ GAS", "GUARANA", "GUARANA ANTARTICA  ZERO", "PEPSI", "PEPSI ZERO BLACK",
      "SODA LIMONADA", "SODA LIMONADA DIET", "SUKITA", "AGUA TONICA", "AGUA TONICA DIET",
      "ARROZ", "ARROZ BIRO BIRO", "ANEIS DE CEBOLA PRÉ-FORMADA", "FRITAS", "MANDIOCA FRITA P",
      "VINAGRETE", "FAROFA  DA CASA", "POLENTA FRITA",
      "QUEIJO COALHO C/ MELACO", "MINI CHURROS C/ DOCE DE LEITE",
      "BOLINHO QUEIJO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA",
    ],
  },
  {
    id: "rodizio-espetos-classicos",
    base: ["rodizio"],
    nome: "Rodízio de Espetos Clássicos",
    precoSugerido: null,
    itens: [
      "BOVINO", "CALABRESA C/ PIMENTA", "CALABRESA S/ PIMENTA", "CORACAO", "FRANGO", "KAFTA",
      "PANCETA", "SALSICHAO", "PAO DE ALHO",
      "MUSSARELA BUFALA C/  RUCULA E TOMATE GRAPE", "QUEIJO COALHO C/ MELACO",
      "ABOBRINHA", "BERINJELA", "BATATA BOLINHA",
      "ARROZ", "ARROZ BIRO BIRO", "ANEIS DE CEBOLA PRÉ-FORMADA", "FRITAS", "VINAGRETE", "FAROFA  DA CASA", "POLENTA FRITA", "MANDIOCA FRITA P",
      "BOLINHO QUEIJO", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA", "COXINHA FRANGO C/ REQUEIJÃO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA",
    ],
  },
];

const CHAVE_CARDAPIOS_CUSTOM = "quintal_cardapios_custom_v1";

// Grupos de itens reaproveitados entre os cardápios corporativos
const CLASSICOS_QUINTAL = ["BOVINO", "FRANGO", "KAFTA", "CORACAO", "CALABRESA S/ PIMENTA", "CALABRESA C/ PIMENTA", "PANCETA", "SALSICHAO", "PAO DE ALHO"];
const DIRETO_FAZENDA = ["QUEIJO COALHO C/ MELACO", "MUSSARELA BUFALA C/  RUCULA E TOMATE GRAPE"];
const VEGGIE_CORP = ["ABOBRINHA", "BATATA BOLINHA", "BERINJELA", "PUPUNHA C/ TOMATE SECO E RUCULA", "PUPUNHA NA BRASA"];
const ACOMPANHAMENTOS_CORP = ["ARROZ", "ARROZ BIRO BIRO", "FRITAS", "FAROFA  DA CASA", "MANDIOCA FRITA P", "POLENTA FRITA", "VINAGRETE", "ANEIS DE CEBOLA PRÉ-FORMADA"];
const SOBREMESAS_CORP = ["ABACAXI C/ CHOCOLATE", "BANANA C/ CHOCOLATE", "BRIGADEIRO", "MINI CHURROS C/ DOCE DE LEITE", "MORANGO C/ CHOCOLATE", "UVA C/ CHOCOLATE"];
const BOTECO_SIMPLES = ["STICKS DE MUSSARELA"];
const BOTECO_COMPLETO = ["BOLINHO BACALHAU", "COXINHA FRANGO C/ REQUEIJÃO", "ESPETO DADINHO DE TAPIOCA C/ GELEIA DE PIMENTA", "KIBE", "PORÇÃO DE PASTÉIS", "STICKS DE MUSSARELA"];
const BEBIDAS_SEM_ALCOOL = ["AGUA S/ GAS", "AGUA C/ GAS", "AGUA TONICA", "AGUA TONICA DIET", "GUARANA", "PEPSI", "SUKITA", "SODA LIMONADA", "SODA LIMONADA DIET"];
const CERVEJAS_CORP = ["BECKS LONG NECK", "BUDWEISER ZERO", "ORIGINAL 600", "CERVEJA SPATEN", "STELLA 550", "STELLA PURE GOLD 600"];
const DRINKS_Q2 = ["CAIPIRINHA CACHACA NACIONAL", "CAIPIRINHA VODKA NACIONAL", "GIN TÔNICA PINK", "GIN TÔNICA CLÁSSICO"];
const DRINKS_Q3 = [...DRINKS_Q2, "CAIPIRINHA DO QUINTAL MEL E LIMÃO"];
const SELECAO_PREMIUM = ["CAMARAO BRASA", "CARRE DE CORDEIRO", "COSTELA BOVINA", "FILE MIGNON BOVINO", "PICANHA", "SALSICHAO C/ PROVOLONE", "SHIMEJI", "TULIPA DE FRANGO"];

// Cardápios corporativos (eventos fechados) — preço é o valor de tabela por
// pessoa, ANTES da taxa de serviço de +10% que aparece nos materiais de
// marketing. Some itens dos folhetos (ex: Linguiça Cuiabana, sabores
// específicos de caipirinha/caipiroska) não têm equivalente exato no
// catálogo e ficaram fora — dá pra adicionar na mão ao carregar.
const CARDAPIOS_CORPORATIVOS = [
  { id: "corp-quintal1-padrao", nome: "Corporativo Quintal 1 (padrão)", precoSugerido: 229.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP] },
  { id: "corp-quintal2-padrao", nome: "Corporativo Quintal 2 (padrão)", precoSugerido: 265.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q2] },
  { id: "corp-quintal3-padrao", nome: "Corporativo Quintal 3 (padrão)", precoSugerido: 284.99,
    itens: [...CLASSICOS_QUINTAL, ...SELECAO_PREMIUM, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q3] },
  { id: "corp-quintal1-fimdeano", nome: "Corporativo Quintal 1 (Fim de Ano 2026)", precoSugerido: 252.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP] },
  { id: "corp-quintal2-fimdeano", nome: "Corporativo Quintal 2 (Fim de Ano 2026)", precoSugerido: 292.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q2] },
  { id: "corp-quintal3-fimdeano", nome: "Corporativo Quintal 3 (Fim de Ano 2026)", precoSugerido: 313.99,
    itens: [...CLASSICOS_QUINTAL, ...SELECAO_PREMIUM, ...DIRETO_FAZENDA, ...BOTECO_COMPLETO, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL, ...CERVEJAS_CORP, ...DRINKS_Q3] },
  { id: "corp-quintal4-fimdeano", nome: "Corporativo Quintal 4 — sem álcool (Fim de Ano 2026)", precoSugerido: 179.99,
    itens: [...CLASSICOS_QUINTAL, ...DIRETO_FAZENDA, ...BOTECO_SIMPLES, ...VEGGIE_CORP, ...ACOMPANHAMENTOS_CORP, ...SOBREMESAS_CORP, ...BEBIDAS_SEM_ALCOOL] },
];


const FAMILIAS = { 'C&C': 'Chopp / Cerveja & Churrasco', 'All Inclusive': 'All Inclusive', 'Clássicos': 'Rodízio de Espetos Clássicos' }
const familia = (nome) => { const c = categorizarPromocao(nome); return c && FAMILIAS[c] ? c : null }
const fmt2 = (v) => (v == null || !isFinite(v) ? '—' : (Math.round(v * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }))

export default function SimuladorPromocoesClientApp({ dados = null, mostrarBarraVoltar = false }) {
  // ---------- Catálogo (ficha técnica) ----------
  const catalogo = useMemo(() => {
    const lista = dados?.catalogo?.length ? dados.catalogo : PRODUTOS_FALLBACK
    return lista
      .map((p) => ({ produto: String(p.produto || '').trim(), categoria: String(p.categoria || 'OUTROS').trim() || 'OUTROS', custo: +p.custo || 0, preco: +p.preco || 0 }))
      .filter((p) => p.produto)
  }, [dados])
  const origemCatalogo = dados?.catalogo?.length ? (dados.fichaAoVivo ? 'ao-vivo' : 'cache') : 'snapshot'
  const catalogoPorChave = useMemo(() => new Map(catalogo.map((p) => [chaveProduto(p.produto), p])), [catalogo])
  const catDe = (key) => catalogoPorChave.get(key)?.categoria || 'OUTROS'
  const CATEGORIAS = useMemo(() => ['TODAS', ...Array.from(new Set(catalogo.map((p) => p.categoria))).sort()], [catalogo])

  const [modoOrigem, setModoOrigem] = useState('historico')
  const [carrinho, setCarrinho] = useState([])
  const [nomePromo, setNomePromo] = useState('')
  const [modoPreco, setModoPreco] = useState('fixo')
  const [precoFixo, setPrecoFixo] = useState('')
  const [percDesconto, setPercDesconto] = useState('')
  const [pessoas, setPessoas] = useState('1')
  const [aviso, setAviso] = useState(null)
  const [base, setBase] = useState(null)
  const [cenarios, setCenarios] = useState([])

  // ---------- Histórico (reservas com detalhe da ZIG) ----------
  const temHistorico = !!dados?.pacotes
  const [histModo, setHistModo] = useState('mes')
  const [histMes, setHistMes] = useState('3m')
  const [histDia, setHistDia] = useState('')
  const [histUnidade, setHistUnidade] = useState('')
  const [buscaPromo, setBuscaPromo] = useState('')
  const [promoSel, setPromoSel] = useState(null)
  const [pessoasManual, setPessoasManual] = useState('')

  const ultimos3 = useMemo(() => {
    const lista = dados?.mesesCarregados || dados?.meses || []
    if (!lista.length) return []
    const atual = dados.ultimoFechado?.slice(0, 7)
    const fechados = lista.filter((m) => m !== atual || dados.ultimoFechado === ultimoDiaDoMes(m))
    return (fechados.length ? fechados : lista).slice(-3)
  }, [dados])

  const filtroHist = useMemo(() => {
    const units = histUnidade ? [histUnidade] : (dados?.unidades || []).map((u) => u.id)
    if (histModo === 'dia' && histDia) return { units, data: histDia }
    if (histMes === '3m') return { units, meses: new Set(ultimos3) }
    return { units, mes: histMes }
  }, [dados, histUnidade, histModo, histDia, histMes, ultimos3])
  const periodoLabel = filtroHist.data ? dataBR(histDia) : histMes === '3m' ? ultimos3.map(mesLabel).join(', ') : mesLabel(histMes)
  const casaLabel = histUnidade ? dados?.unidades.find((u) => u.id === histUnidade)?.label : 'Rede'

  const addItem = (mapa, produto, qtd) => {
    const k = chaveProduto(produto)
    const y = mapa.get(k) || { produto, usos: 0 }
    y.usos += qtd; mapa.set(k, y)
  }

  // Opções de "Pacote real": EXATO pelas reservas com detalhe; estimado só sem detalhe
  const opcoes = useMemo(() => {
    if (!temHistorico) return []
    const exato = new Map()
    const semDet = new Map()
    for (const p of dados.pacotes) {
      if (!noFiltro(p, filtroHist)) continue
      if (p.detalhe && p.promocaoPacote) {
        const f = familia(p.promocaoPacote)
        const k = f ? 'fam:' + f : chavePromo(p.promocaoPacote)
        const x = exato.get(k) || { chave: k, nome: f ? FAMILIAS[f] : p.promocaoPacote, n: 0, pessoas: 0, fat: 0, custo: 0, itens: new Map(), nomes: new Set() }
        x.n++; x.pessoas += p.pessoas; x.fat += p.fat; x.custo += p.custoExato || 0; x.nomes.add(p.promocaoPacote)
        for (const it of p.itens || []) if (it.qtd) addItem(x.itens, it.produto, it.qtd)
        exato.set(k, x)
      } else {
        const f = familia(p.nome)
        const k = f ? 'fam:' + f : p.chave
        const x = semDet.get(k) || { pessoas: 0, fat: 0, n: 0 }
        x.pessoas += p.pessoas; x.fat += p.fat; x.n++
        semDet.set(k, x)
      }
    }
    // relatório de promoções (pra quem ainda não tem reserva com detalhe)
    const consumo = filtroHist.data ? dados.consumoDia : dados.consumoMes
    const rel = new Map()
    for (const c of consumo) {
      if (!noFiltro(c, filtroHist) || c.categoria === 'Desconto') continue
      const f = familia(c.nome)
      const k = f ? 'fam:' + f : c.chave
      const x = rel.get(k) || { nome: f ? FAMILIAS[f] : dados.nomes.get(c.chave) || c.nome, usos: 0, custo: 0, itens: new Map() }
      x.usos += c.usos; x.custo += c.custo; addItem(x.itens, c.produto, c.usos)
      rel.set(k, x)
    }
    const out = []
    for (const x of exato.values()) {
      if (x.pessoas > 0) out.push({ ...x, fonte: 'exato', ticket: x.fat / x.pessoas, detalheFonte: `${x.n} reserva(s) com consumo detalhado${x.nomes.size > 1 ? ' · ' + [...x.nomes].join(', ') : ''}` })
    }
    for (const [k, c] of rel) {
      if (exato.has(k)) continue
      const s = semDet.get(k)
      if (s && s.pessoas > 0) out.push({ chave: k, nome: c.nome, fonte: 'estimado', pessoas: s.pessoas, n: s.n, fat: s.fat, ticket: s.fat / s.pessoas, custo: c.custo, itens: c.itens, detalheFonte: 'estimado: relatório de promoções ÷ pessoas das reservas (pode superestimar)' })
      else out.push({ chave: k, nome: c.nome, fonte: null, pessoas: 0, fat: null, ticket: null, custo: c.custo, itens: c.itens, usos: c.usos, detalheFonte: 'sem nº de pessoas — dá pra digitar' })
    }
    const ordem = { exato: 0, estimado: 1 }
    return out.sort((a, b) => (ordem[a.fonte] ?? 2) - (ordem[b.fonte] ?? 2) || (b.pessoas || 0) - (a.pessoas || 0) || b.custo - a.custo)
  }, [dados, filtroHist, temHistorico])

  // Média de TODOS os pacotes com detalhe no período (referência padrão)
  const mediaGeral = useMemo(() => {
    const itens = new Map()
    let pessoasT = 0, fat = 0, custo = 0, n = 0
    for (const o of opcoes) if (o.fonte === 'exato') {
      pessoasT += o.pessoas; fat += o.fat; custo += o.custo; n += o.n
      for (const [k, v] of o.itens) { const y = itens.get(k) || { produto: v.produto, usos: 0 }; y.usos += v.usos; itens.set(k, y) }
    }
    return pessoasT > 0 ? { chave: '__media__', nome: 'Média de todos os pacotes', fonte: 'exato', pessoas: pessoasT, fat, custo, n, ticket: fat / pessoasT, itens } : null
  }, [opcoes])

  const promoEscolhida = opcoes.find((o) => o.chave === promoSel) || null
  const pessoasBase = promoEscolhida?.pessoas > 0 ? promoEscolhida.pessoas : num(pessoasManual, 0)

  function montarBase(op, nPessoas) {
    return { nome: op.nome, fonte: op.fonte, pessoas: nPessoas, ticket: op.ticket ?? null, receita: op.fat ?? null,
      custoPessoa: nPessoas > 0 ? op.custo / nPessoas : null, cmv: op.fat ? op.custo / op.fat : null, periodo: periodoLabel, casa: casaLabel }
  }

  function carregarDoHistorico() {
    if (!promoEscolhida) { setAviso('Escolha o pacote.'); return }
    if (!(pessoasBase > 0)) { setAviso('Esse pacote ainda não tem nº de pessoas — digite quantas pessoas.'); return }
    let semFicha = 0
    const novo = [...promoEscolhida.itens.values()].map((x) => {
      const it = itemDoCatalogo(catalogoPorChave, x.produto)
      if (it.semFicha) semFicha++
      return { ...it, qtd: +(x.usos / pessoasBase).toFixed(3) }
    }).filter((i) => i.qtd > 0)
    setCarrinho(novo)
    setNomePromo(promoEscolhida.nome)
    setPessoas('1')
    setModoPreco('fixo')
    if (promoEscolhida.ticket) setPrecoFixo(String(promoEscolhida.ticket.toFixed(2)).replace('.', ','))
    setBase(montarBase(promoEscolhida, pessoasBase))
    setRefSel(promoEscolhida.chave)
    const avisos = []
    if (promoEscolhida.fonte === 'estimado') avisos.push('Consumo ESTIMADO (ainda sem o detalhe das reservas): o relatório de promoções inclui consumo fora de reserva, então o custo por pessoa tende a ficar alto.')
    if (semFicha) avisos.push(`${semFicha} produto(s) sem ficha técnica entraram com custo R$ 0.`)
    setAviso(avisos.join(' ') || null)
  }

  // ---------- Referência de consumo por pessoa ----------
  const [refSel, setRefSel] = useState('__media__')
  const referencia = refSel === '__media__' ? mediaGeral : opcoes.find((o) => o.chave === refSel && o.pessoas > 0) || null
  // por produto: qtd/pessoa na referência
  const refPorProduto = useMemo(() => {
    const m = new Map()
    if (referencia) for (const [k, v] of referencia.itens) m.set(k, v.usos / referencia.pessoas)
    return m
  }, [referencia])
  // por categoria da ficha: qtd/pessoa na referência
  const refPorCategoria = useMemo(() => {
    const m = new Map()
    for (const [k, q] of refPorProduto) { const c = catDe(k); m.set(c, (m.get(c) || 0) + q) }
    return m
  }, [refPorProduto, catalogoPorChave])
  const mediaPorProduto = useMemo(() => {
    const m = new Map()
    if (mediaGeral) for (const [k, v] of mediaGeral.itens) m.set(k, v.usos / mediaGeral.pessoas)
    return m
  }, [mediaGeral])

  // ---------- Carrinho ----------
  const qtdPadrao = (key, emLote) => {
    const q = mediaPorProduto.get(key)
    return q > 0 ? +q.toFixed(3) : (emLote ? 0 : 1)
  }
  function adicionarProdutos(lista, emLote = false) {
    setCarrinho((prev) => {
      const ja = new Set(prev.map((i) => i.key))
      const novos = lista.filter((p) => !ja.has(chaveProduto(p.produto))).map((p) => {
        const it = itemDoCatalogo(catalogoPorChave, p.produto)
        return { ...it, qtd: qtdPadrao(it.key, emLote) }
      })
      return [...prev, ...novos]
    })
    if (emLote) setAviso(mediaGeral
      ? 'Itens adicionados com o consumo médio real por pessoa (média dos pacotes com reserva). Quem não tem histórico entrou com 0 — ajuste em "Consumo por pessoa, por categoria".'
      : 'Itens adicionados com 0 — defina o consumo por pessoa em "Consumo por pessoa, por categoria".')
  }
  const atualizar = (key, f) => setCarrinho((prev) => prev.map((i) => (i.key === key ? f(i) : i)))
  const alterarQtd = (key, d) => atualizar(key, (i) => ({ ...i, qtd: Math.max(0, +(i.qtd + d).toFixed(3)), qtdTexto: undefined }))
  const definirQtd = (key, v) => atualizar(key, (i) => ({ ...i, qtdTexto: v, qtd: Math.max(0, num(v, i.qtd)) }))
  const definirCusto = (key, v) => atualizar(key, (i) => ({ ...i, custoTexto: v, custo: num(v, i.custo) }))
  const definirPreco = (key, v) => atualizar(key, (i) => ({ ...i, precoTexto: v, preco: num(v, i.preco) }))
  const removerItem = (key) => setCarrinho((prev) => prev.filter((i) => i.key !== key))
  function limparPacote() { setCarrinho([]); setNomePromo(''); setBase(null); setAviso(null); setPrecoFixo(''); setPessoas('1') }

  // ---------- Consumo por categoria ----------
  const categoriasCarrinho = useMemo(() => {
    const m = new Map()
    for (const i of carrinho) {
      const x = m.get(i.categoria) || { categoria: i.categoria, itens: 0, qtd: 0, custo: 0 }
      x.itens++; x.qtd += i.qtd; x.custo += i.custo * i.qtd
      m.set(i.categoria, x)
    }
    return [...m.values()].map((x) => ({ ...x, ref: refPorCategoria.get(x.categoria) ?? null })).sort((a, b) => b.custo - a.custo)
  }, [carrinho, refPorCategoria])
  const [catTexto, setCatTexto] = useState({})

  // Define o total por pessoa de uma categoria e redistribui entre os itens dela
  function definirCategoria(cat, alvo) {
    setCarrinho((prev) => {
      const doCat = prev.filter((i) => i.categoria === cat)
      const atual = doCat.reduce((s, i) => s + i.qtd, 0)
      let pesos
      if (atual > 0) pesos = new Map(doCat.map((i) => [i.key, i.qtd / atual]))
      else {
        const w = doCat.map((i) => refPorProduto.get(i.key) || mediaPorProduto.get(i.key) || 0)
        const sw = w.reduce((s, v) => s + v, 0)
        pesos = new Map(doCat.map((i, j) => [i.key, sw > 0 ? w[j] / sw : 1 / doCat.length]))
      }
      return prev.map((i) => (i.categoria === cat ? { ...i, qtd: +(alvo * (pesos.get(i.key) || 0)).toFixed(3), qtdTexto: undefined } : i))
    })
  }

  // Aplica a referência inteira: cada categoria recebe o consumo/pessoa da referência,
  // distribuído pela preferência real entre os itens do pacote
  function aplicarReferencia() {
    if (!referencia) return
    setCarrinho((prev) => {
      const porCat = new Map()
      for (const i of prev) { const a = porCat.get(i.categoria) || []; a.push(i); porCat.set(i.categoria, a) }
      const novas = new Map()
      for (const [cat, itens] of porCat) {
        const alvo = refPorCategoria.get(cat)
        if (alvo == null) continue // categoria sem referência: mantém
        const w = itens.map((i) => refPorProduto.get(i.key) || 0)
        const sw = w.reduce((s, v) => s + v, 0)
        itens.forEach((i, j) => novas.set(i.key, +(alvo * (sw > 0 ? w[j] / sw : 1 / itens.length)).toFixed(3)))
      }
      return prev.map((i) => (novas.has(i.key) ? { ...i, qtd: novas.get(i.key), qtdTexto: undefined } : i))
    })
    setCatTexto({})
    setAviso(`Consumo por pessoa ajustado pela referência "${referencia.nome}" (${referencia.pessoas.toLocaleString('pt-BR')} pessoas): cada categoria recebeu o consumo real por pessoa, distribuído pela preferência real entre os itens do pacote.`)
  }

  // ---------- Montar do zero: busca + seleção múltipla ----------
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('TODAS')
  const [selecionados, setSelecionados] = useState(() => new Set())
  const produtosFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    return catalogo.filter((p) => (termo === '' || normalizar(p.produto).includes(termo)) && (categoria === 'TODAS' || p.categoria === categoria))
  }, [catalogo, busca, categoria])
  const noCarrinho = useMemo(() => new Set(carrinho.map((i) => i.key)), [carrinho])
  const toggleSel = (k) => setSelecionados((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const visiveis = produtosFiltrados.slice(0, 150)
  const todosVisiveisSel = visiveis.length > 0 && visiveis.every((p) => selecionados.has(chaveProduto(p.produto)))

  // ---------- Cardápios fixos ----------
  const [cardapiosCustom, setCardapiosCustom] = useState([])
  const [criandoCardapio, setCriandoCardapio] = useState(false)
  const [novoCardapioNome, setNovoCardapioNome] = useState('')
  const [novoCardapioPreco, setNovoCardapioPreco] = useState('')
  const [novoCardapioItens, setNovoCardapioItens] = useState([])
  const [buscaCardapio, setBuscaCardapio] = useState('')
  useEffect(() => {
    try { const s = window.localStorage.getItem(CHAVE_CARDAPIOS_CUSTOM); if (s) setCardapiosCustom(JSON.parse(s)) } catch (e) { /* sem persistência */ }
  }, [])
  function salvarCardapiosCustom(lista) {
    setCardapiosCustom(lista)
    try { window.localStorage.setItem(CHAVE_CARDAPIOS_CUSTOM, JSON.stringify(lista)) } catch (e) { /* ignora */ }
  }

  function carregarCardapio(cardapio) {
    let semFicha = 0
    const famCard = familia(cardapio.nome)
    const ref = (famCard && opcoes.find((o) => o.chave === 'fam:' + famCard && o.fonte === 'exato')) || mediaGeral
    const refProd = new Map()
    if (ref) for (const [k, v] of ref.itens) refProd.set(k, v.usos / ref.pessoas)
    const novo = cardapio.itens.map((nome) => {
      const it = itemDoCatalogo(catalogoPorChave, nome)
      if (it.semFicha) semFicha++
      return { ...it, qtd: +(refProd.get(it.key) || 0).toFixed(3) }
    })
    setCarrinho(novo)
    setNomePromo(cardapio.nome)
    setPessoas('1')
    setBase(ref ? montarBase(ref, ref.pessoas) : null)
    if (ref) setRefSel(ref.chave)
    if (cardapio.precoSugerido != null) { setModoPreco('fixo'); setPrecoFixo(String(cardapio.precoSugerido).replace('.', ',')) }
    setAviso(ref
      ? `Quantidades = consumo real por pessoa de "${ref.nome}" (${ref.pessoas.toLocaleString('pt-BR')} pessoas, ${periodoLabel}). Itens sem consumo no histórico ficaram com 0 — ajuste por categoria.` + (semFicha ? ` ${semFicha} item(ns) sem ficha (custo R$ 0).` : '')
      : 'Sem histórico de reservas com detalhe no período — defina o consumo por pessoa em "Consumo por pessoa, por categoria".')
  }

  function salvarNovoCardapio() {
    if (!novoCardapioNome.trim() || novoCardapioItens.length === 0) return
    const p = num(novoCardapioPreco, NaN)
    salvarCardapiosCustom([...cardapiosCustom, { id: 'custom-' + Date.now(), nome: novoCardapioNome.trim(), precoSugerido: isFinite(p) && p > 0 ? p : null, itens: [...novoCardapioItens] }])
    setCriandoCardapio(false); setNovoCardapioNome(''); setNovoCardapioPreco(''); setNovoCardapioItens([]); setBuscaCardapio('')
  }

  // ---------- Cálculo ----------
  const multiplicador = Math.max(num(pessoas, 1), 0) || 1
  const custoPessoa = carrinho.reduce((s, i) => s + i.custo * i.qtd, 0)
  const cardapioPessoa = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0)
  const precoPessoa = modoPreco === 'fixo' ? num(precoFixo, 0) : cardapioPessoa * (1 - num(percDesconto, 0) / 100)
  const cmvPct = precoPessoa > 0 ? custoPessoa / precoPessoa : Infinity
  const margemPessoa = precoPessoa - custoPessoa
  const status = statusCmv(cmvPct)
  const precoMinMeta = custoPessoa > 0 ? custoPessoa / CMV_META : null
  const itensPessoa = carrinho.reduce((s, i) => s + i.qtd, 0)
  const semFichaNoPacote = carrinho.filter((i) => i.semFicha && i.custoTexto === undefined && i.qtd > 0).length
  const temItens = carrinho.length > 0 && precoPessoa > 0

  function salvarCenario() {
    if (!temItens) return
    setCenarios((prev) => [...prev, { id: Date.now(), nome: nomePromo || 'Sem nome', itens: carrinho.filter((i) => i.qtd > 0).length, itensPessoa, precoPessoa, custoPessoa, cmvPct, mcRS: margemPessoa, status, base: base?.nome || null }])
  }

  const carrinhoOrdenado = [...carrinho].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.produto.localeCompare(b.produto))
  const embutido = !mostrarBarraVoltar

  return (
    <div className="sim-promo" style={{ background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif", color: '#0D0D0D', minHeight: embutido ? undefined : '100vh' }}>
      <style>{`
        .sim-promo * { box-sizing: border-box; }
        .sim-grid { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: 18px; align-items: start; }
        .sim-grid > * { min-width: 0; }
        @media (max-width: 1100px) { .sim-grid { grid-template-columns: minmax(0, 1fr); } }
        .sim-res { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 700px) { .sim-res { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .sim-linha:hover { background: #FAFAF8; }
      `}</style>

      <div style={{ maxWidth: 1400, width: '100%', margin: '0 auto', padding: '20px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#8C1414', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Flame size={20} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Simulador de CMV de promoção</div>
            <div style={{ fontSize: 12.5, color: '#71717a' }}>Tudo por pessoa · parta de um pacote real, de um cardápio ou do zero e teste o preço</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: origemCatalogo === 'ao-vivo' ? '#97A624' : origemCatalogo === 'cache' ? '#D9B504' : '#8C1414' }} />
            {origemCatalogo === 'ao-vivo' ? 'ficha técnica ao vivo' : origemCatalogo === 'cache' ? 'ficha técnica (cache)' : 'snapshot antigo — ficha indisponível'} · {catalogo.length} produtos
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { id: 'historico', icon: History, label: 'Pacote real' },
            { id: 'cardapios', icon: BookOpen, label: 'Cardápios fixos' },
            { id: 'manual', icon: PenLine, label: 'Montar do zero' },
          ].map(({ id, icon: Icon, label: l }) => (
            <button key={id} onClick={() => setModoOrigem(id)} style={{ ...tab, flex: '0 0 auto', padding: '8px 16px', ...(modoOrigem === id ? tabAtiva : {}) }}>
              <Icon size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> {l}
            </button>
          ))}
        </div>

        <div className="sim-grid">
          {/* ───────── ESQUERDA: origem ───────── */}
          <div>
            {modoOrigem === 'historico' && (
              <div style={card}>
                <div style={tituloCard}>Pacote real — consumo por pessoa</div>
                {!temHistorico ? (
                  <div style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>Os dados ainda não carregaram. Abra a Visão geral e volte aqui.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      <select value={histUnidade} onChange={(e) => setHistUnidade(e.target.value)} style={{ ...selectBox, width: 'auto', marginBottom: 0 }}>
                        <option value="">Rede</option>
                        {dados.unidades.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                      </select>
                      <div style={{ display: 'flex', border: '1px solid #E8E8E2', borderRadius: 8, overflow: 'hidden' }}>
                        {[['mes', 'Mês'], ['dia', 'Dia']].map(([id, l]) => (
                          <button key={id} onClick={() => setHistModo(id)} style={{ padding: '6px 12px', border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: histModo === id ? '#0D0D0D' : '#fff', color: histModo === id ? '#fff' : '#71717a' }}>{l}</button>
                        ))}
                      </div>
                      {histModo === 'mes' ? (
                        <select value={histMes} onChange={(e) => setHistMes(e.target.value)} style={{ ...selectBox, width: 'auto', marginBottom: 0 }}>
                          <option value="3m">Meses carregados (fechados)</option>
                          {[...(dados.mesesCarregados || dados.meses || [])].reverse().map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
                        </select>
                      ) : (
                        <input type="date" value={histDia} max={dados.ultimoFechado} onChange={(e) => setHistDia(e.target.value)} style={{ ...selectBox, width: 'auto', marginBottom: 0 }} />
                      )}
                    </div>
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                      <input value={buscaPromo} onChange={(e) => setBuscaPromo(e.target.value)} placeholder="Buscar pacote (PACOTE 03, Rodízio…)" style={inputBusca} />
                    </div>
                    <div style={{ maxHeight: 460, overflowY: 'auto', border: '1px solid #F0F0F0', borderRadius: 8, marginBottom: 8 }}>
                      {opcoes.filter((o) => !buscaPromo || normalizar(o.nome).includes(normalizar(buscaPromo))).map((o) => {
                        const sel = promoSel === o.chave
                        const cmv = o.fat ? o.custo / o.fat : null
                        return (
                          <div key={o.chave} className="sim-linha" onClick={() => { setPromoSel(o.chave); setPessoasManual('') }}
                            style={{ padding: '9px 10px', borderBottom: '1px solid #F4F4F0', cursor: 'pointer', background: sel ? '#f0f4e0' : undefined }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                              <span style={{ fontSize: 13, fontWeight: 650, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.nome}</span>
                              {o.fonte && <span style={{ ...tag, ...(o.fonte === 'exato' ? tagOk : tagWarn) }}>{o.fonte === 'exato' ? 'exato' : 'estimado'}</span>}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 10.5, color: '#9ca3af', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.detalheFonte}>{o.detalheFonte}</span>
                              <span className="font-mono" style={{ fontSize: 11, color: '#52525b', flexShrink: 0 }}>
                                {o.pessoas > 0
                                  ? <>{o.pessoas.toLocaleString('pt-BR')} pes · ticket {formatR$(o.ticket)} · <span style={{ color: statusCmv(cmv ?? NaN).cor }}>CMV {formatPct(cmv)}</span></>
                                  : <>custo {formatR$(o.custo)}</>}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {opcoes.length === 0 && <div style={{ padding: 12, color: '#9ca3af', fontSize: 12.5 }}>Nada nesse filtro.</div>}
                    </div>
                    {promoEscolhida && !(promoEscolhida.pessoas > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: '#71717a' }}>Quantas pessoas consumiram?</span>
                        <input value={pessoasManual} onChange={(e) => setPessoasManual(e.target.value)} placeholder="ex: 120" inputMode="decimal" style={{ ...inputMini, width: 90 }} />
                      </div>
                    )}
                    <button onClick={carregarDoHistorico} disabled={!promoEscolhida || !(pessoasBase > 0)}
                      style={{ ...btnPreto, width: '100%', padding: '10px 12px', opacity: !promoEscolhida || !(pessoasBase > 0) ? 0.4 : 1 }}>
                      {promoEscolhida && pessoasBase > 0 ? `Carregar "${promoEscolhida.nome}" →` : promoEscolhida ? 'Digite o nº de pessoas' : 'Escolha um pacote'}
                    </button>
                    <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 8, lineHeight: 1.5 }}>
                      <b>exato</b> = tudo que as reservas daquele pacote consumiram ÷ pessoas (detalhe da ZIG). <b>estimado</b> = relatório de promoções ÷ pessoas das reservas de mesmo nome — inclui consumo fora de reserva, por isso o custo/pessoa costuma sair alto.
                    </div>
                  </>
                )}
              </div>
            )}

            {modoOrigem === 'cardapios' && (
              <div style={card}>
                <div style={tituloCard}>Cardápios fixos</div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 10, lineHeight: 1.5 }}>
                  As quantidades entram com o consumo real por pessoa (do pacote equivalente, ou a média de todos os pacotes). Depois é só ajustar por categoria.
                </div>
                {!criandoCardapio ? (
                  <>
                    <div style={{ maxHeight: 460, overflowY: 'auto', borderTop: '1px solid #F0F0F0', marginBottom: 12 }}>
                      {[
                        { titulo: 'À vontade / Rodízio', lista: CARDAPIOS_PADRAO },
                        { titulo: 'Corporativo — eventos fechados', lista: CARDAPIOS_CORPORATIVOS },
                        ...(cardapiosCustom.length ? [{ titulo: 'Cadastrados por vocês', lista: cardapiosCustom }] : []),
                      ].map((grupo) => (
                        <div key={grupo.titulo}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3, padding: '10px 4px 4px' }}>{grupo.titulo}</div>
                          {grupo.lista.map((c) => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 4px', borderBottom: '1px solid #F4F4F0' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.nome}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.itens.length} itens{c.precoSugerido != null ? ` · ${formatR$(c.precoSugerido)}/pessoa` : ''}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <button onClick={() => carregarCardapio(c)} style={btnPreto}>Carregar →</button>
                                {String(c.id).startsWith('custom-') && (
                                  <button onClick={() => salvarCardapiosCustom(cardapiosCustom.filter((x) => x.id !== c.id))} style={{ ...btnCirc, color: '#8C1414' }}><Trash2 size={13} /></button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setCriandoCardapio(true)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px dashed #E8E8E2', background: '#FAFAF8', color: '#3f3f46', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      + Cadastrar novo cardápio
                    </button>
                  </>
                ) : (
                  <div>
                    <input value={novoCardapioNome} onChange={(e) => setNovoCardapioNome(e.target.value)} placeholder="Nome do cardápio" style={{ ...inputBusca, paddingLeft: 10, marginBottom: 8 }} />
                    <input value={novoCardapioPreco} onChange={(e) => setNovoCardapioPreco(e.target.value)} placeholder="Preço por pessoa (opcional)" inputMode="decimal" style={{ ...inputBusca, paddingLeft: 10, marginBottom: 10 }} />
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                      <input value={buscaCardapio} onChange={(e) => setBuscaCardapio(e.target.value)} placeholder="Buscar produto..." style={inputBusca} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{novoCardapioItens.length} item(ns) selecionado(s)</div>
                    <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #F0F0F0', borderRadius: 8, marginBottom: 12 }}>
                      {catalogo.filter((p) => normalizar(p.produto).includes(normalizar(buscaCardapio))).slice(0, 120).map((p) => {
                        const sel = novoCardapioItens.includes(p.produto)
                        return (
                          <div key={p.produto} onClick={() => setNovoCardapioItens((prev) => (sel ? prev.filter((x) => x !== p.produto) : [...prev, p.produto]))}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderBottom: '1px solid #F4F4F0', cursor: 'pointer', background: sel ? '#f0f4e0' : 'transparent' }}>
                            <span style={{ fontSize: 13 }}>{p.produto}</span>
                            {sel && <Check size={14} color="#97A624" />}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setCriandoCardapio(false); setNovoCardapioItens([]) }} style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E8E8E2', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={salvarNovoCardapio} disabled={!novoCardapioNome.trim() || !novoCardapioItens.length}
                        style={{ flex: 1, ...btnPreto, padding: '9px 12px', opacity: !novoCardapioNome.trim() || !novoCardapioItens.length ? 0.4 : 1 }}>
                        <Save size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modoOrigem === 'manual' && (
              <div style={card}>
                <div style={tituloCard}>Catálogo (ficha técnica)</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." style={inputBusca} />
                  </div>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ ...selectBox, width: 'auto', maxWidth: 200, marginBottom: 0 }}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c === 'TODAS' ? 'Todas as categorias' : c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 4px', borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0', flexWrap: 'wrap' }}>
                  <button onClick={() => setSelecionados((s) => { const n = new Set(s); visiveis.forEach((p) => (todosVisiveisSel ? n.delete(chaveProduto(p.produto)) : n.add(chaveProduto(p.produto)))); return n })}
                    style={{ ...btnLink }}>
                    {todosVisiveisSel ? <CheckSquare size={14} /> : <Square size={14} />} {todosVisiveisSel ? 'Desmarcar' : 'Marcar'} {categoria !== 'TODAS' ? `toda a categoria (${visiveis.length})` : `os ${visiveis.length} da lista`}
                  </button>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {selecionados.size > 0 && <button onClick={() => setSelecionados(new Set())} style={btnLink}>limpar</button>}
                    <button disabled={!selecionados.size}
                      onClick={() => { adicionarProdutos(catalogo.filter((p) => selecionados.has(chaveProduto(p.produto))), true); setSelecionados(new Set()) }}
                      style={{ ...btnPreto, opacity: selecionados.size ? 1 : 0.4 }}>
                      <Plus size={13} style={{ verticalAlign: -2 }} /> Adicionar {selecionados.size || ''} ao pacote
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: 470, overflowY: 'auto' }}>
                  {visiveis.length === 0 && <div style={{ padding: '20px 4px', color: '#9ca3af', fontSize: 13 }}>Nenhum produto encontrado.</div>}
                  {visiveis.map((p) => {
                    const k = chaveProduto(p.produto)
                    const sel = selecionados.has(k)
                    const ja = noCarrinho.has(k)
                    const media = mediaPorProduto.get(k)
                    return (
                      <div key={p.produto} className="sim-linha" onClick={() => toggleSel(k)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid #F4F4F0', cursor: 'pointer', background: sel ? '#f0f4e0' : undefined, opacity: ja ? 0.5 : 1 }}>
                        {sel ? <CheckSquare size={16} color="#5f6b12" /> : <Square size={16} color="#d4d4d8" />}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.produto}{ja && <span style={{ fontSize: 10, color: '#5f6b12', marginLeft: 6 }}>no pacote</span>}</div>
                          <div style={{ fontSize: 10.5, color: '#9ca3af' }}>{p.categoria}{media > 0 ? ` · média ${fmt2(media)}/pessoa nos pacotes` : ''}</div>
                        </div>
                        <div className="font-mono" style={{ fontSize: 11.5, textAlign: 'right', color: '#3f3f46', flexShrink: 0 }}>
                          <div>custo {formatR$(p.custo)}</div>
                          <div style={{ color: '#9ca3af' }}>cardápio {formatR$(p.preco)}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); adicionarProdutos([p]) }} disabled={ja} style={{ ...btnCirc, background: '#0D0D0D', border: 'none', opacity: ja ? 0.3 : 1 }}><Plus size={13} color="#fff" /></button>
                      </div>
                    )
                  })}
                  {produtosFiltrados.length > visiveis.length && <div style={{ padding: 8, fontSize: 11, color: '#9ca3af' }}>Mostrando 150 de {produtosFiltrados.length} — refine a busca.</div>}
                </div>
              </div>
            )}
          </div>

          {/* ───────── DIREITA: pacote + resultado ───────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Resultado no topo: é o que importa */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <input value={nomePromo} onChange={(e) => setNomePromo(e.target.value)} placeholder="Nome da promoção / pacote" style={{ ...inputBusca, paddingLeft: 10, flex: 1, minWidth: 180, fontWeight: 600 }} />
                <div style={{ padding: '5px 12px', borderRadius: 999, background: status.bg, color: status.cor, border: `1px solid ${status.border}`, fontSize: 12, fontWeight: 700 }}>{status.label}</div>
              </div>
              <div className="sim-res">
                <Metrica destaque label="% CMV" valor={formatPct(cmvPct)} cor={status.cor} />
                <Metrica destaque label="Margem por pessoa" valor={formatR$(margemPessoa)} cor={margemPessoa < 0 ? '#8C1414' : undefined} />
                <Metrica destaque label="Preço mínimo p/ meta" valor={precoMinMeta ? formatR$(precoMinMeta) : '—'} sub={`CMV ${formatPct(CMV_META)}`} />
                <Metrica label="Custo por pessoa" valor={formatR$(custoPessoa)} />
                <Metrica label="Preço por pessoa" valor={formatR$(precoPessoa)} />
                <Metrica label="Itens por pessoa" valor={fmt2(itensPessoa)} sub={`cardápio ${formatR$(cardapioPessoa)}`} />
              </div>
              {base && (
                <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E2', borderRadius: 10, padding: '9px 12px', marginTop: 10, fontSize: 12 }}>
                  <b>Real:</b> {base.nome} <span style={{ color: '#9ca3af' }}>· {base.casa} · {base.periodo}{base.fonte === 'estimado' ? ' · estimado' : ''}</span>
                  <div className="font-mono" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#3f3f46', marginTop: 3 }}>
                    <span>{base.pessoas.toLocaleString('pt-BR')} pessoas</span>
                    <span>ticket {base.ticket != null ? formatR$(base.ticket) : '—'}</span>
                    <span>custo/pessoa {base.custoPessoa != null ? formatR$(base.custoPessoa) : '—'}</span>
                    <span style={{ color: statusCmv(base.cmv ?? NaN).cor }}>CMV real {base.cmv != null ? formatPct(base.cmv) : '—'}</span>
                  </div>
                </div>
              )}
              {multiplicador > 1 && (
                <div className="font-mono" style={{ fontSize: 12, color: '#71717a', marginTop: 8 }}>
                  {multiplicador.toLocaleString('pt-BR')} pessoas → faturamento {formatR$(precoPessoa * multiplicador)} · custo {formatR$(custoPessoa * multiplicador)} · margem {formatR$(margemPessoa * multiplicador)}
                </div>
              )}
              {semFichaNoPacote > 0 && <div style={{ ...avisoBox, marginTop: 10, marginBottom: 0 }}>{semFichaNoPacote} item(ns) sem ficha técnica estão com custo R$ 0 — o CMV está subestimado.</div>}
            </div>

            {/* Preço */}
            <div style={card}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => setModoPreco('fixo')} style={{ ...tab, ...(modoPreco === 'fixo' ? tabAtiva : {}) }}>Preço por pessoa</button>
                <button onClick={() => setModoPreco('desconto')} style={{ ...tab, ...(modoPreco === 'desconto' ? tabAtiva : {}) }}>% de desconto sobre o cardápio</button>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  {modoPreco === 'fixo' ? (
                    <><label style={label}>Preço por pessoa (R$)</label><input value={precoFixo} onChange={(e) => setPrecoFixo(e.target.value)} placeholder="ex: 99,90" inputMode="decimal" style={inputBig} /></>
                  ) : (
                    <><label style={label}>Desconto sobre o cardápio (%)</label><input value={percDesconto} onChange={(e) => setPercDesconto(e.target.value)} placeholder="ex: 20" inputMode="decimal" style={inputBig} /></>
                  )}
                </div>
                <div style={{ width: 150 }}>
                  <label style={label}><Users size={12} style={{ verticalAlign: -2 }} /> Projetar para (pessoas)</label>
                  <input value={pessoas} onChange={(e) => setPessoas(e.target.value)} inputMode="decimal" style={inputBig} />
                </div>
              </div>
            </div>

            {/* Consumo por categoria */}
            {carrinho.length > 0 && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ ...tituloCard, marginBottom: 0 }}>Consumo por pessoa, por categoria</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: '#9ca3af' }}>Referência:</span>
                    <select value={refSel} onChange={(e) => setRefSel(e.target.value)} style={{ ...selectBox, width: 'auto', maxWidth: 230, marginBottom: 0, fontSize: 12 }}>
                      {mediaGeral && <option value="__media__">Média de todos os pacotes ({mediaGeral.pessoas.toLocaleString('pt-BR')} pes.)</option>}
                      {opcoes.filter((o) => o.pessoas > 0).map((o) => <option key={o.chave} value={o.chave}>{o.nome} ({o.pessoas.toLocaleString('pt-BR')} pes.)</option>)}
                    </select>
                    <button onClick={aplicarReferencia} disabled={!referencia} style={{ ...btnPreto, opacity: referencia ? 1 : 0.4 }}>Aplicar</button>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: '#9ca3af', fontSize: 10.5, textTransform: 'uppercase', textAlign: 'right' }}>
                      <th style={{ ...th, textAlign: 'left' }}>Categoria</th><th style={th}>Itens</th><th style={th}>Por pessoa</th><th style={th}>Referência</th><th style={th}>Custo/pessoa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriasCarrinho.map((c) => (
                      <tr key={c.categoria} style={{ borderTop: '1px solid #F0F0F0', textAlign: 'right' }}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{c.categoria}</td>
                        <td style={td}>{c.itens}</td>
                        <td style={{ ...td, width: 110 }}>
                          <input value={catTexto[c.categoria] ?? fmt2(c.qtd)} inputMode="decimal"
                            onChange={(e) => setCatTexto((t) => ({ ...t, [c.categoria]: e.target.value }))}
                            onBlur={(e) => { const v = num(e.target.value, NaN); if (isFinite(v) && v >= 0) definirCategoria(c.categoria, v); setCatTexto((t) => { const n = { ...t }; delete n[c.categoria]; return n }) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            style={{ ...inputMini, textAlign: 'right' }} />
                        </td>
                        <td className="font-mono" style={{ ...td, color: '#9ca3af' }}>{c.ref != null ? fmt2(c.ref) : '—'}</td>
                        <td className="font-mono" style={td}>{formatR$(c.custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 6, lineHeight: 1.5 }}>
                  Digite quantos itens daquela categoria cada pessoa consome (ex.: 6 espetos) e aperte Enter — o total é distribuído entre os itens do pacote na mesma proporção.
                  "Aplicar" usa o consumo real por pessoa da referência em todas as categorias.
                </div>
              </div>
            )}

            {/* Itens do pacote */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ ...tituloCard, marginBottom: 0 }}>Itens do pacote · por pessoa ({carrinho.length})</div>
                {carrinho.length > 0 && <button onClick={limparPacote} style={{ ...btnLink, color: '#8C1414' }}>limpar tudo</button>}
              </div>
              {aviso && <div style={avisoBox}>{aviso}</div>}
              {carrinho.length === 0 ? (
                <div style={{ padding: '22px 8px', textAlign: 'center', color: '#9ca3af', fontSize: 13, border: '1px dashed #E8E8E2', borderRadius: 10 }}>
                  Carregue um pacote real, um cardápio fixo ou monte do zero
                </div>
              ) : (
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                      <tr style={{ color: '#9ca3af', fontSize: 10.5, textTransform: 'uppercase', textAlign: 'right' }}>
                        <th style={{ ...th, textAlign: 'left' }}>Produto</th><th style={th}>Qtd/pessoa</th><th style={th}>Custo un.</th><th style={th}>Cardápio un.</th><th style={th}>Custo/pessoa</th><th style={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrinhoOrdenado.map((i, idx) => {
                        const novaCat = idx === 0 || carrinhoOrdenado[idx - 1].categoria !== i.categoria
                        return [
                          novaCat ? <tr key={'c' + i.categoria}><td colSpan={6} style={{ padding: '8px 6px 2px', fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{i.categoria}</td></tr> : null,
                          <tr key={i.key} style={{ borderTop: '1px solid #F4F4F0', textAlign: 'right', opacity: i.qtd === 0 ? 0.5 : 1 }}>
                            <td style={{ ...td, textAlign: 'left', maxWidth: 230 }}>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={i.produto}>{i.produto}</div>
                              {i.semFicha && i.custoTexto === undefined && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8C1414' }}>SEM FICHA</span>}
                            </td>
                            <td style={{ ...td, width: 86 }}><input value={i.qtdTexto ?? fmt2(i.qtd)} onChange={(e) => definirQtd(i.key, e.target.value)} inputMode="decimal" style={{ ...inputMini, textAlign: 'right' }} /></td>
                            <td style={{ ...td, width: 86 }}><input value={i.custoTexto ?? String(i.custo).replace('.', ',')} onChange={(e) => definirCusto(i.key, e.target.value)} inputMode="decimal" style={{ ...inputMini, textAlign: 'right' }} /></td>
                            <td style={{ ...td, width: 86 }}><input value={i.precoTexto ?? String(i.preco).replace('.', ',')} onChange={(e) => definirPreco(i.key, e.target.value)} inputMode="decimal" style={{ ...inputMini, textAlign: 'right' }} /></td>
                            <td className="font-mono" style={td}>{formatR$(i.custo * i.qtd)}</td>
                            <td style={{ ...td, width: 78 }}>
                              <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <button onClick={() => alterarQtd(i.key, -0.5)} style={btnCirc}><Minus size={11} /></button>
                                <button onClick={() => alterarQtd(i.key, 0.5)} style={btnCirc}><Plus size={11} /></button>
                                <button onClick={() => removerItem(i.key)} style={{ ...btnCirc, color: '#b3261e' }}><Trash2 size={11} /></button>
                              </div>
                            </td>
                          </tr>,
                        ]
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={salvarCenario} disabled={!temItens}
                style={{ width: '100%', marginTop: 12, padding: '10px 12px', borderRadius: 10, border: 'none', background: temItens ? '#0D0D0D' : '#E8E8E2', color: temItens ? '#fff' : '#9ca3af', fontSize: 13.5, fontWeight: 600, cursor: temItens ? 'pointer' : 'not-allowed' }}>
                <Save size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Salvar cenário para comparar
              </button>
            </div>
          </div>
        </div>

        {cenarios.length > 0 && (
          <div style={{ ...card, marginTop: 18 }}>
            <div style={{ ...tituloCard, display: 'flex', alignItems: 'center', gap: 6 }}><ChefHat size={14} /> Cenários salvos (por pessoa)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={th}>Promoção</th><th style={th}>Itens</th><th style={th}>Itens/pessoa</th><th style={th}>Preço</th><th style={th}>Custo</th><th style={th}>% CMV</th><th style={th}>Margem</th><th style={th}>Base</th><th style={th}>Status</th><th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {cenarios.map((c) => (
                    <tr key={c.id} style={{ borderTop: '1px solid #F0F0F0' }}>
                      <td style={{ ...td, fontWeight: 600 }}>{c.nome}</td>
                      <td style={td}>{c.itens}</td>
                      <td className="font-mono" style={td}>{fmt2(c.itensPessoa)}</td>
                      <td className="font-mono" style={td}>{formatR$(c.precoPessoa)}</td>
                      <td className="font-mono" style={td}>{formatR$(c.custoPessoa)}</td>
                      <td className="font-mono" style={td}>{formatPct(c.cmvPct)}</td>
                      <td className="font-mono" style={td}>{formatR$(c.mcRS)}</td>
                      <td style={{ ...td, color: '#71717a', fontSize: 12 }}>{c.base || 'manual'}</td>
                      <td style={td}><span style={{ padding: '3px 9px', borderRadius: 999, background: c.status.bg, color: c.status.cor, border: `1px solid ${c.status.border}`, fontSize: 11, fontWeight: 700 }}>{c.status.label}</span></td>
                      <td style={td}><button onClick={() => setCenarios((prev) => prev.filter((x) => x.id !== c.id))} style={{ ...btnCirc, color: '#b3261e' }}><X size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Metrica({ label: l, valor, destaque, cor, sub }) {
  return (
    <div style={{ padding: '10px 12px', background: destaque ? '#FAFAF8' : 'transparent', borderRadius: 10, border: destaque ? '1px solid #E8E8E2' : '1px solid transparent', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{l}</div>
      <div className="font-mono" style={{ fontSize: destaque ? 18 : 15, fontWeight: 700, color: cor || '#0D0D0D', whiteSpace: 'nowrap' }}>{valor}</div>
      {sub && <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

const card = { background: '#fff', border: '1px solid #E8E8E2', borderRadius: 14, padding: 16 }
const tituloCard = { fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#71717a', marginBottom: 10, textTransform: 'uppercase' }
const avisoBox = { fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.45 }
const btnPreto = { padding: '7px 12px', borderRadius: 8, border: 'none', background: '#0D0D0D', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
const btnLink = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 6px', border: 'none', background: 'none', color: '#3f3f46', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnCirc = { width: 22, height: 22, borderRadius: 6, border: '1px solid #E8E8E2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }
const tab = { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #E8E8E2', background: '#fff', color: '#71717a', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const tabAtiva = { background: '#0D0D0D', color: '#fff', border: '1px solid #0D0D0D' }
const tag = { fontSize: 9.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.3 }
const tagOk = { background: '#f0f4e0', color: '#5f6b12' }
const tagWarn = { background: '#FFFBEB', color: '#B45309' }
const label = { display: 'block', fontSize: 11.5, color: '#9ca3af', marginBottom: 4 }
const inputMini = { width: '100%', padding: '5px 7px', borderRadius: 6, border: '1px solid #E8E8E2', fontSize: 12.5, outline: 'none', fontFamily: "'DM Mono', ui-monospace, monospace" }
const inputBusca = { width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid #E8E8E2', fontSize: 13.5, outline: 'none' }
const selectBox = { width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #E8E8E2', fontSize: 13, marginBottom: 10, color: '#3f3f46', background: '#fff' }
const inputBig = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E8E2', fontSize: 16, fontWeight: 600, outline: 'none' }
const th = { padding: '6px 8px', fontWeight: 600 }
const td = { padding: '6px 8px' }
