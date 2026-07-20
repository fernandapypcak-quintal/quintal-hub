'use client'

import { useState, useEffect } from 'react'

const GAS_URL = '/api/pipedrive'

// ─── Tipos ────────────────────────────────────────────────────
export type Sumario = {
  total: number
  won: number
  open: number
  lost: number
  receitaTotal: number
  ticketMedio: number
  paxTotal: number
  mediaPaxPorEvento: number
  taxaConversao: number
  cicloMedio: number
  futuros: number
  proximoEvento: Deal | null
  funil: Record<string, number>
}

export type Deal = {
  id: number
  titulo: string
  empresa: string
  contato: string
  email_contato: string
  telefone_contato: string
  razao_social: string
  cnpj_cpf: string
  status: 'open' | 'won' | 'lost'
  stage_id: string
  stage_nome: string
  valor: number
  moeda: string
  data_evento: string
  qtd_pessoas: number
  unidade_id: string
  unidade_nome: string
  cardapio_id: string
  cardapio_nome: string
  tipo_evento: string
  local_evento: string
  horario_inicio: string
  horario_fim: string
  responsavel_evento: string
  telefone_responsavel: string
  forma_pgto_id: string
  forma_pgto_nome: string
  status_contrato: string
  conferido: string
  info_extras: string
  vendedor: string
  email_vendedor: string
  add_time: string
  update_time: string
  won_time: string
  lost_time: string
  close_time: string
  motivo_perda: string
  sync_time: string
}

export type Filtros = {
  status: '' | 'open' | 'won' | 'lost'
  unidade: string
  ano: string
  mes: string
}

function buildParams(extra: Record<string, string>, filtros: Filtros) {
  const p = new URLSearchParams(extra)
  if (filtros.status)  p.set('status',  filtros.status)
  if (filtros.unidade) p.set('unidade', filtros.unidade)
  if (filtros.ano)     p.set('ano',     filtros.ano)
  if (filtros.mes)     p.set('mes',     filtros.mes)
  return p.toString()
}

// ─── Hook sumário ─────────────────────────────────────────────
export function useSumario(filtros: Filtros) {
  const [sumario, setSumario] = useState<Sumario | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErro(null)
    setSumario(null)

    const qs = buildParams({ tipo: 'sumario' }, filtros)
    fetch(`${GAS_URL}?${qs}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setSumario(data)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.unidade, filtros.ano, filtros.mes])

  return { sumario, loading, erro }
}

// ─── Hook deals (lista paginada) ──────────────────────────────
export function useDeals(filtros: Filtros, page = 1) {
  const [deals, setDeals]     = useState<Deal[]>([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErro(null)

    const qs = buildParams({ tipo: 'deals', page: String(page), limit: '500' }, filtros)
    fetch(`${GAS_URL}?${qs}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setDeals(data.deals || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.unidade, filtros.ano, filtros.mes, page])

  return { deals, total, pages, loading, erro }
}

// ─── Hook leads diários ───────────────────────────────────────
// Busca deals criados num período específico (por add_time)
export function useLeadsDiarios(filtros: Filtros, dataInicio: string, dataFim: string) {
  const [leads, setLeads]     = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)

  useEffect(() => {
    if (!dataInicio || !dataFim) return
    setLoading(true)
    setErro(null)

    const p = new URLSearchParams({
      tipo:        'leads',
      dataInicio,
      dataFim,
      limit:       '1000',
    })
    if (filtros.unidade) p.set('unidade', filtros.unidade)

    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setLeads(data.deals || [])
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, dataInicio, dataFim])

  return { leads, loading, erro }
}
