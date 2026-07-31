import React from 'react'
import { formatarReais, formatarPercentual } from './Tabela.jsx'

// Tabela no estilo "análise de Pareto": Item / Qtd / Valor / % / % Acumulado,
// com destaque (fundo leve) nas linhas que ainda estão dentro dos 80%
// acumulados -- os "poucos vitais" que concentram a maior parte do valor.
// Espera itens no formato devolvido por paretoPorChave.
export default function ParetoTabela({ dados, tituloItem = 'Item', limite = 15 }) {
  if (!dados || dados.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#BBB' }}>
        Sem registros no período.
      </div>
    )
  }

  const linhas = limite ? dados.slice(0, limite) : dados

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>{tituloItem}</th>
            <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Qtd</th>
            <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Valor</th>
            <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>%</th>
            <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>% Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, idx) => {
            const dentro80 = l.percentualAcumulado <= 0.8
            return (
              <tr key={l.chave + idx} style={{ borderBottom: '1px solid #F7F7F7', background: dentro80 ? '#FFF7ED' : 'transparent' }}>
                <td style={{ padding: '8px 12px 8px 0', color: '#333', fontWeight: dentro80 ? 600 : 400 }}>{l.chave}</td>
                <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', color: '#333', fontVariantNumeric: 'tabular-nums' }}>{l.qtd.toLocaleString('pt-BR')}</td>
                <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', color: '#333', fontVariantNumeric: 'tabular-nums' }}>{formatarReais(l.valor)}</td>
                <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', color: '#666', fontVariantNumeric: 'tabular-nums' }}>{formatarPercentual(l.percentual)}</td>
                <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', color: '#666', fontVariantNumeric: 'tabular-nums' }}>{formatarPercentual(l.percentualAcumulado)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {limite && dados.length > limite && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#BBB', marginTop: 8 }}>
          Mostrando {limite} de {dados.length} registros
        </div>
      )}
    </div>
  )
}
