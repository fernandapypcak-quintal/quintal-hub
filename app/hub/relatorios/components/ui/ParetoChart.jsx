import React from 'react'
import {
  Bar, ComposedChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis, ReferenceLine,
} from 'recharts'
import { formatarReais, formatarPercentual } from './Tabela.jsx'

// Gráfico clássico de Pareto: barras com o valor de cada item (ordenado
// desc) + linha da % acumulada, com uma referência nos 80%. Espera itens
// no formato { chave, valor, percentualAcumulado }, já ordenados (é o que
// paretoPorChave devolve).
export default function ParetoChart({ dados, cor = '#EA580C', altura = 300, limite = 10 }) {
  if (!dados || dados.length === 0) {
    return (
      <div style={{ height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BBB', fontSize: 13 }}>
        Sem dados no período.
      </div>
    )
  }

  const exibidos = dados.slice(0, limite).map(d => ({
    ...d,
    percentualAcumuladoPct: d.percentualAcumulado * 100,
  }))

  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={exibidos} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
          <XAxis
            dataKey="chave"
            fontSize={10.5}
            stroke="#999"
            angle={-30}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis yAxisId="valor" fontSize={11} stroke="#999" tickFormatter={v => formatarReais(v)} />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            fontSize={11}
            stroke="#999"
            tickFormatter={v => `${v}%`}
          />
          <Tooltip
            formatter={(v, nome) => nome === 'percentualAcumuladoPct'
              ? [`${v.toFixed(1)}%`, '% Acumulado']
              : [formatarReais(v), 'Valor']}
          />
          <ReferenceLine yAxisId="pct" y={80} stroke="#BBB" strokeDasharray="4 4" label={{ value: '80%', fontSize: 10, fill: '#999' }} />
          <Bar yAxisId="valor" dataKey="valor" fill={cor} radius={[4, 4, 0, 0]} />
          <Line yAxisId="pct" type="monotone" dataKey="percentualAcumuladoPct" stroke="#1F3D2E" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
