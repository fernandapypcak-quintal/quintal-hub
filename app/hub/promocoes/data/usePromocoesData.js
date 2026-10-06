// app/hub/promocoes/data/usePromocoesData.js
//
// Carrega e normaliza tudo que o módulo usa:
//  1) /api/promocoes?acao=meta    → meses disponíveis + resumo mensal (gráfico) + status
//     /api/promocoes?acao=periodo → mês escolhido + anterior: pacotes, reservas (detalhe),
//                                    consumo por reserva, promoções utilizadas, ficha técnica
//  2) loadData() do /hub/faturamento → faturamento total por casa/dia (canal CASA)
//     (mesma regra de corte planilha/ZIG/ao vivo do dashboard de faturamento —
//      antes este módulo somava as três fontes por cima e duplicava dias)

import { useEffect, useState } from 'react'
import { unitIdFromString, labelForUnit, ALL_UNIT_IDS } from '@/lib/units'
import { CUSTO_POR_PRODUTO } from '@/lib/catalogoCustos'
import { COLUNA_FATURAMENTO_PACOTE, DESCONTO_PARCIAL_MIN, DESCONTO_PARCIAL_MAX } from '@/lib/promocoesConfig'
import { loadData as carregarFaturamento } from '../../faturamento/data/loader'
import { chavePromo, chaveProduto, numero, mesDe, ultimoDiaDoMes, categorizarPromocao, estimarCustoPacotes } from './modelo'

function expandir(t) {
  if (!t?.cols?.length) return []
  const texto = new Set(t.texto || [])
  return t.rows.map((r) => {
    const o = {}
    t.cols.forEach((c, i) => { o[c] = texto.has(i) ? t.dict[r[i]] : r[i] })
    return o
  })
}

function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
function diaAnterior(d) {
  const [a, m, dd] = d.split('-').map(Number)
  const x = new Date(Date.UTC(a, m - 1, dd - 1))
  return x.toISOString().slice(0, 10)
}

function montarFicha(linhas) {
  const mapa = new Map()
  // fallback: catálogo embutido (Mai/Jun 2026) só pro que a ficha ao vivo não tiver
  for (const [nome, custo] of Object.entries(CUSTO_POR_PRODUTO)) {
    mapa.set(chaveProduto(nome), { custo, preco: null, origem: 'catalogo' })
  }
  for (const [nome, custo, preco] of linhas || []) {
    const c = numero(custo)
    if (!nome || !(c > 0)) continue
    mapa.set(chaveProduto(nome), { custo: c, preco: numero(preco) || null, origem: 'ficha' })
  }
  return mapa
}

export function processar(api, linhasFaturamento) {
  const status = { ...(api.status || {}) }
  status.diarioAte = status.diarioAte || status.coletadoAte || null
  const ultimoFechado = status.ultimoDiaFechado || diaAnterior(hojeSP())
  const ficha = montarFicha(api.ficha)
  // Catálogo pro Simulador (só a ficha ao vivo/cache; vazio → simulador usa o snapshot)
  const catalogo = (api.ficha || [])
    .map(([produto, custo, preco, categoria]) => ({ produto: String(produto || '').trim(), categoria: String(categoria || 'OUTROS').trim() || 'OUTROS', custo: numero(custo), preco: numero(preco) }))
    .filter((p) => p.produto)

  // ── Pacotes ──────────────────────────────────────────────────────────────
  const pacotes = []
  for (const r of expandir(api.pacotes)) {
    const unit = unitIdFromString(r.unidade || r.loja)
    const data = String(r.data || '').slice(0, 10)
    if (!unit || !/^\d{4}-\d{2}-\d{2}$/.test(data) || data > ultimoFechado) continue
    if (categorizarPromocao(r.nome_do_pacote) === null) continue // funcionário, sócio, CEO…
    const faturamento = numero(r.faturamento_r)
    const valor = numero(r.valor_do_pacote_r)
    const emitido = numero(r.emitido_nf_r)
    const nome = String(r.nome_do_pacote || '(sem nome)').trim()
    pacotes.push({
      tipo: 'pacote',
      unit, data, mes: data.slice(0, 7),
      nome,
      chave: chavePromo(nome),
      categoria: 'Pacote',
      produtos: numero(r.produtos),
      id: String(r.id_reserva || ''),
      pessoas: numero(r.confirmados),
      convidados: numero(r.convidados),
      valor, faturamento,
      emitido,
      fat: COLUNA_FATURAMENTO_PACOTE === 'valor' ? valor
        : COLUNA_FATURAMENTO_PACOTE === 'faturamento' ? faturamento
        : faturamento + emitido,
    })
  }

  // ── Consumo (Promoções Utilizadas) ───────────────────────────────────────
  const semCusto = new Map() // produto → usos (pra Conferência)
  function linhaConsumo(r, data, mes) {
    const unit = unitIdFromString(r.unidade || r.loja)
    if (!unit || !mes) return null
    if (categorizarPromocao(r.promocao) === null) return null // funcionário, sócio…
    const categoria = 'Pacote'
    const usos = numero(r.usos)
    const f = ficha.get(chaveProduto(r.produto))
    return {
      tipo: 'consumo',
      unit, data, mes,
      nome: String(r.promocao || '').trim(),
      chave: chavePromo(r.promocao),
      categoria,
      produto: String(r.produto || '').trim(),
      usos,
      desconto: numero(r.desconto_total_r),
      temCusto: !!f,
      custoUnit: f ? f.custo : null,
      custo: f ? f.custo * usos : 0,
      precoUnit: f?.preco || null,
      fatItens: 0, // preenchido depois, só pra promoções de desconto
      cardapio: f?.preco ? f.preco * usos : numero(r.desconto_total_r), // valor de cardápio do que foi consumido
    }
  }

  const consumoDia = []
  for (const r of expandir(api.promocoesDiario)) {
    const data = String(r.data || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue
    const l = linhaConsumo(r, data, data.slice(0, 7))
    if (l) consumoDia.push(l)
  }
  const consumoMensalBruto = []
  for (const r of expandir(api.promocoesMensal)) {
    const l = linhaConsumo(r, null, mesDe(r.mes))
    if (l) consumoMensalBruto.push(l)
  }

  // ── Tipo de promoção: item de pacote (sai de graça) x desconto parcial ──
  // % desconto da promoção = desconto ÷ (usos × preço de cardápio), no histórico todo.
  const somaTipo = new Map()
  for (const c of [...consumoMensalBruto, ...consumoDia]) {
    if (!c.precoUnit) continue
    const x = somaTipo.get(c.chave) || { tabela: 0, desconto: 0 }
    x.tabela += c.usos * c.precoUnit
    x.desconto += c.desconto
    somaTipo.set(c.chave, x)
  }
  const tipoPromo = new Map()
  for (const [k, x] of somaTipo) {
    const pct = x.tabela > 0 ? x.desconto / x.tabela : null
    const tipo = pct != null && pct >= DESCONTO_PARCIAL_MIN && pct < DESCONTO_PARCIAL_MAX ? 'desconto' : 'pacote'
    tipoPromo.set(k, { tipo, pctDesconto: pct })
  }
  for (const c of [...consumoMensalBruto, ...consumoDia]) {
    if (tipoPromo.get(c.chave)?.tipo !== 'desconto') continue
    c.categoria = 'Desconto'
    c.fatItens = c.precoUnit ? Math.max(0, c.usos * c.precoUnit - c.desconto) : 0
  }

  // Mês "coberto" pelo diário = todos os dias fechados do mês já processados.
  // Coberto → usa o diário (mês = soma exata dos dias). Senão → usa o mensal.
  const diarioDesde = status.diarioDesde || null
  const diarioAte = status.diarioAte || null
  const mesCoberto = (mes) => {
    if (!diarioDesde || !diarioAte) return false
    if (`${mes}-01` < diarioDesde) return false
    const fim = ultimoDiaDoMes(mes) < ultimoFechado ? ultimoDiaDoMes(mes) : ultimoFechado
    return diarioAte >= fim
  }

  const mesesSet = new Set([...pacotes.map((p) => p.mes), ...consumoMensalBruto.map((c) => c.mes), ...consumoDia.map((c) => c.mes)])
  const meses = [...mesesSet].filter(Boolean).sort()
  const fonteCustoMes = {}
  const consumoMes = []
  for (const mes of meses) {
    const usarDiario = mesCoberto(mes)
    fonteCustoMes[mes] = usarDiario ? 'diario' : 'mensal'
    const origem = usarDiario ? consumoDia : consumoMensalBruto
    for (const c of origem) if (c.mes === mes) consumoMes.push(c)
  }
  // ── Detalhe de cada reserva ("Mais detalhes" da ZIG) → receita e CMV exatos ──
  const detReserva = new Map()
  for (const r of expandir(api.pacotesReservas)) {
    if (r.status && r.status !== 'ok') continue
    detReserva.set(String(r.id_reserva), {
      receita: numero(r.receita_r),
      valorPacote: numero(r.valor_do_pacote_r),
      produtosPagos: numero(r.produtos_pagos_r),
      nfAvulsa: numero(r.nf_avulsa_r),
      gorjeta: numero(r.gorjeta_r),
      itens: [],
    })
  }
  for (const r of expandir(api.pacotesConsumo)) {
    const d = detReserva.get(String(r.id_reserva))
    if (!d) continue
    const qtd = numero(r.qtd)
    const f = ficha.get(chaveProduto(r.produto))
    d.itens.push({
      promocao: String(r.promocao || '').trim(),
      produto: String(r.produto || '').trim(),
      qtd,
      precoUnit: numero(r.preco_unit_r),
      pago: numero(r.valor_pago_r),
      desconto: numero(r.desconto_r),
      temCusto: !!f,
      custo: f ? f.custo * qtd : 0,
    })
  }
  for (const p of pacotes) {
    const d = p.id ? detReserva.get(p.id) : null
    if (!d) continue
    // promoção principal = a que mais teve itens (ignora "ADICIONAL ...")
    const porPromo = new Map()
    for (const it of d.itens) if (it.promocao) porPromo.set(it.promocao, (porPromo.get(it.promocao) || 0) + it.qtd)
    const ordenadas = [...porPromo.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
    p.detalhe = true
    p.promocoes = ordenadas
    p.promocaoPacote = ordenadas.find((n) => !/^adicional/i.test(n)) || ordenadas[0] || null
    p.itens = d.itens
    p.faturamento = d.valorPacote + d.produtosPagos
    p.emitido = d.nfAvulsa
    p.gorjeta = d.gorjeta
    p.fat = d.receita
    p.produtos = d.itens.reduce((s, it) => s + it.qtd, 0)
    p.custoExato = d.itens.reduce((s, it) => s + it.custo, 0)
    p.itensSemCusto = d.itens.filter((it) => !it.temCusto && it.qtd > 0 && it.precoUnit > 0).length
  }

  estimarCustoPacotes(pacotes, consumoDia, consumoMes)

  for (const c of [...consumoMes, ...consumoDia]) {
    if (!c.temCusto) semCusto.set(c.produto, (semCusto.get(c.produto) || 0) + c.usos)
  }

  // ── Faturamento total por casa ───────────────────────────────────────────
  const fatTotal = { dia: {}, mes: {} }
  for (const r of linhasFaturamento || []) {
    if (r.Canal !== 'CASA') continue
    const unit = unitIdFromString(r.Loja)
    if (!unit || !r.Data || r.Data > ultimoFechado) continue
    fatTotal.dia[unit] ??= {}
    fatTotal.mes[unit] ??= {}
    fatTotal.dia[unit][r.Data] = (fatTotal.dia[unit][r.Data] || 0) + r.Valor
    fatTotal.mes[unit][r.Ano_Mes] = (fatTotal.mes[unit][r.Ano_Mes] || 0) + r.Valor
  }

  // ── Nome de exibição por promoção (grafia mais frequente) ────────────────
  const contagem = new Map()
  for (const r of [...pacotes, ...consumoMes]) {
    if (!contagem.has(r.chave)) contagem.set(r.chave, new Map())
    const m = contagem.get(r.chave)
    m.set(r.nome, (m.get(r.nome) || 0) + 1)
  }
  const nomes = new Map()
  for (const [k, m] of contagem) nomes.set(k, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0] || k)

  const categoriaDaChave = new Map()
  for (const r of consumoMes) categoriaDaChave.set(r.chave, r.categoria)
  for (const r of pacotes) categoriaDaChave.set(r.chave, r.categoria) // pacote tem prioridade

  const unitsComDado = new Set([...pacotes.map((p) => p.unit), ...consumoMes.map((c) => c.unit)])
  const unidades = ALL_UNIT_IDS.filter((u) => unitsComDado.has(u)).map((id) => ({ id, label: labelForUnit(id) }))

  return {
    pacotes, consumoMes, consumoDia, fatTotal, meses, unidades, catalogo,
    nomes, categoriaDaChave, fonteCustoMes, ultimoFechado, tipoPromo,
    status, geradoEm: status.atualizadoEm || null, fichaAoVivo: api.fichaAoVivo,
    produtosSemCusto: [...semCusto.entries()].sort((a, b) => b[1] - a[1]),
    temFaturamentoTotal: Object.keys(fatTotal.mes).length > 0,
    reservasComDetalhe: pacotes.filter((p) => p.detalhe).length,
  }
}

// Resumo mensal (resumo.json do Apps Script) → { mes: { unitId: {...} } }
function processarResumo(resumo) {
  const out = {}
  for (const [mes, porUni] of Object.entries(resumo || {})) {
    out[mes] = {}
    for (const [uni, v] of Object.entries(porUni || {})) {
      const id = unitIdFromString(uni)
      if (!id) continue
      const x = out[mes][id] || { reservas: 0, pessoas: 0, receita: 0, usos: 0, desconto: 0, custo: 0, cardapio: 0 }
      for (const k of Object.keys(x)) x[k] += numero(v[k])
      out[mes][id] = x
    }
  }
  return out
}

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-store' })
  const j = await r.json().catch(() => ({ ok: false, erro: `HTTP ${r.status}` }))
  if (!r.ok || j.ok === false) throw new Error(j.erro || `HTTP ${r.status}`)
  return j
}

// mes = 'AAAA-MM' escolhido no filtro (vazio → último mês disponível)
export function usePromocoesData(mes) {
  const [meta, setMeta] = useState(null)
  const [linhasFat, setLinhasFat] = useState(null)
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [avisoFaturamento, setAvisoFaturamento] = useState(null)

  // 1) meta + faturamento total (uma vez)
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const [m, f] = await Promise.allSettled([getJson('/api/promocoes?acao=meta'), carregarFaturamento(false)])
        if (cancelado) return
        if (m.status === 'rejected') throw m.reason
        if (f.status === 'rejected') setAvisoFaturamento('Faturamento total das casas indisponível agora — o Peso das promoções fica em branco.')
        setLinhasFat(f.status === 'fulfilled' ? f.value : [])
        setMeta({ ...m.value, resumoPorUnit: processarResumo(m.value.resumo) })
      } catch (e) {
        if (!cancelado) { setErro(e.message || String(e)); setLoading(false) }
      }
    })()
    return () => { cancelado = true }
  }, [])

  const mesAlvo = mes || meta?.meses?.[meta.meses.length - 1] || ''

  // 2) período (mês escolhido + anterior) — recarrega quando o mês muda
  useEffect(() => {
    if (!meta || linhasFat === null) return
    if (!mesAlvo) { setLoading(false); setDados({ vazio: true, meses: [] }); return }
    let cancelado = false
    ;(async () => {
      setLoading(true)
      setErro(null)
      try {
        const api = await getJson(`/api/promocoes?acao=periodo&mes=${mesAlvo}`)
        if (cancelado) return
        api.status = { ...(meta.status || {}), ...(api.status || {}) }
        const d = processar(api, linhasFat)
        d.mesesCarregados = d.meses
        d.meses = meta.meses            // todos os meses (seletor)
        d.resumo = meta.resumoPorUnit    // gráfico de evolução
        d.mesCarregado = mesAlvo
        setDados(d)
      } catch (e) {
        if (!cancelado) setErro(e.message || String(e))
      } finally {
        if (!cancelado) setLoading(false)
      }
    })()
    return () => { cancelado = true }
  }, [meta, linhasFat, mesAlvo])

  return { dados, meta, loading, erro, avisoFaturamento, mesAlvo }
}
