// app/hub/bonus/components/ComposicaoBonus.jsx
//
// Resultado em % do BÔNUS TOTAL, com a divisão explícita:
//   Coletivo 80% (CMV 10% + Custo c/ Pessoal 10% + LOL 50% + NPS 10%)
//   Individual 20% (2 metas × 10% por gerente — avaliadas fora deste painel)
//
// Os pesos dos indicadores já são % do bônus total, então os pontos de
// cada indicador (peso × fração da faixa) já são "% do bônus total".

'use client'

import {
  FAIXA_LABEL,
  PESO_COLETIVO_TOTAL,
  PESO_INDIVIDUAL_TOTAL,
  METAS_INDIVIDUAIS_QTD,
  PESO_POR_META_INDIVIDUAL,
  SALARIOS_POR_SEMESTRE,
} from '@/lib/bonus/scoring'

const fmtSal = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })

const COR_FAIXA = {
  meta: '#059669',
  meta_80: '#D97706',
  meta_60: '#F59E0B',
  nao_atingiu: '#E11D48',
  pendente: '#A1A1AA',
}

const PILL_FAIXA = {
  meta: 'bg-emerald-50 text-emerald-700',
  meta_80: 'bg-amber-50 text-amber-700',
  meta_60: 'bg-amber-50 text-amber-700',
  nao_atingiu: 'bg-rose-50 text-rose-700',
  pendente: 'bg-zinc-100 text-zinc-500',
}

export function fmtPctBonus(v, digits = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits).replace('.', ',')}%`
}

// itens: [{ config, resultado }] — resultado = ResultadoIndicadorBonus (faixa, fracao, pontos)
export default function ComposicaoBonus({ itens, pontosTotais, salariosBase = SALARIOS_POR_SEMESTRE, apenasLinhas = false }) {
  if (apenasLinhas) return <LinhasIndicadores itens={itens} />
  return (
    <div>
      {/* Número principal */}
      <div className="flex items-end gap-3">
        <p className="text-6xl font-bold leading-none text-brand-black tabular-nums">{fmtPctBonus(pontosTotais)}</p>
        <div className="pb-1 leading-tight">
          <p className="text-sm text-zinc-600">do bônus total</p>
          <p className="text-xs text-zinc-400">de {fmtPctBonus(PESO_COLETIVO_TOTAL, 0)} possíveis no coletivo</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-600">
        = <span className="font-semibold text-brand-black tabular-nums">{fmtSal(pontosTotais * salariosBase)} salário{pontosTotais * salariosBase === 1 ? '' : 's'}</span>
        <span className="text-zinc-400"> de {fmtSal(PESO_COLETIVO_TOTAL * salariosBase)} possíveis no coletivo ({salariosBase} no total com as individuais)</span>
      </p>

      {/* Barra: cada segmento = peso do indicador no bônus total */}
      <div className="flex w-full gap-1 mt-5">
        {itens.map(({ config, resultado }) => {
          const preenchido = config.peso > 0 ? (resultado.pontos / config.peso) * 100 : 0
          return (
            <div
              key={config.key}
              className="h-2.5 rounded-full overflow-hidden bg-zinc-100"
              style={{ width: `${config.peso * 100}%` }}
              title={`${config.label}: ${fmtPctBonus(resultado.pontos)} de ${fmtPctBonus(config.peso, 0)}`}
            >
              <div className="h-full rounded-full" style={{ width: `${preenchido}%`, backgroundColor: COR_FAIXA[resultado.faixa] }} />
            </div>
          )
        })}
        <div
          className="h-2.5 rounded-full border border-dashed border-zinc-300"
          style={{ width: `${PESO_INDIVIDUAL_TOTAL * 100}%` }}
          title="Metas individuais — avaliadas fora deste painel"
        />
      </div>

      <LinhasIndicadores itens={itens} comIndividual />
    </div>
  )
}

function LinhasIndicadores({ itens, comIndividual = false }) {
  return (
    <>
      {/* Linhas: indicador · faixa · garantido / vale */}
      <div className="mt-4 divide-y divide-surface-border">
        {itens.map(({ config, resultado }) => (
          <div key={config.key} className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2 text-zinc-700">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COR_FAIXA[resultado.faixa] }} />
              {config.label}
            </span>
            <span className="flex items-center gap-3">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PILL_FAIXA[resultado.faixa]}`}>
                {FAIXA_LABEL[resultado.faixa]}
              </span>
              <span className="w-24 text-right tabular-nums">
                <span className="font-semibold text-brand-black">{fmtPctBonus(resultado.pontos)}</span>
                <span className="text-zinc-400"> / {fmtPctBonus(config.peso, 0)}</span>
              </span>
            </span>
          </div>
        ))}
        {comIndividual && (
        <div className="flex items-center justify-between py-2 text-sm">
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="w-2 h-2 rounded-full border border-dashed border-zinc-400" />
            Individual ({METAS_INDIVIDUAIS_QTD} metas de {fmtPctBonus(PESO_POR_META_INDIVIDUAL, 0)})
          </span>
          <span className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400">fora deste painel</span>
            <span className="w-24 text-right tabular-nums text-zinc-400">— / {fmtPctBonus(PESO_INDIVIDUAL_TOTAL, 0)}</span>
          </span>
        </div>
        )}
      </div>
    </>
  )
}
