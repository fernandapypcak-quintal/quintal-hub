// app/hub/metas/components/pages/Home.jsx
'use client'

import { useMetasData } from '../../hooks/useMetasData'
import UnidadeCard from '../UnidadeCard'

export default function Home() {
  const { anoMes, setAnoMes, resultadosPorUnidade, pontosMedia, loading, error } = useMetasData()

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">Minhas Metas</h1>
          <input
            type="month"
            value={anoMes}
            onChange={(e) => setAnoMes(e.target.value)}
            className="mt-2 text-sm font-mono text-zinc-500 bg-transparent border border-surface-border rounded-md px-2 py-1"
          />
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold text-brand-amber">{pontosMedia.toFixed(0)}%</p>
          <p className="text-xs text-zinc-400">média da carteira</p>
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
          <span className="text-2xl">Erro</span>
          <span className="text-sm font-semibold text-brand-black">Erro ao carregar dados</span>
          <span className="text-xs text-brand-crimson bg-brand-crimson/10 px-3 py-2 rounded-lg text-center max-w-md">
            {error}
          </span>
        </div>
      )}

      {!loading && !error && resultadosPorUnidade.length === 0 && (
        <p className="text-sm text-zinc-400">Nenhuma unidade encontrada pra esse período.</p>
      )}

      {!loading && !error && resultadosPorUnidade.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resultadosPorUnidade.map((r) => (
            <UnidadeCard key={r.unidade} resultado={r} />
          ))}
        </div>
      )}
    </div>
  )
}
