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
    fat: 0, fatPacote: 0, fatItens: 0, valor: 0, faturamentoZig: 0, emitido: 0,
    pessoas: 0, convidados: 0, nPacotes: 0,
    custo: 0, usos: 0, usosSemCusto: 0, desconto: 0, descontoSemCusto: 0,
    dias: new Set(),
  }
}

export function somarPacote(acc, p) {
  acc.fat += p.fat
  acc.fatPacote += p.fat
  acc.valor += p.valor
  acc.faturamentoZig += p.faturamento
  acc.emitido += p.emitido
  acc.pessoas += p.pessoas
  acc.convidados += p.convidados
  acc.nPacotes += 1
  if (p.data) acc.dias.add(p.data)
}

export function somarConsumo(acc, c) {
  // Promoção de desconto (ex.: Parceiros 20%): a receita está no próprio item
  // (preço de cardápio − desconto). Item de pacote tem receita 0 aqui — ela
  // vem do relatório de Pacotes.
  acc.fat += c.fatItens || 0
  acc.fatItens += c.fatItens || 0
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

// ── Categorização (mesma regra do QuintalPromocoes.gs) ─────────────────────
// Aplicada aqui também, pra o dashboard não depender da categoria gravada
// na planilha (que pode estar com a regra antiga).
// null = excluir (desconto interno). Ajuste as listas aqui E no .gs.
// "Descontos" não sai daqui: é atribuída no carregamento, pra promoção que
// dá desconto parcial no item (ver classificarTipoPromo em usePromocoesData).
const EXCLUIR = ['funcionario', 'socio', 'holding', 'supervisao', 'diretoria', 'colaborador', 'proprietario', 'ceo']
const ALL_INCLUSIVE = ['all inclusive']
const CEC_BEBIDA = ['chopp', 'chope', 'choop', 'cerveja']
const CEC_COMIDA = ['churrasco', 'carne']
const CLASSICOS = ['rodizio', 'classico']

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1])
    }
    prev = cur
  }
  return prev[n]
}

function semPlural(p) {
  return p.length > 4 && p.endsWith('es') ? p.slice(0, -2) : p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p
}

function palavraCasa(palavra, alvo) {
  const p = semPlural(palavra)
  if (palavra === alvo || p === alvo) return true
  if (alvo.length < 5 || p.length < 5) return false
  if (Math.abs(p.length - alvo.length) > 2) return false
  return levenshtein(p, alvo) <= (alvo.length <= 6 ? 1 : 2)
}

function contem(palavras, lista) {
  const frase = ` ${palavras.join(' ')} `
  return lista.some((alvo) => (alvo.includes(' ') ? frase.includes(` ${alvo} `) : palavras.some((p) => palavraCasa(p, alvo))))
}

export function categorizarPromocao(nome) {
  const palavras = chavePromo(nome).split(' ').filter(Boolean)
  if (contem(palavras, EXCLUIR)) return null
  if (contem(palavras, ALL_INCLUSIVE)) return 'All Inclusive'
  // C&C = chopp/cerveja + churrasco/carne, em qualquer ordem e grafia ("Festival Chopp & Churrasco",
  // "Cerveja e Churrasco", "Chopp Churrasco", "Carne & Chope", "C&C")
  if ((contem(palavras, CEC_BEBIDA) && contem(palavras, CEC_COMIDA)) || ` ${palavras.join(' ')} `.includes(' c e c ')) return 'C&C'
  if (contem(palavras, CLASSICOS)) return 'Clássicos'
  return 'Pacotes'
}

// ── Visões separadas (sem cruzar reserva x promoção) ───────────────────────
// PACOTES: pelo nome do pacote no relatório de Pacotes → pessoas, receita, ticket
export function agruparPacotes(pacotes, filtro, chaveFn) {
  const f = normFiltro(filtro)
  const mapa = new Map()
  for (const p of pacotes) {
    if (!passa(p, f)) continue
    const k = chaveFn(p)
    const a = mapa.get(k) || { n: 0, pessoas: 0, convidados: 0, produtos: 0, fat: 0, faturamento: 0, emitido: 0, custo: 0, fatComCusto: 0, nComCusto: 0, dias: new Set(), casas: new Set() }
    a.n += 1; a.pessoas += p.pessoas; a.convidados += p.convidados; a.produtos += p.produtos || 0
    if (p.custoEst != null) { a.custo += p.custoEst; a.fatComCusto += p.fat; a.nComCusto += 1 }
    a.fat += p.fat; a.faturamento += p.faturamento; a.emitido += p.emitido
    a.dias.add(p.data); a.casas.add(p.unit)
    mapa.set(k, a)
  }
  for (const a of mapa.values()) {
    a.ticket = a.pessoas ? a.fat / a.pessoas : null
    a.produtosPessoa = a.pessoas ? a.produtos / a.pessoas : null
    a.nDias = a.dias.size
    a.nCasas = a.casas.size
    a.cmv = a.fatComCusto > 0 ? a.custo / a.fatComCusto : null
    a.margem = a.nComCusto ? a.fatComCusto - a.custo : null
    a.custoPessoa = a.nComCusto && a.pessoas ? a.custo / a.pessoas : null
  }
  return mapa
}

// PROMOÇÕES: pelo nome da promoção no Promoções Utilizadas → consumo e custo
export function agruparConsumo(consumo, filtro, chaveFn) {
  const f = normFiltro(filtro)
  const mapa = new Map()
  for (const c of consumo) {
    if (!passa(c, f)) continue
    const k = chaveFn(c)
    const a = mapa.get(k) || { usos: 0, cardapio: 0, desconto: 0, pago: 0, custo: 0, usosSemCusto: 0, dias: new Set(), casas: new Set() }
    a.usos += c.usos; a.cardapio += c.cardapio || 0; a.desconto += c.desconto; a.pago += c.fatItens || 0
    if (c.temCusto) a.custo += c.custo; else a.usosSemCusto += c.usos
    if (c.data) a.dias.add(c.data)
    a.casas.add(c.unit)
    mapa.set(k, a)
  }
  for (const a of mapa.values()) {
    const temAlgumCusto = a.usos > a.usosSemCusto
    a.cmvCardapio = a.cardapio > 0 && temAlgumCusto ? a.custo / a.cardapio : null   // custo ÷ valor de cardápio consumido
    a.cmvPago = a.pago > 0 && temAlgumCusto ? a.custo / a.pago : null               // só promoções de desconto
    a.pctDesconto = a.cardapio > 0 ? a.desconto / a.cardapio : null
    a.cobertura = a.usos ? 1 - a.usosSemCusto / a.usos : null
    a.nDias = a.dias.size
  }
  return mapa
}

// ── CMV estimado por pacote ────────────────────────────────────────────────
// O relatório de Pacotes traz quantos PRODUTOS cada reserva consumiu, mas não
// quais. O custo vem do consumo das promoções do mesmo dia e casa:
//   custo da reserva = produtos da reserva × custo médio por produto
// usando, nesta ordem: a promoção de MESMO NOME no dia → todas as promoções de
// pacote da casa no dia → média da casa no mês. (Promoções de desconto ficam fora.)
export function estimarCustoPacotes(pacotes, consumoDia, consumoMes) {
  const soma = () => ({ custo: 0, usos: 0 })
  const porNomeDia = new Map(), porDia = new Map(), porMes = new Map()
  const add = (mapa, k, c) => { const x = mapa.get(k) || soma(); x.custo += c.custo; x.usos += c.usos; mapa.set(k, x) }
  for (const c of consumoDia) {
    if (c.categoria !== 'Pacote' || !c.temCusto || !c.usos) continue
    add(porNomeDia, `${c.unit}|${c.data}|${c.chave}`, c)
    add(porDia, `${c.unit}|${c.data}`, c)
  }
  for (const c of consumoMes) {
    if (c.categoria !== 'Pacote' || !c.temCusto || !c.usos) continue
    add(porMes, `${c.unit}|${c.mes}`, c)
  }
  const media = (x) => (x && x.usos > 0 ? x.custo / x.usos : null)
  for (const p of pacotes) {
    p.custoEst = null
    p.metodoCusto = null
    if (p.custoExato != null) { p.custoEst = p.custoExato; p.custoProduto = p.produtos ? p.custoExato / p.produtos : null; p.metodoCusto = 'exato (consumo da reserva)'; continue }
    if (!p.produtos) continue
    let m = media(porNomeDia.get(`${p.unit}|${p.data}|${p.chave}`)), metodo = 'promoção de mesmo nome no dia'
    if (m == null) { m = media(porDia.get(`${p.unit}|${p.data}`)); metodo = 'média das promoções da casa no dia' }
    if (m == null) { m = media(porMes.get(`${p.unit}|${p.mes}`)); metodo = 'média da casa no mês' }
    if (m == null) continue
    p.custoEst = p.produtos * m
    p.custoProduto = m
    p.metodoCusto = metodo
  }
}

// Pacote usado pela reserva (PACOTE 03, QUINTAL 2…) — vem do detalhe da ZIG.
// Sem detalhe ainda → todas juntas em SEM_DETALHE.
export const SEM_DETALHE = '__sem_detalhe__'
export function chavePacoteUsado(p) {
  return p.detalhe && p.promocaoPacote ? chavePromo(p.promocaoPacote) : SEM_DETALHE
}

// ═══════════════════════════════════════════════════════════════════════
// VISÃO UNIFICADA — uma linha por promoção/pacote (nome na ZIG)
//
// Junta os dois relatórios SEM contar nada duas vezes:
//  • Reservas com detalhe ("Mais detalhes"): entram na linha do PACOTE USADO
//    (ex.: PACOTE 03) com pessoas, receita e o custo de TUDO que consumiram.
//  • Promoções Utilizadas: o consumo da promoção que NÃO aconteceu dentro
//    dessas reservas ("fora de reserva") soma custo na linha da promoção;
//    nas promoções de desconto, o que o cliente pagou soma receita.
//  • Reservas ainda sem detalhe: linha à parte, só com receita/pessoas (o
//    consumo delas já está no relatório de promoções).
// ═══════════════════════════════════════════════════════════════════════
function linhaVazia(k, nome) {
  return {
    k, nome, tipo: 'Pacote', semDetalhe: k === SEM_DETALHE,
    n: 0, pessoas: 0, receitaRes: 0, custoRes: 0,
    usosRel: 0, custoRel: 0, pagoRel: 0, cardapioRel: 0, usosSemCusto: 0,
    usosDentro: 0, custoDentro: 0,
    reservas: [], itensRel: [], casas: new Set(), dias: new Set(),
  }
}

export function unificar({ pacotes, consumo, nomes }, filtro) {
  const f = normFiltro(filtro)
  const linhas = new Map()
  const get = (k, nome) => { if (!linhas.has(k)) linhas.set(k, linhaVazia(k, nome)); return linhas.get(k) }
  const dentro = new Map() // consumo de cada promoção que aconteceu dentro de reservas com detalhe

  // Promoções do relatório no período (pra ligar reservas sem detalhe pelo nome)
  const usoPorChave = new Map()
  for (const c of consumo) if (passa(c, f)) usoPorChave.set(c.chave, (usoPorChave.get(c.chave) || 0) + c.usos)
  const familiaDe = (nome) => { const c = categorizarPromocao(nome); return c && c !== 'Pacotes' ? c : null }
  const melhorDaFamilia = new Map()
  for (const [k, u] of usoPorChave) {
    const fam = familiaDe(nomes.get(k) || k)
    if (fam && (!melhorDaFamilia.has(fam) || u > usoPorChave.get(melhorDaFamilia.get(fam)))) melhorDaFamilia.set(fam, k)
  }
  const chaveProvisoria = (p) => {
    if (usoPorChave.has(p.chave)) return p.chave
    const fam = familiaDe(p.nome)
    return fam ? melhorDaFamilia.get(fam) || null : null
  }

  for (const c of consumo) {
    if (!passa(c, f)) continue
    const r = get(c.chave, nomes.get(c.chave) || c.nome)
    r.usosRel += c.usos; r.custoRel += c.custo; r.pagoRel += c.fatItens || 0; r.cardapioRel += c.cardapio || 0
    if (!c.temCusto) r.usosSemCusto += c.usos
    if (c.categoria === 'Desconto') r.tipo = 'Desconto'
    r.itensRel.push(c); r.casas.add(c.unit); if (c.data) r.dias.add(c.data)
  }

  for (const p of pacotes) {
    if (!passa(p, f)) continue
    const temDet = p.detalhe && p.promocaoPacote
    // Sem detalhe ainda: liga pelo nome (igual, ou mesma família: C&C, All Inclusive, Rodízio)
    const kProv = !temDet ? chaveProvisoria(p) : null
    const r = temDet ? get(chavePromo(p.promocaoPacote), p.promocaoPacote)
      : kProv ? get(kProv, nomes.get(kProv) || kProv)
      : get(SEM_DETALHE, 'Reservas ainda sem detalhe')
    if (kProv) r.provisorias = (r.provisorias || 0) + 1
    r.n++; r.pessoas += p.pessoas; r.receitaRes += p.fat; r.reservas.push(p); r.casas.add(p.unit); r.dias.add(p.data)
    if (temDet) {
      r.custoRes += p.custoExato || 0
      for (const it of p.itens || []) {
        if (!it.promocao) continue
        const kk = chavePromo(it.promocao)
        const d = dentro.get(kk) || { qtd: 0, custo: 0 }
        d.qtd += it.qtd; d.custo += it.custo
        dentro.set(kk, d)
      }
    }
  }

  for (const r of linhas.values()) {
    const d = dentro.get(r.k) || { qtd: 0, custo: 0 }
    r.usosDentro = d.qtd
    r.custoDentro = d.custo
    r.usosFora = Math.max(0, r.usosRel - d.qtd)
    r.custoFora = Math.max(0, r.custoRel - d.custo)
    r.receita = r.receitaRes + r.pagoRel
    r.custo = r.semDetalhe ? null : r.custoRes + r.custoFora
    r.temCusto = !r.semDetalhe && (r.custoRes > 0 || r.usosRel > 0)
    r.cmv = r.temCusto && r.receita > 0 ? r.custo / r.receita : null
    r.margem = r.temCusto ? r.receita - r.custo : null
    r.ticket = r.pessoas ? r.receitaRes / r.pessoas : null
    r.margemPessoa = r.margem != null && r.pessoas ? r.margem / r.pessoas : null
    // campos que o StatusTag entende
    r.fat = r.receita; r.usos = r.temCusto ? 1 : 0
    r.nCasas = r.casas.size; r.nDias = r.dias.size
  }
  return linhas
}

// Soma de várias linhas unificadas (total do período / casa / dia)
export function totalUnificado(linhas, fatTotal = null) {
  const t = { n: 0, pessoas: 0, receita: 0, receitaRes: 0, custo: 0, custoConhecido: 0, receitaComCusto: 0, semDetalheReceita: 0, usosSemCusto: 0, usosRel: 0 }
  for (const r of linhas.values ? linhas.values() : linhas) {
    t.n += r.n; t.pessoas += r.pessoas; t.receita += r.receita; t.receitaRes += r.receitaRes
    t.usosSemCusto += r.usosSemCusto; t.usosRel += r.usosRel
    if (r.semDetalhe) t.semDetalheReceita += r.receita
    else { t.custo += r.custo || 0; t.receitaComCusto += r.receita }
  }
  // CMV do período: custo de tudo ÷ receita de tudo (inclusive das reservas sem
  // detalhe — o consumo delas já está no custo "fora de reserva")
  t.cmv = t.receita > 0 && t.custo > 0 ? t.custo / t.receita : null
  t.margem = t.receita - t.custo
  t.ticket = t.pessoas ? t.receitaRes / t.pessoas : null
  t.peso = fatTotal ? t.receita / fatTotal : null
  t.cobertura = t.usosRel ? 1 - t.usosSemCusto / t.usosRel : null
  t.fat = t.receita; t.usos = t.custo > 0 ? 1 : 0
  return t
}
