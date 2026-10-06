'use client'

// Simulador de CMV de promoções — v2 (out/2026)
//
// O que mudou:
//  - Catálogo vem do mesmo carregamento do dashboard (/api/promocoes →
//    aba Ficha_Tecnica ao vivo). Não chama mais o Apps Script direto.
//  - Busca de produtos agora acompanha o catálogo ao vivo (antes ficava
//    presa no snapshot de Mai/Jun até digitar alguma coisa).
//  - "Histórico" usa os dados do HUB: consumo por pessoa = usos ÷ pessoas
//    confirmadas no pacote (antes dividia pelo item mais usado, o que
//    subestimava o consumo e o CMV).
//  - "Aplicar consumo real" ajusta as quantidades de qualquer pacote
//    (inclusive cardápios fixos) com o consumo médio de uma promoção real.
//  - Quantidade pode ser 0; nomes casam ignorando acento e espaço duplo.
//  - Faixas de CMV iguais às do dashboard (lib/promocoesConfig.js).

import { useState, useMemo, useEffect } from 'react'
import { Plus, Minus, Trash2, Search, Save, X, Flame, TrendingDown, TrendingUp, ChefHat, History, PenLine, BookOpen, Check, Users } from 'lucide-react'
import PRODUTOS_FALLBACK from '@/lib/catalogoFallback.json'
import { CMV_META, CMV_CRITICO } from '@/lib/promocoesConfig'
import { chaveProduto, agruparConsumo, agruparPacotes, ultimoDiaDoMes } from '../promocoes/data/modelo'

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

export default function SimuladorPromocoesClientApp({ dados = null, mostrarBarraVoltar = false }) {
  // ---------- Catálogo (ficha técnica ao vivo, vinda do dashboard) ----------
  const catalogo = useMemo(() => {
    const lista = dados?.catalogo?.length ? dados.catalogo : PRODUTOS_FALLBACK
    return lista
      .map((p) => ({ produto: String(p.produto || '').trim(), categoria: String(p.categoria || 'OUTROS').trim() || 'OUTROS', custo: +p.custo || 0, preco: +p.preco || 0 }))
      .filter((p) => p.produto)
  }, [dados])
  const origemCatalogo = dados?.catalogo?.length ? (dados.fichaAoVivo ? 'ao-vivo' : 'cache') : 'snapshot'
  const catalogoPorChave = useMemo(() => new Map(catalogo.map((p) => [chaveProduto(p.produto), p])), [catalogo])

  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('TODAS')
  const [carrinho, setCarrinho] = useState([])
  const [nomePromo, setNomePromo] = useState('')
  const [modoPreco, setModoPreco] = useState('fixo')
  const [precoFixo, setPrecoFixo] = useState('')
  const [percDesconto, setPercDesconto] = useState('')
  const [cenarios, setCenarios] = useState([])
  const [pessoas, setPessoas] = useState('1')
  const [modoOrigem, setModoOrigem] = useState('manual')
  const [aviso, setAviso] = useState(null)
  const [base, setBase] = useState(null) // promoção real usada como referência de consumo

  const CATEGORIAS = useMemo(() => ['TODAS', ...Array.from(new Set(catalogo.map((p) => p.categoria))).sort()], [catalogo])

  const produtosFiltrados = useMemo(() => {
    const termo = normalizar(busca)
    return catalogo.filter((p) => (termo === '' || normalizar(p.produto).includes(termo)) && (categoria === 'TODAS' || p.categoria === categoria)).slice(0, 80)
  }, [catalogo, busca, categoria])

  // ---------- Histórico (dados do HUB) ----------
  // Promoção (Promoções Utilizadas) = o que foi consumido.
  // Pacote (relatório de Pacotes) = quantas pessoas e quanto pagaram.
  // Consumo por pessoa = itens da promoção ÷ pessoas do pacote escolhido.
  const temHistorico = !!dados?.pacotes
  const [histModo, setHistModo] = useState('mes') // 'mes' | 'dia'
  const [histMes, setHistMes] = useState('3m')
  const [histDia, setHistDia] = useState('')
  const [histUnidade, setHistUnidade] = useState('')
  const [buscaPromo, setBuscaPromo] = useState('')
  const [buscaPacote, setBuscaPacote] = useState('')
  const [promoSel, setPromoSel] = useState(null)
  const [pacoteSel, setPacoteSel] = useState(null)
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

  const consumoHist = filtroHist.data ? dados?.consumoDia || [] : dados?.consumoMes || []
  const periodoLabel = filtroHist.data ? dataBR(histDia) : histMes === '3m' ? ultimos3.map(mesLabel).join(', ') : mesLabel(histMes)
  const casaLabel = histUnidade ? dados?.unidades.find((u) => u.id === histUnidade)?.label : 'Rede'

  const promosHist = useMemo(() => {
    if (!temHistorico) return []
    return [...agruparConsumo(consumoHist, filtroHist, (c) => c.chave).entries()]
      .map(([chave, a]) => ({ chave, nome: dados.nomes.get(chave) || chave, ...a }))
      .sort((a, b) => b.custo - a.custo)
  }, [dados, consumoHist, filtroHist, temHistorico])

  const pacotesHist = useMemo(() => {
    if (!temHistorico) return []
    return [...agruparPacotes(dados.pacotes, filtroHist, (p) => p.chave).entries()]
      .map(([chave, a]) => ({ chave, nome: dados.nomes.get(chave) || chave, ...a }))
      .filter((p) => p.pessoas > 0)
      .sort((a, b) => b.pessoas - a.pessoas)
  }, [dados, filtroHist, temHistorico])

  // Ao escolher a promoção, já sugere o pacote de mesmo nome (se existir)
  useEffect(() => {
    if (!promoSel) return
    if (pacotesHist.some((p) => p.chave === promoSel)) setPacoteSel(promoSel)
  }, [promoSel])

  const promoEscolhida = promosHist.find((p) => p.chave === promoSel) || null
  const pacoteEscolhido = pacotesHist.find((p) => p.chave === pacoteSel) || null
  const pessoasBase = pacoteEscolhido ? pacoteEscolhido.pessoas : num(pessoasManual, 0)

  function itensDaPromo(chave, filtro = filtroHist, consumo = consumoHist) {
    const mapa = new Map()
    for (const c of consumo) {
      if (c.chave !== chave || !noFiltro(c, filtro)) continue
      const k = chaveProduto(c.produto)
      const x = mapa.get(k) || { produto: c.produto, usos: 0 }
      x.usos += c.usos
      mapa.set(k, x)
    }
    return mapa
  }

  function montarBase(promo, pacote, nPessoas) {
    return {
      nome: promo.nome,
      pacoteNome: pacote?.nome || null,
      pessoas: nPessoas,
      ticket: pacote?.ticket ?? null,
      receita: pacote?.fat ?? null,
      custoPessoa: nPessoas > 0 ? promo.custo / nPessoas : null,
      cmv: pacote?.fat ? promo.custo / pacote.fat : null,
      periodo: periodoLabel,
      casa: casaLabel,
    }
  }

  function carregarDoHistorico() {
    if (!promoEscolhida) { setAviso('Escolha a promoção (o que foi consumido).'); return }
    if (!(pessoasBase > 0)) { setAviso('Escolha o pacote de onde vem o nº de pessoas, ou digite o nº de pessoas.'); return }
    const itens = itensDaPromo(promoEscolhida.chave)
    let semFicha = 0
    const novo = [...itens.values()].map((x) => {
      const it = itemDoCatalogo(catalogoPorChave, x.produto)
      if (it.semFicha) semFicha++
      return { ...it, qtd: +(x.usos / pessoasBase).toFixed(3) }
    }).sort((a, b) => b.qtd * b.custo - a.qtd * a.custo)
    setCarrinho(novo)
    setNomePromo(promoEscolhida.nome)
    setPessoas('1')
    setModoPreco('fixo')
    if (pacoteEscolhido?.ticket) setPrecoFixo(String(pacoteEscolhido.ticket.toFixed(2)).replace('.', ','))
    setBase(montarBase(promoEscolhida, pacoteEscolhido, pessoasBase))
    setAviso(semFicha ? `${semFicha} produto(s) sem ficha técnica entraram com custo R$ 0 — ajuste na lista ou cadastre na ficha.` : null)
  }

  // Ajusta as quantidades do pacote montado pelo consumo real da promoção escolhida no Histórico
  function aplicarConsumoReal() {
    if (!promoEscolhida || !(pessoasBase > 0)) return
    const itens = itensDaPromo(promoEscolhida.chave)
    setCarrinho((prev) => prev.map((i) => {
      const x = itens.get(i.key)
      return { ...i, qtd: x ? +(x.usos / pessoasBase).toFixed(3) : 0, qtdTexto: undefined }
    }))
    const fora = [...itens.keys()].filter((k) => !carrinho.some((i) => i.key === k)).length
    setBase(montarBase(promoEscolhida, pacoteEscolhido, pessoasBase))
    setAviso(`Quantidades = consumo de "${promoEscolhida.nome}" ÷ ${pessoasBase.toLocaleString('pt-BR')} pessoas (${casaLabel}, ${periodoLabel}). Itens sem consumo ficaram com 0.` +
      (fora ? ` ${fora} item(ns) consumidos na promoção não estão neste pacote.` : ''))
  }

  // ---------- Carrinho ----------
  function adicionarItem(produto) {
    const key = chaveProduto(produto.produto)
    setCarrinho((prev) => {
      if (prev.find((i) => i.key === key)) return prev.map((i) => (i.key === key ? { ...i, qtd: +(i.qtd + 1).toFixed(3), qtdTexto: undefined } : i))
      return [...prev, { ...itemDoCatalogo(catalogoPorChave, produto.produto) }]
    })
  }
  const atualizar = (key, f) => setCarrinho((prev) => prev.map((i) => (i.key === key ? f(i) : i)))
  const alterarQtd = (key, d) => atualizar(key, (i) => ({ ...i, qtd: Math.max(0, +(i.qtd + d).toFixed(3)), qtdTexto: undefined }))
  const definirQtd = (key, v) => atualizar(key, (i) => ({ ...i, qtdTexto: v, qtd: Math.max(0, num(v, i.qtd)) }))
  const definirCusto = (key, v) => atualizar(key, (i) => ({ ...i, custoTexto: v, custo: num(v, i.custo) }))
  const definirPreco = (key, v) => atualizar(key, (i) => ({ ...i, precoTexto: v, preco: num(v, i.preco) }))
  const removerItem = (key) => setCarrinho((prev) => prev.filter((i) => i.key !== key))
  function limparPacote() { setCarrinho([]); setNomePromo(''); setBase(null); setAviso(null); setPrecoFixo(''); setPessoas('1') }

  // ---------- Cardápios fixos ----------
  const CHAVE = CHAVE_CARDAPIOS_CUSTOM
  const [cardapiosCustom, setCardapiosCustom] = useState([])
  const [criandoCardapio, setCriandoCardapio] = useState(false)
  const [novoCardapioNome, setNovoCardapioNome] = useState('')
  const [novoCardapioPreco, setNovoCardapioPreco] = useState('')
  const [novoCardapioItens, setNovoCardapioItens] = useState([])
  const [buscaCardapio, setBuscaCardapio] = useState('')

  useEffect(() => {
    try { const s = window.localStorage.getItem(CHAVE); if (s) setCardapiosCustom(JSON.parse(s)) } catch (e) { /* sem persistência */ }
  }, [])
  function salvarCardapiosCustom(lista) {
    setCardapiosCustom(lista)
    try { window.localStorage.setItem(CHAVE, JSON.stringify(lista)) } catch (e) { /* ignora */ }
  }

  function carregarCardapio(cardapio) {
    let semFicha = 0
    const novo = cardapio.itens.map((nome) => {
      const it = itemDoCatalogo(catalogoPorChave, nome)
      if (it.semFicha) semFicha++
      return it
    })
    setCarrinho(novo)
    setNomePromo(cardapio.nome)
    setPessoas('1')
    setBase(null)
    if (cardapio.precoSugerido != null) { setModoPreco('fixo'); setPrecoFixo(String(cardapio.precoSugerido).replace('.', ',')) }

    // Se o cardápio tem promoção/pacote real equivalente, já aplica o consumo médio (filtro atual do Histórico)
    const kws = [].concat(cardapio.base || [])
    const bate = (chave) => kws.some((kw) => chave.includes(kw))
    const promoRef = kws.length ? promosHist.filter((p) => bate(p.chave)).sort((a, b) => b.usos - a.usos)[0] : null
    const pacoteRef = kws.length ? pacotesHist.filter((p) => bate(p.chave)).sort((a, b) => b.pessoas - a.pessoas)[0] : null
    if (promoRef && pacoteRef) {
      const itens = itensDaPromo(promoRef.chave)
      setCarrinho(novo.map((i) => { const x = itens.get(i.key); return { ...i, qtd: x ? +(x.usos / pacoteRef.pessoas).toFixed(3) : 0 } }))
      setBase(montarBase(promoRef, pacoteRef, pacoteRef.pessoas))
      setAviso(`Quantidades = consumo de "${promoRef.nome}" ÷ ${pacoteRef.pessoas.toLocaleString('pt-BR')} pessoas de "${pacoteRef.nome}" (${casaLabel}, ${periodoLabel}).` + (semFicha ? ` ${semFicha} item(ns) sem ficha técnica (custo R$ 0).` : ''))
    } else {
      setAviso('Quantidade entrou como 1 de cada item por pessoa — isso é o PIOR caso (ninguém come tudo). Ajuste as quantidades ou aplique o consumo real de uma promoção (aba Promoção real).' + (semFicha ? ` ${semFicha} item(ns) sem ficha técnica (custo R$ 0).` : ''))
    }
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
  const custoTotal = custoPessoa * multiplicador
  const valorCardapio = cardapioPessoa * multiplicador
  const precoPessoa = modoPreco === 'fixo' ? num(precoFixo, 0) : cardapioPessoa * (1 - num(percDesconto, 0) / 100)
  const precoPromo = precoPessoa * multiplicador
  const descontoRS = valorCardapio - precoPromo
  const descontoPct = valorCardapio > 0 ? descontoRS / valorCardapio : 0
  const cmvPct = precoPromo > 0 ? custoTotal / precoPromo : Infinity
  const mcRS = precoPromo - custoTotal
  const mcPct = precoPromo > 0 ? mcRS / precoPromo : 0
  const status = statusCmv(cmvPct)
  const precoMaxMeta = custoPessoa > 0 ? custoPessoa / CMV_META : null // preço mínimo pra bater a meta
  const semFichaNoPacote = carrinho.filter((i) => i.semFicha && i.custoTexto === undefined).length
  const temItens = carrinho.length > 0 && precoPromo > 0

  function salvarCenario() {
    if (!temItens) return
    setCenarios((prev) => [...prev, { id: Date.now(), nome: nomePromo || 'Sem nome', itens: carrinho.length, precoPessoa, custoPessoa, cmvPct, mcRS: precoPessoa - custoPessoa, status, base: base?.nome || null }])
  }

  const embutido = !mostrarBarraVoltar

  return (
    <div className="sim-promo" style={{ background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif", color: '#0D0D0D', minHeight: embutido ? undefined : '100vh' }}>
      <style>{`
        .sim-promo * { box-sizing: border-box; }
        .sim-promo input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .sim-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 20px; }
        @media (max-width: 1024px) { .sim-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1240, width: '100%', margin: '0 auto', padding: '22px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#8C1414', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Flame size={20} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Simulador de CMV de promoção</div>
            <div style={{ fontSize: 12.5, color: '#71717a' }}>Valores por pessoa · monte o pacote, use o consumo real e teste o preço antes de lançar</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: origemCatalogo === 'ao-vivo' ? '#97A624' : origemCatalogo === 'cache' ? '#D9B504' : '#8C1414' }} />
            {origemCatalogo === 'ao-vivo' ? 'ficha técnica ao vivo' : origemCatalogo === 'cache' ? 'ficha técnica (cópia do cache)' : 'snapshot Mai/Jun — ficha indisponível'} · {catalogo.length} produtos
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { id: 'manual', icon: PenLine, label: 'Montar do zero' },
            { id: 'historico', icon: History, label: 'Promoção real' },
            { id: 'cardapios', icon: BookOpen, label: 'Cardápios fixos' },
          ].map(({ id, icon: Icon, label: l }) => (
            <button key={id} onClick={() => setModoOrigem(id)} style={{ ...tab, flex: '0 0 auto', padding: '8px 16px', ...(modoOrigem === id ? tabAtiva : {}) }}>
              <Icon size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> {l}
            </button>
          ))}
        </div>

        <div className="sim-grid">
          {/* ───────── Coluna esquerda ───────── */}
          {modoOrigem === 'manual' && (
            <div style={card}>
              <div style={tituloCard}>Catálogo</div>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." style={inputBusca} />
              </div>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={selectBox}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ maxHeight: 520, overflowY: 'auto', borderTop: '1px solid #F0F0F0' }}>
                {produtosFiltrados.length === 0 && <div style={{ padding: '20px 4px', color: '#9ca3af', fontSize: 13 }}>Nenhum produto encontrado.</div>}
                {produtosFiltrados.map((p) => (
                  <div key={p.produto} onClick={() => adicionarItem(p)} className="hover:bg-zinc-50"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid #F4F4F0', cursor: 'pointer' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.produto}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.categoria}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div className="font-mono" style={{ fontSize: 12, textAlign: 'right', color: '#3f3f46' }}>
                        <div>custo {formatR$(p.custo)}</div>
                        <div style={{ color: '#9ca3af' }}>cardápio {formatR$(p.preco)}</div>
                      </div>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} color="#fff" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modoOrigem === 'historico' && (
            <div style={card}>
              <div style={tituloCard}>Promoção real — consumo por pessoa</div>
              {!temHistorico ? (
                <div style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>Os dados do dashboard ainda não carregaram. Abra a Visão geral e volte aqui.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  {histModo === 'dia' && !histDia && <div style={avisoBox}>Escolha o dia.</div>}
                  {histModo === 'dia' && histDia && dados.status?.diarioAte && histDia > dados.status.diarioAte && (
                    <div style={avisoBox}>O consumo dia a dia está processado até {dataBR(dados.status.diarioAte)} — esse dia ainda não tem itens.</div>
                  )}

                  <div style={{ fontSize: 11, fontWeight: 700, color: '#3f3f46', margin: '4px 0 6px' }}>1 · Promoção (o que foi consumido)</div>
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                    <input value={buscaPromo} onChange={(e) => setBuscaPromo(e.target.value)} placeholder="Buscar promoção..." style={inputBusca} />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #F0F0F0', borderRadius: 8, marginBottom: 12 }}>
                    {promosHist.filter((p) => !buscaPromo || normalizar(p.nome).includes(normalizar(buscaPromo))).map((p) => (
                      <div key={p.chave} onClick={() => setPromoSel(p.chave)}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderBottom: '1px solid #F4F4F0', cursor: 'pointer', background: promoSel === p.chave ? '#f0f4e0' : 'transparent' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                        <span className="font-mono" style={{ fontSize: 11.5, color: '#71717a', flexShrink: 0 }}>{p.usos.toLocaleString('pt-BR')} itens · custo {formatR$(p.custo)}</span>
                      </div>
                    ))}
                    {promosHist.length === 0 && <div style={{ padding: 12, color: '#9ca3af', fontSize: 12.5 }}>Nenhuma promoção nesse filtro.</div>}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: '#3f3f46', margin: '4px 0 6px' }}>2 · Pacote (de onde vem o nº de pessoas e o ticket)</div>
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                    <input value={buscaPacote} onChange={(e) => setBuscaPacote(e.target.value)} placeholder="Buscar pacote..." style={inputBusca} />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #F0F0F0', borderRadius: 8, marginBottom: 8 }}>
                    {pacotesHist.filter((p) => !buscaPacote || normalizar(p.nome).includes(normalizar(buscaPacote))).map((p) => (
                      <div key={p.chave} onClick={() => { setPacoteSel(p.chave === pacoteSel ? null : p.chave); setPessoasManual('') }}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderBottom: '1px solid #F4F4F0', cursor: 'pointer', background: pacoteSel === p.chave ? '#f0f4e0' : 'transparent' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                        <span className="font-mono" style={{ fontSize: 11.5, color: '#71717a', flexShrink: 0 }}>{p.pessoas.toLocaleString('pt-BR')} pessoas · ticket {formatR$(p.ticket)}</span>
                      </div>
                    ))}
                    {pacotesHist.length === 0 && <div style={{ padding: 12, color: '#9ca3af', fontSize: 12.5 }}>Nenhum pacote com pessoas nesse filtro.</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#71717a' }}>ou nº de pessoas:</span>
                    <input value={pessoasManual} onChange={(e) => { setPessoasManual(e.target.value); setPacoteSel(null) }} placeholder="ex: 120" inputMode="decimal" style={{ ...inputMini, width: 90 }} />
                  </div>

                  <button onClick={carregarDoHistorico} disabled={!promoEscolhida || !(pessoasBase > 0)}
                    style={{ ...btnPreto, width: '100%', padding: '10px 12px', opacity: !promoEscolhida || !(pessoasBase > 0) ? 0.4 : 1 }}>
                    {promoEscolhida && pessoasBase > 0
                      ? `Carregar "${promoEscolhida.nome}" ÷ ${pessoasBase.toLocaleString('pt-BR')} pessoas →`
                      : 'Escolha a promoção e as pessoas'}
                  </button>
                </>
              )}
            </div>
          )}

          {modoOrigem === 'cardapios' && (
            <div style={card}>
              <div style={tituloCard}>Cardápios fixos</div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 12, lineHeight: 1.5 }}>
                Os à vontade com promoção real equivalente já carregam com o consumo médio por pessoa dela. Os corporativos entram com 1 de cada item (pior caso) — ajuste ou aplique o consumo de uma promoção real.
              </div>
              {!criandoCardapio ? (
                <>
                  <div style={{ maxHeight: 440, overflowY: 'auto', borderTop: '1px solid #F0F0F0', marginBottom: 12 }}>
                    {[
                      { titulo: 'À vontade / Rodízio', lista: CARDAPIOS_PADRAO },
                      { titulo: 'Corporativo — eventos fechados', lista: CARDAPIOS_CORPORATIVOS },
                      ...(cardapiosCustom.length ? [{ titulo: 'Cadastrados por vocês', lista: cardapiosCustom }] : []),
                    ].map((grupo) => (
                      <div key={grupo.titulo}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3, padding: '10px 4px 4px' }}>{grupo.titulo}</div>
                        {grupo.lista.map((c) => (
                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 4px', borderBottom: '1px solid #F4F4F0' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.nome}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                {c.itens.length} itens{c.precoSugerido != null ? ` · ${formatR$(c.precoSugerido)}/pessoa` : ''}{c.base ? ' · consumo real' : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                  <input value={novoCardapioPreco} onChange={(e) => setNovoCardapioPreco(e.target.value)} placeholder="Preço por pessoa (opcional, ex: 89,90)" inputMode="decimal" style={{ ...inputBusca, paddingLeft: 10, marginBottom: 10 }} />
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                    <input value={buscaCardapio} onChange={(e) => setBuscaCardapio(e.target.value)} placeholder="Buscar produto pra adicionar..." style={inputBusca} />
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{novoCardapioItens.length} item(ns) selecionado(s)</div>
                  <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #F0F0F0', borderRadius: 8, marginBottom: 12 }}>
                    {catalogo.filter((p) => normalizar(p.produto).includes(normalizar(buscaCardapio))).slice(0, 80).map((p) => {
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
                    <button onClick={() => { setCriandoCardapio(false); setNovoCardapioNome(''); setNovoCardapioPreco(''); setNovoCardapioItens([]); setBuscaCardapio('') }}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E8E8E2', background: '#fff', color: '#3f3f46', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={salvarNovoCardapio} disabled={!novoCardapioNome.trim() || novoCardapioItens.length === 0}
                      style={{ flex: 1, ...btnPreto, padding: '9px 12px', opacity: !novoCardapioNome.trim() || novoCardapioItens.length === 0 ? 0.4 : 1 }}>
                      <Save size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Salvar cardápio
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────── Coluna direita: pacote + resultado ───────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ ...tituloCard, marginBottom: 0 }}>Pacote / promoção · por pessoa</div>
                {carrinho.length > 0 && <button onClick={limparPacote} style={{ fontSize: 11, color: '#8C1414', background: 'none', border: 'none', cursor: 'pointer' }}>limpar</button>}
              </div>
              <input value={nomePromo} onChange={(e) => setNomePromo(e.target.value)} placeholder="Nome da promoção" style={{ ...inputBusca, paddingLeft: 10, marginBottom: 10 }} />

              {aviso && <div style={avisoBox}>{aviso}</div>}

              {carrinho.length === 0 ? (
                <div style={{ padding: '24px 8px', textAlign: 'center', color: '#9ca3af', fontSize: 13, border: '1px dashed #E8E8E2', borderRadius: 10 }}>
                  Monte do zero, carregue uma promoção real ou um cardápio fixo
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 0.75fr 0.8fr 0.75fr auto', gap: 6, padding: '0 4px', fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    <div>Produto</div><div>Qtd/pessoa</div><div>Custo un.</div><div>Cardápio un.</div><div style={{ textAlign: 'right' }}>Custo/pessoa</div><div></div>
                  </div>
                  <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {carrinho.map((i) => {
                      const st = statusCmv(i.preco > 0 ? i.custo / i.preco : Infinity)
                      return (
                        <div key={i.key} style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 0.75fr 0.8fr 0.75fr auto', gap: 6, alignItems: 'center', padding: '6px 8px', background: i.qtd === 0 ? '#fff' : '#FAFAF8', border: i.qtd === 0 ? '1px dashed #E8E8E2' : '1px solid transparent', borderRadius: 8, opacity: i.qtd === 0 ? 0.6 : 1 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={i.produto}>{i.produto}</div>
                            {i.semFicha && i.custoTexto === undefined
                              ? <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8C1414' }}>SEM FICHA TÉCNICA</span>
                              : <span style={{ fontSize: 9.5, fontWeight: 700, color: st.cor }}>CMV item {formatPct(i.preco > 0 ? i.custo / i.preco : NaN)}</span>}
                          </div>
                          <input value={i.qtdTexto !== undefined ? i.qtdTexto : formatQtd(i.qtd)} onChange={(e) => definirQtd(i.key, e.target.value)} inputMode="decimal" style={inputMini} />
                          <input value={i.custoTexto !== undefined ? i.custoTexto : String(i.custo).replace('.', ',')} onChange={(e) => definirCusto(i.key, e.target.value)} inputMode="decimal" style={inputMini} />
                          <input value={i.precoTexto !== undefined ? i.precoTexto : String(i.preco).replace('.', ',')} onChange={(e) => definirPreco(i.key, e.target.value)} inputMode="decimal" style={inputMini} />
                          <div className="font-mono" style={{ fontSize: 12, textAlign: 'right' }}>{formatR$(i.custo * i.qtd)}</div>
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button onClick={() => alterarQtd(i.key, -1)} style={btnCirc}><Minus size={12} /></button>
                            <button onClick={() => alterarQtd(i.key, 1)} style={btnCirc}><Plus size={12} /></button>
                            <button onClick={() => removerItem(i.key)} style={{ ...btnCirc, color: '#b3261e' }}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Editar custo/preço aqui não altera a ficha técnica.</div>
                </div>
              )}

              {carrinho.length > 0 && temHistorico && (
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: '#71717a' }}>
                  <span style={{ flex: 1, minWidth: 200 }}>
                    {promoEscolhida && pessoasBase > 0
                      ? <>Consumo real: <b>{promoEscolhida.nome}</b> ÷ {pessoasBase.toLocaleString('pt-BR')} pessoas · {casaLabel} · {periodoLabel}</>
                      : 'Pra usar o consumo real, escolha promoção e pessoas na aba "Promoção real".'}
                  </span>
                  <button onClick={aplicarConsumoReal} disabled={!promoEscolhida || !(pessoasBase > 0)}
                    style={{ ...btnPreto, opacity: !promoEscolhida || !(pessoasBase > 0) ? 0.4 : 1 }}>Aplicar nas quantidades</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => setModoPreco('fixo')} style={{ ...tab, ...(modoPreco === 'fixo' ? tabAtiva : {}) }}>Preço por pessoa</button>
                <button onClick={() => setModoPreco('desconto')} style={{ ...tab, ...(modoPreco === 'desconto' ? tabAtiva : {}) }}>% de desconto s/ cardápio</button>
              </div>
              {modoPreco === 'fixo' ? (
                <div>
                  <label style={label}>Preço por pessoa (R$)</label>
                  <input value={precoFixo} onChange={(e) => setPrecoFixo(e.target.value)} placeholder="ex: 99,90" inputMode="decimal" style={inputBig} />
                </div>
              ) : (
                <div>
                  <label style={label}>Desconto sobre o valor de cardápio (%)</label>
                  <input value={percDesconto} onChange={(e) => setPercDesconto(e.target.value)} placeholder="ex: 20" inputMode="decimal" style={inputBig} />
                  <div className="font-mono" style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Cardápio {formatR$(cardapioPessoa)} → {formatR$(precoPessoa)} por pessoa</div>
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Users size={14} color="#9ca3af" />
                <label style={{ ...label, marginBottom: 0 }}>Projetar para</label>
                <input value={pessoas} onChange={(e) => setPessoas(e.target.value)} inputMode="decimal" style={{ ...inputMini, width: 80 }} />
                <span style={{ fontSize: 11.5, color: '#9ca3af' }}>pessoas (só multiplica os totais; o CMV % não muda)</span>
              </div>
            </div>

            {/* Resultado */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ ...tituloCard, marginBottom: 0 }}>Resultado</div>
                <div style={{ padding: '4px 12px', borderRadius: 999, background: status.bg, color: status.cor, border: `1px solid ${status.border}`, fontSize: 12, fontWeight: 700 }}>{status.label}</div>
              </div>
              {semFichaNoPacote > 0 && <div style={avisoBox}>{semFichaNoPacote} item(ns) sem ficha técnica estão com custo R$ 0 — o CMV está subestimado.</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <Metrica label="Custo por pessoa" valor={formatR$(custoPessoa)} />
                <Metrica label="Preço por pessoa" valor={formatR$(precoPessoa)} />
                <Metrica label="Valor de cardápio por pessoa" valor={formatR$(cardapioPessoa)} />
                <Metrica label="Desconto concedido" valor={`${formatR$(descontoRS / multiplicador)} · ${formatPct(descontoPct)}`} />
                <Metrica destaque label="% CMV" valor={formatPct(cmvPct)} cor={status.cor} />
                <Metrica destaque label="Margem por pessoa" valor={`${formatR$(precoPessoa - custoPessoa)} · ${formatPct(mcPct)}`} cor={mcRS < 0 ? '#8C1414' : undefined} />
              </div>
              {multiplicador > 1 && (
                <div className="font-mono" style={{ fontSize: 12, color: '#71717a', marginBottom: 8 }}>
                  {multiplicador.toLocaleString('pt-BR')} pessoas → faturamento {formatR$(precoPromo)} · custo {formatR$(custoTotal)} · margem {formatR$(mcRS)}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#71717a', marginBottom: 12 }}>
                {mcRS >= 0 ? <TrendingUp size={14} color="#5f6b12" /> : <TrendingDown size={14} color="#b3261e" />}
                Meta de CMV {formatPct(CMV_META)}{precoMaxMeta ? ` → preço mínimo por pessoa ${formatR$(precoMaxMeta)}` : ''}
              </div>

              {base && (
                <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E2', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Real: {base.nome}{base.pacoteNome && base.pacoteNome !== base.nome ? ` + pacote ${base.pacoteNome}` : ''}
                    <span style={{ fontWeight: 400, color: '#9ca3af' }}> · {base.casa} · {base.periodo}</span>
                  </div>
                  <div className="font-mono" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#3f3f46' }}>
                    <span>{base.pessoas.toLocaleString('pt-BR')} pessoas</span>
                    <span>ticket {base.ticket != null ? formatR$(base.ticket) : '—'}</span>
                    <span>custo/pessoa {base.custoPessoa != null ? formatR$(base.custoPessoa) : '—'}</span>
                    <span style={{ color: statusCmv(base.cmv ?? NaN).cor }}>CMV real {base.cmv != null ? formatPct(base.cmv) : '— (sem pacote)'}</span>
                  </div>
                </div>
              )}

              <button onClick={salvarCenario} disabled={!temItens}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: temItens ? '#0D0D0D' : '#E8E8E2', color: temItens ? '#fff' : '#9ca3af', fontSize: 13.5, fontWeight: 600, cursor: temItens ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Save size={15} /> Salvar cenário para comparar
              </button>
            </div>
          </div>
        </div>

        {cenarios.length > 0 && (
          <div style={{ ...card, marginTop: 20 }}>
            <div style={{ ...tituloCard, display: 'flex', alignItems: 'center', gap: 6 }}><ChefHat size={14} /> Cenários salvos (por pessoa)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    <th style={th}>Promoção</th><th style={th}>Itens</th><th style={th}>Preço</th><th style={th}>Custo</th><th style={th}>% CMV</th><th style={th}>Margem</th><th style={th}>Consumo base</th><th style={th}>Status</th><th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {cenarios.map((c) => (
                    <tr key={c.id} style={{ borderTop: '1px solid #F0F0F0' }}>
                      <td style={{ ...td, fontWeight: 600 }}>{c.nome}</td>
                      <td style={td}>{c.itens}</td>
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

function Metrica({ label: l, valor, destaque, cor }) {
  return (
    <div style={{ padding: '10px 12px', background: destaque ? '#FAFAF8' : 'transparent', borderRadius: 10, border: destaque ? '1px solid #E8E8E2' : 'none' }}>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{l}</div>
      <div className="font-mono" style={{ fontSize: destaque ? 18 : 15, fontWeight: 700, color: cor || '#0D0D0D' }}>{valor}</div>
    </div>
  )
}

const card = { background: '#fff', border: '1px solid #E8E8E2', borderRadius: 14, padding: 16 }
const tituloCard = { fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#71717a', marginBottom: 10, textTransform: 'uppercase' }
const avisoBox = { fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.45 }
const btnPreto = { padding: '7px 12px', borderRadius: 8, border: 'none', background: '#0D0D0D', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
const btnCirc = { width: 24, height: 24, borderRadius: 7, border: '1px solid #E8E8E2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const tab = { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #E8E8E2', background: '#fff', color: '#71717a', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
const tabAtiva = { background: '#0D0D0D', color: '#fff', border: '1px solid #0D0D0D' }
const label = { display: 'block', fontSize: 11.5, color: '#9ca3af', marginBottom: 4 }
const inputMini = { width: '100%', padding: '6px 7px', borderRadius: 6, border: '1px solid #E8E8E2', fontSize: 12.5, outline: 'none', fontFamily: "'DM Mono', ui-monospace, monospace" }
const inputBusca = { width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid #E8E8E2', fontSize: 13.5, outline: 'none' }
const selectBox = { width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #E8E8E2', fontSize: 13, marginBottom: 10, color: '#3f3f46', background: '#fff' }
const inputBig = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E8E2', fontSize: 16, fontWeight: 600, outline: 'none' }
const th = { padding: '6px 10px' }
const td = { padding: '8px 10px' }
