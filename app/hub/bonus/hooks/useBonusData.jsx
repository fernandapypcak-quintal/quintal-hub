// app/hub/bonus/hooks/useBonusData.jsx
//
// Busca a apuração manual do mês via /api/bonus (proxy pro Apps Script
// QuintalBonus.gs) e calcula faixas/pontos com lib/bonus/scoring.ts.
// Sem dimensão de loja — a meta coletiva é única para a rede.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { calcularResultadoMes } from '@/lib/bonus/scoring'

const BonusDataContext = createContext(null)

function mesAtualStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function primeiroDiaDoMes(anoMes) {
  return `${anoMes}-01`
}

export function BonusDataProvider({ children, isAdmin = false }) {
  const [anoMes, setAnoMes] = useState(mesAtualStr())
  const [linhasBrutas, setLinhasBrutas] = useState([])
  const [historico, setHistorico] = useState([]) // últimos meses, pra tendência
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const carregar = useCallback(async (mesRef) => {
    setLoading(true)
    setError(null)
    try {
      const mesRefFormatado = primeiroDiaDoMes(mesRef)
      const res = await fetch(`/api/bonus?mes_ref=${mesRefFormatado}`).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      setLinhasBrutas(res.bonus || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarHistorico = useCallback(async (mesesAtras = 6) => {
    try {
      const res = await fetch('/api/bonus').then((r) => r.json())
      if (res.erro) return
      setHistorico(res.bonus || [])
    } catch {
      // histórico é só decorativo — não bloqueia o dashboard se falhar
    }
  }, [])

  useEffect(() => {
    carregar(anoMes)
  }, [anoMes, carregar])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  const linhasDoMes = linhasBrutas.map((l) => ({
    indicador: l.indicador,
    meta: l.meta,
    meta80: l.meta_80,
    meta60: l.meta_60,
    real: l.real,
    observacao: l.observacao,
  }))

  const resultado = calcularResultadoMes(anoMes, linhasDoMes)

  const resultadosPorMes = (() => {
    const porMes = {}
    historico.forEach((l) => {
      const mes = (l.mes_ref || '').slice(0, 7)
      if (!mes) return
      if (!porMes[mes]) porMes[mes] = []
      porMes[mes].push({ indicador: l.indicador, meta: l.meta, meta80: l.meta_80, meta60: l.meta_60, real: l.real })
    })
    return Object.keys(porMes)
      .sort()
      .map((mes) => calcularResultadoMes(mes, porMes[mes]))
  })()

  const salvarIndicador = useCallback(async (row) => {
    const res = await fetch('/api/bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const json = await res.json()
    if (json.erro) throw new Error(json.erro)
    await carregar(anoMes)
    await carregarHistorico()
  }, [anoMes, carregar, carregarHistorico])

  return (
    <BonusDataContext.Provider value={{
      anoMes, setAnoMes,
      resultado,
      resultadosPorMes,
      loading, error, isAdmin,
      salvarIndicador,
      recarregar: () => carregar(anoMes),
    }}>
      {children}
    </BonusDataContext.Provider>
  )
}

export function useBonusData() {
  const ctx = useContext(BonusDataContext)
  if (!ctx) throw new Error('useBonusData precisa estar dentro de BonusDataProvider')
  return ctx
}
