// app/hub/metas/components/GerenteResumo.jsx
// Resumo visual do gerente: selos por categoria (bateu/não bateu + pts),
// barra de progresso, e a tabela detalhada por unidade escondida atrás
// de "ver detalhe" — só abre pra quem quer investigar o porquê.

'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { labelForUnit } from '@/lib/units'
import { PESOS_PTS } from '@/lib/metas/scoring'

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
  if (delta == null) return ''
  const bom = MENOR_MELHOR.has(indicador) ? delta <= 0 : delta >= 0
  return bom ? 'text-brand-olive' : 'text-brand-crimson'
}

function achar(indicadores, key) {
  return indicadores.find((i) => i.indicador === key)
}

function Selo({ grupo, ind }) {
  const bateu = !!ind?.bateuMeta
  const pontos = ind?.pontos ?? 0
  const pts = PESOS_PTS[grupo.indicador]

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${
        bateu ? 'bg-brand-olive/10' : 'bg-brand-crimson/10'
      }`}
    >
      {bateu ? (
        <Check size={16} className="text-brand-olive shrink-0" />
      ) : (
        <X size={16} className="text-brand-crimson shrink-0" />
      )}
      <div>
        <div className={`text-sm font-medium ${bateu ? 'text-brand-olive' : 'text-brand-crimson'}`}>
          {grupo.label}
        </div>
        <div className={`text-xs ${bateu ? 'text-brand-olive' : 'text-brand-crimson'}`}>
          {bateu ? `${pontos} pts` : `0 de ${pts} pts`}
        </div>
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

  return (
    <div className="mb-8 rounded-xl border border-surface-border bg-surface-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-brand-black">{resultado.gerenteNome}</h2>
        <span className="text-sm font-mono text-zinc-500">
          {resultado.pontosTotais} / {resultado.pontosPossiveis} pts
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden mb-4">
        <div
          className={`h-full ${pct >= 70 ? 'bg-brand-olive' : pct >= 40 ? 'bg-brand-amber' : 'bg-brand-crimson'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {GRUPOS.map((g) => (
          <Selo key={g.indicador} grupo={g} ind={achar(resultado.totalIndicadores, g.indicador)} />
        ))}
      </div>

      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-black transition-colors"
      >
        {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Ver detalhe por unidade
      </button>

      {aberto && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400">
                <th className="px-3 py-1 text-left font-normal">Unidade</th>
                {GRUPOS.map((g) => (
                  <th key={g.indicador} className="px-2 py-1 text-right font-normal">{g.label}</th>
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
