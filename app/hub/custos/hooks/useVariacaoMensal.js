import { useMemo } from 'react'
import { sortMesLabel } from './useFinanceiro.jsx'

/**
 * Recebe historicoCat (array de { mes, loja, categoria, realizado })
 * já filtrado por loja e devolve análise mês a mês.
 */
export function useVariacaoMensal(historicoCat) {
  return useMemo(() => {
    if (!historicoCat || historicoCat.length === 0) {
      return { meses:[], categorias:[], dadosGrafico:[], tabelaHistorica:[], ranking:{ maioresAltas:[], maioresBaixas:[] } }
    }

    // Meses ordenados cronologicamente
    const meses = sortMesLabel(Array.from(new Set(historicoCat.map(h => h.mes))))

    // Categorias
    const categorias = Array.from(new Set(historicoCat.map(h => h.categoria))).sort()

    // Pivot para gráfico de linha
    const dadosGrafico = meses.map(mes => {
      const row = { mes }
      categorias.forEach(cat => {
        const entries = historicoCat.filter(h => h.mes === mes && h.categoria === cat)
        row[cat] = entries.reduce((s, h) => s + h.realizado, 0)
      })
      return row
    })

    // Tabela histórica — variação do último vs penúltimo mês
    const ultMes  = meses[meses.length - 1]
    const prevMes = meses[meses.length - 2]

    const tabelaHistorica = categorias.map(cat => {
      const row = { categoria: cat }
      meses.forEach(mes => {
        const entries = historicoCat.filter(h => h.mes === mes && h.categoria === cat)
        row[mes] = entries.reduce((s, h) => s + h.realizado, 0)
      })
      const ultVal  = row[ultMes]  || 0
      const prevVal = row[prevMes] || 0
      row.variacaoPct = prevVal > 0 ? ((ultVal - prevVal) / prevVal) * 100 : 0
      row.variacaoR   = ultVal - prevVal
      row.ultimoMes   = ultMes
      row.penultimoMes = prevMes
      return row
    })

    // Ranking maiores altas e baixas
    const sorted       = [...tabelaHistorica].sort((a, b) => b.variacaoPct - a.variacaoPct)
    const maioresAltas  = sorted.filter(r => r.variacaoPct > 0).slice(0, 5)
    const maioresBaixas = sorted.filter(r => r.variacaoPct < 0).slice(-5).reverse()

    return { meses, categorias, dadosGrafico, tabelaHistorica, ranking: { maioresAltas, maioresBaixas } }
  }, [historicoCat])
}
