// app/hub/promocoes/components/ResumoLojas.jsx
'use client'

import { useMemo, useState } from 'react'
import { useResumoMensal, CATEGORIAS_BASE } from './DashboardPromocoes'

const brlK = (v) => { const n = v || 0; return Math.abs(n) >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : `R$ ${n.toFixed(1)}` }
const pct = (v) => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—')
const num = (v) => (isFinite(v) ? Math.round(v).toLocaleString('pt-BR') : '—')

function StatusBadge({ cmvPct }) {
  if (!isFinite(cmvPct)) {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-zinc-50 text-zinc-400 border-zinc-100">—</span>
  }
  const status = cmvPct >= 0.80 ? 'Crítico' : cmvPct >= 0.35 ? 'Atenção' : 'OK'
  const cls = cmvPct >= 0.80
    ? 'bg-red-50 text-brand-crimson border-red-100'
    : cmvPct >= 0.35
    ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-green-50 text-brand-olive border-green-100'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{status}</span>
}

export default function ResumoLojas() {
  const { loading, erro, ALL_UNIT_IDS, labelForUnit, meses, agregarPorUnidades } = useResumoMensal()
  const [ordenarPor, setOrdenarPor] = useState('peso') // 'peso' | 'faturamento' | 'cmv'

  const mesMaisRecente = meses[meses.length - 1]
  const [mesSelecionado, setMesSelecionado] = useState(null)
  const mes = mesSelecionado || mesMaisRecente

  const linhas = useMemo(() => {
    if (!mes) return []
    return ALL_UNIT_IDS.map(unitId => {
      const agregado = agregarPorUnidades([unitId], [mes])[mes]
      const totalPacotes = agregado.faturamento['Pacotes (total)']
      const peso = agregado.faturamentoTotal ? totalPacotes / agregado.faturamentoTotal : 0
      const custoTotal = CATEGORIAS_BASE.reduce((s, c) => s + agregado.custoTotal[c], 0)
      const cmv = totalPacotes ? custoTotal / totalPacotes : 0
      const pessoas = CATEGORIAS_BASE.reduce((s, c) => s + agregado.pessoas[c], 0)
      return {
        unitId,
        nome: labelForUnit(unitId),
        faturamentoTotal: agregado.faturamentoTotal,
        faturamentoPromo: totalPacotes,
        peso,
        cmv,
        pessoas,
      }
    })
  }, [mes, ALL_UNIT_IDS.join(',')])

  const ordenadas = useMemo(() => {
    const copia = [...linhas]
    if (ordenarPor === 'faturamento') copia.sort((a, b) => b.faturamentoTotal - a.faturamentoTotal)
    else if (ordenarPor === 'cmv') copia.sort((a, b) => b.cmv - a.cmv)
    else copia.sort((a, b) => b.peso - a.peso)
    return copia
  }, [linhas, ordenarPor])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-olive border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Carregando dados de promoções...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return <div className="p-6 text-sm text-brand-crimson">Erro ao carregar: {erro}</div>
  }

  if (!meses.length) {
    return <div className="p-6 text-sm text-zinc-400">Nenhum dado disponível ainda.</div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Resumo das Casas</h1>
          <p className="text-xs text-zinc-400">Comparativo entre unidades — {mes}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={mes}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white"
          >
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
            className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white"
          >
            <option value="peso">Ordenar por Peso %</option>
            <option value="faturamento">Ordenar por Faturamento</option>
            <option value="cmv">Ordenar por CMV</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border border-surface-border rounded-xl">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-right text-[11px] text-zinc-400 uppercase">
              <th className="py-2.5 px-3 text-left">Loja</th>
              <th className="py-2.5 px-3">Faturamento Total</th>
              <th className="py-2.5 px-3">Faturamento Promoções</th>
              <th className="py-2.5 px-3">Peso %</th>
              <th className="py-2.5 px-3">CMV Promoções</th>
              <th className="py-2.5 px-3">Pessoas</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((l, idx) => (
              <tr key={l.unitId} className={idx % 2 ? 'bg-zinc-50/50' : ''}>
                <td className="py-2 px-3 font-medium text-brand-black">{l.nome}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{brlK(l.faturamentoTotal)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{brlK(l.faturamentoPromo)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{pct(l.peso)}</td>
                <td className="py-2 px-3 text-right">
                  <span className="font-mono tabular-nums mr-2">{pct(l.cmv)}</span>
                  <StatusBadge cmvPct={l.cmv} />
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{num(l.pessoas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
