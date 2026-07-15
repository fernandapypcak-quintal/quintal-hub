import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarReais } from './Tabela.jsx'

export function Card({ titulo, children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 18, ...style }}>
      {titulo && <h2 style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: '0 0 12px' }}>{titulo}</h2>}
      {children}
    </div>
  )
}

export default function GraficoBarraUnidade({ dados, cor = '#EA580C', altura = 280 }) {
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ left: 24, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
          <XAxis type="number" tickFormatter={v => formatarReais(v)} fontSize={11} stroke="#999" />
          <YAxis type="category" dataKey="chave" width={110} fontSize={11} stroke="#999" />
          <Tooltip formatter={(v) => formatarReais(v)} />
          <Bar dataKey="valor" fill={cor} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
