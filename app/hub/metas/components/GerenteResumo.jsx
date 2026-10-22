// app/hub/metas/components/GerenteResumo.jsx
// Card do regional: pontuação do bônus (sobre o Total da carteira),
// um tile por indicador (status + pontos + real/meta/desvio) e a
// matriz das unidades da carteira sempre visível.

'use client'

import { useMemo } from 'react'
import { Check, X, Minus } from 'lucide-react'
import { labelForUnit } from '@/lib/units'
import { PESOS_PTS, pontuarUnidade, compararPorMetasBatidas } from '@/lib/metas/scoring'
import { INDICADORES, COR_STATUS, GERENTE_COLORS, corPontuacao, fmtValor, fmtDelta, fmtMoeda, deltaBom, valorPrincipal, rotulos } from './formato'
import MatrizUnidades, { Legenda } from './MatrizUnidades'

function Tile({ grupo, ind }) {
  const status = !ind ? 'sem_dado' : ind.bateuMeta ? 'bateu' : 'nao_bateu'
  const cor = COR_STATUS[status]
  const peso = PESOS_PTS[grupo.key]
  const r = rotulos(grupo.key)
  const metaV = grupo.key === 'bandas' ? fmtMoeda(ind?.custoArtista) : fmtValor(grupo.tipo, ind?.meta)
  const bom = deltaBom(grupo.key, ind?.delta)
  const Icone = status === 'bateu' ? Check : status === 'nao_bateu' ? X : Minus

  return (
    <div className={`rounded-xl border p-3 ${cor.bg} ${cor.borda}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600">{grupo.label}</span>
        <span className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${cor.texto}`}>
          <Icone size={13} strokeWidth={2.5} />
          {status === 'bateu' ? `${peso} pts` : status === 'nao_bateu' ? `0 de ${peso}` : 'sem dado'}
        </span>
      </div>
      <div className="mt-2 text-xl font-semibold text-brand-black tabular-nums leading-tight">
        {valorPrincipal(grupo.key, grupo.tipo, ind)}
      </div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{r.principal}</div>
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-black/5 text-xs">
        <span className="text-zinc-500 whitespace-nowrap">{r.meta} <span className="tabular-nums text-zinc-700">{metaV}</span></span>
        {grupo.key !== 'bandas' && (
          <span className={`tabular-nums whitespace-nowrap ${bom == null ? 'text-zinc-400' : bom ? 'text-emerald-700' : 'text-rose-700'}`}>
            {ind ? fmtDelta(grupo.tipo, ind.delta) : '—'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function GerenteResumo({ resultado }) {
  const pct = (resultado.pontosTotais / resultado.pontosPossiveis) * 100
  const cor = GERENTE_COLORS[resultado.gerenteId] || '#97A624'

  const linhasUnidades = useMemo(
    () => resultado.unidades.map(pontuarUnidade).sort(compararPorMetasBatidas),
    [resultado.unidades]
  )

  return (
    <section
      id={`gerente-${resultado.gerenteId}`}
      className="scroll-mt-4 bg-white border border-surface-border rounded-2xl shadow-card"
      style={{ borderLeft: `4px solid ${cor}` }}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-black">{resultado.gerenteNome}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {resultado.unidades.map((u) => labelForUnit(u.unidade)).join(', ')}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-3xl font-semibold text-brand-black tabular-nums leading-none">{resultado.pontosTotais}</span>
              <span className="text-sm text-zinc-400">/ {resultado.pontosPossiveis} pts</span>
            </div>
            <div className="w-40 h-1.5 bg-surface-muted rounded-full overflow-hidden mt-2 ml-auto">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: corPontuacao(pct) }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {INDICADORES.map((g) => (
            <Tile key={g.key} grupo={g} ind={resultado.totalIndicadores.find((i) => i.indicador === g.key)} />
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 mt-2">
          Total da carteira: média das unidades em CMV, Folha e NPS; soma em Freela, Bandas e Faturamento. É essa linha que pontua o regional.
        </p>
      </div>

      <div className="border-t border-surface-border px-5 py-4">
        <div className="text-sm font-medium text-brand-black mb-2">Unidades da carteira</div>
        <MatrizUnidades linhas={linhasUnidades} />
        <div className="mt-3">
          <Legenda />
        </div>
      </div>
    </section>
  )
}
