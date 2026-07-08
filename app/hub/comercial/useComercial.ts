'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Cole aqui a URL do Web App após publicar o Apps Script ───
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
}

// ─── Hook sumário (KPIs) ──────────────────────────────────────
export function useSumario(filtros: Filtros) {
  const [sumario, setSumario] = useState<Sumario | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)

  const fetch_ = useCallback(() => {
    setLoading(true)
    setErro(null)

    const params = new URLSearchParams({ tipo: 'sumario' })
    if (filtros.status)  params.set('status',  filtros.status)
    if (filtros.unidade) params.set('unidade', filtros.unidade)
    if (filtros.ano)     params.set('ano',     filtros.ano)

    fetch(`${GAS_URL}?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setSumario(data)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [filtros.status, filtros.unidade, filtros.ano])

  useEffect(() => { fetch_() }, [fetch_])
  return { sumario, loading, erro, refetch: fetch_ }
}

// ─── Hook deals (lista) ───────────────────────────────────────
export function useDeals(filtros: Filtros, page = 1) {
  const [deals, setDeals]   = useState<Deal[]>([])
  const [total, setTotal]   = useState(0)
  const [pages, setPages]   = useState(1)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErro(null)

    const params = new URLSearchParams({ tipo: 'deals', page: String(page), limit: '200' })
    if (filtros.status)  params.set('status',  filtros.status)
    if (filtros.unidade) params.set('unidade', filtros.unidade)
    if (filtros.ano)     params.set('ano',     filtros.ano)

    fetch(`${GAS_URL}?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setDeals(data.deals || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [filtros.status, filtros.unidade, filtros.ano, page])

  return { deals, total, pages, loading, erro }
}
