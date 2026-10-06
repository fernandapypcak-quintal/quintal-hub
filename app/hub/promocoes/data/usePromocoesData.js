// app/hub/promocoes/data/usePromocoesData.js
//
// Carrega e normaliza tudo que o módulo usa:
//  1) /api/promocoes  → pacotes, promoções utilizadas (mensal + diário), ficha técnica, status
//  2) loadData() do /hub/faturamento → faturamento total por casa/dia (canal CASA)
//     (mesma regra de corte planilha/ZIG/ao vivo do dashboard de faturamento —
//      antes este módulo somava as três fontes por cima e duplicava dias)

import { useEffect, useState } from 'react'
import { unitIdFromString, labelForUnit, ALL_UNIT_IDS } from '@/lib/units'
import { CUSTO_POR_PRODUTO } from '@/lib/catalogoCustos'
import { COLUNA_FATURAMENTO_PACOTE } from '@/lib/promocoesConfig'
import { loadData as carregarFaturamento } from '../../faturamento/data/loader'
import { chavePromo, chaveProduto, numero, mesDe, ultimoDiaDoMes, categorizarPromocao } from './modelo'

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
  const status = api.status || {}
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
    const categoria = categorizarPromocao(r.nome_do_pacote)
    if (!categoria) continue // desconto interno (funcionário, sócio…)
    const faturamento = numero(r.faturamento_r)
    const valor = numero(r.valor_do_pacote_r)
    pacotes.push({
      tipo: 'pacote',
      unit, data, mes: data.slice(0, 7),
      nome: String(r.nome_do_pacote || '(sem nome)').trim(),
      chave: chavePromo(r.nome_do_pacote),
      categoria,
      pessoas: numero(r.confirmados),
      convidados: numero(r.convidados),
      valor, faturamento,
      emitido: numero(r.emitido_nf_r),
      fat: COLUNA_FATURAMENTO_PACOTE === 'valor' ? valor : faturamento,
    })
  }

  // ── Consumo (Promoções Utilizadas) ───────────────────────────────────────
  const semCusto = new Map() // produto → usos (pra Conferência)
  function linhaConsumo(r, data, mes) {
    const unit = unitIdFromString(r.unidade || r.loja)
    if (!unit || !mes) return null
    const categoria = categorizarPromocao(r.promocao)
    if (!categoria) return null
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
    nomes, categoriaDaChave, fonteCustoMes, ultimoFechado,
    status, geradoEm: api.geradoEm, fichaAoVivo: api.fichaAoVivo,
    produtosSemCusto: [...semCusto.entries()].sort((a, b) => b[1] - a[1]),
    temFaturamentoTotal: Object.keys(fatTotal.mes).length > 0,
  }
}

export function usePromocoesData() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [avisoFaturamento, setAvisoFaturamento] = useState(null)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      setLoading(true)
      setErro(null)
      try {
        const [resApi, resFat] = await Promise.allSettled([
          fetch('/api/promocoes', { cache: 'no-store' }).then(async (r) => {
            const j = await r.json()
            if (!r.ok || j.ok === false) throw new Error(j.erro || `HTTP ${r.status}`)
            return j
          }),
          carregarFaturamento(false),
        ])
        if (cancelado) return
        if (resApi.status === 'rejected') throw resApi.reason
        if (resFat.status === 'rejected') setAvisoFaturamento('Faturamento total das casas indisponível agora — o Peso das promoções fica em branco.')
        setDados(processar(resApi.value, resFat.status === 'fulfilled' ? resFat.value : []))
      } catch (e) {
        if (!cancelado) setErro(e.message || String(e))
      } finally {
        if (!cancelado) setLoading(false)
      }
    })()
    return () => { cancelado = true }
  }, [])

  return { dados, loading, erro, avisoFaturamento }
}
