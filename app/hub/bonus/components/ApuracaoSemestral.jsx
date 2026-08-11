// app/hub/bonus/components/ApuracaoSemestral.jsx
//
// Apuração OFICIAL do bônus: S1 (Jan-Jun) e S2 (Jul-Dez, ou Jan-Dez pra
// quem não bateu nenhuma faixa em S1 — regra de recuperação).
//
// Reforça 3 coisas visualmente que antes ficavam escondidas numa tabela:
// 1. Quantos meses de cada período JÁ foram lançados (nem todo período
//    fechado tem os 6/12 meses digitados ainda).
// 2. O status de cada período: Fechado (6 ou 12 de 6 ou 12) vs Em andamento.
// 3. A "jornada" de cada indicador — o que aconteceu no S1 e pra onde
//    isso empurra o S2 (janela própria ou recuperação).

'use client'

import { ArrowRight, RotateCcw, CheckCircle2, Clock } from 'lucide-react'
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

function StatusPeriodo({ lancados, total }) {
  const fechado = lancados >= total
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full ${
      fechado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
    }`}>
      {fechado ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {fechado ? 'Fechado' : `${lancados}/${total} meses`}
    </span>
  )
}

function CardPeriodo({ label, subtitulo, resultado, lancados, total }) {
  const pct = resultado.percentualAtingido * 100
  const barColor = pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#E11D48'

  return (
    <div className="rounded-xl border border-surface-border p-4 flex flex-col gap-2 flex-1 min-w-[220px] max-w-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
          <p className="text-[11px] font-mono text-zinc-400">{subtitulo}</p>
        </div>
        <StatusPeriodo lancados={lancados} total={total} />
      </div>

      <p className="text-2xl font-mono font-semibold text-brand-black">{pct.toFixed(0)}%</p>

      <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
      </div>

      <p className="text-[11px] font-mono text-zinc-400">
        {resultado.pontosTotais.toFixed(3).replace('.', ',')} / {resultado.pesoTotalColetivo.toFixed(2).replace('.', ',')} pts
      </p>
    </div>
  )
}

function Badge({ resultado, mesesLancados, totalMeses }) {
  const style = FAIXA_STYLE[resultado.faixa]
  return (
    <div className={`rounded-lg ${style.bg} px-3 py-2 flex flex-col gap-0.5 flex-1 min-w-[104px] max-w-[220px]`}>
      <span className="text-sm font-mono font-semibold text-brand-black">{fmtPct(resultado.real)}</span>
      <span className={`text-[10px] font-mono ${style.text}`}>{FAIXA_LABEL[resultado.faixa]}</span>
      <span className="text-[9px] font-mono text-zinc-400">{mesesLancados}/{totalMeses} meses</span>
    </div>
  )
}

function JornadaIndicador({ item }) {
  const { config, s1, s2, s2Janela, recuperandoS1, mesesLancadosS1, mesesLancadosS2, totalMesesS2 } = item

  return (
    <div className="flex items-center gap-3 py-3 border-t border-surface-border first:border-t-0 max-w-2xl">
      <div className="w-36 shrink-0">
        <p className="text-sm font-medium text-brand-black">{config.label}</p>
        <p className="text-[10px] font-mono text-zinc-400">peso {(config.peso * 100).toFixed(0)}%</p>
      </div>

      <Badge resultado={s1} mesesLancados={mesesLancadosS1} totalMeses={6} />

      <div className="flex flex-col items-center shrink-0 w-16">
        {recuperandoS1 ? (
          <>
            <RotateCcw size={14} className="text-amber-600" />
            <span className="text-[9px] font-mono text-amber-600 text-center leading-tight mt-0.5">
              recuperando<br />no S2
            </span>
          </>
        ) : (
          <ArrowRight size={14} className="text-zinc-300" />
        )}
      </div>

      <Badge resultado={s2} mesesLancados={mesesLancadosS2} totalMeses={totalMesesS2} />

      <span className="text-[10px] font-mono text-zinc-400 shrink-0 hidden lg:inline w-20 text-right">
        {s2Janela === 'jul_dez' ? 'Jul-Dez' : 'Jan-Dez'}
      </span>
    </div>
  )
}

export default function ApuracaoSemestral({ resultadoAnual }) {
  const { ano, indicadores, s1, s2 } = resultadoAnual
  const algumRecuperando = indicadores.some((i) => i.recuperandoS1)

  // status geral do período = o mínimo entre os indicadores (a apuração
  // só está "fechada" quando TODOS os indicadores tiverem os meses lançados)
  const lancadosS1 = Math.min(...indicadores.map((i) => i.mesesLancadosS1))
  const lancadosS2 = Math.min(...indicadores.map((i) => i.mesesLancadosS2))
  const totalS2 = indicadores[0]?.totalMesesS2 ?? 6
  const janelaS2Mista = new Set(indicadores.map((i) => i.s2Janela)).size > 1

  return (
    <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
      <div className="p-5 pb-4">
        <h2 className="text-base font-semibold text-brand-black mb-1">Apuração Semestral — {ano}</h2>
        <p className="text-[11px] text-zinc-400 font-mono mb-4">
          S1: Jan-Jun · S2: Jul-Dez (ou Jan-Dez pro indicador que não bateu nenhuma faixa em S1)
        </p>

        <div className="flex flex-wrap gap-3">
          <CardPeriodo
            label="S1"
            subtitulo="Jan-Jun"
            resultado={s1}
            lancados={lancadosS1}
            total={6}
          />
          <CardPeriodo
            label="S2"
            subtitulo={janelaS2Mista ? 'misto (varia por indicador)' : (indicadores[0]?.s2Janela === 'jan_dez' ? 'Jan-Dez' : 'Jul-Dez')}
            resultado={s2}
            lancados={lancadosS2}
            total={totalS2}
          />
        </div>
      </div>

      <div className="border-t border-surface-border px-5">
        {indicadores.map((item) => (
          <JornadaIndicador key={item.config.key} item={item} />
        ))}
      </div>

      {algumRecuperando && (
        <div className="px-5 py-3 bg-amber-50/60 border-t border-amber-100">
          <p className="text-xs text-amber-800 flex items-center gap-1.5">
            <RotateCcw size={12} />
            Pelo menos um indicador não bateu nenhuma faixa em S1 — pra esse indicador, o S2 está
            avaliando o acumulado do ano inteiro (Jan-Dez), não só o segundo semestre.
          </p>
        </div>
      )}
    </div>
  )
}
