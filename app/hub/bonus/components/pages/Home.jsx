// app/hub/bonus/components/pages/Home.jsx
'use client'

import { useBonusData } from '../../hooks/useBonusData'
import BonusResumo from '../BonusResumo'
import TendenciaBonus from '../TendenciaBonus'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function labelMes(anoMes) {
  const [ano, mes] = anoMes.split('-')
  return `${MESES[parseInt(mes, 10) - 1]} de ${ano}`
}

export default function Home() {
  const { anoMes, setAnoMes, resultado, resultadosPorMes, loading, error } = useBonusData()

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">Meta de Bônus</h1>
          <p className="text-xs text-zinc-400 font-mono">Coletiva — 70% do bônus total</p>
        </div>
        <input
          type="month"
          value={anoMes}
          onChange={(e) => setAnoMes(e.target.value)}
          className="rounded-md border border-surface-border px-3 py-1.5 text-sm font-mono"
        />
      </div>

      {loading && <p className="text-sm text-zinc-400 font-mono">Carregando...</p>}
      {error && <p className="text-sm text-rose-600">Erro ao carregar: {error}</p>}

      {!loading && !error && (
        <>
          {resultado.indicadores.every((i) => i.faixa === 'pendente') ? (
            <div className="bg-white border border-surface-border rounded-2xl p-8 text-center shadow-card">
              <p className="text-sm text-zinc-500">
                Ainda não há apuração lançada para {labelMes(anoMes)}.
              </p>
            </div>
          ) : (
            <BonusResumo resultado={resultado} />
          )}

          <div className="mt-4">
            <TendenciaBonus resultadosPorMes={resultadosPorMes} />
          </div>
        </>
      )}
    </div>
  )
}
