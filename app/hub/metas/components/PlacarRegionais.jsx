// app/hub/metas/components/PlacarRegionais.jsx
// Comparativo dos regionais lado a lado: pontuação do bônus (Total da
// carteira) + status dos 6 indicadores. Clique leva ao card do gerente.

'use client'

import { INDICADORES, GERENTE_COLORS, corPontuacao } from './formato'

function statusDo(resultado, key) {
  const ind = resultado.totalIndicadores.find((i) => i.indicador === key)
  if (!ind) return 'sem_dado'
  return ind.bateuMeta ? 'bateu' : 'nao_bateu'
}

const QUADRADO = {
  bateu: 'bg-emerald-500',
  nao_bateu: 'bg-rose-500',
  sem_dado: 'bg-white border border-dashed border-zinc-300',
}

export default function PlacarRegionais({ resultados }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {resultados.map((r) => {
        const pct = (r.pontosTotais / r.pontosPossiveis) * 100
        return (
          <a
            key={r.gerenteId}
            href={`#gerente-${r.gerenteId}`}
            className="block bg-white border border-surface-border rounded-2xl shadow-card hover:shadow-card-hover transition-shadow p-5"
            style={{ borderTop: `3px solid ${GERENTE_COLORS[r.gerenteId] || '#97A624'}` }}
          >
            <div className="text-sm font-medium text-zinc-600">{r.gerenteNome}</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-semibold text-brand-black tabular-nums leading-none">{r.pontosTotais}</span>
              <span className="text-sm text-zinc-400">/ {r.pontosPossiveis} pts</span>
            </div>
            <div className="mt-3 h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: corPontuacao(pct) }} />
            </div>
            <div className="grid grid-cols-6 gap-1.5 mt-4">
              {INDICADORES.map((g) => {
                const st = statusDo(r, g.key)
                return (
                  <div key={g.key} className="flex flex-col items-center gap-1" title={`${g.label}: ${st === 'bateu' ? 'bateu' : st === 'nao_bateu' ? 'não bateu' : 'sem dado'}`}>
                    <span className={`w-full h-2 rounded-sm ${QUADRADO[st]}`} />
                    <span className="text-[11px] text-zinc-500">{g.curto}</span>
                  </div>
                )
              })}
            </div>
          </a>
        )
      })}
    </section>
  )
}
