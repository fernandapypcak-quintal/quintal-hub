import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadTudo } from '../data/loader.js'
import { filterRowsByUnit } from '@/lib/units'

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

// ── Detecção de "Desperdício" ──────────────────────────────────────
function _normalizarTexto(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function _ehDesperdicio(campos) {
  return campos.some(c => _normalizarTexto(c).includes('desperdicio'))
}

// ── Provider ──────────────────────────────────────────────────────
export function RelatoriosProvider({ children, allowedLojas = '*' }) {
  const [descontos, setDescontos] = useState([])
  const [estornos, setEstornos] = useState([])
  const [contasAberto, setContasAberto] = useState([])
  const [bonusConcedido, setBonusConcedido] = useState([])
  const [bonusUtilizado, setBonusUtilizado] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [unidadeFiltro, setUnidadeFiltro] = useState('Todas')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    loadTudo()
      .then(d => {
        const porUnidade = arr => filterRowsByUnit(arr || [], 'unidade', allowedLojas)

        const descontosF      = porUnidade(d.descontos)
        const estornosF       = porUnidade(d.estornos)
        const contasAbertoF   = porUnidade(d.contasAberto)
        const bonusConcedidoF = porUnidade(d.bonusConcedido)
        const bonusUtilizadoF = porUnidade(d.bonusUtilizado)

        setDescontos(descontosF)
        setEstornos(estornosF)
        setContasAberto(contasAbertoF)
        setBonusConcedido(bonusConcedidoF)
        setBonusUtilizado(bonusUtilizadoF)

        const unicas = new Set(
          [...descontosF, ...estornosF, ...contasAbertoF, ...bonusConcedidoF, ...bonusUtilizadoF]
            .map(l => l.unidade).filter(Boolean)
        )
        if (allowedLojas !== '*' && unicas.size === 1) {
          setUnidadeFiltro([...unicas][0])
        }

        console.log('[Relatorios] OK —', {
          descontos: descontosF.length,
          estornos: estornosF.length,
          contasAberto: contasAbertoF.length,
          bonusConcedido: bonusConcedidoF.length,
          bonusUtilizado: bonusUtilizadoF.length,
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

  const filtra = (arr, campoData) => {
    let r = arr
    if (unidadeFiltro !== 'Todas') r = r.filter(l => l.unidade === unidadeFiltro)
    if (campoData && (dataInicio || dataFim)) {
      r = r.filter(l => {
        const d = l[campoData]
        if (!d) return true
        if (dataInicio && d < dataInicio) return false
        if (dataFim && d > dataFim) return false
        return true
      })
    }
    return r
  }

  const descontosFiltrados = useMemo(
    () => filtra(descontos, 'data'),
    [descontos, unidadeFiltro, dataInicio, dataFim]
  )
  const estornosFiltrados = useMemo(
    () => filtra(estornos, 'data'),
    [estornos, unidadeFiltro, dataInicio, dataFim]
  )
  const contasAbertoFiltradas = useMemo(
    () => filtra(contasAberto, null),
    [contasAberto, unidadeFiltro]
  )
  const bonusConcedidoFiltrado = useMemo(
    () => filtra(bonusConcedido, 'dataConcessao'),
    [bonusConcedido, unidadeFiltro, dataInicio, dataFim]
  )
  const bonusUtilizadoFiltrado = useMemo(
    () => filtra(bonusUtilizado, 'utilizadoEm'),
    [bonusUtilizado, unidadeFiltro, dataInicio, dataFim]
  )

  const { descontosSemDesperdicio, desperdicioDeDescontos } = useMemo(() => {
    const normal = []
    const desperdicio = []
    descontosFiltrados.forEach(d => {
      if (_ehDesperdicio([d.cliente, d.justificativa, d.categoria])) {
        desperdicio.push({
          origem: 'Desconto',
          data: d.data,
          unidade: d.unidade,
          canal: d.canal,
          responsavel: d.funcionario,
          cliente: d.cliente,
          motivo: d.justificativa,
          categoria: d.categoria,
          produto: d.produtos,
          valor: d.valor,
        })
      } else {
        normal.push(d)
      }
    })
    return { descontosSemDesperdicio: normal, desperdicioDeDescontos: desperdicio }
  }, [descontosFiltrados])

  const { estornosSemDesperdicio, desperdicioDeEstornos } = useMemo(() => {
    const normal = []
    const desperdicio = []
    estornosFiltrados.forEach(e => {
      const valorTotal = e.valorUnitario * (e.quantidade || 1)
      if (_ehDesperdicio([e.clientes, e.motivo, e.categoria])) {
        desperdicio.push({
          origem: 'Estorno',
          data: e.data,
          unidade: e.unidade,
          canal: e.canal,
          responsavel: e.estornadoPor,
          cliente: e.clientes,
          motivo: e.motivo,
          categoria: e.categoria,
          produto: e.produto,
          valor: valorTotal,
        })
      } else {
        normal.push(e)
      }
    })
    return { estornosSemDesperdicio: normal, desperdicioDeEstornos: desperdicio }
  }, [estornosFiltrados])

  const desperdicio = useMemo(
    () => [...desperdicioDeDescontos, ...desperdicioDeEstornos],
    [desperdicioDeDescontos, desperdicioDeEstornos]
  )

  return (
    <RelatoriosCtx.Provider value={{
      loading, error,
      unidadeFiltro, setUnidadeFiltro, unidadesDisponiveis,
      dataInicio, setDataInicio, dataFim, setDataFim,
      descontos: descontosSemDesperdicio,
      estornos: estornosSemDesperdicio,
      contasAberto: contasAbertoFiltradas,
      bonusConcedido: bonusConcedidoFiltrado,
      bonusUtilizado: bonusUtilizadoFiltrado,
      desperdicio,
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
