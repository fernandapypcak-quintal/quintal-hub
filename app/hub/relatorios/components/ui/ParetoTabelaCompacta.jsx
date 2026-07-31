import React from 'react'
import { formatarReais, formatarPercentual } from './Tabela.jsx'

// Tabela compacta "tipo planilha dinâmica": cada linha tem uma barra de
// fundo proporcional ao valor (igual "barra de dados" do Excel/Google
// Sheets), e destaca com uma bolinha os itens que ainda estão dentro dos
// 80% acumulados -- os "poucos vitais" onde vale a pena atuar primeiro.
// Espera itens no formato devolvido por paretoPorChave.
export default function ParetoTabelaCompacta({ dados, tituloItem = 'Item', limite = 8, cor = '#EA580C' }) {
  if (!dados || dados.length === 0) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: '#BBB' }}>
        Sem dados no período.
      </div>
    )
  }

  const linhas = limite ? dados.slice(0, limite) : dados
  const max = Math.max(...linhas.map(l => l.valor), 1)

  return (
    <div>
      <div style={{
        display: 'flex', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: '#999', padding: '0 0 6px 6px',
        borderBottom: '1px solid #EEE',
      }}>
        <div style={{ flex: 1 }}>{tituloItem}</div>
        <div style={{ width: 88, textAlign: 'right' }}>Valor</div>
        <div style={{ width: 56, textAlign: 'right' }}>% Acum</div>
      </div>

      {linhas.map((l, idx) => {
        const larguraBarra = (l.valor / max) * 100
        const vital = l.percentualAcumulado <= 0.8
        return (
          <div key={l.chave + idx} style={{
            display: 'flex', alignItems: 'center', padding: '7px 0',
            borderBottom: '1px solid #F7F7F7',
            background: `linear-gradient(90deg, ${cor}26 ${larguraBarra}%, transparent ${larguraBarra}%)`,
          }}>
            <div style={{
              flex: 1, fontSize: 12.5, color: '#1a1a1a', paddingLeft: 6,
              fontWeight: vital ? 700 : 400, display: 'flex', alignItems: 'center', gap: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {vital && <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: cor }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.chave}</span>
            </div>
            <div style={{ width: 88, textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: '#333' }}>
              {formatarReais(l.valor)}
            </div>
            <div style={{
              width: 56, textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums',
              color: vital ? cor : '#999', fontWeight: vital ? 700 : 400,
            }}>
              {formatarPercentual(l.percentualAcumulado)}
            </div>
          </div>
        )
      })}

      {limite && dados.length > limite && (
        <div style={{ fontSize: 10.5, color: '#BBB', padding: '6px 0 0 6px' }}>
          + {dados.length - limite} outros
        </div>
      )}
    </div>
  )
}
