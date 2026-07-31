import React, { useState } from 'react'
import { formatarReais, formatarPercentual } from './Tabela.jsx'

// Tabela compacta "tipo planilha dinâmica": cada linha tem uma barra de
// fundo proporcional ao valor (igual "barra de dados" do Excel/Google
// Sheets), e destaca com uma bolinha os itens que ainda estão dentro dos
// 80% acumulados -- os "poucos vitais" onde vale a pena atuar primeiro.
// Espera itens no formato devolvido por paretoPorChave.
export default function ParetoTabelaCompacta({ dados, tituloItem = 'Item', limite = 8, cor = '#EA580C' }) {
  const [expandido, setExpandido] = useState(false)

  if (!dados || dados.length === 0) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: '#BBB' }}>
        Sem dados no período.
      </div>
    )
  }

  const limiteEfetivo = expandido ? null : limite
  const linhas = limiteEfetivo ? dados.slice(0, limiteEfetivo) : dados
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

      <div style={{ maxHeight: expandido ? 420 : 'none', overflowY: expandido ? 'auto' : 'visible' }}>
        {linhas.map((l, idx) => {
          const larguraBarra = (l.valor / max) * 100
          const vital = l.percentualAcumulado <= 0.8
          return (
            <div key={l.chave + idx} style={{
              display: 'flex', alignItems: 'flex-start', padding: '7px 0',
              borderBottom: '1px solid #F7F7F7',
              background: `linear-gradient(90deg, ${cor}26 ${larguraBarra}%, transparent ${larguraBarra}%)`,
            }}>
              <div style={{
                flex: 1, minWidth: 0, fontSize: 12.5, color: '#1a1a1a', paddingLeft: 6,
                fontWeight: vital ? 700 : 400, display: 'flex', alignItems: 'flex-start', gap: 6,
              }}>
                {vital && <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: cor, marginTop: 5 }} />}
                <span style={{ overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.35 }}>{l.chave}</span>
              </div>
              <div style={{ flexShrink: 0, width: 88, textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: '#333' }}>
                {formatarReais(l.valor)}
              </div>
              <div style={{
                flexShrink: 0, width: 56, textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums',
                color: vital ? cor : '#999', fontWeight: vital ? 700 : 400,
              }}>
                {formatarPercentual(l.percentualAcumulado)}
              </div>
            </div>
          )
        })}
      </div>

      {limite && dados.length > limite && (
        <button
          onClick={() => setExpandido(v => !v)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', marginTop: 6,
            border: 'none', background: 'none', cursor: 'pointer', padding: '4px 0 0 6px',
            fontSize: 11.5, color: cor, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          {expandido ? '▲ mostrar menos' : `▼ ver todos (${dados.length - limite} outros)`}
        </button>
      )}
    </div>
  )
}
