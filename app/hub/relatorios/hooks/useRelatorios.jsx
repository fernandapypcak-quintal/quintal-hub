import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadTudo } from '../data/loader.js'

const RelatoriosCtx = createContext(null)

// ── Helpers de agregação (usados pelas páginas) ──────────────────
export function agruparPorChave(linhas, extrairChave, extrairValor, extrairQtd) {
  const mapa = {}
  linhas.forEach(l => {
    const chave = extrairChave(l) || '(não informado)'
    const valor = extrairValor(l) || 0
    const qtd = extrairQtd ? extrairQtd(l) : 1
    if (!mapa[chave]) mapa[chave] = { chave, qtd: 0, valor: 0 }
    mapa[chave].qtd += qtd
    mapa[chave].valor += valor
  })
  return Object.values(mapa).sort((a, b) => b.valor - a.valor)
}

export function agruparPorUnidade(linhas, extrairValor, extrairQtd) {
  return agruparPorChave(linhas, l => l.unidade, extrairValor, extrairQtd)
}

export function crossTab(linhas, extrairDim1, extrairDim2, extrairValor, extrairQtd) {
  const mapa = {}
  linhas.forEach(l => {
    const d1 = extrairDim1(l) || '(sem informação)'
    const d2 = extrairDim2(l) || '(sem informação)'
    const valor = extrairValor(l) || 0
    const qtd = extrairQtd ? extrairQtd(l) : 1
    const chave = `${d1}||${d2}`
    if (!mapa[chave]) mapa[chave] = { dimensao1: d1, dimensao2: d2, qtd: 0, valor: 0 }
    mapa[chave].qtd += qtd
    mapa[chave].valor += valor
  })
  return Object.values(mapa).sort((a, b) => b.valor - a.valor)
}

export function contarDistintos(linhas, extrairChave) {
  return new Set(linhas.map(l => extrairChave(l) || '(não informado)')).size
}

export function somar(linhas, extrair) {
  return linhas.reduce((acc, l) => acc + (extrair(l) || 0), 0)
}

// ── Provider ──────────────────────────────────────────────────────
export function RelatoriosProvider({ children }) {
  const [descontos, setDescontos] = useState([])
  const [estornos, setEstornos] = useState([])
  const [contasAberto, setContasAberto] = useState([])
  const [bonusConcedido, setBonusConcedido] = useState([])
  const [bonusUtilizado, setBonusUtilizado] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [unidadeFiltro, setUnidadeFiltro] = useState('Todas')

  useEffect(() => {
    loadTudo()
      .then(d => {
        setDescontos(d.descontos)
        setEstornos(d.estornos)
        setContasAberto(d.contasAberto)
        setBonusConcedido(d.bonusConcedido)
        setBonusUtilizado(d.bonusUtilizado)
        console.log('[Relatorios] OK —', {
          descontos: d.descontos.length,
          estornos: d.estornos.length,
          contasAberto: d.contasAberto.length,
          bonusConcedido: d.bonusConcedido.length,
          bonusUtilizado: d.bonusUtilizado.length,
        })
      })
      .catch(e => { console.error('[Relatorios] Erro:', e); setError(e.message) })
      .finally(() => setLoading(false))
  }, [])

  const unidadesDisponiveis = useMemo(() => {
    const set = new Set(
      [...descontos, ...estornos, ...contasAberto, ...bonusConcedido, ...bonusUtilizado]
        .map(l => l.unidade)
        .filter(Boolean)
    )
    return ['Todas', ...Array.from(set).sort()]
  }, [descontos, estornos, contasAberto, bonusConcedido, bonusUtilizado])

  const filtra = arr => (unidadeFiltro === 'Todas' ? arr : arr.filter(l => l.unidade === unidadeFiltro))

  const descontosFiltrados = useMemo(() => filtra(descontos), [descontos, unidadeFiltro])
  const estornosFiltrados = useMemo(() => filtra(estornos), [estornos, unidadeFiltro])
  const contasAbertoFiltradas = useMemo(() => filtra(contasAberto), [contasAberto, unidadeFiltro])
  const bonusConcedidoFiltrado = useMemo(() => filtra(bonusConcedido), [bonusConcedido, unidadeFiltro])
  const bonusUtilizadoFiltrado = useMemo(() => filtra(bonusUtilizado), [bonusUtilizado, unidadeFiltro])

  return (
    <RelatoriosCtx.Provider value={{
      loading, error,
      unidadeFiltro, setUnidadeFiltro, unidadesDisponiveis,
      descontos: descontosFiltrados,
      estornos: estornosFiltrados,
      contasAberto: contasAbertoFiltradas,
      bonusConcedido: bonusConcedidoFiltrado,
      bonusUtilizado: bonusUtilizadoFiltrado,
    }}>
      {children}
    </RelatoriosCtx.Provider>
  )
}

export function useRelatorios() {
  const ctx = useContext(RelatoriosCtx)
  if (!ctx) throw new Error('useRelatorios fora do RelatoriosProvider')
  return ctx
}
