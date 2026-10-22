// app/hub/metas/components/pages/Home.jsx
// Ordem: Placar dos regionais → Ranking das unidades (admin/diretor,
// com filtro Top 5 críticas) → card de cada regional.
// Filtros de período ficam no header verde (ClientApp).
'use client'

import { useMetasData } from '../../hooks/useMetasData'
import GerenteResumo from '../GerenteResumo'
import PlacarRegionais from '../PlacarRegionais'
import RankingUnidades from '../RankingUnidades'

export default function Home() {
  const { resultadosPorGerente, rankingUnidades, loading, error } = useMetasData()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="w-7 h-7 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
        <span className="text-sm text-zinc-400">Carregando metas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 px-6">
        <span className="text-sm font-semibold text-brand-black">Não foi possível carregar as metas</span>
        <span className="text-xs text-brand-crimson bg-brand-crimson/10 px-3 py-2 rounded-lg text-center max-w-md">{error}</span>
      </div>
    )
  }

  if (resultadosPorGerente.length === 0 && !rankingUnidades) {
    return <p className="p-8 text-sm text-zinc-500">Nenhuma unidade com metas nesse período. Troque o mês no filtro acima.</p>
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {resultadosPorGerente.length > 1 && <PlacarRegionais resultados={resultadosPorGerente} />}

      {rankingUnidades && <RankingUnidades ranking={rankingUnidades} />}

      {resultadosPorGerente.map((r) => (
        <GerenteResumo key={r.gerenteId} resultado={r} />
      ))}
    </div>
  )
}
