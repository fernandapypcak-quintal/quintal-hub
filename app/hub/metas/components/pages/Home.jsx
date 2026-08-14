// app/hub/metas/components/pages/Home.jsx
'use client'

import { useMetasData } from '../../hooks/useMetasData'
import GerenteResumo from '../GerenteResumo'

export default function Home() {
  const { anoMes, setAnoMes, visao, setVisao, trimestreLabel, resultadosPorGerente, resultadoConsolidado, resultadoTop5, loading, error } = useMetasData()

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">Metas</h1>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="month"
              value={anoMes}
              onChange={(e) => setAnoMes(e.target.value)}
              className="text-sm font-mono text-zinc-500 bg-transparent border border-surface-border rounded-md px-2 py-1"
            />
            <div className="flex rounded-md border border-surface-border overflow-hidden">
              <button
                onClick={() => setVisao('mes')}
                className={`text-xs px-3 py-1.5 ${visao === 'mes' ? 'bg-brand-black text-white' : 'text-zinc-500'}`}
              >
                Mês
              </button>
              <button
                onClick={() => setVisao('trimestre')}
                className={`text-xs px-3 py-1.5 ${visao === 'trimestre' ? 'bg-brand-black text-white' : 'text-zinc-500'}`}
              >
                Trimestre
              </button>
            </div>
            {visao === 'trimestre' && (
              <span className="text-xs font-mono text-zinc-400">{trimestreLabel}</span>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="w-7 h-7 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Carregando metas...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 px-6">
          <span className="text-sm font-semibold text-brand-black">Erro ao carregar dados</span>
          <span className="text-xs text-brand-crimson bg-brand-crimson/10 px-3 py-2 rounded-lg text-center max-w-md">
            {error}
          </span>
        </div>
      )}

      {!loading && !error && resultadosPorGerente.length === 0 && (
        <p className="text-sm text-zinc-400">Nenhuma unidade encontrada pra esse período.</p>
      )}

      {!loading && !error && resultadoConsolidado && (
        <GerenteResumo resultado={resultadoConsolidado} />
      )}

      {!loading && !error && resultadoTop5 && (
        <GerenteResumo resultado={resultadoTop5} />
      )}

      {!loading && !error && resultadosPorGerente.map((r) => (
        <GerenteResumo key={r.gerenteId} resultado={r} />
      ))}
    </div>
  )
}
