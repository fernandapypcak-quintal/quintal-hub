// app/hub/bonus/components/BonusResumo.jsx
// Mesmo estilo visual dos cards de gerente do módulo de Metas: rounded-2xl,
// borda colorida à esquerda, badges em pill, barra de progresso fina.
// Aqui não há dimensão de loja/gerente — é um card único da meta coletiva.

'use client'

import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { FAIXA_LABEL } from '@/lib/bonus/scoring'

const FAIXA_STYLE = {
  meta:         { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  meta_80:      { bg: 'bg-amber-50',    text: 'text-amber-700' },
  meta_60:      { bg: 'bg-amber-50',    text: 'text-amber-700' },
  nao_atingiu:  { bg: 'bg-rose-50',     text: 'text-rose-700' },
  pendente:     { bg: 'bg-zinc-100',    text: 'text-zinc-400' },
}

function fmtPct(v, digits = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

function fmtReais(v) {
  if (v == null) return null
  const sinal = v < 0 ? '-' : ''
  return `${sinal}R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function Selo({ resultado }) {
  const { config, real, meta, faixa, pontos, numerador } = resultado
  const style = FAIXA_STYLE[faixa]
  const isLol = config.key === 'lol_margem'

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full ${style.bg}`}
      title={`Precisamos: ${config.objetivo} · Fonte: ${config.fonte}`}
    >
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={`text-xs font-semibold whitespace-nowrap ${style.text}`}>
          {config.label}
        </span>
        <span className="text-[10px] text-zinc-400 whitespace-nowrap font-mono">
          {fmtPct(real)} / meta {fmtPct(meta)}
        </span>
        {isLol && numerador != null && (
          <span className="text-[10px] text-zinc-400 whitespace-nowrap font-mono">
            ({fmtReais(numerador)})
          </span>
        )}
        <span className={`text-[10px] whitespace-nowrap font-mono ${style.text}/70`}>
          {FAIXA_LABEL[faixa]} · {pontos.toFixed(3).replace('.', ',')} pts
        </span>
      </div>
    </div>
  )
}

function LinhaDetalhe({ resultado }) {
  const { config, meta, meta80, meta60, real, gapProximaFaixa, faixa } = resultado
  return (
    <tr className="border-t border-surface-border">
      <td className="px-3 py-1.5 text-sm text-brand-black whitespace-nowrap">
        {config.label}
        <p className="text-[10px] text-zinc-400 font-normal">{config.objetivo} · {config.fonte}</p>
      </td>
      <td className="px-2 py-1.5 text-right text-xs font-mono text-zinc-500">{fmtPct(meta)}</td>
      <td className="px-2 py-1.5 text-right text-xs font-mono text-zinc-500">{fmtPct(meta80)}</td>
      <td className="px-2 py-1.5 text-right text-xs font-mono text-zinc-500">{fmtPct(meta60)}</td>
      <td className="px-2 py-1.5 text-right text-xs font-mono text-brand-black font-semibold">{fmtPct(real)}</td>
      <td className="px-2 py-1.5 text-right text-xs font-mono text-zinc-400">
        {faixa === 'meta' || faixa === 'pendente' ? '—' : `${gapProximaFaixa >= 0 ? '+' : ''}${fmtPct(Math.abs(gapProximaFaixa ?? 0))}`}
      </td>
    </tr>
  )
}

export default function BonusResumo({ resultado, titulo = 'Meta Coletiva', subtitulo }) {
  const [aberto, setAberto] = useState(false)
  const pct = resultado.percentualAtingido * 100
  const barColor = pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#E11D48'

  return (
    <div className="mb-5 bg-white border border-surface-border rounded-2xl shadow-card" style={{ borderLeft: '4px solid #97A624' }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-olive" />
            <div>
              <h2 className="text-base font-semibold text-brand-black">{titulo}</h2>
              {subtitulo && <p className="text-[11px] text-zinc-400 font-mono">{subtitulo}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block w-24 h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-500 whitespace-nowrap">
              {resultado.pontosTotais.toFixed(3).replace('.', ',')} / {resultado.pesoTotalColetivo.toFixed(2).replace('.', ',')} pts
              {' '}({pct.toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {resultado.indicadores.map((r) => (
            <Selo key={r.config.key} resultado={r} />
          ))}
        </div>

        <button
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-black transition-colors"
        >
          {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Ver faixas (Meta / 80% / 60%)
        </button>
      </div>

      {aberto && (
        <div className="border-t border-surface-border px-5 py-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Indicador</th>
                <th className="px-2 py-1 text-right text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Meta</th>
                <th className="px-2 py-1 text-right text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Meta 80%</th>
                <th className="px-2 py-1 text-right text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Meta 60%</th>
                <th className="px-2 py-1 text-right text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Real</th>
                <th className="px-2 py-1 text-right text-[10px] text-zinc-400 uppercase tracking-wider font-normal">Gap próx. faixa</th>
              </tr>
            </thead>
            <tbody>
              {resultado.indicadores.map((r) => (
                <LinhaDetalhe key={r.config.key} resultado={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
