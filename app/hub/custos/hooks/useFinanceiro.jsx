import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { loadContas, loadHistoricoUnificado, loadHistoricoCatUnificado, loadHistoricoDetalheTodos } from '../data/loader.js'

const FinanceiroCtx = createContext(null)

// ── Ordem cronológica ─────────────────────────────────────────
const ORDEM_MESES = [
  'Jan/24','Fev/24','Mar/24','Abr/24','Mai/24','Jun/24','Jul/24','Ago/24','Set/24','Out/24','Nov/24','Dez/24',
  'Jan/25','Fev/25','Mar/25','Abr/25','Mai/25','Jun/25','Jul/25','Ago/25','Set/25','Out/25','Nov/25','Dez/25',
  'Jan/26','Fev/26','Mar/26','Abr/26','Mai/26','Jun/26','Jul/26','Ago/26','Set/26','Out/26','Nov/26','Dez/26',
]

export function sortMesLabel(arr) {
  return [...arr].sort((a, b) => {
    const ia = ORDEM_MESES.indexOf(a)
    const ib = ORDEM_MESES.indexOf(b)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })
}

function normalizarMes(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  if (/^[A-Za-zÀ-ú]{3}\/\d{2}$/.test(s)) return s
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  if (/^\d{4}-\d{2}/.test(s)) {
    const [a, m] = s.split('-')
    return `${MESES[parseInt(m) - 1]}/${a.substring(2)}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return `${MESES[d.getMonth()]}/${String(d.getFullYear()).substring(2)}`
  return s
}

// ── Tipos ──────────────────────────────────────────────────────
export const TIPO_GRUPOS = {
  operacional: ['Fixo', 'Variável'],
  comCapex:    ['Fixo', 'Variável', 'Investimento'],
  tudo:        ['Fixo', 'Variável', 'Investimento', 'Fora'],
}

// ── Grupos de categorias ───────────────────────────────────────
export const GRUPOS_CATEGORIA = {
  todos:       null,
  pessoal:     ['Folha', 'Encargos', 'Benefícios', 'RH / Treinamento'],
  ocupacao:    ['Aluguel', 'Utilidades', 'Infraestrutura'],
  operacional: ['CMV', 'Embalagens', 'Mão de Obra Variável', 'Comissões'],
  fiscal:      ['Impostos', 'Financeiro', 'Rateio Holding'],
  comercial:   ['Marketing', 'Administrativo', 'Tecnologia', 'Jurídico'],
}

export function FinanceiroProvider({ children }) {
  // ── Dados brutos ──────────────────────────────────────────
  const [contas,          setContas]          = useState([])
  const [historicoRaw,    setHistoricoRaw]    = useState([])
  const [historicoCatRaw, setHistoricoCatRaw] = useState([])
  const [historicoDetRaw, setHistoricoDetRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Filtros ───────────────────────────────────────────────
  const [lojaFiltro,     setLojaFiltro]     = useState('Todas')
  const [mesFiltro,      setMesFiltro]      = useState('')
  const [tipoFiltro,     setTipoFiltro]     = useState('operacional')
  const [mesInicio,      setMesInicio]      = useState('')
  const [mesFim,         setMesFim]         = useState('')
  const [grupoCategoria, setGrupoCategoria] = useState('todos')

  // ── Carregamento inicial ──────────────────────────────────
  useEffect(() => {
    Promise.all([
      loadContas(),
      loadHistoricoUnificado(),
      loadHistoricoCatUnificado(),
      loadHistoricoDetalheTodos(),
    ]).then(([c, h, hc, hd]) => {
      const safe  = x => Array.isArray(x) ? x : []
      const normH = arr => safe(arr).map(x => ({ ...x, mes: normalizarMes(x.mes) }))

      const hN  = normH(h)
      const hcN = normH(hc)
      const hdN = normH(hd)

      const todosMeses = sortMesLabel([...new Set(hN.map(x => x.mes).filter(Boolean))])
      const mesPadrao  = todosMeses[todosMeses.length - 1] || ''

      setContas(safe(c))
      setHistoricoRaw(hN)
      setHistoricoCatRaw(hcN)
      setHistoricoDetRaw(hdN)
      setMesFiltro(mesPadrao)
      setMesFim(mesPadrao)
      setMesInicio(todosMeses.length > 1 ? todosMeses[0] : mesPadrao)

      console.log('[Financeiro] OK — meses:', todosMeses)
    })
    .catch(e => { console.error('[Financeiro] Erro:', e); setError(e.message) })
    .finally(() => setLoading(false))
  }, [])

  // ── Derived ───────────────────────────────────────────────
  const tiposAtivos      = TIPO_GRUPOS[tipoFiltro] || TIPO_GRUPOS.operacional
  const categoriasAtivas = GRUPOS_CATEGORIA[grupoCategoria] || null

  // Filtra por loja
  const porLoja = arr => lojaFiltro === 'Todas' ? arr : arr.filter(h => h.loja === lojaFiltro)

  // Filtra por intervalo de meses
  const porPeriodo = arr => {
    if (!mesInicio && !mesFim) return arr
    return arr.filter(h => {
      const im = ORDEM_MESES.indexOf(h.mes)
      const ii = mesInicio ? ORDEM_MESES.indexOf(mesInicio) : 0
      const ifm = mesFim   ? ORDEM_MESES.indexOf(mesFim)   : 9999
      return im >= ii && im <= ifm
    })
  }

  // Filtra por categorias do grupo
  const porGrupo = arr => {
    if (!categoriasAtivas) return arr
    return arr.filter(h => categoriasAtivas.includes(h.categoria))
  }

  // ── Histórico agregado (para gráficos) ───────────────────
  const historicoFiltrado = useMemo(() => {
    const map = {}
    historicoRaw
      .filter(h => h.tipo === 'Fixo')
      .filter(h => lojaFiltro === 'Todas' || h.loja === lojaFiltro)
      .forEach(h => {
        const key = h.mes + '||' + h.loja
        if (!map[key]) map[key] = { mes: h.mes, loja: h.loja, total_realizado: 0 }
        map[key].total_realizado += h.total_realizado
      })
    const arr   = Object.values(map)
    const ordem = sortMesLabel(arr.map(x => x.mes))
    return arr.sort((a, b) => ordem.indexOf(a.mes) - ordem.indexOf(b.mes))
  }, [historicoRaw, lojaFiltro])

  const historicoVariavelFiltrado = useMemo(() => {
    const tiposVar = tiposAtivos.filter(t => t !== 'Fixo')
    const map = {}
    historicoRaw
      .filter(h => tiposVar.includes(h.tipo))
      .filter(h => lojaFiltro === 'Todas' || h.loja === lojaFiltro)
      .forEach(h => {
        const key = h.mes + '||' + h.loja
        if (!map[key]) map[key] = { mes: h.mes, loja: h.loja, total_realizado: 0 }
        map[key].total_realizado += h.total_realizado
      })
    const arr   = Object.values(map)
    const ordem = sortMesLabel(arr.map(x => x.mes))
    return arr.sort((a, b) => ordem.indexOf(a.mes) - ordem.indexOf(b.mes))
  }, [historicoRaw, lojaFiltro, tiposAtivos])

  // ── historicoCat filtrado ─────────────────────────────────
  const historicoCatFixoFiltrado = useMemo(() => (
    porGrupo(porPeriodo(porLoja(historicoCatRaw.filter(h => h.tipo === 'Fixo'))))
  ), [historicoCatRaw, lojaFiltro, categoriasAtivas, mesInicio, mesFim])

  const historicoCatVariavelFiltrado = useMemo(() => {
    const tiposVar = tiposAtivos.filter(t => t !== 'Fixo')
    return porGrupo(porPeriodo(porLoja(historicoCatRaw.filter(h => tiposVar.includes(h.tipo)))))
  }, [historicoCatRaw, lojaFiltro, tiposAtivos, categoriasAtivas, mesInicio, mesFim])

  // ── historicoDetalhe filtrado ─────────────────────────────
  const historicoDetalheFixoFiltrado = useMemo(() => (
    porPeriodo(porLoja(historicoDetRaw.filter(h => h.tipo === 'Fixo')))
  ), [historicoDetRaw, lojaFiltro, mesInicio, mesFim])

  const historicoDetalheVariavelFiltrado = useMemo(() => {
    const tiposVar = tiposAtivos.filter(t => t !== 'Fixo')
    return porPeriodo(porLoja(historicoDetRaw.filter(h => tiposVar.includes(h.tipo))))
  }, [historicoDetRaw, lojaFiltro, tiposAtivos, mesInicio, mesFim])

  // ── Contas ────────────────────────────────────────────────
  const contasFiltradas = useMemo(() => {
    let r = contas
    if (lojaFiltro !== 'Todas') r = r.filter(c => c.centro === lojaFiltro)
    if (!tiposAtivos.includes('Fora')) r = r.filter(c => c.tipo !== 'Fora')
    return r
  }, [contas, lojaFiltro, tiposAtivos])

  // ── Meses disponíveis ─────────────────────────────────────
  const mesesDisponiveis = useMemo(() => {
    const set = new Set(historicoRaw.map(h => h.mes).filter(Boolean))
    return sortMesLabel(Array.from(set)).map(m => ({ value: m, label: m }))
  }, [historicoRaw])

  // ── KPIs contas ───────────────────────────────────────────
  const kpis = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const em7d = new Date(hoje.getTime() + 7 * 86400000)
    return {
      totalAPagar:  contasFiltradas.filter(c => c.status !== 'pago').reduce((s,c) => s+c.valor, 0),
      totalVencido: contasFiltradas.filter(c => c.status === 'vencido').reduce((s,c) => s+c.valor, 0),
      aVencer7d:    contasFiltradas.filter(c => c.status !== 'pago' && (() => { const d=new Date(c.vencimento); return d>=hoje&&d<=em7d })()).reduce((s,c) => s+c.valor, 0),
    }
  }, [contasFiltradas])

  return (
    <FinanceiroCtx.Provider value={{
      loading, error,
      contas, contasFiltradas,
      historicoRaw, historicoCatRaw,
      historicoFiltrado,
      historicoVariavelFiltrado,
      historicoCatFixoFiltrado,
      historicoCatVariavelFiltrado,
      historicoDetalheFixoFiltrado,
      historicoDetalheVariavelFiltrado,
      lojaFiltro,     setLojaFiltro,
      mesFiltro,      setMesFiltro,
      tipoFiltro,     setTipoFiltro,
      mesInicio,      setMesInicio,
      mesFim,         setMesFim,
      grupoCategoria, setGrupoCategoria,
      tiposAtivos,
      categoriasAtivas,
      mesesDisponiveis,
      kpis,
      // aliases de compatibilidade
      custosFiltrados:          [],
      custosVariaveisFiltrados: [],
    }}>
      {children}
    </FinanceiroCtx.Provider>
  )
}

export function useFinanceiro() {
  const ctx = useContext(FinanceiroCtx)
  if (!ctx) throw new Error('useFinanceiro fora do FinanceiroProvider')
  return ctx
}
