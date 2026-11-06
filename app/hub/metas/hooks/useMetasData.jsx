// app/hub/metas/hooks/useMetasData.jsx
//
// As REGRAS (indicadores, pesos, regionais, críticas) vêm do banco via
// /api/metas/regras (editadas na aba Regras), pela vigência do mês
// selecionado. Se o banco falhar, valem as regras padrão de
// lib/metas/config.ts. Este hook busca os dados e entrega para o cálculo.
//
// Fontes:
// 1. Lançamentos manuais (CMV, Custo c/ pessoas, NPS, metas por canal…)
//    via /api/metas (Apps Script QuintalMetas.gs) — UMA chamada com a
//    planilha inteira; filtragem por mês no cliente (chamadas paralelas
//    no Apps Script travam/estouram timeout).
// 2. Faturamento real (total e por canal CASA/DELIVERY) e meta de
//    faturamento — mesma fonte do dashboard Faturamento.
// 3. Desconto + estorno (+ desperdício) por unidade/mês — /api/metas/perdas,
//    que resume o Relatório de Descontos. Carrega em segundo plano
//    (é lento) e só se a vigência usar esse indicador.
//
// Visão Mês (1 mês) ou Trimestre (3 meses agregados por média/soma,
// conforme a `agregacao` de cada indicador).

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { isUnitAllowed, unitIdFromString, ALL_UNIT_IDS } from '@/lib/units'
import { vigenciaDoMes, VIGENCIAS_PADRAO } from '@/lib/metas/config'
import {
  calcularResultadoUnidade,
  calcularResultadoGerente,
  pontuarUnidade,
  compararPorMetasBatidas,
  agregar,
} from '@/lib/metas/scoring'
import { loadData, buscarTipo } from '@/app/hub/faturamento/data/loader'

const MetasDataContext = createContext(null)

const pad2 = (n) => String(n).padStart(2, '0')

function mesAtualStr() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
}

function mesAnterior(anoMes) {
  const [a, m] = anoMes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${pad2(m - 1)}`
}

function trimestreDoMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number)
  return `${ano}-Q${Math.floor((mes - 1) / 3) + 1}`
}

function mesesDoTrimestre(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number)
  const ini = Math.floor((mes - 1) / 3) * 3 + 1
  return [0, 1, 2].map((i) => `${ano}-${pad2(ini + i)}`)
}

/** Fração do mês já decorrida (1 para meses fechados) — usada para proporcionalizar metas "vs mês anterior". */
function fracaoDoMes(anoMes) {
  if (anoMes !== mesAtualStr()) return 1
  const hoje = new Date()
  const dias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  return hoje.getDate() / dias
}

// -------------------------------------------------------------------
// Caches em memória (por sessão)
// -------------------------------------------------------------------
async function getRegras() {
  try {
    const res = await fetch('/api/metas/regras', { cache: 'no-store' }).then((r) => r.json())
    if (res.erro || !Array.isArray(res.vigencias)) throw new Error(res.erro || 'resposta inválida')
    return { vigencias: res.vigencias, aviso: res.aviso || null, mesAtual: res.mesAtual, isAdmin: !!res.isAdmin }
  } catch (e) {
    console.error('[Metas] erro ao buscar regras:', e.message)
    return { vigencias: VIGENCIAS_PADRAO, aviso: 'Não consegui carregar as regras salvas: usando as regras padrão.', mesAtual: mesAtualStr(), isAdmin: false }
  }
}

let _cacheManuais = null
async function getTodosManuais() {
  if (!_cacheManuais) {
    const res = await fetch('/api/metas').then((r) => r.json())
    if (res.erro) throw new Error(res.erro)
    _cacheManuais = res.metas || []
  }
  return _cacheManuais
}
function invalidarCacheManuais() {
  _cacheManuais = null
}

/** { 'YYYY-MM': { unitId: { total, CASA, DELIVERY } } } */
let _cacheFatReal = null
async function getFaturamentoReal() {
  if (!_cacheFatReal) {
    try {
      const rows = await loadData(false)
      const idx = {}
      rows.forEach((r) => {
        const id = unitIdFromString(r.Loja)
        if (!id) return
        idx[r.Ano_Mes] ??= {}
        const u = (idx[r.Ano_Mes][id] ??= { total: 0 })
        u.total += r.Valor
        u[r.Canal] = (u[r.Canal] || 0) + r.Valor
      })
      _cacheFatReal = idx
    } catch (e) {
      console.error('[Metas] erro ao buscar faturamento real:', e.message)
      return {}
    }
  }
  return _cacheFatReal
}

/** { 'YYYY-MM': { unitId: { total, CASA, DELIVERY } } } — CASA/DELIVERY só se a meta foi separada por canal */
let _cacheFatMeta = null
async function getFaturamentoMeta() {
  if (!_cacheFatMeta) {
    try {
      const { json } = await buscarTipo('metas', 'metas')
      const idx = {}
      const num = (v) => (v === '' || v == null || Number.isNaN(parseFloat(v)) ? null : parseFloat(v))
      ;(json.metas || []).forEach((m) => {
        const id = unitIdFromString(m.Loja)
        if (!id || !m.Ano_Mes) return
        idx[m.Ano_Mes] ??= {}
        idx[m.Ano_Mes][id] = { total: num(m.Meta) ?? 0, CASA: num(m.Meta_Salao), DELIVERY: num(m.Meta_Delivery) }
      })

      // Meta por canal (salão/delivery) direto da planilha Quintal Dashboard, via
      // /api/faturamento/metas — a cópia publicada (CSV) pode não levar essas colunas.
      // Se a gravação ainda não estiver configurada, segue só com o total do CSV.
      try {
        const res = await fetch('/api/faturamento/metas', { cache: 'no-store' }).then((r) => r.json())
        ;(res.metas || []).forEach((m) => {
          const id = unitIdFromString(m.Loja)
          if (!id || !m.Ano_Mes) return
          idx[m.Ano_Mes] ??= {}
          const atual = idx[m.Ano_Mes][id] || { total: 0, CASA: null, DELIVERY: null }
          idx[m.Ano_Mes][id] = {
            total: num(m.Meta) ?? atual.total,
            CASA: num(m.Meta_Salao) ?? atual.CASA,
            DELIVERY: num(m.Meta_Delivery) ?? atual.DELIVERY,
          }
        })
      } catch (e) {
        console.warn('[Metas] meta por canal indisponível:', e.message)
      }

      _cacheFatMeta = idx
    } catch (e) {
      console.error('[Metas] erro ao buscar meta de faturamento:', e.message)
      return {}
    }
  }
  return _cacheFatMeta
}

/** { 'YYYY-MM': { unitId: { descontos, estornos, total } } } */
let _cachePerdas = null
async function getPerdas() {
  if (!_cachePerdas) {
    const res = await fetch('/api/metas/perdas').then((r) => r.json())
    if (res.erro) throw new Error(res.erro)
    _cachePerdas = res.porMes || {}
  }
  return _cachePerdas
}

// -------------------------------------------------------------------
// Leitura de UM indicador, de UMA unidade, em UM mês
// -------------------------------------------------------------------
function linhaManual(dados, anoMes, unidade, chave) {
  const mesRef = `${anoMes}-01`
  return dados.manuais.find((l) => l.mes_ref === mesRef && l.unidade === unidade && l.indicador === chave)
}

function realDoMes(cfg, dados, anoMes, unidade) {
  switch (cfg.real.tipo) {
    case 'manual':
      return linhaManual(dados, anoMes, unidade, cfg.real.chaveManual || cfg.key)?.real ?? null
    case 'faturamento': {
      const u = dados.fatReal[anoMes]?.[unidade]
      if (!u) return null
      return cfg.real.canal ? u[cfg.real.canal] ?? 0 : u.total
    }
    case 'perdas':
      if (!dados.perdas) return null
      return dados.perdas[anoMes]?.[unidade]?.total ?? null
    case 'bandas':
      return linhaManual(dados, anoMes, unidade, 'bandas_arrecadacao')?.real ?? null
    default:
      return null
  }
}

function metaDoMes(cfg, dados, anoMes, unidade) {
  // meta lançada no Admin sempre tem prioridade
  const manual = linhaManual(dados, anoMes, unidade, cfg.key)?.meta
  if (manual != null) return manual

  switch (cfg.meta.tipo) {
    case 'fixa':
      return cfg.meta.valor
    case 'faturamento': {
      const m = dados.fatMeta[anoMes]?.[unidade]
      if (!m) return null
      return cfg.meta.canal ? m[cfg.meta.canal] ?? null : m.total
    }
    case 'reducaoMesAnterior': {
      const anterior = realDoMes(cfg, dados, mesAnterior(anoMes), unidade)
      if (anterior == null) return null
      return anterior * (1 - cfg.meta.pct) * fracaoDoMes(anoMes)
    }
    default:
      return null
  }
}

function montarInputsDaUnidade(vigencia, unidade, meses, dados) {
  const inputs = []
  vigencia.indicadores.forEach((cfg) => {
    if (cfg.real.tipo === 'bandas') {
      const arrecad = agregar('soma', meses.map((m) => realDoMes(cfg, dados, m, unidade)))
      const custo = agregar('soma', meses.map((m) => linhaManual(dados, m, unidade, 'bandas_custo_artista')?.real))
      if (arrecad == null && custo == null) return
      inputs.push({ indicador: cfg.key, meta: 0, real: arrecad ?? 0, custoArtista: custo ?? 0 })
      return
    }
    const meta = agregar(cfg.agregacao, meses.map((m) => metaDoMes(cfg, dados, m, unidade)))
    const real = agregar(cfg.agregacao, meses.map((m) => realDoMes(cfg, dados, m, unidade)))
    if (meta == null && real == null) return
    inputs.push({ indicador: cfg.key, meta, real })
  })
  return inputs
}

export function MetasDataProvider({ children, allowedLojas = '*', isAdmin = false }) {
  const [visao, setVisao] = useState('mes') // 'mes' | 'trimestre'
  const [anoMes, setAnoMes] = useState(mesAtualStr())
  const [dados, setDados] = useState({ manuais: [], fatReal: {}, fatMeta: {}, perdas: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [perdasStatus, setPerdasStatus] = useState('ocioso') // ocioso | carregando | ok | erro
  const [regras, setRegras] = useState({ vigencias: VIGENCIAS_PADRAO, aviso: null, mesAtual: mesAtualStr(), isAdmin: false })

  const vigencia = useMemo(() => vigenciaDoMes(regras.vigencias, anoMes), [regras.vigencias, anoMes])
  const meses = useMemo(() => (visao === 'trimestre' ? mesesDoTrimestre(anoMes) : [anoMes]), [anoMes, visao])
  const usaPerdas = vigencia.indicadores.some((i) => i.real.tipo === 'perdas')

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [regrasCarregadas, manuais] = await Promise.all([getRegras(), getTodosManuais()])
      setRegras(regrasCarregadas)
      const [fatReal, fatMeta] = await Promise.all([getFaturamentoReal(), getFaturamentoMeta()])
      setDados((d) => ({ ...d, manuais, fatReal, fatMeta }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Desconto/estorno: lento, carrega em segundo plano só quando a vigência usa
  useEffect(() => {
    if (!usaPerdas || dados.perdas || perdasStatus === 'carregando' || perdasStatus === 'erro') return
    setPerdasStatus('carregando')
    getPerdas()
      .then((perdas) => {
        setDados((d) => ({ ...d, perdas }))
        setPerdasStatus('ok')
      })
      .catch((e) => {
        console.error('[Metas] erro ao buscar descontos/estornos:', e.message)
        setPerdasStatus('erro')
      })
  }, [usaPerdas, dados.perdas, perdasStatus])

  // Regionais visíveis pro usuário (admin/diretor vê todos)
  const gruposVisiveis = useMemo(() => {
    return vigencia.regionais
      .map((g) => ({
        ...g,
        unidades: allowedLojas === '*' ? g.unidades : g.unidades.filter((u) => isUnitAllowed(u, allowedLojas)),
      }))
      .filter((g) => g.unidades.length > 0)
  }, [vigencia, allowedLojas])

  const resultadosPorGerente = useMemo(() => {
    return gruposVisiveis.map((g) => {
      const unidadesResultado = g.unidades.map((unidade) =>
        calcularResultadoUnidade(vigencia, unidade, anoMes, montarInputsDaUnidade(vigencia, unidade, meses, dados))
      )
      return { ...calcularResultadoGerente(vigencia, g.id, g.nome, anoMes, unidadesResultado), cor: g.cor }
    })
  }, [gruposVisiveis, vigencia, meses, dados, anoMes])

  // Visão por Unidade — todas as unidades (inclui as sem regional), só admin/diretor
  const rankingUnidades = useMemo(() => {
    if (allowedLojas !== '*') return null
    const gerentePorUnidade = {}
    vigencia.regionais.forEach((g) => g.unidades.forEach((u) => { gerentePorUnidade[u] = g }))

    return ALL_UNIT_IDS.filter((u) => u !== 'holding')
      .map((unidade) => {
        const res = calcularResultadoUnidade(vigencia, unidade, anoMes, montarInputsDaUnidade(vigencia, unidade, meses, dados))
        const g = gerentePorUnidade[unidade]
        return {
          ...pontuarUnidade(vigencia, res),
          gerenteId: g?.id ?? null,
          gerenteNome: g?.nome ?? 'Sem regional',
          gerenteCor: g?.cor ?? null,
          critica: vigencia.unidadesCriticas.includes(unidade),
        }
      })
      .sort(compararPorMetasBatidas)
  }, [allowedLojas, vigencia, meses, dados, anoMes])

  const salvarIndicador = useCallback(async (row) => {
    const res = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    })
    const json = await res.json()
    if (json.erro) throw new Error(json.erro)
    invalidarCacheManuais()
    await carregar()
  }, [carregar])

  return (
    <MetasDataContext.Provider value={{
      anoMes, setAnoMes,
      visao, setVisao,
      trimestreLabel: trimestreDoMes(anoMes),
      vigencia,
      vigencias: regras.vigencias,
      avisoRegras: regras.aviso,
      mesAtualServidor: regras.mesAtual,
      recarregarRegras: async () => setRegras(await getRegras()),
      resultadosPorGerente,
      rankingUnidades,
      perdasStatus,
      loading, error, isAdmin,
      salvarIndicador,
      recarregar: () => { invalidarCacheManuais(); carregar() },
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
