'use client'

import { useState, useEffect } from 'react'

const GAS_URL = '/api/pipedrive'

export type Sumario = {
  total: number; won: number; open: number; lost: number
  receitaTotal: number; ticketMedio: number; ticketPorPax: number
  paxTotal: number; mediaPaxPorEvento: number
  taxaConversao: number; cicloMedio: number
  futuros: number; proximoEvento: Deal | null
  funil: Record<string, number>
  funilConversao: Record<string, number>
  funilVendedor: Record<string, { total: number; won: number; open: number; lost: number; receita: number }>
  pacotes: Record<string, number>
  serieConversao: { mes: string; won: number; total: number; taxa: number }[]
}

export type Comparativo = {
  atual: SumarioSimples; anoAnterior: SumarioSimples; mesAnterior: SumarioSimples | null
}

export type SumarioSimples = {
  total: number; won: number; open: number; lost: number
  receita: number; ticketMedio: number; ticketPorPax: number; taxa: number
}

export type Deal = {
  id: number; titulo: string; empresa: string; contato: string
  email_contato: string; telefone_contato: string
  razao_social: string; cnpj_cpf: string
  status: 'open' | 'won' | 'lost'; stage_id: string; stage_nome: string
  valor: number; moeda: string
  data_evento: string; qtd_pessoas: number
  unidade_id: string; unidade_nome: string
  cardapio_id: string; cardapio_nome: string
  tipo_evento: string; local_evento: string
  horario_inicio: string; horario_fim: string
  responsavel_evento: string; telefone_responsavel: string
  forma_pgto_id: string; forma_pgto_nome: string
  status_contrato: string; conferido: string; info_extras: string
  vendedor: string; email_vendedor: string
  add_time: string; update_time: string; won_time: string
  lost_time: string; close_time: string; motivo_perda: string; sync_time: string
}

export type Filtros = {
  status: '' | 'open' | 'won' | 'lost'
  unidade: string; ano: string; mes: string; vendedor: string
}

export type LojaSumario = {
  total: number; won: number; open: number; lost: number
  receita: number; pax: number; pacotes: Record<string, number>
}

function buildParams(extra: Record<string, string>, filtros: Partial<Filtros>) {
  const p = new URLSearchParams(extra)
  if (filtros.status)   p.set('status',   filtros.status)
  if (filtros.unidade)  p.set('unidade',  filtros.unidade)
  if (filtros.ano)      p.set('ano',      filtros.ano)
  if (filtros.mes)      p.set('mes',      filtros.mes)
  if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
  return p.toString()
}

export function useSumario(filtros: Filtros) {
  const [sumario, setSumario] = useState<Sumario | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null); setSumario(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'sumario' }, filtros)}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setSumario(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.unidade, filtros.ano, filtros.mes, filtros.vendedor])

  return { sumario, loading, erro }
}

export function useComparativo(filtros: Filtros) {
  const [data, setData] = useState<Comparativo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setData(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'sumario_comparativo' }, filtros)}`)
      .then(r => r.json())
      .then(d => { if (!d.erro) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.ano, filtros.mes, filtros.unidade, filtros.vendedor])

  return { comparativo: data, loadingComp: loading }
}

export function useDeals(filtros: Filtros, page = 1) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'deals', page: String(page), limit: '500' }, filtros)}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setDeals(data.deals || []); setTotal(data.total || 0); setPages(data.pages || 1)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.unidade, filtros.ano, filtros.mes, filtros.vendedor, page])

  return { deals, total, pages, loading, erro }
}

export function useLeadsDiarios(filtros: Filtros, dataInicio: string, dataFim: string) {
  const [leads, setLeads] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!dataInicio || !dataFim) return
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'leads', dataInicio, dataFim, limit: '1000' })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setLeads(data.deals || []) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, dataInicio, dataFim])

  return { leads, loading, erro }
}

export function useVendedores() {
  const [vendedores, setVendedores] = useState<string[]>([])
  useEffect(() => {
    fetch(`${GAS_URL}?tipo=vendedores`)
      .then(r => r.json())
      .then(d => { if (d.vendedores) setVendedores(d.vendedores) })
      .catch(() => {})
  }, [])
  return vendedores
}

export function usePorLoja(filtros: Filtros) {
  const [lojas, setLojas] = useState<Record<string, LojaSumario>>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'por_loja' }, filtros)}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setLojas(data.lojas || {}) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.ano, filtros.mes, filtros.status, filtros.vendedor])

  return { lojas, loading, erro }
}
