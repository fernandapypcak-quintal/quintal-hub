// app/hub/metas/components/PlacarRegionais.jsx
// Comparativo dos regionais lado a lado: pontuação do bônus (Total da
// carteira) + status de cada indicador da vigência. Clique leva ao card.

'use client'

import { useMetasData } from '../hooks/useMetasData'
import { corPontuacao } from './formato'

function statusDo(resultado, key) {
  const ind = resultado.totalIndicadores.find((i) => i.indicador === key)
  if (!ind || ind.semDado) return 'sem_dado'
  return ind.bateuMeta ? 'bateu' : 'nao_bateu'
}

const QUADRADO = {
  bateu: 'bg-emerald-500',
  nao_bateu: 'bg-rose-500',
  sem_dado: 'bg-white border border-dashed border-zinc-300',
}

export default function PlacarRegionais({ resultados }) {
  const { vigencia } = useMetasData()
  const n = vigencia.indicadores.length
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {resultados.map((r) => {
        const pct = r.pontosPossiveis ? (r.pontosTotais / r.pontosPossiveis) * 100 : 0
        return (
          <a
            key={r.gerenteId}
            href={`#gerente-${r.gerenteId}`}
            className="block bg-white border border-surface-border rounded-2xl shadow-card hover:shadow-card-hover transition-shadow p-5"
            style={{ borderTop: `3px solid ${r.cor || '#97A624'}` }}
          >
            <div className="text-sm font-medium text-zinc-600">{r.gerenteNome}</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-semibold text-brand-black tabular-nums leading-none">{r.pontosTotais}</span>
              <span className="text-sm text-zinc-400">/ {r.pontosPossiveis} pts</span>
            </div>
            <div className="mt-3 h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: corPontuacao(pct) }} />
            </div>
            <div className="grid gap-1.5 mt-4" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              {vigencia.indicadores.map((cfg) => {
                const st = statusDo(r, cfg.key)
                return (
                  <div key={cfg.key} className="flex flex-col items-center gap-1" title={`${cfg.label}: ${st === 'bateu' ? 'bateu' : st === 'nao_bateu' ? 'não bateu' : 'sem dado'}`}>
                    <span className={`w-full h-2 rounded-sm ${QUADRADO[st]}`} />
                    <span className="text-[11px] text-zinc-500 truncate max-w-full">{cfg.curto}</span>
                  </div>
                )
              })}
            </div>
            {r.criticas.length > 0 && (
              <div className="mt-3 text-[11px] text-amber-800">
                {r.criticas.length} {r.criticas.length === 1 ? 'casa crítica' : 'casas críticas'} na carteira
              </div>
            )}
          </a>
        )
      })}
    </section>
  )
}
