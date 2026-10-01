// app/hub/bonus/components/TabelaMensal.jsx
//
// Visão "Mês a mês": os 12 meses do ano, lado a lado, numa tabela só —
// sem precisar trocar nenhum seletor pra comparar meses.

'use client'

import { LineChart } from 'lucide-react'
import { INDICADORES_BONUS, FAIXA_LABEL } from '@/lib/bonus/scoring'

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const FAIXA_STYLE = {
  meta:         { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  meta_80:      { bg: 'bg-amber-50',    text: 'text-amber-700' },
  meta_60:      { bg: 'bg-amber-50',    text: 'text-amber-700' },
  nao_atingiu:  { bg: 'bg-rose-50',     text: 'text-rose-700' },
  pendente:     { bg: 'bg-zinc-50',     text: 'text-zinc-300' },
}

function fmtPct(v, digits = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

function Celula({ resultadoIndicador }) {
  const { faixa, real, isProjecao } = resultadoIndicador
  const style = FAIXA_STYLE[faixa]

  if (faixa === 'pendente') {
    return <td className="px-2 py-2 text-center text-xs text-zinc-300">—</td>
  }

  return (
    <td className="px-1 py-1.5 text-center">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold ${style.bg} ${style.text} ${isProjecao ? 'border border-dashed border-blue-300' : ''}`}
        title={FAIXA_LABEL[faixa]}
      >
        {isProjecao && <LineChart size={10} className="text-blue-500" />}
        {fmtPct(real)}
      </span>
    </td>
  )
}

export default function TabelaMensal({ resultadosPorMes }) {
  if (!resultadosPorMes || resultadosPorMes.length === 0) return null

  return (
    <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
      <div className="p-5 pb-3">
        <h2 className="text-lg font-semibold text-brand-black">Mês a mês — {resultadosPorMes[0]?.mesRef.slice(0, 4)}</h2>
        <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
          Os 12 meses do ano, lado a lado · <LineChart size={11} className="text-blue-500" /> = projeção, não fechamento real
        </p>
      </div>

      <div className="overflow-x-auto px-5 pb-5">
        <table className="min-w-full text-sm border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Mês</th>
              {INDICADORES_BONUS.map((cfg) => (
                <th key={cfg.key} className="px-2 py-1 text-center text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
                  {cfg.label}
                </th>
              ))}
              <th className="px-2 py-1 text-center text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {resultadosPorMes.map((r) => {
              const [, mm] = r.mesRef.split('-')
              const label = MESES_LABEL[parseInt(mm, 10) - 1]
              const pct = r.percentualAtingido * 100
              const temDado = r.indicadores.some((i) => i.faixa !== 'pendente')

              return (
                <tr key={r.mesRef}>
                  <td className="px-2 py-1.5 text-sm font-medium text-brand-black whitespace-nowrap">{label}</td>
                  {r.indicadores.map((ind) => (
                    <Celula key={ind.config.key} resultadoIndicador={ind} />
                  ))}
                  <td className="px-2 py-1.5 text-center text-xs font-mono font-semibold text-zinc-600">
                    {temDado ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
