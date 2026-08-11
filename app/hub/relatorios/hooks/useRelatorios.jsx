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

// Agrupa por chave (igual agruparPorChave) e devolve já ordenado por valor
// desc, com % do total e % acumulado — no mesmo formato da análise de
// Pareto (tabela dinâmica "Rótulos de Linha / Soma / % Acumulado / %").
export function paretoPorChave(linhas, extrairChave, extrairValor, extrairQtd) {
  const base = agruparPorChave(linhas, extrairChave, extrairValor, extrairQtd)
  const total = base.reduce((acc, l) => acc + l.valor, 0)
  let acumulado = 0
  return base.map(l => {
    acumulado += l.valor
    return {
      ...l,
      percentual: total > 0 ? l.valor / total : 0,
      percentualAcumulado: total > 0 ? acumulado / total : 0,
    }
  })
}

export function contarDistintos(linhas, extrairChave) {
  return new Set(linhas.map(l => extrairChave(l) || '(não informado)')).size
}

export function somar(linhas, extrair) {
  return linhas.reduce((acc, l) => acc + (extrair(l) || 0), 0)
}

// ── Comparativo de dois períodos quaisquer, por unidade + série diária
// (pra dar pra ver a tendência num gráfico, dia a dia). Usa SEMPRE o
// dataset completo (não respeita o filtro de data do cabeçalho, senão não
// teria como comparar dois períodos diferentes ao mesmo tempo) -- só
// respeita a permissão de lojas do usuário.
function _pad2(n) { return String(n).padStart(2, '0') }

function _formatarYMD(d) {
  return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`
}

function _diffDias(iniStr, fimStr) {
  const ini = new Date(iniStr + 'T00:00:00')
  const fim = new Date(fimStr + 'T00:00:00')
  return Math.round((fim - ini) / 86400000)
}

function _somarDias(dataStr, n) {
  const d = new Date(dataStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return _formatarYMD(d)
}

// Período padrão: do dia 1 do mês atual até hoje.
export function periodoMesAtual() {
  const hoje = new Date()
  return {
    inicio: `${hoje.getFullYear()}-${_pad2(hoje.getMonth() + 1)}-01`,
    fim: _formatarYMD(hoje),
  }
}

// Período padrão: mesmo intervalo de dias do mês anterior (ex: se hoje é
// dia 10, pega do dia 1 ao dia 10 do mês anterior).
export function periodoMesAnterior() {
  const hoje = new Date()
  const ref = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const diasNoMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
  const diaFim = Math.min(hoje.getDate(), diasNoMes)
  return {
    inicio: `${ref.getFullYear()}-${_pad2(ref.getMonth() + 1)}-01`,
    fim: `${ref.getFullYear()}-${_pad2(ref.getMonth() + 1)}-${_pad2(diaFim)}`,
  }
}

// periodoAtual / periodoAnterior: { inicio: 'yyyy-MM-dd', fim: 'yyyy-MM-dd' }
export function compararPeriodos(linhas, campoData, extrairValor, periodoAtual, periodoAnterior) {
  const porUnidade = {}
  const porDiaAtual = {}
  const porDiaAnterior = {}

  linhas.forEach(l => {
    const data = l[campoData]
    if (!data) return
    const unidade = l.unidade || '(sem unidade)'
    const valor = extrairValor(l) || 0

    if (data >= periodoAtual.inicio && data <= periodoAtual.fim) {
      if (!porUnidade[unidade]) porUnidade[unidade] = { unidade, atual: 0, qtdAtual: 0, anterior: 0, qtdAnterior: 0 }
      porUnidade[unidade].atual += valor
      porUnidade[unidade].qtdAtual += 1
      const offset = _diffDias(periodoAtual.inicio, data)
      porDiaAtual[offset] = (porDiaAtual[offset] || 0) + valor
    } else if (data >= periodoAnterior.inicio && data <= periodoAnterior.fim) {
      if (!porUnidade[unidade]) porUnidade[unidade] = { unidade, atual: 0, qtdAtual: 0, anterior: 0, qtdAnterior: 0 }
      porUnidade[unidade].anterior += valor
      porUnidade[unidade].qtdAnterior += 1
      const offset = _diffDias(periodoAnterior.inicio, data)
      porDiaAnterior[offset] = (porDiaAnterior[offset] || 0) + valor
    }
  })

  const calcVariacao = (atual, anterior) => {
    if (anterior > 0) return (atual - anterior) / anterior
    if (atual > 0) return 1
    return 0
  }

  const linhasResultado = Object.values(porUnidade)
    .map(l => ({ ...l, variacao: calcVariacao(l.atual, l.anterior) }))
    .sort((a, b) => b.atual - a.atual)

  const totalAtual = linhasResultado.reduce((acc, l) => acc + l.atual, 0)
  const totalAnterior = linhasResultado.reduce((acc, l) => acc + l.anterior, 0)

  // Série diária alinhada por "dia N do período" (não pela data em si),
  // pra dar pra sobrepor visualmente os dois períodos mesmo que tenham
  // durações diferentes.
  const maxOffset = Math.max(
    _diffDias(periodoAtual.inicio, periodoAtual.fim),
    _diffDias(periodoAnterior.inicio, periodoAnterior.fim)
  )
  const porDia = []
  for (let i = 0; i <= maxOffset; i++) {
    const dataAtualDia = _somarDias(periodoAtual.inicio, i)
    const dataAnteriorDia = _somarDias(periodoAnterior.inicio, i)
    porDia.push({
      dia: i + 1,
      dataAtual: dataAtualDia <= periodoAtual.fim ? dataAtualDia : null,
      valorAtual: porDiaAtual[i] || 0,
      dataAnterior: dataAnteriorDia <= periodoAnterior.fim ? dataAnteriorDia : null,
      valorAnterior: porDiaAnterior[i] || 0,
    })
  }

  return {
    linhas: linhasResultado,
    totalAtual,
    totalAnterior,
    variacaoTotal: calcVariacao(totalAtual, totalAnterior),
    porDia,
    periodoAtual,
    periodoAnterior,
  }
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
          motivoCompleto: d.motivoCompleto,
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
          motivoCompleto: e.motivoCompleto,
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

  // ── Versões "brutas": mesmo split de desperdício, mas aplicado ao
  // dataset completo (sem o filtro de data do cabeçalho) -- é o que
  // alimenta o comparativo de mês atual x mês anterior em cada página,
  // já que ele precisa enxergar os dois meses ao mesmo tempo.
  const { descontosSemDesperdicioBruto, desperdicioDeDescontosBruto } = useMemo(() => {
    const normal = []
    const desperdicio = []
    descontos.forEach(d => {
      if (_ehDesperdicio([d.cliente, d.justificativa, d.categoria])) {
        desperdicio.push({ ...d, origem: 'Desconto', responsavel: d.funcionario, valor: d.valor })
      } else {
        normal.push(d)
      }
    })
    return { descontosSemDesperdicioBruto: normal, desperdicioDeDescontosBruto: desperdicio }
  }, [descontos])

  const { estornosSemDesperdicioBruto, desperdicioDeEstornosBruto } = useMemo(() => {
    const normal = []
    const desperdicio = []
    estornos.forEach(e => {
      const valorTotal = e.valorUnitario * (e.quantidade || 1)
      if (_ehDesperdicio([e.clientes, e.motivo, e.categoria])) {
        desperdicio.push({ ...e, origem: 'Estorno', responsavel: e.estornadoPor, valor: valorTotal })
      } else {
        normal.push({ ...e, valor: valorTotal })
      }
    })
    return { estornosSemDesperdicioBruto: normal, desperdicioDeEstornosBruto: desperdicio }
  }, [estornos])

  const desperdicioBruto = useMemo(
    () => [...desperdicioDeDescontosBruto, ...desperdicioDeEstornosBruto],
    [desperdicioDeDescontosBruto, desperdicioDeEstornosBruto]
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
      // Datasets brutos (sem filtro de data do cabeçalho) -- só pro
      // comparativo mensal, que precisa ver mês atual + mês anterior juntos.
      descontosBruto: descontosSemDesperdicioBruto,
      estornosBruto: estornosSemDesperdicioBruto,
      desperdicioBruto,
      bonusConcedidoBruto: bonusConcedido,
      bonusUtilizadoBruto: bonusUtilizado,
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
