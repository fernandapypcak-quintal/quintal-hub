import React from 'react'
import { Card } from './GraficoBarraUnidade.jsx'
import ParetoTabelaCompacta from './ParetoTabelaCompacta.jsx'
import { formatarReais } from './Tabela.jsx'

// Painel "Onde Atuar": duas tabelas compactas de Pareto lado a lado
// (funcionário e motivo/categoria), no mesmo espírito das abas "RESUMO X"
// da planilha antiga -- bate o olho e já mostra quem e o quê concentram
// o valor, sem precisar rolar a tela ou abrir gráfico separado.
export default function PainelPareto({
  titulo = 'Onde Atuar',
  subtitulo,
  paretoResponsavel,
  labelResponsavel = 'Funcionário',
  corResponsavel = '#EA580C',
  paretoMotivo,
  labelMotivo = 'Motivo',
  corMotivo = '#B45309',
  limite = 8,
  semCard = false,
}) {
  const conteudo = (
    <>
      {subtitulo && <p style={{ fontSize: 12, color: '#999', margin: '-8px 0 14px' }}>{subtitulo}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <ParetoTabelaCompacta dados={paretoResponsavel} tituloItem={labelResponsavel} cor={corResponsavel} limite={limite} />
        <ParetoTabelaCompacta dados={paretoMotivo} tituloItem={labelMotivo} cor={corMotivo} limite={limite} />
      </div>
    </>
  )

  if (semCard) return conteudo

  return <Card titulo={titulo}>{conteudo}</Card>
}
