import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from './GraficoBarraUnidade.jsx'
import { formatarReais, formatarData } from './Tabela.jsx'

// Mostra a variação com seta e cor. Por padrão, subir é "ruim" (vermelho) --
// faz sentido pra desconto/estorno/desperdício, que são custo. Passa
// aumentoBom=true pra inverter (ex: não faz muito sentido aqui, mas fica
// disponível caso um dia precise).
function Variacao({ valor, aumentoBom = false }) {
  const positivo = valor > 0.001
  const negativo = valor < -0.001
  const corPositivo = aumentoBom ? '#1B7F3A' : '#C00000'
  const corNegativo = aumentoBom ? '#C00000' : '#1B7F3A'
  const cor = positivo ? corPositivo : negativo ? corNegativo : '#999'
  const Icone = positivo ? TrendingUp : negativo ? TrendingDown : Minus

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: cor, fontWeight: 700 }}>
      <Icone size={13} />
      {Math.abs(valor * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  )
}

// dadosComparativo: resultado de compararMesAtualVsAnterior() do useRelatorios.jsx
export default function ComparativoMensal({ titulo = 'Comparativo com o Mês Anterior', dadosComparativo, aumentoBom = false }) {
  const { linhas, totalAtual, totalAnterior, variacaoTotal, periodoAtual, periodoAnterior } = dadosComparativo

  const semDadosNosDoisMeses = totalAtual === 0 && totalAnterior === 0

  return (
    <Card titulo={titulo}>
      <p style={{ fontSize: 12, color: '#999', margin: '-8px 0 14px' }}>
        {formatarData(periodoAtual.inicio)} a {formatarData(periodoAtual.fim)} (mês atual) vs {formatarData(periodoAnterior.inicio)} a {formatarData(periodoAnterior.fim)} (mês anterior, mesmo intervalo de dias)
      </p>

      {semDadosNosDoisMeses ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#BBB' }}>
          Sem dados em nenhum dos dois períodos.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Unidade</th>
                <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Mês Anterior</th>
                <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Mês Atual</th>
                <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Variação</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '2px solid #EEE', background: '#FAFAFA' }}>
                <td style={{ padding: '9px 12px 9px 0', fontWeight: 700, color: '#1a1a1a' }}>Rede (todas as unidades)</td>
                <td style={{ padding: '9px 12px 9px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#333' }}>{formatarReais(totalAnterior)}</td>
                <td style={{ padding: '9px 12px 9px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#1a1a1a' }}>{formatarReais(totalAtual)}</td>
                <td style={{ padding: '9px 12px 9px 0', textAlign: 'right' }}><Variacao valor={variacaoTotal} aumentoBom={aumentoBom} /></td>
              </tr>
              {linhas.map(l => (
                <tr key={l.unidade} style={{ borderBottom: '1px solid #F7F7F7' }}>
                  <td style={{ padding: '8px 12px 8px 0', color: '#333' }}>{l.unidade}</td>
                  <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#666' }}>{formatarReais(l.anterior)}</td>
                  <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#333' }}>{formatarReais(l.atual)}</td>
                  <td style={{ padding: '8px 12px 8px 0', textAlign: 'right' }}><Variacao valor={l.variacao} aumentoBom={aumentoBom} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
