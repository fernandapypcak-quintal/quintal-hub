// app/hub/bonus/components/MiniTabelaMeses.jsx
//
// Mini-tabela mês a mês de UM indicador, dentro de um recorte de meses
// (ex: Jan-Jun pro S1, Jul-Dez pro S2, Jan-Dez pro Acumulado). Usada
// dentro dos cards de ApuracaoSemestral e AcumuladoAnoView pra abrir o
// detalhe sem precisar trocar de aba.

'use client'

import { LineChart } from 'lucide-react'
import { FAIXA_LABEL } from '@/lib/bonus/scoring'

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const FAIXA_STYLE = {
  meta:         { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  meta_80:      { bg: 'bg-amber-50',    text: 'text-amber-700' },
  meta_60:      { bg: 'bg-amber-50',    text: 'text-amber-700' },
  nao_atingiu:  { bg: 'bg-rose-50',     text: 'text-rose-700' },
  pendente:     { bg: 'bg-zinc-50',     text: 'text-zinc-300' },
}

function fmtPct(v, digits = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

/**
 * @param resultadosPorMes  array de ResultadoBonusMes (um por mês do ano, já vem do hook)
 * @param configKey         chave do indicador (ex: 'lol_margem')
 * @param meses             array de 'MM' a mostrar, ex: ['01',...,'06']
 */
export default function MiniTabelaMeses({ resultadosPorMes, configKey, meses }) {
  if (!resultadosPorMes || resultadosPorMes.length === 0) return null

  const linhas = meses.map((mm) => {
    const mesResultado = resultadosPorMes.find((r) => r.mesRef.slice(5, 7) === mm)
    const ind = mesResultado?.indicadores.find((i) => i.config.key === configKey)
    return { mm, ind }
  })

  return (
    <div className="mt-2 rounded-lg border border-surface-border overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          {linhas.map(({ mm, ind }) => {
            const faixa = ind?.faixa ?? 'pendente'
            const style = FAIXA_STYLE[faixa]
            return (
              <tr key={mm} className="border-t border-surface-border first:border-t-0">
                <td className="px-2.5 py-1.5 font-medium text-zinc-600 whitespace-nowrap">{MESES_LABEL[parseInt(mm, 10) - 1]}</td>
                <td className="px-2.5 py-1.5 text-right font-mono text-zinc-700">{fmtPct(ind?.real)}</td>
                <td className="px-2.5 py-1.5 text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                    {ind?.isProjecao && <LineChart size={9} className="text-blue-500" />}
                    {FAIXA_LABEL[faixa]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
