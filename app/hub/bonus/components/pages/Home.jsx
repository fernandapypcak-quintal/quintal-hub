// app/hub/bonus/components/pages/Home.jsx
'use client'

import { useState } from 'react'
import { useBonusData } from '../../hooks/useBonusData'
import BonusResumo from '../BonusResumo'
import ApuracaoSemestral from '../ApuracaoSemestral'
import AcumuladoAnoView from '../AcumuladoAnoView'
import TendenciaBonus from '../TendenciaBonus'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function labelMes(anoMes) {
  const [ano, mes] = anoMes.split('-')
  return `${MESES[parseInt(mes, 10) - 1]} de ${ano}`
}

const ABAS = [
  { id: 'semestre', label: 'Semestre (oficial)' },
  { id: 'ano', label: 'Acumulado do Ano' },
  { id: 'mes', label: 'Mês a mês' },
]

export default function Home() {
  const { anoMes, setAnoMes, resultadoMes, resultadosPorMes, resultadoAnual, resultadoAcumuladoAno, loading, error } = useBonusData()
  const [aba, setAba] = useState('semestre')

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">Meta de Bônus</h1>
          <p className="text-xs text-zinc-400 font-mono">Coletiva — 70% do bônus total</p>
        </div>
        {aba === 'mes' && (
          <input
            type="month"
            value={anoMes}
            onChange={(e) => setAnoMes(e.target.value)}
            className="rounded-md border border-surface-border px-3 py-1.5 text-sm font-mono"
          />
        )}
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
          {aba === 'semestre' && <ApuracaoSemestral resultadoAnual={resultadoAnual} />}

          {aba === 'ano' && <AcumuladoAnoView resultadoAcumuladoAno={resultadoAcumuladoAno} />}

          {aba === 'mes' && (
            <div className="flex flex-col gap-4">
              {resultadoMes.indicadores.every((i) => i.faixa === 'pendente') ? (
                <div className="bg-white border border-surface-border rounded-2xl p-8 text-center shadow-card">
                  <p className="text-sm text-zinc-500">
                    Ainda não há apuração lançada para {labelMes(anoMes)}.
                  </p>
                </div>
              ) : (
                <BonusResumo resultado={resultadoMes} subtitulo={labelMes(anoMes)} />
              )}

              <TendenciaBonus resultadosPorMes={resultadosPorMes} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
