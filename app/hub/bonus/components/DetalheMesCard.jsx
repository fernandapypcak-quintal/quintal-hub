// app/hub/bonus/components/DetalheMesCard.jsx
//
// Detalhe completo de UM mês — aberto ao clicar numa linha da TabelaMensal.
// Mesmo nível de riqueza da visão "Acumulado do Ano": Real grande, as 3
// faixas, gap em p.p. e em número bruto, R$ do LOL, badge de projeção.

'use client'

import { CheckCircle2, AlertTriangle, XCircle, Info, LineChart } from 'lucide-react'
import { FAIXA_LABEL } from '@/lib/bonus/scoring'

const FAIXA_INFO = {
  meta:        { cor: 'text-emerald-700', bg: 'bg-emerald-50', Icon: CheckCircle2, iconCor: '#059669' },
  meta_80:     { cor: 'text-amber-700',   bg: 'bg-amber-50',   Icon: AlertTriangle, iconCor: '#D97706' },
  meta_60:     { cor: 'text-amber-700',   bg: 'bg-amber-50',   Icon: AlertTriangle, iconCor: '#D97706' },
  nao_atingiu: { cor: 'text-rose-700',    bg: 'bg-rose-50',    Icon: XCircle, iconCor: '#E11D48' },
  pendente:    { cor: 'text-zinc-500',    bg: 'bg-zinc-100',   Icon: Info, iconCor: '#A1A1AA' },
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

// Mesma lógica de estimativa usada no Semestre/Acumulado — gap em p.p.
// convertido pra número bruto usando o denominador do próprio mês.
function fmtGapBruto(configKey, gapProximaFaixa, denominador) {
  if (gapProximaFaixa == null || denominador == null) return null
  const bruto = gapProximaFaixa * denominador
  if (configKey === 'nps') {
    return `~${Math.round(Math.abs(bruto)).toLocaleString('pt-BR')} respondentes`
  }
  return `~${fmtReais(bruto)}`
}

function CardIndicadorMes({ resultadoIndicador }) {
  const { config, real, meta, meta80, meta60, faixa, pontos, numerador, denominador, gapProximaFaixa, isProjecao } = resultadoIndicador
  const info = FAIXA_INFO[faixa]
  const isLol = config.key === 'lol_margem'
  const temGap = gapProximaFaixa != null
  const gapBruto = temGap ? fmtGapBruto(config.key, gapProximaFaixa, denominador) : null

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-card ${isProjecao ? 'border-2 border-dashed border-blue-300' : 'border-surface-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-brand-black">{config.label}</h3>
            {isProjecao && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                <LineChart size={10} /> projeção
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Precisamos: <span className="text-zinc-500">{config.objetivo}</span> · Fonte: {config.fonte}
          </p>
        </div>
        <span className="text-sm text-zinc-400 shrink-0 ml-3">peso {(config.peso * 100).toFixed(0)}%</span>
      </div>

      <div className="flex flex-wrap items-end gap-6 mb-2">
        <div>
          <p className="text-xs text-zinc-400 mb-1">Real do mês</p>
          <p className="text-4xl font-bold text-brand-black">{fmtPct(real)}</p>
          {isLol && numerador != null && (
            <p className="text-sm text-zinc-500 mt-1">{fmtReais(numerador)}</p>
          )}
        </div>

        <div className="flex gap-4 pb-1">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Meta</p>
            <p className="text-lg font-semibold text-zinc-600">{fmtPct(meta)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Faixa 80%</p>
            <p className="text-lg font-semibold text-zinc-600">{fmtPct(meta80)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Faixa 60%</p>
            <p className="text-lg font-semibold text-zinc-600">{fmtPct(meta60)}</p>
          </div>
        </div>

        <div className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-full ${info.bg}`}>
          <info.Icon size={16} color={info.iconCor} />
          <span className={`text-sm font-medium ${info.cor}`}>{FAIXA_LABEL[faixa]}</span>
        </div>
      </div>

      {temGap && (
        <p className="text-sm text-zinc-500 mb-1">
          Faltam <span className="font-semibold text-zinc-700">{fmtPct(Math.abs(gapProximaFaixa))}</span> pra próxima faixa
          {gapBruto && <> · <span className="font-semibold text-zinc-700">{gapBruto}</span> <span className="text-zinc-400">(estimativa)</span></>}
        </p>
      )}

      <p className="text-xs text-zinc-400 mt-2">{pontos.toFixed(3).replace('.', ',')} pts</p>
    </div>
  )
}

export default function DetalheMesCard({ resultadoMes, label }) {
  if (!resultadoMes) return null
  const temAlgumDado = resultadoMes.indicadores.some((i) => i.faixa !== 'pendente')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-brand-black">Detalhe — {label}</h3>
        <span className="text-xs font-mono text-zinc-500">
          {resultadoMes.pontosTotais.toFixed(3).replace('.', ',')} / {resultadoMes.pesoTotalColetivo.toFixed(2).replace('.', ',')} pts
          {' '}({(resultadoMes.percentualAtingido * 100).toFixed(0)}%)
        </span>
      </div>

      {!temAlgumDado ? (
        <div className="bg-white border border-surface-border rounded-2xl p-6 text-center shadow-card">
          <p className="text-sm text-zinc-500">Ainda não há apuração lançada para {label}.</p>
        </div>
      ) : (
        resultadoMes.indicadores.map((ind) => (
          <CardIndicadorMes key={ind.config.key} resultadoIndicador={ind} />
        ))
      )}
    </div>
  )
}
