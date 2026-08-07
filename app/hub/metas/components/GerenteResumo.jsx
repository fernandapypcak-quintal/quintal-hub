// app/hub/metas/components/GerenteResumo.jsx
// Resumo visual do gerente — mesmo estilo visual dos cards de loja do
// dashboard de Faturamento: rounded-2xl, borda colorida à esquerda,
// badges em pill, barra de progresso fina.

'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { labelForUnit } from '@/lib/units'
import { PESOS_PTS } from '@/lib/metas/scoring'

const GERENTE_COLORS = { marco: '#97A624', andre: '#0284C7', keylla: '#7C3AED' }

const GRUPOS = [
  { indicador: 'cmv', label: 'CMV', tipo: 'pct' },
  { indicador: 'custo_folha', label: 'Custo Folha', tipo: 'pct' },
  { indicador: 'custo_freela', label: 'Custo Freela', tipo: 'moeda' },
  { indicador: 'nps', label: 'NPS', tipo: 'num' },
  { indicador: 'bandas', label: 'Bandas', tipo: 'bandas' },
  { indicador: 'faturamento', label: 'Faturamento', tipo: 'moeda' },
]

// Indicadores de custo — delta negativo (real caiu abaixo da meta) é BOM.
const MENOR_MELHOR = new Set(['cmv', 'custo_folha', 'custo_freela'])

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

function corDelta(indicador, delta) {
  if (delta == null) return 'text-zinc-400'
  const bom = MENOR_MELHOR.has(indicador) ? delta <= 0 : delta >= 0
  return bom ? 'text-emerald-700' : 'text-rose-700'
}

function achar(indicadores, key) {
  return indicadores.find((i) => i.indicador === key)
}

function Selo({ grupo, ind }) {
  const bateu = !!ind?.bateuMeta
  const pontos = ind?.pontos ?? 0
  const pts = PESOS_PTS[grupo.indicador]

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${bateu ? 'bg-emerald-50' : 'bg-rose-50'}`}>
      {bateu ? (
        <Check size={14} className="text-emerald-700 shrink-0" />
      ) : (
        <X size={14} className="text-rose-700 shrink-0" />
      )}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={`text-xs font-semibold whitespace-nowrap ${bateu ? 'text-emerald-700' : 'text-rose-700'}`}>
          {grupo.label}
        </span>
        <span className={`text-[10px] whitespace-nowrap ${bateu ? 'text-emerald-700/70' : 'text-rose-700/70'}`}>
          {bateu ? `${pontos} pts` : `0/${pts} pts`}
        </span>
      </div>
    </div>
  )
}

function LinhaDetalhe({ unidade, indicadores }) {
  return (
    <tr className="border-t border-surface-border">
      <td className="px-3 py-1.5 text-sm text-brand-black whitespace-nowrap">{labelForUnit(unidade)}</td>
      {GRUPOS.map((g) => {
        if (g.indicador === 'bandas') {
          const ind = achar(indicadores, 'bandas')
          return (
            <td key={g.indicador} className="px-2 py-1.5 text-right">
              <div className="flex flex-col items-end text-xs font-mono">
                <span className="text-zinc-400">{fmt('moeda', ind?.custoArtista)} → {fmt('moeda', ind?.real)}</span>
                <span className={corDelta('bandas', ind?.delta)}>{ind ? fmtDelta('moeda', ind.delta) : '—'}</span>
              </div>
            </td>
          )
        }
        const ind = achar(indicadores, g.indicador)
        return (
          <td key={g.indicador} className="px-2 py-1.5 text-right">
            <div className="flex flex-col items-end text-xs font-mono">
              <span className="text-zinc-400">{fmt(g.tipo, ind?.meta)} → {fmt(g.tipo, ind?.real)}</span>
              <span className={corDelta(g.indicador, ind?.delta)}>{ind ? fmtDelta(g.tipo, ind.delta) : '—'}</span>
            </div>
          </td>
        )
      })}
    </tr>
  )
}

export default function GerenteResumo({ resultado }) {
  const [aberto, setAberto] = useState(false)
  const pct = (resultado.pontosTotais / resultado.pontosPossiveis) * 100
  const cor = GERENTE_COLORS[resultado.gerenteId] || '#97A624'
  const barColor = pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#E11D48'

  return (
    <div
      className="mb-5 bg-white border border-surface-border rounded-2xl shadow-card"
      style={{ borderLeft: `4px solid ${cor}` }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-brand-black">{resultado.gerenteNome}</h2>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block w-24 h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-500 whitespace-nowrap">
              {resultado.pontosTotais}/{resultado.pontosPossiveis} pts
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {GRUPOS.map((g) => (
            <Selo key={g.indicador} grupo={g} ind={achar(resultado.totalIndicadores, g.indicador)} />
          ))}
        </div>

        <button
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-black transition-colors"
        >
          {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Ver detalhe por unidade
        </button>
      </div>

      {aberto && (
        <div className="border-t border-surface-border px-5 py-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Unidade</th>
                {GRUPOS.map((g) => (
                  <th key={g.indicador} className="px-2 py-1 text-right text-[10px] text-zinc-400 uppercase tracking-wider font-normal">
                    {g.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultado.unidades.map((u) => (
                <LinhaDetalhe key={u.unidade} unidade={u.unidade} indicadores={u.indicadores} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
