// app/hub/bonus/components/ApuracaoSemestral.jsx
//
// Pensado pra quem só quer entender "como estou indo", sem precisar
// saber como o cálculo funciona por trás. Regras de exposição:
// - Números grandes, frase em português simples por indicador.
// - Nenhum jargão de metodologia ("acumulado"/"média fallback") na tela
//   principal — isso vira um ⓘ com tooltip pra quem quiser o detalhe.
// - A regra de recuperação é contada como frase, não como badge pequeno.

'use client'

import { CheckCircle2, AlertTriangle, XCircle, Info, ArrowDown } from 'lucide-react'
import { useState } from 'react'

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmtPct(v, digits = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

// -------- linguagem simples por faixa --------
const FAIXA_INFO = {
  meta:        { texto: 'Bateu a meta cheia',      cor: 'text-emerald-700', bg: 'bg-emerald-50', Icon: CheckCircle2, iconCor: '#059669' },
  meta_80:     { texto: 'Bateu a faixa de 80%',     cor: 'text-amber-700',   bg: 'bg-amber-50',   Icon: AlertTriangle, iconCor: '#D97706' },
  meta_60:     { texto: 'Bateu a faixa de 60%',     cor: 'text-amber-700',   bg: 'bg-amber-50',   Icon: AlertTriangle, iconCor: '#D97706' },
  nao_atingiu: { texto: 'Não bateu nenhuma faixa',  cor: 'text-rose-700',    bg: 'bg-rose-50',    Icon: XCircle, iconCor: '#E11D48' },
  pendente:    { texto: 'Ainda sem dados',          cor: 'text-zinc-500',    bg: 'bg-zinc-100',   Icon: Info, iconCor: '#A1A1AA' },
}

function resumoPeriodo(indicadores, chave) {
  const validos = indicadores.filter((i) => i[chave].faixa !== 'pendente')
  if (validos.length === 0) return 'Ainda não há dados suficientes pra apurar este período.'
  const bateram = validos.filter((i) => i[chave].faixa !== 'nao_atingiu').length
  if (bateram === validos.length) return `Todos os ${validos.length} indicadores já apurados bateram pelo menos uma faixa da meta.`
  if (bateram === 0) return `Nenhum dos ${validos.length} indicadores já apurados bateu a meta ainda.`
  return `${bateram} de ${validos.length} indicadores já apurados bateram pelo menos uma faixa da meta.`
}

function HeroPeriodo({ titulo, subtitulo, resultado, lancados, total, indicadores, chave }) {
  const pct = resultado.percentualAtingido * 100
  const fechado = lancados >= total
  const cor = pct >= 70 ? '#059669' : pct >= 40 ? '#D97706' : '#E11D48'

  return (
    <div className="flex-1 min-w-[280px] rounded-2xl border border-surface-border bg-white p-6 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{titulo}</p>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          fechado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {fechado ? 'Fechado' : `Dados de ${lancados} de ${total} meses`}
        </span>
      </div>
      <p className="text-sm text-zinc-400 mb-4">{subtitulo}</p>

      <p className="text-6xl font-bold text-brand-black leading-none mb-1" style={{ color: cor }}>
        {pct.toFixed(0)}%
      </p>
      <p className="text-sm text-zinc-500 mb-4">do bônus coletivo garantido até aqui</p>

      <p className="text-sm text-zinc-600">{resumoPeriodo(indicadores, chave)}</p>
    </div>
  )
}

function CardIndicador({ item }) {
  const { config, s1, s2, recuperandoS1, mesesLancadosS1, mesesLancadosS2, totalMesesS2, metodologiaS1, metodologiaS2 } = item
  const [detalheAberto, setDetalheAberto] = useState(false)

  const infoS1 = FAIXA_INFO[s1.faixa]
  const infoS2 = FAIXA_INFO[s2.faixa]

  const fraseConexao = recuperandoS1
    ? 'Não bateu no 1º semestre — o resultado final agora vai depender do ano inteiro (Jan a Dez), não só do 2º semestre.'
    : 'Bateu no 1º semestre — o 2º semestre é avaliado à parte, só com Jul a Dez.'

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-black">{config.label}</h3>
        <span className="text-sm text-zinc-400">peso {(config.peso * 100).toFixed(0)}% do bônus coletivo</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* S1 */}
        <div className={`rounded-xl p-4 ${infoS1.bg}`}>
          <p className="text-xs font-medium text-zinc-500 mb-1">1º Semestre (Jan-Jun)</p>
          <p className="text-3xl font-bold text-brand-black mb-1">{fmtPct(s1.real)}</p>
          <div className="flex items-center gap-1.5">
            <infoS1.Icon size={15} color={infoS1.iconCor} />
            <span className={`text-sm font-medium ${infoS1.cor}`}>{infoS1.texto}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">meta: {fmtPct(s1.meta)} · dados de {mesesLancadosS1}/6 meses</p>
        </div>

        {/* S2 */}
        <div className={`rounded-xl p-4 ${infoS2.bg}`}>
          <p className="text-xs font-medium text-zinc-500 mb-1">
            2º Semestre {recuperandoS1 ? '(Jan-Dez)' : '(Jul-Dez)'}
          </p>
          <p className="text-3xl font-bold text-brand-black mb-1">{fmtPct(s2.real)}</p>
          <div className="flex items-center gap-1.5">
            <infoS2.Icon size={15} color={infoS2.iconCor} />
            <span className={`text-sm font-medium ${infoS2.cor}`}>{infoS2.texto}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">meta: {fmtPct(s2.meta)} · dados de {mesesLancadosS2}/{totalMesesS2} meses</p>
        </div>
      </div>

      <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
        recuperandoS1 ? 'bg-amber-50/60 text-amber-800' : 'bg-surface-muted/60 text-zinc-600'
      }`}>
        <ArrowDown size={14} className="mt-0.5 shrink-0 rotate-[-90deg]" />
        <span>{fraseConexao}</span>
      </div>

      <button
        onClick={() => setDetalheAberto((v) => !v)}
        className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
      >
        <Info size={12} /> {detalheAberto ? 'Ocultar' : 'Como esse número foi calculado?'}
      </button>

      {detalheAberto && (
        <div className="mt-2 text-xs text-zinc-500 bg-surface-muted/40 rounded-lg p-3 space-y-1">
          <p>
            <strong>1º Semestre:</strong> {metodologiaS1 === 'acumulado'
              ? 'acumulado real do período (soma dos valores ÷ soma da base de todos os meses lançados).'
              : 'faltou volume lançado em algum mês — usando a média simples dos meses como aproximação.'}
          </p>
          <p>
            <strong>2º Semestre:</strong> {metodologiaS2 === 'acumulado'
              ? 'acumulado real do período (soma dos valores ÷ soma da base de todos os meses lançados).'
              : 'faltou volume lançado em algum mês — usando a média simples dos meses como aproximação.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ApuracaoSemestral({ resultadoAnual }) {
  const { ano, indicadores, s1, s2 } = resultadoAnual

  const lancadosS1 = Math.min(...indicadores.map((i) => i.mesesLancadosS1))
  const lancadosS2 = Math.min(...indicadores.map((i) => i.mesesLancadosS2))
  const totalS2 = indicadores[0]?.totalMesesS2 ?? 6

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-brand-black">Apuração do Bônus — {ano}</h2>
        <p className="text-sm text-zinc-500 mt-1">
          O bônus coletivo é apurado 2 vezes por ano. Se um indicador não bater meta no 1º semestre,
          ele ganha mais uma chance no fechamento do ano — avaliando Jan a Dez inteiro em vez de só o 2º semestre.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <HeroPeriodo
          titulo="1º Semestre"
          subtitulo="Jan-Jun/2026"
          resultado={s1}
          lancados={lancadosS1}
          total={6}
          indicadores={indicadores}
          chave="s1"
        />
        <HeroPeriodo
          titulo="2º Semestre"
          subtitulo="Jul-Dez/2026 (ou ano inteiro pra quem tá recuperando)"
          resultado={s2}
          lancados={lancadosS2}
          total={totalS2}
          indicadores={indicadores}
          chave="s2"
        />
      </div>

      <div className="flex flex-col gap-3">
        {indicadores.map((item) => (
          <CardIndicador key={item.config.key} item={item} />
        ))}
      </div>
    </div>
  )
}
