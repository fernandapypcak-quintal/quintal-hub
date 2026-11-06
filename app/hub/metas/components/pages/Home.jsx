// app/hub/metas/components/pages/Home.jsx
// Ordem: Placar dos regionais → Visão por unidade (admin/diretor,
// com filtro Top 5 críticas) → card de cada regional.
// Filtros de período ficam no header verde (ClientApp).
'use client'

import { useMetasData } from '../../hooks/useMetasData'
import GerenteResumo from '../GerenteResumo'
import PlacarRegionais from '../PlacarRegionais'
import RankingUnidades from '../RankingUnidades'

export default function Home() {
  const { resultadosPorGerente, rankingUnidades, vigencia, perdasStatus, avisoRegras, loading, error } = useMetasData()

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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className="font-medium text-zinc-700">{vigencia.nome}</span>
        <span>{vigencia.indicadores.map((i) => `${i.label} ${i.peso}`).join(' · ')} pts</span>
        {avisoRegras && <span className="text-amber-700">{avisoRegras}</span>}
        {perdasStatus === 'carregando' && <span className="text-amber-700">Carregando descontos e estornos…</span>}
        {perdasStatus === 'erro' && <span className="text-rose-700">Não consegui carregar descontos/estornos agora. Recarregue a página em alguns minutos.</span>}
      </div>

      {resultadosPorGerente.length > 1 && <PlacarRegionais resultados={resultadosPorGerente} />}

      {rankingUnidades && <RankingUnidades ranking={rankingUnidades} />}

      {resultadosPorGerente.map((r) => (
        <GerenteResumo key={r.gerenteId} resultado={r} />
      ))}
    </div>
  )
}
