import React, { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import Tabela, { formatarReais, formatarData } from './Tabela.jsx'

// Versão "pra imprimir" do detalhe por funcionário: em vez de acordeão (um
// de cada vez), mostra todo mundo expandido de uma vez, com um filtro de
// dia específico -- pensado pra bater o olho e imprimir/exportar em PDF.
//
// dadosDetalhe: array já filtrado pelo período/unidade da página (Header)
// campoAgrupador: campo de dadosDetalhe que identifica o responsável (ex: 'funcionario')
// campoData: campo da data (ex: 'data'), no formato yyyy-MM-dd
// campoValor: função (item) => number, pra somar o subtotal de cada responsável
// colunasDetalhe: mesmo formato usado em TabelaExpansivel/Tabela
export default function ImpressaoDetalhe({
  titulo,
  dadosDetalhe,
  campoAgrupador,
  campoData = 'data',
  campoValor,
  colunasDetalhe,
  tituloResponsavel = 'Funcionário',
}) {
  const [dia, setDia] = useState('')

  const filtrados = useMemo(() => {
    if (!dia) return dadosDetalhe
    return dadosDetalhe.filter(d => d[campoData] === dia)
  }, [dadosDetalhe, dia, campoData])

  // Agrupa primeiro por Unidade (casa) e, dentro de cada casa, por
  // funcionário/responsável -- assim a impressão sempre separa por casa,
  // mesmo quando o filtro do cabeçalho está em "Todas as unidades".
  const unidades = useMemo(() => {
    const porUnidade = {}
    filtrados.forEach(d => {
      const unidade = d.unidade || '(sem unidade)'
      if (!porUnidade[unidade]) porUnidade[unidade] = []
      porUnidade[unidade].push(d)
    })

    return Object.keys(porUnidade).sort().map(unidade => {
      const itensUnidade = porUnidade[unidade]

      const porResponsavel = {}
      itensUnidade.forEach(d => {
        const chave = d[campoAgrupador] || '(sem responsável)'
        if (!porResponsavel[chave]) porResponsavel[chave] = []
        porResponsavel[chave].push(d)
      })

      const grupos = Object.keys(porResponsavel).sort().map(chave => {
        const itens = [...porResponsavel[chave]].sort((a, b) => String(b[campoData]).localeCompare(String(a[campoData])))
        return {
          chave,
          itens,
          qtd: itens.length,
          valor: itens.reduce((acc, d) => acc + campoValor(d), 0),
        }
      }).sort((a, b) => b.valor - a.valor)

      return {
        unidade,
        grupos,
        qtd: itensUnidade.length,
        valor: itensUnidade.reduce((acc, d) => acc + campoValor(d), 0),
      }
    }).sort((a, b) => b.valor - a.valor)
  }, [filtrados, campoAgrupador, campoData, campoValor])

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#999' }}>Filtrar por dia:</span>
        <input
          type="date"
          value={dia}
          onChange={e => setDia(e.target.value)}
          style={{ height: 32, borderRadius: 99, border: '1px solid #E8E8E8', padding: '0 10px', fontSize: 12.5, fontFamily: 'inherit' }}
        />
        {dia && (
          <button
            onClick={() => setDia('')}
            style={{ border: 'none', background: 'none', color: '#999', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
          >
            limpar
          </button>
        )}
        <button
          onClick={() => window.print()}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 16px', borderRadius: 99, border: 'none',
            background: '#1a1a1a', color: '#fff', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Printer size={13} /> Imprimir
        </button>
      </div>

      <div id="area-impressao-detalhe">
        <div className="print-only" style={{ display: 'none', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quintal do Espeto</div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: '2px 0 4px' }}>{titulo}</h2>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
            {dia ? `Dia: ${formatarData(dia)}` : 'Todo o período selecionado nos filtros'} · Gerado em {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

        {unidades.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#BBB' }}>
            Sem lançamentos {dia ? 'nesse dia' : 'no período'}.
          </div>
        )}

        {unidades.map((u, idxUnidade) => (
          <div
            key={u.unidade}
            style={{
              breakInside: 'avoid',
              breakBefore: idxUnidade === 0 ? 'auto' : 'page',
              marginBottom: 28,
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              borderBottom: '2px solid #1a1a1a', paddingBottom: 8, marginBottom: 14,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{u.unidade}</h3>
              <div style={{ fontSize: 12.5, color: '#666' }}>
                {u.qtd.toLocaleString('pt-BR')} lançamentos · <strong>{formatarReais(u.valor)}</strong>
              </div>
            </div>

            {u.grupos.map(g => (
              <div key={g.chave} style={{ breakInside: 'avoid', marginBottom: 22 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  borderBottom: '1px solid #EEE', paddingBottom: 6, marginBottom: 6,
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{g.chave}</h4>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {g.qtd.toLocaleString('pt-BR')} lançamentos · <strong>{formatarReais(g.valor)}</strong>
                  </div>
                </div>
                <Tabela
                  colunas={colunasDetalhe}
                  linhas={g.itens}
                  chaveLinha={(l, idx) => `${g.chave}-${idx}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-impressao-detalhe, #area-impressao-detalhe * { visibility: visible; }
          #area-impressao-detalhe { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>
    </div>
  )
}
