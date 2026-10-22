// app/hub/metas/components/RankingUnidades.jsx
// Ranking das 10 unidades com pontuação individual (substitui os cards
// Consolidado e Top 5). Top 5 críticas virou filtro.

'use client'

import { useState } from 'react'
import MatrizUnidades, { Legenda } from './MatrizUnidades'

export default function RankingUnidades({ ranking }) {
  const [filtro, setFiltro] = useState('todas') // 'todas' | 'criticas'
  const linhas = filtro === 'criticas' ? ranking.filter((u) => u.critica) : ranking

  const media = linhas.length ? linhas.reduce((s, u) => s + u.pontosTotais, 0) / linhas.length : 0

  return (
    <section className="bg-white border border-surface-border rounded-2xl shadow-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-brand-black">Ranking das unidades</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pontuação individual de cada unidade, mesma regra e pesos dos regionais.
            Média {filtro === 'criticas' ? 'das críticas' : 'geral'}: <span className="font-semibold text-brand-black tabular-nums">{media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pts</span>
          </p>
        </div>
        <div className="flex rounded-lg border border-surface-border overflow-hidden">
          {[
            { id: 'todas', label: `Todas (${ranking.length})` },
            { id: 'criticas', label: `Top 5 críticas` },
          ].map((op) => (
            <button
              key={op.id}
              onClick={() => setFiltro(op.id)}
              className={`text-xs px-3 py-1.5 transition-colors ${filtro === op.id ? 'bg-brand-black text-white' : 'text-zinc-600 hover:bg-surface-muted'}`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <MatrizUnidades linhas={linhas} mostrarPosicao mostrarGerente />

      <div className="mt-3">
        <Legenda />
      </div>
    </section>
  )
}
