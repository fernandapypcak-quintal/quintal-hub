// app/hub/bonus/components/pages/Home.jsx
'use client'

import { useState } from 'react'
import { useBonusData } from '../../hooks/useBonusData'
import ApuracaoSemestral from '../ApuracaoSemestral'
import AcumuladoAnoView from '../AcumuladoAnoView'
import TabelaMensal from '../TabelaMensal'
import TendenciaBonus from '../TendenciaBonus'

const ABAS = [
  { id: 'semestre', label: 'Semestre (oficial)' },
  { id: 'ano', label: 'Acumulado do Ano' },
  { id: 'mes', label: 'Mês a mês' },
]

export default function Home() {
  const { anoMes, setAnoMes, resultadosPorMes, resultadoAnual, resultadoAcumuladoAno, loading, error } = useBonusData()
  const [aba, setAba] = useState('semestre')

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">Meta de Bônus</h1>
          <p className="text-xs text-zinc-400 font-mono">Coletiva — 70% do bônus total</p>
        </div>
        <input
          type="number"
          value={anoMes.slice(0, 4)}
          onChange={(e) => setAnoMes(`${e.target.value}-${anoMes.slice(5, 7)}`)}
          className="rounded-md border border-surface-border px-3 py-1.5 text-sm font-mono w-24"
          title="Ano de apuração"
        />
      </div>

      <div className="flex gap-1 bg-surface-muted/60 rounded-lg p-1 w-fit mb-5">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
              aba === a.id ? 'bg-white text-brand-black shadow-card' : 'text-zinc-500'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-zinc-400 font-mono">Carregando...</p>}
      {error && <p className="text-sm text-rose-600">Erro ao carregar: {error}</p>}

      {!loading && !error && (
        <>
          {aba === 'semestre' && (
            <ApuracaoSemestral resultadoAnual={resultadoAnual} resultadosPorMes={resultadosPorMes} />
          )}

          {aba === 'ano' && (
            <AcumuladoAnoView resultadoAcumuladoAno={resultadoAcumuladoAno} resultadosPorMes={resultadosPorMes} />
          )}

          {aba === 'mes' && (
            <div className="flex flex-col gap-4">
              <TabelaMensal resultadosPorMes={resultadosPorMes} />
              <TendenciaBonus resultadosPorMes={resultadosPorMes} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
