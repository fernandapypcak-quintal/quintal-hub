// app/hub/bonus/components/ComposicaoBonus.jsx
//
// Mostra o resultado em % do BÔNUS TOTAL, deixando explícita a divisão:
//   Coletivo 80% (CMV 10% + Custo c/ Pessoal 10% + LOL 50% + NPS 10%)
//   Individual 20% (2 metas × 10% por gerente — avaliadas fora deste painel)
//
// Como os pesos dos indicadores já são % do bônus total, os pontos de cada
// indicador (peso × fração da faixa) já são "% do bônus total garantido".

'use client'

import {
  FAIXA_LABEL,
  PESO_COLETIVO_TOTAL,
  PESO_INDIVIDUAL_TOTAL,
  METAS_INDIVIDUAIS_QTD,
  PESO_POR_META_INDIVIDUAL,
} from '@/lib/bonus/scoring'

const COR_FAIXA = {
  meta: '#059669',
  meta_80: '#D97706',
  meta_60: '#F59E0B',
  nao_atingiu: '#E11D48',
  pendente: '#A1A1AA',
}

const LABEL_CURTO = {
  cmv: 'CMV',
  custo_pessoal: 'Pessoal',
  lol_margem: 'LOL',
  nps: 'NPS',
}

export function fmtPctBonus(v, digits = 1) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits).replace('.', ',')}%`
}

// itens: [{ config, resultado }] — resultado = ResultadoIndicadorBonus (tem faixa, fracao, pontos)
export default function ComposicaoBonus({ itens, pontosTotais, compacto = false }) {
  const pctDoColetivo = PESO_COLETIVO_TOTAL > 0 ? pontosTotais / PESO_COLETIVO_TOTAL : 0

  return (
    <div>
      {/* Número principal: % do bônus TOTAL */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={`${compacto ? 'text-5xl' : 'text-6xl'} font-bold leading-none text-brand-black`}>
          {fmtPctBonus(pontosTotais)}
        </p>
        <p className="text-sm text-zinc-500">do bônus total garantido</p>
      </div>
      <p className="text-xs text-zinc-400 mt-1.5">
        de <strong className="text-zinc-600">{fmtPctBonus(PESO_COLETIVO_TOTAL, 0)}</strong> possíveis na meta coletiva
        {' '}({fmtPctBonus(pctDoColetivo, 0)} da parte coletiva)
      </p>

      {/* Barra de composição do bônus total (100%) */}
      <div className="mt-4">
        <div className="flex w-full h-7 rounded-md overflow-hidden border border-surface-border">
          {itens.map(({ config, resultado }) => {
            const preenchido = config.peso > 0 ? (resultado.pontos / config.peso) * 100 : 0
            const cor = COR_FAIXA[resultado.faixa] ?? COR_FAIXA.pendente
            return (
              <div
                key={config.key}
                className="relative h-full border-r border-white"
                style={{ width: `${config.peso * 100}%`, backgroundColor: '#F4F4F5' }}
                title={`${config.label}: vale ${fmtPctBonus(config.peso, 0)} · garantiu ${fmtPctBonus(resultado.pontos)}`}
              >
                <div className="absolute inset-y-0 left-0" style={{ width: `${preenchido}%`, backgroundColor: cor, opacity: 0.85 }} />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-zinc-800 whitespace-nowrap">
                  {LABEL_CURTO[config.key] ?? config.label} {fmtPctBonus(config.peso, 0)}
                </span>
              </div>
            )
          })}
          <div
            className="relative h-full flex items-center justify-center"
            style={{
              width: `${PESO_INDIVIDUAL_TOTAL * 100}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, #FAFAFA 0 6px, #E4E4E7 6px 8px)',
            }}
            title="Metas individuais — avaliadas fora deste painel"
          >
            <span className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap">Individual {fmtPctBonus(PESO_INDIVIDUAL_TOTAL, 0)}</span>
          </div>
        </div>
        <div className="flex text-[10px] text-zinc-400 mt-1 font-mono">
          <span style={{ width: `${PESO_COLETIVO_TOTAL * 100}%` }}>◀ Coletivo {fmtPctBonus(PESO_COLETIVO_TOTAL, 0)} — este painel ▶</span>
          <span style={{ width: `${PESO_INDIVIDUAL_TOTAL * 100}%` }} className="text-center">
            {METAS_INDIVIDUAIS_QTD} × {fmtPctBonus(PESO_POR_META_INDIVIDUAL, 0)}
          </span>
        </div>
      </div>

      {/* Quanto cada indicador vale e quanto garantiu */}
      {!compacto && (
        <div className="mt-4 flex flex-col gap-1.5">
          {itens.map(({ config, resultado }) => (
            <div key={config.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-600">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_FAIXA[resultado.faixa] }} />
                {config.label}
              </span>
              <span className="font-mono text-zinc-500">
                vale {fmtPctBonus(config.peso, 0)} → <strong className="text-zinc-800">{fmtPctBonus(resultado.pontos)}</strong>
                <span className="text-zinc-400 text-xs"> · {FAIXA_LABEL[resultado.faixa]}</span>
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm border-t border-surface-border pt-1.5 mt-1">
            <span className="text-zinc-400">Metas individuais ({METAS_INDIVIDUAIS_QTD} × {fmtPctBonus(PESO_POR_META_INDIVIDUAL, 0)})</span>
            <span className="font-mono text-zinc-400">vale {fmtPctBonus(PESO_INDIVIDUAL_TOTAL, 0)} · avaliadas fora deste painel</span>
          </div>
        </div>
      )}
    </div>
  )
}
