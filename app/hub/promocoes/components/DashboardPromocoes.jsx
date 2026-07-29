// app/hub/promocoes/components/DashboardPromocoes.jsx
'use client'

import { useMemo, useState } from 'react'
import { usePromocoesData } from '../data/usePromocoesData'
import { RefreshCw, AlertTriangle } from 'lucide-react'

function formatR$(v) {
  if (!isFinite(v)) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
function formatPct(v) {
  if (!isFinite(v)) return '—'
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}
function formatNum(v) {
  if (!isFinite(v)) return '—'
  return Math.round(v).toLocaleString('pt-BR')
}

function corDelta(v, invertido) {
  if (!isFinite(v) || v === 0) return '#71717a'
  const positivo = invertido ? v < 0 : v > 0
  return positivo ? '#97A624' : '#8C1414'
}

const CATEGORIAS_LINHA = ['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes', 'Pacotes (total)', 'Sem Promos']

export default function DashboardPromocoes() {
  const { dados, loading, erro, ALL_UNIT_IDS, labelForUnit } = usePromocoesData()
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('rede')

  // Todos os meses disponíveis (união de todas as unidades), ordenados
  const meses = useMemo(() => {
    if (!dados) return []
    const set = new Set()
    Object.values(dados).forEach(porMes => Object.keys(porMes).forEach(m => set.add(m)))
    return Array.from(set).sort()
  }, [dados])

  // Últimos 3 meses disponíveis (ou menos, se não tiver histórico suficiente)
  const mesesExibidos = meses.slice(-3)

  // Agrega tudo em "rede" (soma de todas as unidades) ou filtra pra 1 unidade
  const dadosAgregados = useMemo(() => {
    if (!dados) return {}
    const resultado = {}
    for (const mes of mesesExibidos) {
      const acc = {
        faturamento: Object.fromEntries(CATEGORIAS_LINHA.map(c => [c, 0])),
        pessoas: Object.fromEntries(CATEGORIAS_LINHA.map(c => [c, 0])),
        custoTotal: Object.fromEntries(CATEGORIAS_LINHA.map(c => [c, 0])),
        faturamentoTotal: 0,
      }
      const unidadesParaSomar = unidadeSelecionada === 'rede' ? ALL_UNIT_IDS : [unidadeSelecionada]

      for (const unitId of unidadesParaSomar) {
        const slot = dados[unitId]?.[mes]
        if (!slot) continue
        acc.faturamentoTotal += slot.faturamentoTotal || 0
        for (const cat of ['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes']) {
          acc.faturamento[cat] += slot.faturamento[cat] || 0
          acc.pessoas[cat] += slot.pessoas[cat] || 0
          acc.custoTotal[cat] += slot.custoTotal[cat] || 0
        }
      }

      const totalPacotes = ['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes']
        .reduce((s, c) => s + acc.faturamento[c], 0)
      acc.faturamento['Pacotes (total)'] = totalPacotes
      acc.faturamento['Sem Promos'] = Math.max(0, acc.faturamentoTotal - totalPacotes)

      resultado[mes] = acc
    }
    return resultado
  }, [dados, mesesExibidos, unidadeSelecionada, ALL_UNIT_IDS])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <RefreshCw size={16} className="animate-spin" /> Carregando dados de promoções...
      </div>
    )
  }

  if (erro) {
    return (
      <div style={{ padding: 24, color: '#8C1414', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={16} /> Erro ao carregar: {erro}
      </div>
    )
  }

  if (!mesesExibidos.length) {
    return <div style={{ padding: 24, color: '#71717a' }}>Nenhum dado disponível ainda.</div>
  }

  function linhaMetrica(label, getValor, formatador, invertido) {
    return (
      <tr style={{ borderTop: '1px solid #F0F0F0' }}>
        <td style={{ padding: '7px 10px', fontWeight: 500 }}>{label}</td>
        {mesesExibidos.map((mes, idx) => {
          const valor = getValor(dadosAgregados[mes])
          const anterior = idx > 0 ? getValor(dadosAgregados[mesesExibidos[idx - 1]]) : null
          const delta = anterior != null && anterior !== 0 ? (valor - anterior) / anterior : null
          return (
            <td key={mes} className="font-mono" style={{ padding: '7px 10px', textAlign: 'right' }}>
              {formatador(valor)}
              {delta != null && (
                <div style={{ fontSize: 10.5, color: corDelta(delta, invertido) }}>
                  {delta > 0 ? '+' : ''}{formatPct(delta)}
                </div>
              )}
            </td>
          )
        })}
      </tr>
    )
  }

  function secao(titulo) {
    return (
      <tr>
        <td colSpan={mesesExibidos.length + 1} style={{ padding: '12px 10px 4px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: '#9ca3af', textTransform: 'uppercase' }}>
          {titulo}
        </td>
      </tr>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Resumo Mensal — Promoções</div>
          <div style={{ fontSize: 12.5, color: '#71717a' }}>Comparativo dos últimos {mesesExibidos.length} meses fechados</div>
        </div>
        <select
          value={unidadeSelecionada}
          onChange={(e) => setUnidadeSelecionada(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E8E2', fontSize: 13 }}
        >
          <option value="rede">Rede (todas as unidades)</option>
          {ALL_UNIT_IDS.map(id => (
            <option key={id} value={id}>{labelForUnit(id)}</option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #E8E8E2', borderRadius: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'right', color: '#9ca3af', fontSize: 11, textTransform: 'uppercase' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Categoria</th>
              {mesesExibidos.map(mes => <th key={mes} style={{ padding: '10px' }}>{mes}</th>)}
            </tr>
          </thead>
          <tbody>
            {secao('Faturamento')}
            {CATEGORIAS_LINHA.map(cat =>
              linhaMetrica(cat, (d) => d?.faturamento[cat] ?? 0, formatR$, false)
            )}

            {secao('CMV (estimado)')}
            {['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes'].map(cat =>
              linhaMetrica(cat, (d) => (d?.faturamento[cat] ? (d.custoTotal[cat] || 0) / d.faturamento[cat] : 0), formatPct, true)
            )}

            {secao('Peso das Promoções (% do faturamento total)')}
            {['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes', 'Pacotes (total)'].map(cat =>
              linhaMetrica(cat, (d) => (d?.faturamentoTotal ? d.faturamento[cat] / d.faturamentoTotal : 0), formatPct, false)
            )}

            {secao('Nº de Pessoas')}
            {['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes'].map(cat =>
              linhaMetrica(cat, (d) => d?.pessoas[cat] ?? 0, formatNum, false)
            )}

            {secao('Ticket Médio')}
            {['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes'].map(cat =>
              linhaMetrica(cat, (d) => (d?.pessoas[cat] ? d.faturamento[cat] / d.pessoas[cat] : 0), formatR$, false)
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 11.5, color: '#9ca3af' }}>
        CMV estimado cruza o produto consumido (relatório de Promoções Utilizadas) com o custo unitário do catálogo de rede — pode variar um pouco do CMV real por loja.
      </div>
    </div>
  )
}
