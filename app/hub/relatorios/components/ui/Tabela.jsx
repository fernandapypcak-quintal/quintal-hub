import React from 'react'

export function formatarReais(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 1 })
}

export function formatarData(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = String(iso).split('-')
  if (!dia) return iso
  return `${dia}/${mes}/${ano}`
}

export default function Tabela({ colunas, linhas, chaveLinha, limite }) {
  const linhasExibidas = limite ? linhas.slice(0, limite) : linhas

  if (!linhas || linhas.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#BBB' }}>
        Sem registros no período.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
            {colunas.map(col => (
              <th key={col.chave} style={{
                textAlign: col.alinhamento === 'right' ? 'right' : 'left',
                padding: '8px 12px 8px 0',
                fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em',
                textTransform: 'uppercase', color: '#999',
              }}>
                {col.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhasExibidas.map((linha, idx) => (
            <tr key={chaveLinha(linha, idx)} style={{ borderBottom: '1px solid #F7F7F7' }}>
              {colunas.map(col => (
                <td key={col.chave} style={{
                  textAlign: col.alinhamento === 'right' ? 'right' : 'left',
                  padding: '8px 12px 8px 0', color: '#333',
                  fontVariantNumeric: col.alinhamento === 'right' ? 'tabular-nums' : undefined,
                }}>
                  {col.render ? col.render(linha) : (linha[col.chave] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {limite && linhas.length > limite && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#BBB', marginTop: 8 }}>
          Mostrando {limite} de {linhas.length} registros
        </div>
      )}
    </div>
  )
}
