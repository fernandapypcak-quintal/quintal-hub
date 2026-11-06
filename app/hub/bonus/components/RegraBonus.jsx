// app/hub/bonus/components/RegraBonus.jsx
//
// Os 3 "quadrinhos" do bônus — 1º Semestre, 2º Semestre e Acumulado do Ano.
// Cada um traz a regra em poucas linhas e, embaixo, quanto isso dá hoje em
// salários. Como as metas individuais (20%) são apuradas fora do painel, o
// resultado aparece em cenários: 0, 1 ou 2 individuais batidas.

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, LineChart } from 'lucide-react'
import {
  PESO_COLETIVO_TOTAL,
  CORTE_MINIMO_TOTAL,
  SALARIOS_POR_SEMESTRE,
  SALARIOS_ANO,
  calcularCenarios,
} from '@/lib/bonus/scoring'
import ComposicaoBonus from './ComposicaoBonus'

export function fmtSal(v) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

const fmtPct = (v, d = 0) => `${(v * 100).toFixed(d).replace('.', ',')}%`

const COR_FAIXA = {
  meta: '#059669',
  meta_80: '#D97706',
  meta_60: '#F59E0B',
  nao_atingiu: '#E11D48',
  pendente: '#D4D4D8',
}

function BarraColetivo({ itens }) {
  return (
    <div className="flex w-full gap-1">
      {itens.map(({ config, resultado }) => {
        const preenchido = config.peso > 0 ? (resultado.pontos / config.peso) * 100 : 0
        return (
          <div key={config.key} className="h-2 rounded-full overflow-hidden bg-zinc-100" style={{ width: `${config.peso * 100}%` }}>
            <div className="h-full rounded-full" style={{ width: `${preenchido}%`, backgroundColor: COR_FAIXA[resultado.faixa] }} />
          </div>
        )
      })}
      <div className="h-2 rounded-full border border-dashed border-zinc-300" style={{ width: '20%' }} />
    </div>
  )
}

function Status({ texto, tipo }) {
  const cls = {
    fechado: 'bg-emerald-50 text-emerald-700',
    parcial: 'bg-amber-50 text-amber-700',
    projecao: 'bg-blue-50 text-blue-700',
  }[tipo]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {tipo === 'projecao' && <LineChart size={10} />}
      {texto}
    </span>
  )
}

function statusPeriodo(lancados, total, temProjecao) {
  if (temProjecao) return { tipo: 'projecao', texto: 'Inclui projeção' }
  if (lancados >= total) return { tipo: 'fechado', texto: 'Fechado' }
  return { tipo: 'parcial', texto: `Parcial · ${lancados}/${total} meses` }
}

function Quadrinho({ titulo, periodo, vale, regras, status, coletivo, itens, children, escuro }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className={`flex flex-col rounded-2xl border p-5 shadow-card ${escuro ? 'border-brand-black bg-white ring-1 ring-brand-black' : 'border-surface-border bg-white'}`}>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-brand-black">{titulo}</p>
          <p className="text-xs text-zinc-400">{periodo}</p>
        </div>
        <Status {...status} />
      </div>
      <p className="mt-3 text-2xl font-bold text-brand-black">{vale}</p>

      {/* Regra */}
      <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
        {regras.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-zinc-300">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {/* Coletivo hoje */}
      <div className="mt-5 pt-4 border-t border-surface-border">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Coletivo</p>
          <p className="text-sm text-zinc-500">
            <span className="text-xl font-bold text-brand-black tabular-nums">{fmtPct(coletivo, 1)}</span> de {fmtPct(PESO_COLETIVO_TOTAL)}
          </p>
        </div>
        <BarraColetivo itens={itens} />
        <button
          onClick={() => setAberto((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
        >
          {aberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />} ver por indicador
        </button>
        {aberto && <ComposicaoBonus itens={itens} pontosTotais={coletivo} apenasLinhas />}
      </div>

      {/* Quanto dá */}
      <div className="mt-4 flex-1">{children}</div>
    </div>
  )
}

function TabelaCenarios({ linhas, colunas }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] text-zinc-400 uppercase tracking-wide">
          {colunas.map((c, i) => (
            <th key={c} className={`font-normal pb-1.5 ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-border">
        {linhas.map((l) => (
          <tr key={l.chave} className={l.naoPaga ? 'text-zinc-400' : 'text-zinc-700'}>
            {l.celulas.map((c, i) => (
              <td key={i} className={`py-1.5 tabular-nums ${i === 0 ? 'text-left' : 'text-right'} ${i === l.celulas.length - 1 && !l.naoPaga ? 'font-semibold text-brand-black' : ''}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const labelInd = (k) => (k === 0 ? 'Nenhuma' : k === 1 ? '1 de 2' : '2 de 2')

export default function RegraBonus({ resultadoAnual, resultadoAcumuladoAno }) {
  const { indicadores, s1, s2 } = resultadoAnual
  const coletivoAno = resultadoAcumuladoAno.pontosTotais
  const cenarios = calcularCenarios(s1.pontosTotais, s2.pontosTotais, coletivoAno)

  const itensS1 = indicadores.map((i) => ({ config: i.config, resultado: i.s1 }))
  const itensS2 = indicadores.map((i) => ({ config: i.config, resultado: i.s2 }))
  const itensAno = resultadoAcumuladoAno.indicadores.map((i) => ({ config: i.config, resultado: i.resultado }))

  const lancS1 = Math.min(...indicadores.map((i) => i.mesesLancadosS1))
  const lancS2 = Math.min(...indicadores.map((i) => i.mesesLancadosS2))
  const projS1 = indicadores.some((i) => i.s1TemProjecao)
  const projS2 = indicadores.some((i) => i.s2TemProjecao)
  const projAno = resultadoAcumuladoAno.indicadores.some((i) => i.temProjecao)

  const corte = fmtPct(CORTE_MINIMO_TOTAL)

  const regrasSemestre = [
    'Cada meta paga pela faixa que bateu: meta cheia, 80% ou 60%.',
    'Total = coletivo (até 80%) + individuais (até 20%).',
    `Total abaixo de ${corte}: não paga.`,
    `Recebe: total × ${SALARIOS_POR_SEMESTRE} salários.`,
  ]

  const linhasSemestre = (chaveAting, chaveSal) =>
    cenarios.map((c) => ({
      chave: c.individuais,
      naoPaga: c[chaveSal] === 0,
      celulas: [labelInd(c.individuais), fmtPct(c[chaveAting]), c[chaveSal] === 0 ? 'não paga' : `${fmtSal(c[chaveSal])} sal.`],
    }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Quadrinho
        titulo="1º Semestre"
        periodo="Jan – Jun"
        vale={`Até ${SALARIOS_POR_SEMESTRE} salários`}
        regras={regrasSemestre}
        status={statusPeriodo(lancS1, 6, projS1)}
        coletivo={s1.pontosTotais}
        itens={itensS1}
      >
        <TabelaCenarios colunas={['Individuais batidas', 'Total', 'Recebe']} linhas={linhasSemestre('atingimentoS1', 'salariosS1')} />
      </Quadrinho>

      <Quadrinho
        titulo="2º Semestre"
        periodo="Jul – Dez"
        vale={`Até ${SALARIOS_POR_SEMESTRE} salários`}
        regras={regrasSemestre}
        status={statusPeriodo(lancS2, 6, projS2)}
        coletivo={s2.pontosTotais}
        itens={itensS2}
      >
        <TabelaCenarios colunas={['Individuais batidas', 'Total', 'Recebe']} linhas={linhasSemestre('atingimentoS2', 'salariosS2')} />
      </Quadrinho>

      <Quadrinho
        escuro
        titulo="Acumulado do Ano"
        periodo="Jan – Dez"
        vale={`Até ${SALARIOS_ANO} salários`}
        regras={[
          'Refaz a conta com o ano inteiro, com as mesmas faixas.',
          `Total do ano abaixo de ${corte}: não paga.`,
          `Recebe: total × ${SALARIOS_ANO} salários, menos o que já recebeu nos semestres.`,
          'Se der menos do que já recebeu, ninguém devolve.',
        ]}
        status={statusPeriodo(resultadoAcumuladoAno.mesesLancados, 12, projAno)}
        coletivo={coletivoAno}
        itens={itensAno}
      >
        <TabelaCenarios
          colunas={['Individuais', 'Total', 'Ano', 'Já recebeu', 'Acerto']}
          linhas={cenarios.map((c) => ({
            chave: c.individuais,
            naoPaga: c.salariosAno === 0,
            celulas: [
              labelInd(c.individuais),
              fmtPct(c.atingimentoAno),
              c.salariosAno === 0 ? 'não paga' : fmtSal(c.salariosAno),
              fmtSal(c.salariosS1 + c.salariosS2),
              c.acertoAno > 0 ? `+${fmtSal(c.acertoAno)} sal.` : '—',
            ],
          }))}
        />
        <p className="text-xs text-zinc-400 mt-2">
          Total no ano com as 2 individuais: <span className="font-semibold text-zinc-600">{fmtSal(cenarios[cenarios.length - 1].totalAno)} de {SALARIOS_ANO} salários</span>.
        </p>
      </Quadrinho>
    </div>
  )
}
