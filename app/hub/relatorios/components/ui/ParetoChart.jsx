import React from 'react'
import {
  Bar, ComposedChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend, LabelList,
} from 'recharts'
import { formatarReais } from './Tabela.jsx'

// Gráfico de Pareto clássico: barras com o valor de cada item (ordenado
// desc, com o valor escrito em cima) + linha vermelha da % acumulada (com
// o percentual escrito ao lado de cada ponto) -- igual o gráfico combinado
// que o Excel/Google Sheets gera pra análise de Pareto.
export default function ParetoChart({ dados, titulo, cor = '#4472C4', corLinha = '#C00000', altura = 380, limite = 10 }) {
  if (!dados || dados.length === 0) {
    return (
      <div style={{ height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BBB', fontSize: 13 }}>
        Sem dados no período.
      </div>
    )
  }

  const exibidos = dados.slice(0, limite)

  return (
    <div style={{ height: altura }}>
      {titulo && <h3 style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#333', margin: '0 0 4px' }}>{titulo}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={exibidos} margin={{ top: 26, right: 30, left: 8, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
          <XAxis dataKey="chave" angle={-30} textAnchor="end" interval={0} height={90} fontSize={11} stroke="#666" />
          <YAxis yAxisId="valor" fontSize={11} stroke="#666" tickFormatter={v => formatarReais(v)} />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 1]}
            tickFormatter={v => `${Math.round(v * 100)}%`}
            fontSize={11}
            stroke="#666"
          />
          <Tooltip
            formatter={(v, nome) => nome === 'percentualAcumulado'
              ? [`${(v * 100).toFixed(1)}%`, '% Acumulado']
              : [formatarReais(v), 'Valor']}
          />
          <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />

          <Bar yAxisId="valor" dataKey="valor" name="Valor" fill={cor} radius={[3, 3, 0, 0]}>
            <LabelList dataKey="valor" position="top" fontSize={11} fill="#333" formatter={v => formatarReais(v)} />
          </Bar>

          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="percentualAcumulado"
            name="% Acumulado"
            stroke={corLinha}
            strokeWidth={2.5}
            dot={{ r: 3, fill: corLinha }}
          >
            <LabelList
              dataKey="percentualAcumulado"
              position="top"
              fontSize={10.5}
              fill={corLinha}
              formatter={v => `${(v * 100).toFixed(1)}%`}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
