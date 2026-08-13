// app/hub/bonus/components/AcumuladoAnoView.jsx
//
// Segunda visão da apuração: o número cru do ano corrido (Jan-Dez
// acumulado), sem a mecânica de pagamento (S1/S2/recuperação). Serve
// pra acompanhar a tendência do ano sem misturar com a regra de bônus.

'use client'

import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { FAIXA_LABEL } from '@/lib/bonus/scoring'

function fmtPct(v, digits = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

function fmtReais(v) {
  if (v == null) return null
  const sinal = v < 0 ? '-' : ''
  return `${sinal}R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const FAIXA_INFO = {
  meta:        { cor: 'text-emerald-700', bg: 'bg-emerald-50', Icon: CheckCircle2, iconCor: '#059669' },
  meta_80:     { cor: 'text-amber-700',   bg: 'bg-amber-50',   Icon: AlertTriangle, iconCor: '#D97706' },
  meta_60:     { cor: 'text-amber-700',   bg: 'bg-amber-50',   Icon: AlertTriangle, iconCor: '#D97706' },
  nao_atingiu: { cor: 'text-rose-700',    bg: 'bg-rose-50',    Icon: XCircle, iconCor: '#E11D48' },
  pendente:    { cor: 'text-zinc-500',    bg: 'bg-zinc-100',   Icon: Info, iconCor: '#A1A1AA' },
}

function LinhaIndicador({ item }) {
  const { config, resultado, mesesLancados, valorAbsoluto, valorParcial } = item
  const info = FAIXA_INFO[resultado.faixa]
  const isLol = config.key === 'lol_margem'

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-semibold text-brand-black">{config.label}</h3>
        <span className="text-sm text-zinc-400">peso {(config.peso * 100).toFixed(0)}%</span>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-zinc-400 mb-1">Real (Jan-Dez acumulado)</p>
          <p className="text-4xl font-bold text-brand-black">{fmtPct(resultado.real)}</p>
          {isLol && valorAbsoluto != null && (
            <p className="text-sm text-zinc-500 mt-1">
              {fmtReais(valorAbsoluto)}{valorParcial && <span className="text-zinc-400"> (parcial — faltam meses)</span>}
            </p>
          )}
        </div>

        <div className="pb-1">
          <p className="text-xs text-zinc-400 mb-1">Meta</p>
          <p className="text-xl font-semibold text-zinc-600">{fmtPct(resultado.meta)}</p>
        </div>

        <div className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-full ${info.bg}`}>
          <info.Icon size={16} color={info.iconCor} />
          <span className={`text-sm font-medium ${info.cor}`}>{FAIXA_LABEL[resultado.faixa]}</span>
        </div>
      </div>

      <p className="text-xs text-zinc-400 mt-3">dados de {mesesLancados}/12 meses do ano</p>
    </div>
  )
}

export default function AcumuladoAnoView({ resultadoAcumuladoAno }) {
  const { ano, indicadores, pontosTotais, pesoTotalColetivo, percentualAtingido, mesesLancados } = resultadoAcumuladoAno
  const pct = percentualAtingido * 100
  const cor = pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#E11D48'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-brand-black">Acumulado do Ano — {ano}</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Visão de acompanhamento: acumulado Jan-Dez corrido, sem a regra de recuperação por semestre.
          Útil pra ver a tendência do ano sem misturar com a mecânica de pagamento do bônus.
        </p>
      </div>

      <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-card max-w-sm">
        <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-1">Placar do ano</p>
        <p className="text-xs text-zinc-400 mb-3">dados de {mesesLancados}/12 meses</p>
        <p className="text-6xl font-bold leading-none" style={{ color: cor }}>{pct.toFixed(0)}%</p>
        <p className="text-sm text-zinc-500 mt-2">
          {pontosTotais.toFixed(3).replace('.', ',')} / {pesoTotalColetivo.toFixed(2).replace('.', ',')} pts do bônus coletivo
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {indicadores.map((item) => (
          <LinhaIndicador key={item.config.key} item={item} />
        ))}
      </div>
    </div>
  )
}
