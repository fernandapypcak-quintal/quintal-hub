import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadTudo } from '../data/loader.js'
import { filterRowsByUnit } from '@/lib/units'

const KidsCtx = createContext(null)

// ── Helpers de agregação ──────────────────────────────────────────
export function agruparPorUnidade(linhas, extrairValor) {
  const mapa = {}
  linhas.forEach(l => {
    const chave = l.unidade || '(não informado)'
    const valor = extrairValor(l) || 0
    if (!mapa[chave]) mapa[chave] = { chave, valor: 0 }
    mapa[chave].valor += valor
  })
  return Object.values(mapa).sort((a, b) => b.valor - a.valor)
}

export function somar(linhas, extrair) {
  return linhas.reduce((acc, l) => acc + (extrair(l) || 0), 0)
}

// Agrupa qualquer array por mês (YYYY-MM extraído do campo "data") e soma
// um valor por linha. Usado na "Evolução Mensal".
export function agruparPorMes(linhas, extrairValor) {
  const mapa = {}
  linhas.forEach(l => {
    const mes = (l.data || '').slice(0, 7) // "2026-08-02" -> "2026-08"
    if (!mes) return
    const valor = extrairValor(l) || 0
    if (!mapa[mes]) mapa[mes] = 0
    mapa[mes] += valor
  })
  return mapa
}

// ── Provider ──────────────────────────────────────────────────────
export function KidsProvider({ children, allowedLojas = '*' }) {
  const [shows, setShows] = useState([])
  const [criancas, setCriancas] = useState([])
  const [inflaveis, setInflaveis] = useState([])
  const [combo, setCombo] = useState([])
  const [faturamentoDomShow, setFaturamentoDomShow] = useState([])
  const [entradasKids, setEntradasKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [unidadeFiltro, setUnidadeFiltro] = useState('Todas')
  // Por padrão, abre já no mês atual (mais útil no dia a dia); quem
  // quiser ver outro período/histórico completo usa os filtros/"limpar".
  const hoje = new Date()
  const primeiroDiaMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const ultimoDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString().slice(0, 10)

  const [dataInicio, setDataInicio] = useState(primeiroDiaMesAtual)
  const [dataFim, setDataFim] = useState(ultimoDiaMesAtual)

  useEffect(() => {
    loadTudo()
      .then(d => {
        const porUnidade = arr => filterRowsByUnit(arr || [], 'unidade', allowedLojas)

        const showsF = porUnidade(d.shows)
        const criancasF = porUnidade(d.criancas)
        const inflaveisF = porUnidade(d.inflaveis)
        const comboF = porUnidade(d.combo)
        const faturamentoF = porUnidade(d.faturamentoDomShow)
        const entradasF = porUnidade(d.entradasKids)

        setShows(showsF)
        setCriancas(criancasF)
        setInflaveis(inflaveisF)
        setCombo(comboF)
        setFaturamentoDomShow(faturamentoF)
        setEntradasKids(entradasF)

        const unicas = new Set(
          [...showsF, ...criancasF, ...inflaveisF, ...comboF, ...faturamentoF, ...entradasF]
            .map(l => l.unidade).filter(Boolean)
        )
        if (allowedLojas !== '*' && unicas.size === 1) {
          setUnidadeFiltro([...unicas][0])
        }

        console.log('[Kids] OK —', {
          shows: showsF.length,
          criancas: criancasF.length,
          inflaveis: inflaveisF.length,
          combo: comboF.length,
          faturamentoDomShow: faturamentoF.length,
          entradasKids: entradasF.length,
        })
      })
      .catch(e => { console.error('[Kids] Erro:', e); setError(e.message) })
      .finally(() => setLoading(false))
  }, [])

  const unidadesDisponiveis = useMemo(() => {
    const set = new Set(
      [...shows, ...criancas, ...inflaveis, ...combo, ...faturamentoDomShow, ...entradasKids]
        .map(l => l.unidade)
        .filter(Boolean)
    )
    return ['Todas', ...Array.from(set).sort()]
  }, [shows, criancas, inflaveis, combo, faturamentoDomShow, entradasKids])

  const filtra = (arr, campoData) => {
    let r = arr
    if (unidadeFiltro !== 'Todas') r = r.filter(l => l.unidade === unidadeFiltro)
    if (campoData && (dataInicio || dataFim)) {
      r = r.filter(l => {
        const d = l[campoData]
        // Antes, um registro sem data preenchida "passava direto" pelo
        // filtro (ficava sempre incluído) -- isso inflava os totais quando
        // algum dado vinha sem "data" válida. Agora, com o filtro ativo,
        // um registro sem data é excluído em vez de incluído por padrão.
        if (!d) return false
        if (dataInicio && d < dataInicio) return false
        if (dataFim && d > dataFim) return false
        return true
      })
    }
    return r
  }

  const showsFiltrados = useMemo(() => filtra(shows, 'data'), [shows, unidadeFiltro, dataInicio, dataFim])
  const criancasFiltradas = useMemo(() => filtra(criancas, 'data'), [criancas, unidadeFiltro, dataInicio, dataFim])
  const inflaveisFiltrados = useMemo(() => filtra(inflaveis, 'data'), [inflaveis, unidadeFiltro, dataInicio, dataFim])
  const comboFiltrado = useMemo(() => filtra(combo, 'data'), [combo, unidadeFiltro, dataInicio, dataFim])
  const faturamentoFiltrado = useMemo(() => filtra(faturamentoDomShow, 'data'), [faturamentoDomShow, unidadeFiltro, dataInicio, dataFim])
  const entradasFiltradas = useMemo(() => filtra(entradasKids, 'data'), [entradasKids, unidadeFiltro, dataInicio, dataFim])

  // Versões filtradas SÓ por unidade (ignora o filtro de data do topo) --
  // usadas pra calcular "vs mês anterior", que precisa ver pelo menos os
  // últimos 2 meses de histórico mesmo que o filtro de data esteja restrito
  // a 1 mês só (senão nunca teria o mês anterior pra comparar).
  const filtraSoUnidade = (arr) => unidadeFiltro !== 'Todas' ? arr.filter(l => l.unidade === unidadeFiltro) : arr
  const showsHistorico = useMemo(() => filtraSoUnidade(shows), [shows, unidadeFiltro])
  const criancasHistorico = useMemo(() => filtraSoUnidade(criancas), [criancas, unidadeFiltro])
  const inflaveisHistorico = useMemo(() => filtraSoUnidade(inflaveis), [inflaveis, unidadeFiltro])
  const comboHistorico = useMemo(() => filtraSoUnidade(combo), [combo, unidadeFiltro])
  const faturamentoHistorico = useMemo(() => filtraSoUnidade(faturamentoDomShow), [faturamentoDomShow, unidadeFiltro])
  const entradasHistorico = useMemo(() => filtraSoUnidade(entradasKids), [entradasKids, unidadeFiltro])

  return (
    <KidsCtx.Provider value={{
      loading, error,
      unidadeFiltro, setUnidadeFiltro, unidadesDisponiveis,
      dataInicio, setDataInicio, dataFim, setDataFim,
      shows: showsFiltrados,
      criancas: criancasFiltradas,
      inflaveis: inflaveisFiltrados,
      combo: comboFiltrado,
      faturamentoDomShow: faturamentoFiltrado,
      entradasKids: entradasFiltradas,
      // Só filtrados por unidade (ignoram data) -- pra base de "vs mês anterior"
      showsHistorico, criancasHistorico, inflaveisHistorico,
      comboHistorico, faturamentoHistorico, entradasHistorico,
    }}>
      {children}
    </KidsCtx.Provider>
  )
}

export function useKids() {
  const ctx = useContext(KidsCtx)
  if (!ctx) throw new Error('useKids fora do KidsProvider')
  return ctx
}
