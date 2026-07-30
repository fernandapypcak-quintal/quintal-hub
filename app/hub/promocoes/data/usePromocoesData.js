// app/hub/promocoes/data/usePromocoesData.js
//
// Junta duas fontes:
//  1) O Apps Script novo de Promoções Utilizadas + Pacotes (categorizado)
//  2) A mesma fonte de Faturamento Total que o módulo /hub/faturamento já usa
// e devolve uma tabela mensal por unidade, pronta pro Dashboard.

import { useState, useEffect } from 'react'
import { unitIdFromString, labelForUnit, ALL_UNIT_IDS } from '@/lib/units'
import { custoDoProduto } from '@/lib/catalogoCustos'

const URL_PROMOCOES = 'https://script.google.com/macros/s/AKfycbxZv0RNOKnWHk04LDmrwtdak-ALs_GsqbeMNqBhMcNTPCTgW0DZunh1-1oHGWtObQde8g/exec'
const URL_FATURAMENTO = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec'

const CATEGORIAS = ['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes']

function mesLabelToAnoMes(mesLabel) {
  const s = String(mesLabel || '').trim()
  // formato esperado: "MM/AAAA"
  let m = s.match(/^(\d{2})\/(\d{4})$/)
  if (m) return `${m[2]}-${m[1]}`
  // o Google Sheets às vezes converte "MM/AAAA" sozinho pra uma Date, e o
  // Apps Script devolve isso como "AAAA-MM-DD" — trata esse caso também.
  m = s.match(/^(\d{4})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}`
  return null
}

function dataToAnoMes(dataStr) {
  // "2026-07-05" -> "2026-07"
  const s = String(dataStr || '')
  return s.length >= 7 ? s.slice(0, 7) : null
}

async function fetchJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Erro ${r.status} ao buscar ${url}`)
  return r.json()
}

// ── Faturamento Total por unidade + mês (só canal CASA — dine-in) ──────────
async function carregarFaturamentoPorMes() {
  const totais = {} // { unitId: { anoMes: valor } }

  function acumular(loja, anoMes, valor) {
    const unitId = unitIdFromString(loja)
    if (!unitId || !anoMes || !valor) return
    if (!totais[unitId]) totais[unitId] = {}
    totais[unitId][anoMes] = (totais[unitId][anoMes] || 0) + valor
  }

  const [resPlanilha, resZig, resZigLive] = await Promise.allSettled([
    fetchJson(`${URL_FATURAMENTO}?tipo=dados`),
    fetchJson(`${URL_FATURAMENTO}?tipo=zig`),
    fetchJson(`${URL_FATURAMENTO}?tipo=zigLive&dias=3`),
  ])

  if (resPlanilha.status === 'fulfilled') {
    for (const r of resPlanilha.value?.dados || []) {
      const canal = String(r.Canal || '').trim().toUpperCase()
      if (canal !== 'CASA') continue
      const ano = Number(r.Ano), mes = Number(r.Mes)
      if (!ano || !mes) continue
      const anoMes = `${ano}-${String(mes).padStart(2, '0')}`
      acumular(r.Loja, anoMes, parseFloat(String(r.Valor).replace(',', '.')) || 0)
    }
  }

  for (const res of [resZig, resZigLive]) {
    if (res.status !== 'fulfilled') continue
    for (const r of res.value?.zig || []) {
      const canal = String(r.Canal || '').trim().toUpperCase()
      if (canal !== 'CASA') continue
      const anoMes = dataToAnoMes(r.Data)
      acumular(r.Loja, anoMes, parseFloat(r.Valor) || 0)
    }
  }

  return totais // { unitId: { '2026-06': 123456.78, ... } }
}

// ── Promoções + Pacotes categorizados ───────────────────────────────────────
async function carregarPromocoesPacotes() {
  const [pacotes, promocoes] = await Promise.all([
    fetchJson(`${URL_PROMOCOES}?tipo=pacotes`),
    fetchJson(`${URL_PROMOCOES}?tipo=promocoes_utilizadas`),
  ])
  return { pacotes: pacotes || [], promocoes: promocoes || [] }
}

// ── Monta a estrutura final: por unidade+mês, valores por categoria ────────
function montarEstrutura(pacotes, promocoes, faturamentoPorMes) {
  // base[unitId][anoMes] = { faturamento: {categoria: valor}, pessoas: {categoria: valor}, faturamentoTotal, custoPromo: {categoria: valor} }
  const base = {}

  function getSlot(unitId, anoMes) {
    if (!base[unitId]) base[unitId] = {}
    if (!base[unitId][anoMes]) {
      base[unitId][anoMes] = {
        faturamento: Object.fromEntries(CATEGORIAS.map(c => [c, 0])),
        pessoas: Object.fromEntries(CATEGORIAS.map(c => [c, 0])),
        custoDesconto: Object.fromEntries(CATEGORIAS.map(c => [c, 0])),
        custoTotal: Object.fromEntries(CATEGORIAS.map(c => [c, 0])),
        faturamentoTotal: faturamentoPorMes?.[unitId]?.[anoMes] || 0,
      }
    }
    return base[unitId][anoMes]
  }

  // Pacotes → Faturamento + Nº de pessoas (Confirmados) por categoria
  for (const r of pacotes) {
    const unitId = unitIdFromString(r.unidade || r.loja)
    const anoMes = mesLabelToAnoMes(r.mes) || dataToAnoMes(r.data)
    if (!unitId || !anoMes) continue
    const categoria = r.categoria
    if (!CATEGORIAS.includes(categoria)) continue

    const slot = getSlot(unitId, anoMes)
    slot.faturamento[categoria] += (parseFloat(r.faturamento_r) || 0) + (parseFloat(r.emitido_nf_r) || 0)
    slot.pessoas[categoria] += parseFloat(r.confirmados) || 0
  }

  // Promoções utilizadas → soma de desconto (proxy pra intensidade de uso,
  // usado só de apoio — o CMV real por categoria depende do custo do produto,
  // que fica pro próximo passo quando cruzarmos com o catálogo de custos)
  for (const r of promocoes) {
    const unitId = unitIdFromString(r.unidade || r.loja)
    const anoMes = mesLabelToAnoMes(r.mes)
    if (!unitId || !anoMes) continue
    const categoria = r.categoria
    if (!CATEGORIAS.includes(categoria)) continue

    const slot = getSlot(unitId, anoMes)
    slot.custoDesconto[categoria] += parseFloat(r.desconto_total_r) || 0

    const custoUnitario = custoDoProduto(r.produto)
    const usos = parseFloat(r.usos) || 0
    if (custoUnitario != null) {
      slot.custoTotal[categoria] += custoUnitario * usos
    }
  }

  return base
}

export function usePromocoesData() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setLoading(true)
      setErro(null)
      try {
        const [faturamentoPorMes, { pacotes, promocoes }] = await Promise.all([
          carregarFaturamentoPorMes(),
          carregarPromocoesPacotes(),
        ])
        if (cancelado) return
        const estrutura = montarEstrutura(pacotes, promocoes, faturamentoPorMes)
        setDados(estrutura)
      } catch (e) {
        if (!cancelado) setErro(e.message)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [])

  return { dados, loading, erro, CATEGORIAS, ALL_UNIT_IDS, labelForUnit }
}
