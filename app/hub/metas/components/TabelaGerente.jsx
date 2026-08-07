// app/hub/metas/components/TabelaGerente.jsx
// Recria o layout da planilha original: grupos de colunas por indicador
// (Meta/Real/Delta), uma linha por unidade + linha Total (agregada,
// onde a pontuação é calculada).

'use client'

import { labelForUnit } from '@/lib/units'
import { PESOS_PTS } from '@/lib/metas/scoring'

const GRUPOS = [
  { indicador: 'cmv', label: 'CMV', pts: PESOS_PTS.cmv, tipo: 'pct' },
  { indicador: 'custo_folha', label: 'Custo Folha', pts: PESOS_PTS.custo_folha, tipo: 'pct' },
  { indicador: 'custo_freela', label: 'Custo Freela', pts: PESOS_PTS.custo_freela, tipo: 'moeda' },
  { indicador: 'nps', label: 'NPS', pts: PESOS_PTS.nps, tipo: 'num' },
  { indicador: 'bandas', label: 'Bandas', pts: PESOS_PTS.bandas, tipo: 'bandas' },
  { indicador: 'faturamento', label: 'Faturamento', pts: PESOS_PTS.faturamento, tipo: 'moeda' },
]

// Indicadores de custo — aqui delta negativo (real caiu abaixo da meta) é
// BOM, e delta positivo (custo subiu) é RUIM — o oposto de NPS/Bandas/Faturamento.
const MENOR_MELHOR = new Set(['cmv', 'custo_folha', 'custo_freela'])

function corDelta(indicador, delta) {
  if (delta == null) return ''
  const bom = MENOR_MELHOR.has(indicador) ? delta <= 0 : delta >= 0
  return bom ? 'text-brand-olive' : 'text-brand-crimson'
}

function fmt(tipo, valor) {
  if (valor == null) return '—'
  if (tipo === 'pct') return `${(valor * 100).toFixed(1)}%`
  if (tipo === 'num') return valor.toFixed(1)
  if (tipo === 'moeda') return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
  return String(valor)
}

function fmtDelta(tipo, valor) {
  if (valor == null) return '—'
  if (tipo === 'pct') return `${valor >= 0 ? '+' : ''}${(valor * 100).toFixed(1)}%`
  if (tipo === 'num') return `${valor >= 0 ? '+' : ''}${valor.toFixed(1)}`
  return `${valor >= 0 ? '+' : '-'}${Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })}`
}

function achar(indicadores, key) {
  return indicadores.find((i) => i.indicador === key)
}

function LinhaUnidade({ unidade, indicadores }) {
  return (
    <tr className="border-b border-surface-border">
      <td className="sticky left-0 bg-surface-card px-3 py-1.5 text-sm font-medium text-brand-black whitespace-nowrap">
        {labelForUnit(unidade)}
      </td>
      {GRUPOS.map((g) => {
        if (g.indicador === 'bandas') {
          const ind = achar(indicadores, 'bandas')
          return (
            <td key={g.indicador} colSpan={3} className="px-1 py-1.5">
              <div className="grid grid-cols-3 gap-1 text-xs font-mono text-right">
                <span>{fmt('moeda', ind?.custoArtista)}</span>
                <span>{fmt('moeda', ind?.real)}</span>
                <span className={corDelta('bandas', ind?.delta)}>
                  {ind ? fmtDelta('moeda', ind.delta) : '—'}
                </span>
              </div>
            </td>
          )
        }
        const ind = achar(indicadores, g.indicador)
        return (
          <td key={g.indicador} colSpan={3} className="px-1 py-1.5">
            <div className="grid grid-cols-3 gap-1 text-xs font-mono text-right">
              <span>{fmt(g.tipo, ind?.meta)}</span>
              <span>{fmt(g.tipo, ind?.real)}</span>
              <span className={corDelta(g.indicador, ind?.delta)}>
                {ind ? fmtDelta(g.tipo, ind.delta) : '—'}
              </span>
            </div>
          </td>
        )
      })}
    </tr>
  )
}

function LinhaTotal({ totalIndicadores }) {
  return (
    <tr className="bg-yellow-100 font-semibold border-t-2 border-brand-black">
      <td className="sticky left-0 bg-yellow-100 px-3 py-2 text-sm text-brand-black whitespace-nowrap">Total</td>
      {GRUPOS.map((g) => {
        const ind = achar(totalIndicadores, g.indicador)
        if (g.indicador === 'bandas') {
          return (
            <td key={g.indicador} colSpan={3} className="px-1 py-2">
              <div className="grid grid-cols-3 gap-1 text-xs font-mono text-right">
                <span>{fmt('moeda', ind?.custoArtista)}</span>
                <span>{fmt('moeda', ind?.real)}</span>
                <span className={corDelta('bandas', ind?.delta)}>
                  {ind ? fmtDelta('moeda', ind.delta) : '—'}
                </span>
              </div>
            </td>
          )
        }
        return (
          <td key={g.indicador} colSpan={3} className="px-1 py-2">
            <div className="grid grid-cols-3 gap-1 text-xs font-mono text-right">
              <span>{fmt(g.tipo, ind?.meta)}</span>
              <span>{fmt(g.tipo, ind?.real)}</span>
              <span className={corDelta(g.indicador, ind?.delta)}>
                {ind ? fmtDelta(g.tipo, ind.delta) : '—'}
              </span>
            </div>
          </td>
        )
      })}
    </tr>
  )
}

export default function TabelaGerente({ resultado }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-brand-black">{resultado.gerenteNome}</h2>
        <span className="text-sm font-mono font-bold px-3 py-1 rounded-md bg-brand-amber/15 text-brand-amber">
          {resultado.pontosTotais} / {resultado.pontosPossiveis} pts
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="sticky left-0 bg-black px-3 py-1.5 text-left text-xs">VS M-1</th>
              {GRUPOS.map((g) => (
                <th key={g.indicador} colSpan={3} className="px-1 py-1.5 text-xs font-semibold">
                  {g.label} <span className="text-white/50">({g.pts} pts)</span>
                </th>
              ))}
            </tr>
            <tr className="bg-zinc-100">
              <th className="sticky left-0 bg-zinc-100 px-3 py-1"></th>
              {GRUPOS.map((g) => (
                <th key={g.indicador} colSpan={3} className="px-1 py-1">
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-zinc-500 text-right">
                    <span>{g.indicador === 'bandas' ? 'Artista' : 'Meta'}</span>
                    <span>{g.indicador === 'bandas' ? 'Arrecad.' : 'Real'}</span>
                    <span>Delta</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultado.unidades.map((u) => (
              <LinhaUnidade key={u.unidade} unidade={u.unidade} indicadores={u.indicadores} />
            ))}
            <LinhaTotal totalIndicadores={resultado.totalIndicadores} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
