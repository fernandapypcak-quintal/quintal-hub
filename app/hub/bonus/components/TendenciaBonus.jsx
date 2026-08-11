// app/hub/bonus/components/TendenciaBonus.jsx
'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatMes(mesRef) {
  const [ano, mes] = mesRef.split('-')
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`
}

export default function TendenciaBonus({ resultadosPorMes }) {
  if (!resultadosPorMes || resultadosPorMes.length < 2) return null

  const dados = resultadosPorMes.map((r) => ({
    mes: formatMes(r.mesRef),
    percentual: Math.round(r.percentualAtingido * 1000) / 10,
  }))

  return (
    <div className="bg-white border border-surface-border rounded-2xl shadow-card p-5">
      <h3 className="text-sm font-semibold text-brand-black mb-3">Evolução do bônus coletivo</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dados} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E2" />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#E8E8E2' }} tickLine={false} />
          <YAxis unit="%" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={40} />
          <ReferenceLine y={100} stroke="#97A624" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E8E8E2', borderRadius: 8, fontSize: 12 }}
            formatter={(value) => [`${value}%`, 'Atingido']}
          />
          <Line type="monotone" dataKey="percentual" stroke="#97A624" strokeWidth={2} dot={{ r: 3, fill: '#97A624' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
