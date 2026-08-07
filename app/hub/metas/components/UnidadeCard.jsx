// app/hub/metas/components/UnidadeCard.jsx
'use client'

import { labelForUnit } from '@/lib/units'

const LABELS = {
  cmv: 'CMV',
  custo_folha: 'Custo Folha',
  custo_freela: 'Custo Freela',
  nps: 'NPS',
  bandas: 'Bandas',
  faturamento: 'Faturamento',
}

function formatarValor(indicador, valor) {
  if (indicador === 'nps') return valor.toFixed(1)
  if (indicador === 'cmv') return `${(valor * 100).toFixed(1)}%`
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}

export default function UnidadeCard({ resultado }) {
  const pct = (resultado.pontosTotais / resultado.pontosPossiveis) * 100

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-brand-black">{labelForUnit(resultado.unidade)}</h3>
        <span
          className={`text-sm font-mono px-2 py-1 rounded-md ${
            pct >= 70 ? 'text-brand-olive bg-brand-olive/10' : 'text-brand-crimson bg-brand-crimson/10'
          }`}
        >
          {resultado.pontosTotais}/{resultado.pontosPossiveis} pts
        </span>
      </div>

      <div className="space-y-2">
        {resultado.indicadores.map((ind) => (
          <div key={ind.indicador} className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{LABELS[ind.indicador]}</span>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-zinc-400 text-xs">
                Meta {formatarValor(ind.indicador, ind.meta)} · Real {formatarValor(ind.indicador, ind.real)}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${ind.bateuMeta ? 'bg-brand-olive' : 'bg-brand-crimson'}`}
                title={ind.bateuMeta ? 'Bateu meta' : 'Não bateu meta'}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
