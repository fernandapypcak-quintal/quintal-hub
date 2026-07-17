import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Tabela from './Tabela.jsx'

// colunasResumo: colunas da linha "pai" (ex: nome, qtd, valor)
// dadosDetalhe: array completo (não agregado) usado pra achar os itens do grupo clicado
// campoAgrupador: nome do campo em dadosDetalhe que corresponde a linha.chave do resumo
// colunasDetalhe: colunas da tabela aninhada que aparece ao expandir
// ordenarDetalhePor: campo pra ordenar o detalhe (desc) -- geralmente uma data
export default function TabelaExpansivel({
  linhasResumo,
  colunasResumo,
  dadosDetalhe,
  campoAgrupador,
  colunasDetalhe,
  ordenarDetalhePor,
  tituloColunaChave = 'Nome',
}) {
  const [expandido, setExpandido] = useState(null)

  if (!linhasResumo || linhasResumo.length === 0) {
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
            <th style={{ width: 20 }}></th>
            {colunasResumo.map(col => (
              <th key={col.chave} style={{
                textAlign: col.alinhamento === 'right' ? 'right' : 'left',
                padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999',
              }}>
                {col.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhasResumo.map(linha => {
            const aberto = expandido === linha.chave
            const detalhe = aberto
              ? dadosDetalhe
                  .filter(d => d[campoAgrupador] === linha.chave)
                  .sort((a, b) => ordenarDetalhePor
                    ? String(b[ordenarDetalhePor]).localeCompare(String(a[ordenarDetalhePor]))
                    : 0)
              : []

            return (
              <React.Fragment key={linha.chave}>
                <tr
                  onClick={() => setExpandido(aberto ? null : linha.chave)}
                  style={{ borderBottom: '1px solid #F7F7F7', cursor: 'pointer', background: aberto ? '#FAFAFA' : 'transparent' }}
                >
                  <td style={{ padding: '8px 4px', color: '#BBB' }}>
                    {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  {colunasResumo.map((col, idx) => (
                    <td key={col.chave} style={{
                      padding: '8px 12px 8px 0',
                      textAlign: col.alinhamento === 'right' ? 'right' : 'left',
                      color: '#333', fontWeight: idx === 0 && aberto ? 600 : 400,
                    }}>
                      {col.render ? col.render(linha) : linha[col.chave]}
                    </td>
                  ))}
                </tr>
                {aberto && (
                  <tr>
                    <td colSpan={colunasResumo.length + 1} style={{ padding: '0 0 16px 28px', background: '#FAFAFA' }}>
                      <Tabela
                        colunas={colunasDetalhe}
                        linhas={detalhe}
                        chaveLinha={(l, idx) => `${linha.chave}-${idx}`}
                        limite={50}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
