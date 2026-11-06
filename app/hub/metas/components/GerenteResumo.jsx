// app/hub/metas/components/GerenteResumo.jsx
// Card do regional: pontuação do bônus (sobre o Total da carteira),
// casas críticas da carteira, um tile por indicador e a matriz das
// unidades. Tudo segue a vigência do mês (lib/metas/config.ts).

'use client'

import { useMemo } from 'react'
import { Check, X, Minus, AlertTriangle } from 'lucide-react'
import { labelForUnit } from '@/lib/units'
import { pontuarUnidade, compararPorMetasBatidas } from '@/lib/metas/scoring'
import { useMetasData } from '../hooks/useMetasData'
import { COR_STATUS, corPontuacao, fmtDelta, deltaBom, valorPrincipal, valorMeta, rotulos } from './formato'
import MatrizUnidades, { Legenda } from './MatrizUnidades'

function Tile({ cfg, ind, carregando }) {
  const status = !ind || ind.semDado ? 'sem_dado' : ind.bateuMeta ? 'bateu' : 'nao_bateu'
  const cor = COR_STATUS[status]
  const r = rotulos(cfg)
  const bom = deltaBom(cfg, ind?.delta)
  const Icone = status === 'bateu' ? Check : status === 'nao_bateu' ? X : Minus

  return (
    <div className={`rounded-xl border p-3 ${cor.bg} ${cor.borda}`} title={cfg.descricao || cfg.label}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600">{cfg.label}</span>
        <span className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${cor.texto}`}>
          <Icone size={13} strokeWidth={2.5} />
          {status === 'bateu' ? `${cfg.peso} pts` : status === 'nao_bateu' ? `0 de ${cfg.peso}` : carregando ? 'carregando…' : 'sem dado'}
        </span>
      </div>
      <div className="mt-2 text-xl font-semibold text-brand-black tabular-nums leading-tight">
        {valorPrincipal(cfg, ind)}
      </div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{r.principal}</div>
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-black/5 text-xs">
        <span className="text-zinc-500 whitespace-nowrap">{r.meta} <span className="tabular-nums text-zinc-700">{valorMeta(cfg, ind)}</span></span>
        {cfg.direcao !== 'saldo' && (
          <span className={`tabular-nums whitespace-nowrap ${bom == null ? 'text-zinc-400' : bom ? 'text-emerald-700' : 'text-rose-700'}`}>
            {ind && !ind.semDado ? fmtDelta(cfg.formato, ind.delta) : '—'}
          </span>
        )}
      </div>
      {cfg.pendente && (
        <div className="mt-2 text-[10px] leading-snug text-amber-700">A definir: {cfg.pendente}</div>
      )}
    </div>
  )
}

function Criticas({ resultado, regra }) {
  if (resultado.criticas.length === 0) return null
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
          <AlertTriangle size={13} /> Casas críticas da carteira
        </span>
        <span className="text-[11px] text-amber-800">
          {regra
            ? resultado.criticasOk
              ? 'Regra das críticas cumprida'
              : 'Regra das críticas NÃO cumprida: bônus ajustado'
            : 'Regra de bônus ligada às críticas: a definir'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {resultado.criticas.map((c) => (
          <span
            key={c.unidade}
            className={`text-xs px-2 py-1 rounded-md border bg-white tabular-nums ${
              c.ok === false ? 'border-rose-300 text-rose-800' : c.ok ? 'border-emerald-300 text-emerald-800' : 'border-amber-200 text-zinc-700'
            }`}
          >
            {labelForUnit(c.unidade)} · {c.pontos} pts · {c.qtdBateu}/{c.qtdComDado} metas
          </span>
        ))}
      </div>
    </div>
  )
}

function textoAgregacao(indicadores) {
  const media = indicadores.filter((i) => i.agregacao === 'media').map((i) => i.curto)
  const soma = indicadores.filter((i) => i.agregacao === 'soma').map((i) => i.curto)
  const partes = []
  if (media.length) partes.push(`média das unidades em ${media.join(', ')}`)
  if (soma.length) partes.push(`soma em ${soma.join(', ')}`)
  return partes.join('; ')
}

export default function GerenteResumo({ resultado }) {
  const { vigencia, perdasStatus } = useMetasData()
  const pct = resultado.pontosPossiveis ? (resultado.pontosTotais / resultado.pontosPossiveis) * 100 : 0
  const cor = resultado.cor || '#97A624'

  const linhasUnidades = useMemo(
    () =>
      resultado.unidades
        .map((u) => ({ ...pontuarUnidade(vigencia, u), critica: vigencia.unidadesCriticas.includes(u.unidade) }))
        .sort(compararPorMetasBatidas),
    [resultado.unidades, vigencia]
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
            {resultado.pontosTotais !== resultado.pontosIndicadores && (
              <div className="text-[11px] text-rose-700 mt-1">{resultado.pontosIndicadores} pts nos indicadores, ajustado pela regra das críticas</div>
            )}
            <div className="w-40 h-1.5 bg-surface-muted rounded-full overflow-hidden mt-2 ml-auto">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: corPontuacao(pct) }} />
            </div>
          </div>
        </div>

        <Criticas resultado={resultado} regra={vigencia.regraCriticas} />

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {vigencia.indicadores.map((cfg) => (
            <Tile
              key={cfg.key}
              cfg={cfg}
              ind={resultado.totalIndicadores.find((i) => i.indicador === cfg.key)}
              carregando={cfg.real.tipo === 'perdas' && perdasStatus === 'carregando'}
            />
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 mt-2">
          Total da carteira: {textoAgregacao(vigencia.indicadores)}. É essa linha que pontua o regional.
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
