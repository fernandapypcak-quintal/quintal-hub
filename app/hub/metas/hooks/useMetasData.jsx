// app/hub/metas/hooks/useMetasData.jsx
//
// Junta duas fontes:
// 1. Indicadores manuais (CMV, Custo Folha, Custo Freela, NPS, Bandas)
//    via /api/metas (proxy pro Apps Script QuintalMetas.gs).
// 2. Faturamento (Meta + Real) — REAPROVEITA a mesma fonte que já
//    alimenta o dashboard de Faturamento, pra não duplicar regra de
//    negócio (corte do dia operacional, etc). Ver TODOs abaixo.

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { isUnitAllowed, unitIdFromString } from '@/lib/units'
import { calcularResultadoUnidade, calcularPontosMediaGerente } from '@/lib/metas/scoring'
import { loadData } from '@/app/hub/faturamento/data/loader'

// TODO: mesma URL do APPSCRIPT_URL em app/hub/faturamento/hooks/useMetas.jsx
// (fonte de Meta de faturamento por loja/mês). Deixei duplicado pra não
// tocar no módulo de Faturamento — se preferir, dá pra extrair pra uma
// constante compartilhada.
const FATURAMENTO_METAS_URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec'

const MetasDataContext = createContext(null)

function mesAtualStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function primeiroDiaDoMes(anoMes) {
  return `${anoMes}-01`
}

// -------------------------------------------------------------------
// Faturamento Real por loja/mês — total Casa+Delivery (confirmado).
// Reaproveita o mesmo loadData() do dashboard de Faturamento, então
// já vem com a mesma regra de corte de dia operacional / mesclagem
// histórico+ZIG usada lá.
// -------------------------------------------------------------------
let _cacheFaturamento = { anoMes: null, rows: null }

async function buscarFaturamentoReal(anoMes) {
  try {
    // cache simples por mês, pra não rebuscar o histórico completo
    // toda vez que o usuário troca de aba dentro do módulo de Metas
    if (_cacheFaturamento.anoMes !== anoMes) {
      const rows = await loadData(false)
      _cacheFaturamento = { anoMes, rows }
    }

    const porLoja = {}
    _cacheFaturamento.rows
      .filter((r) => r.Ano_Mes === anoMes)
      .forEach((r) => {
        const id = unitIdFromString(r.Loja)
        if (!id) return
        porLoja[id] = (porLoja[id] || 0) + r.Valor // Casa + Delivery somados
      })
    return porLoja
  } catch (e) {
    console.error('[Metas] erro ao buscar faturamento real:', e.message)
    return {}
  }
}

async function buscarFaturamentoMeta(anoMes) {
  try {
    const res = await fetch(`${FATURAMENTO_METAS_URL}?tipo=metas`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.erro) throw new Error(json.erro)

    const porLoja = {}
    ;(json.metas || [])
      .filter((m) => (m.Ano_Mes || '') === anoMes)
      .forEach((m) => {
        const id = unitIdFromString(m.Loja)
        if (id) porLoja[id] = parseFloat(m.Meta) || 0
      })
    return porLoja
  } catch (e) {
    console.error('[Metas] erro ao buscar meta de faturamento:', e.message)
    return {}
  }
}

// -------------------------------------------------------------------

export function MetasDataProvider({ children, allowedLojas = '*', isAdmin = false }) {
  const [manuais, setManuais] = useState([]) // linhas cruas de /api/metas
  const [faturamentoReal, setFaturamentoReal] = useState({})
  const [faturamentoMeta, setFaturamentoMeta] = useState({})
  const [anoMes, setAnoMes] = useState(mesAtualStr())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const carregar = useCallback(async (mesRef) => {
    setLoading(true)
    setError(null)
    try {
      const [resManuais, real, meta] = await Promise.all([
        fetch(`/api/metas?mes_ref=${primeiroDiaDoMes(mesRef)}`).then((r) => r.json()),
        buscarFaturamentoReal(mesRef),
        buscarFaturamentoMeta(mesRef),
      ])

      if (resManuais.erro) throw new Error(resManuais.erro)

      setManuais(resManuais.metas || [])
      setFaturamentoReal(real)
      setFaturamentoMeta(meta)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar(anoMes)
  }, [anoMes, carregar])

  // Monta o resultado (com pontuação) de cada unidade permitida
  const resultadosPorUnidade = useMemo(() => {
    const unidadesPermitidas = allowedLojas === '*'
      ? [...new Set(manuais.map((m) => m.unidade))]
      : allowedLojas

    return unidadesPermitidas
      .filter((unidade) => isUnitAllowed(unidade, allowedLojas))
      .map((unidade) => {
        const linhasDaUnidade = manuais.filter((m) => m.unidade === unidade)
        const buscar = (ind) => linhasDaUnidade.find((l) => l.indicador === ind)

        const cmv = buscar('cmv')
        const folha = buscar('custo_folha')
        const freela = buscar('custo_freela')
        const nps = buscar('nps')
        const bandasCusto = buscar('bandas_custo_artista')
        const bandasArrecadacao = buscar('bandas_arrecadacao')

        const inputs = []
        if (cmv) inputs.push({ indicador: 'cmv', meta: cmv.meta ?? 0, real: cmv.real ?? 0 })
        if (folha) inputs.push({ indicador: 'custo_folha', meta: folha.meta ?? 0, real: folha.real ?? 0 })
        if (freela) inputs.push({ indicador: 'custo_freela', meta: freela.meta ?? 0, real: freela.real ?? 0 })
        if (nps) inputs.push({ indicador: 'nps', meta: nps.meta ?? 85, real: nps.real ?? 0 })
        if (bandasArrecadacao) {
          inputs.push({
            indicador: 'bandas',
            meta: bandasArrecadacao.meta ?? 0,
            real: bandasArrecadacao.real ?? 0,
            custoArtista: bandasCusto?.real ?? 0,
          })
        }
        if (faturamentoMeta[unidade] != null || faturamentoReal[unidade] != null) {
          inputs.push({
            indicador: 'faturamento',
            meta: faturamentoMeta[unidade] ?? 0,
            real: faturamentoReal[unidade] ?? 0,
          })
        }

        return calcularResultadoUnidade(unidade, primeiroDiaDoMes(anoMes), inputs)
      })
  }, [manuais, faturamentoReal, faturamentoMeta, allowedLojas, anoMes])

  const pontosMedia = useMemo(() => calcularPontosMediaGerente(resultadosPorUnidade), [resultadosPorUnidade])

  const salvarIndicador = useCallback(async (row) => {
    const res = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const json = await res.json()
    if (json.erro) throw new Error(json.erro)
    await carregar(anoMes) // recarrega pra refletir o que foi salvo
  }, [anoMes, carregar])

  return (
    <MetasDataContext.Provider value={{
      anoMes, setAnoMes,
      resultadosPorUnidade, pontosMedia,
      loading, error, isAdmin,
      salvarIndicador,
      recarregar: () => carregar(anoMes),
    }}>
      {children}
    </MetasDataContext.Provider>
  )
}

export function useMetasData() {
  const ctx = useContext(MetasDataContext)
  if (!ctx) throw new Error('useMetasData precisa estar dentro de MetasDataProvider')
  return ctx
}
