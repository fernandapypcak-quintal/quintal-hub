// app/hub/bonus/hooks/useBonusData.jsx
//
// Busca a apuração manual do ANO (não só do mês) via /api/bonus (proxy
// pro Apps Script QuintalBonus.gs) e calcula:
//  - resultado do mês selecionado (lib/bonus/scoring.ts: calcularResultadoMes)
//  - apuração semestral oficial (calcularResultadoAnual) — S1 Jan-Jun,
//    S2 Jul-Dez ou Jan-Dez se algum indicador não bateu nenhuma faixa em S1.
// Sem dimensão de loja — a meta coletiva é única para a rede.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { calcularResultadoMes, calcularResultadoAnual, INDICADORES_BONUS } from '@/lib/bonus/scoring'

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
  const ano = anoMes.slice(0, 4)

  const [linhasDoAno, setLinhasDoAno] = useState([]) // todas as linhas do ano selecionado
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const carregarAno = useCallback(async (anoRef) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bonus?ano=${anoRef}`).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      setLinhasDoAno(res.bonus || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarAno(ano)
  }, [ano, carregarAno])

  // -------- resultado do mês selecionado (visão mensal, informativa) --------
  const linhasDoMes = linhasDoAno
    .filter((l) => (l.mes_ref || '').slice(0, 7) === anoMes)
    .map((l) => ({
      indicador: l.indicador,
      meta: l.meta,
      meta80: l.meta_80,
      meta60: l.meta_60,
      real: l.real,
      observacao: l.observacao,
    }))

  const resultadoMes = calcularResultadoMes(anoMes, linhasDoMes)

  // -------- série mensal do ano, pro gráfico de tendência --------
  const resultadosPorMes = (() => {
    const porMes = {}
    linhasDoAno.forEach((l) => {
      const mes = (l.mes_ref || '').slice(0, 7)
      if (!mes) return
      if (!porMes[mes]) porMes[mes] = []
      porMes[mes].push({ indicador: l.indicador, meta: l.meta, meta80: l.meta_80, meta60: l.meta_60, real: l.real })
    })
    return Object.keys(porMes)
      .sort()
      .map((mes) => calcularResultadoMes(mes, porMes[mes]))
  })()

  // -------- apuração semestral oficial (S1 Jan-Jun / S2 Jul-Dez ou Jan-Dez) --------
  const realPorMesPorIndicador = {}
  const limiaresPorIndicador = {}
  INDICADORES_BONUS.forEach((cfg) => {
    realPorMesPorIndicador[cfg.key] = {}
  })
  linhasDoAno.forEach((l) => {
    const mm = (l.mes_ref || '').slice(5, 7)
    if (!mm) return
    if (!realPorMesPorIndicador[l.indicador]) realPorMesPorIndicador[l.indicador] = {}
    realPorMesPorIndicador[l.indicador][mm] = l.real
    // usa o limiar mais recente lançado no ano pra esse indicador
    if (l.meta != null) {
      limiaresPorIndicador[l.indicador] = { meta: l.meta, meta80: l.meta_80, meta60: l.meta_60 }
    }
  })

  const resultadoAnual = calcularResultadoAnual(Number(ano), realPorMesPorIndicador, limiaresPorIndicador)

  const salvarIndicador = useCallback(async (row) => {
    const res = await fetch('/api/bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const json = await res.json()
    if (json.erro) throw new Error(json.erro)
    await carregarAno(ano)
  }, [ano, carregarAno])

  return (
    <BonusDataContext.Provider value={{
      anoMes, setAnoMes,
      resultadoMes,
      resultadosPorMes,
      resultadoAnual,
      loading, error, isAdmin,
      salvarIndicador,
      recarregar: () => carregarAno(ano),
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
