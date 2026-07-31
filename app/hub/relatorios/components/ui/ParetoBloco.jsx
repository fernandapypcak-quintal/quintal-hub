import React from 'react'
import { Card } from './GraficoBarraUnidade.jsx'
import ParetoChart from './ParetoChart.jsx'
import ParetoTabela from './ParetoTabela.jsx'

// Bloco pronto de análise de Pareto: título + gráfico (barras + curva
// acumulada) + tabela com % e % acumulado, lado a lado. Usado pra "quem deu
// desconto", "motivo/categoria por volume", etc — em Descontos, Estornos e
// Desperdício.
export default function ParetoBloco({ titulo, dados, tituloItem, cor = '#EA580C' }) {
  return (
    <Card titulo={titulo}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        <ParetoChart dados={dados} cor={cor} />
        <ParetoTabela dados={dados} tituloItem={tituloItem} />
      </div>
    </Card>
  )
}
