'use client'

import { useCallback, useState } from 'react'
import type { RankLinha, ZigDia } from '@/lib/gorjeta-engine'

type EstadoUnidade = {
  zig: ZigDia[]
  rank: RankLinha[]
  loading: boolean
  erro: string | null
}

async function buscarTipo(unidade: string, tipo: 'gorjeta' | 'ranking', inicio: string, fim: string) {
  const url = `/api/gorjeta?tipo=${tipo}&unidade=${encodeURIComponent(unidade)}&inicio=${inicio}&fim=${fim}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 55000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    const data = await res.json()
    if (data && data.erro) throw new Error(data.erro)
    if (!Array.isArray(data)) throw new Error('Resposta inesperada do servidor.')
    return data
  } finally {
    clearTimeout(timer)
  }
}

export function useGorjeta() {
  const [porUnidade, setPorUnidade] = useState<Record<string, EstadoUnidade>>({})

  const carregar = useCallback(async (unitId: string, inicio: string, fim: string) => {
    setPorUnidade(prev => ({ ...prev, [unitId]: { zig: prev[unitId]?.zig ?? [], rank: prev[unitId]?.rank ?? [], loading: true, erro: null } }))
    try {
      const [gorjetaRows, rankingRows] = await Promise.all([
        buscarTipo(unitId, 'gorjeta', inicio, fim),
        buscarTipo(unitId, 'ranking', inicio, fim),
      ])
      const zig: ZigDia[] = gorjetaRows.map((z: any) => ({ data: z.data, local: z.local, servico: Number(z.servico) || 0, entrada: 0, fat: 0 }))
      const rank: RankLinha[] = rankingRows.map((r: any) => ({ raw: r.nome, valor: Number(r.valorVendido) || 0 }))
      setPorUnidade(prev => ({ ...prev, [unitId]: { zig, rank, loading: false, erro: null } }))
      return { zig, rank }
    } catch (e: any) {
      setPorUnidade(prev => ({ ...prev, [unitId]: { zig: prev[unitId]?.zig ?? [], rank: prev[unitId]?.rank ?? [], loading: false, erro: e.message } }))
      throw e
    }
  }, [])

  return { porUnidade, carregar }
}
