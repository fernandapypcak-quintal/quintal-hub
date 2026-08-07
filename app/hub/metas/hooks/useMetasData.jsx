// app/hub/metas/hooks/useMetasData.jsx
//
// Junta duas fontes:
// 1. Indicadores manuais (CMV, Custo Folha, Custo Freela, NPS, Bandas)
//    via /api/metas (proxy pro Apps Script QuintalMetas.gs).
// 2. Faturamento (Meta + Real) — reaproveita a mesma fonte que já
//    alimenta o dashboard de Faturamento.
//
// Suporta visão Mês (1 mês) e Trimestre (agrega 3 meses: % por média,
// R$ por soma — mesma regra usada pro Total de cada gerente).
//
// Agrupa por gerente (lib/metas/gerentes.ts) e filtra pelas unidades
// permitidas do usuário — quem tem lojas:'*' (admin/diretor) vê os 3
// grupos; cada gerente só vê o próprio.

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { isUnitAllowed, unitIdFromString } from '@/lib/units'
import { GERENTES } from '@/lib/metas/gerentes'
import {
  calcularResultadoUnidade,
  calcularResultadoGerente,
  TIPO_AGREGACAO,
} from '@/lib/metas/scoring'
import { loadData } from '@/app/hub/faturamento/data/loader'

const FATURAMENTO_METAS_URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec'

const MetasDataContext = createContext(null)

function mesAtualStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function primeiroDiaDoMes(anoMes) {
  return `${anoMes}-01`
}

function trimestreDoMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number)
  const tri = Math.floor((mes - 1) / 3) + 1
  return `${ano}-Q${tri}`
}

function mesesDoTrimestre(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number)
  const triInicio = Math.floor((mes - 1) / 3) * 3 + 1 // 1, 4, 7 ou 10
  return [0, 1, 2].map((i) => `${ano}-${String(triInicio + i).padStart(2, '0')}`)
}

// -------------------------------------------------------------------
// Faturamento Real por loja/mês — total Casa+Delivery. Cache simples
// por mês pra não rebuscar o histórico completo repetidas vezes.
// -------------------------------------------------------------------
let _cacheFaturamentoRows = null

async function getFaturamentoRows() {
  if (!_cacheFaturamentoRows) {
    _cacheFaturamentoRows = await loadData(false)
  }
  return _cacheFaturamentoRows
}

async function buscarFaturamentoRealPorMes(anoMes) {
  try {
    const rows = await getFaturamentoRows()
    const porLoja = {}
    rows.filter((r) => r.Ano_Mes === anoMes).forEach((r) => {
      const id = unitIdFromString(r.Loja)
      if (!id) return
      porLoja[id] = (porLoja[id] || 0) + r.Valor
    })
    return porLoja
  } catch (e) {
    console.error('[Metas] erro ao buscar faturamento real:', e.message)
    return {}
  }
}

let _cacheFaturamentoMetas = null

async function buscarFaturamentoMetaPorMes(anoMes) {
  try {
    if (!_cacheFaturamentoMetas) {
      const res = await fetch(`${FATURAMENTO_METAS_URL}?tipo=metas`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.erro) throw new Error(json.erro)
      _cacheFaturamentoMetas = json.metas || []
    }
    const porLoja = {}
    _cacheFaturamentoMetas
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
// Monta os inputs de indicador de UMA unidade a partir das linhas
// manuais (de 1 ou mais meses) + faturamento (de 1 ou mais meses).
// Quando são vários meses (trimestre), agrega por média (%) ou soma (R$)
// antes de montar o input — assim o resto do pipeline nem sabe se é
// mês ou trimestre.
// -------------------------------------------------------------------
function agregarValores(tipo, valores) {
  const validos = valores.filter((v) => v != null)
  if (validos.length === 0) return null
  const soma = validos.reduce((a, b) => a + b, 0)
  return tipo === 'media' ? soma / validos.length : soma
}

function montarInputsDaUnidade(unidade, manuaisPorMes, faturamentoRealPorMes, faturamentoMetaPorMes) {
  const buscarSerie = (ind) =>
    manuaisPorMes.map((linhasDoMes) => linhasDoMes.find((l) => l.unidade === unidade && l.indicador === ind))

  const cmvSerie = buscarSerie('cmv')
  const folhaSerie = buscarSerie('custo_folha')
  const freelaSerie = buscarSerie('custo_freela')
  const npsSerie = buscarSerie('nps')
  const bandasCustoSerie = buscarSerie('bandas_custo_artista')
  const bandasArrecadSerie = buscarSerie('bandas_arrecadacao')

  const inputs = []

  const add = (indicador, serieMeta, serieReal, fallbackMeta) => {
    const meta = agregarValores(TIPO_AGREGACAO[indicador], serieMeta)
    const real = agregarValores(TIPO_AGREGACAO[indicador], serieReal)
    if (meta == null && real == null) return
    inputs.push({ indicador, meta: meta ?? fallbackMeta ?? 0, real: real ?? 0 })
  }

  add('cmv', cmvSerie.map((l) => l?.meta), cmvSerie.map((l) => l?.real))
  add('custo_folha', folhaSerie.map((l) => l?.meta), folhaSerie.map((l) => l?.real))
  add('custo_freela', freelaSerie.map((l) => l?.meta), freelaSerie.map((l) => l?.real))
  add('nps', npsSerie.map((l) => l?.meta), npsSerie.map((l) => l?.real), 85)

  const custoArtistaAgg = agregarValores('soma', bandasCustoSerie.map((l) => l?.real))
  const arrecadAgg = agregarValores('soma', bandasArrecadSerie.map((l) => l?.real))
  if (custoArtistaAgg != null || arrecadAgg != null) {
    inputs.push({
      indicador: 'bandas',
      meta: 0,
      real: arrecadAgg ?? 0,
      custoArtista: custoArtistaAgg ?? 0,
    })
  }

  const fatMeta = agregarValores('soma', faturamentoMetaPorMes.map((m) => m[unidade]))
  const fatReal = agregarValores('soma', faturamentoRealPorMes.map((m) => m[unidade]))
  if (fatMeta != null || fatReal != null) {
    inputs.push({ indicador: 'faturamento', meta: fatMeta ?? 0, real: fatReal ?? 0 })
  }

  return inputs
}

export function MetasDataProvider({ children, allowedLojas = '*', isAdmin = false }) {
  const [visao, setVisao] = useState('mes') // 'mes' | 'trimestre'
  const [anoMes, setAnoMes] = useState(mesAtualStr())
  const [manuaisPorMes, setManuaisPorMes] = useState([]) // array de arrays (1 ou 3 meses)
  const [faturamentoRealPorMes, setFaturamentoRealPorMes] = useState([])
  const [faturamentoMetaPorMes, setFaturamentoMetaPorMes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const carregar = useCallback(async (mesRef, visaoAtual) => {
    setLoading(true)
    setError(null)
    try {
      const meses = visaoAtual === 'trimestre' ? mesesDoTrimestre(mesRef) : [mesRef]

      const resultados = await Promise.all(
        meses.map(async (m) => {
          const [resManuais, real, meta] = await Promise.all([
            fetch(`/api/metas?mes_ref=${primeiroDiaDoMes(m)}`).then((r) => r.json()),
            buscarFaturamentoRealPorMes(m),
            buscarFaturamentoMetaPorMes(m),
          ])
          if (resManuais.erro) throw new Error(resManuais.erro)
          return { manuais: resManuais.metas || [], real, meta }
        })
      )

      setManuaisPorMes(resultados.map((r) => r.manuais))
      setFaturamentoRealPorMes(resultados.map((r) => r.real))
      setFaturamentoMetaPorMes(resultados.map((r) => r.meta))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar(anoMes, visao)
  }, [anoMes, visao, carregar])

  // Grupos de gerente visíveis pro usuário logado (admin/diretor vê os 3)
  const gruposVisiveis = useMemo(() => {
    return GERENTES.map((g) => ({
      ...g,
      unidades: allowedLojas === '*' ? g.unidades : g.unidades.filter((u) => isUnitAllowed(u, allowedLojas)),
    })).filter((g) => g.unidades.length > 0)
  }, [allowedLojas])

  const resultadosPorGerente = useMemo(() => {
    return gruposVisiveis.map((g) => {
      const unidadesResultado = g.unidades.map((unidade) => {
        const inputs = montarInputsDaUnidade(unidade, manuaisPorMes, faturamentoRealPorMes, faturamentoMetaPorMes)
        return calcularResultadoUnidade(unidade, anoMes, inputs)
      })
      return calcularResultadoGerente(g.id, g.nome, anoMes, unidadesResultado)
    })
  }, [gruposVisiveis, manuaisPorMes, faturamentoRealPorMes, faturamentoMetaPorMes, anoMes])

  const salvarIndicador = useCallback(async (row) => {
    const res = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const json = await res.json()
    if (json.erro) throw new Error(json.erro)
    await carregar(anoMes, visao)
  }, [anoMes, visao, carregar])

  return (
    <MetasDataContext.Provider value={{
      anoMes, setAnoMes,
      visao, setVisao,
      trimestreLabel: trimestreDoMes(anoMes),
      resultadosPorGerente,
      loading, error, isAdmin,
      salvarIndicador,
      recarregar: () => carregar(anoMes, visao),
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
