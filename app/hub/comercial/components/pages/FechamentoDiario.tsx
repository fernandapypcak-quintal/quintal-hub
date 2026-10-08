'use client'

import { useState } from 'react'
import { useFechamentoDiarioCompetencia, DiaFD } from '../../useComercial'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmtBRLCompacto(v: number) {
  if (!v && v !== 0) return '—'
  if (Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}
function fmtBRLCompleto(v: number) {
  if (!v && v !== 0) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtDataBR(iso: string) {
  if (!iso) return '—'
  const [a,m,d] = iso.split('-')
  return `${d}/${m}/${a}`
}

const botaoPill: React.CSSProperties = { padding: '6px 12px', borderRadius: 20, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 12, fontWeight: 600, color: '#5a5c5f', cursor: 'pointer' }
const botaoPillAtivo: React.CSSProperties = { ...botaoPill, background: '#0D0F14', color: '#97A624', borderColor: '#0D0F14' }

export default function FechamentoDiario({ filtros }: { filtros: any }) {
  const hoje = new Date()
  const anoPadrao = (filtros.ano && filtros.ano !== '') ? parseInt(filtros.ano) : hoje.getFullYear()
  const [ano, setAno] = useState(anoPadrao)
  const [mesFechamento, setMesFechamento] = useState(hoje.getMonth() + 1)
  // Default: próximos 2 meses a partir de hoje — o caso de uso mais comum
  // (vendas feitas agora pra eventos dos próximos meses).
  const mesSeguinte1 = (hoje.getMonth() + 1) % 12 + 1
  const mesSeguinte2 = (hoje.getMonth() + 2) % 12 + 1
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number[]>([mesSeguinte1, mesSeguinte2].sort((a,b)=>a-b))
  const [modoNumero, setModoNumero] = useState<'compacto' | 'completo'>('compacto')

  const { dados, loading, erro } = useFechamentoDiarioCompetencia(filtros, String(ano), mesFechamento, competenciaSelecionada)
  const fmt = modoNumero === 'completo' ? fmtBRLCompleto : fmtBRLCompacto

  function toggleCompetencia(m: number) {
    setCompetenciaSelecionada(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b) => a-b))
  }

  function imprimir() {
    if (!dados || !dados.temDrillDown) return
    function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
    const labelComp = competenciaSelecionada.map(m => MESES_LONG[m-1]).join(' e ')
    function blocoAno(anoLabel: number, dias: DiaFD[]) {
      return `<div class="bloco">
        <h2>${esc(String(anoLabel))}</h2>
        <table><thead><tr><th>Dia</th>${dias.map(d => `<th>${String(d.dia).padStart(2,'0')}/${esc(MESES[mesFechamento-1].toLowerCase())}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><td>Nº</td>${dias.map(d => `<td>${d.qtd||'—'}</td>`).join('')}</tr>
          <tr><td>Valor</td>${dias.map(d => `<td>${d.valor?esc(fmt(d.valor)):'—'}</td>`).join('')}</tr>
        </tbody></table>
      </div>`
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fechados em ${esc(MESES_LONG[mesFechamento-1])} para ${esc(labelComp)}</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 10px; margin: 0; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        h2 { font-size: 12px; margin: 14px 0 4px; }
        .sub { font-size: 11px; color: #888; margin-bottom: 10px; }
        table { border-collapse: collapse; white-space: nowrap; margin-bottom: 6px; }
        th, td { padding: 3px 6px; border-bottom: 1px solid #e8e8e8; text-align: right; }
        th:first-child, td:first-child { text-align: left; font-weight: 700; }
        .bloco { break-inside: avoid; }
        .resumo { margin-top: 14px; width: auto; }
        .resumo th, .resumo td { text-align: right; padding: 5px 12px; }
        .resumo th:first-child, .resumo td:first-child { text-align: left; }
        .resumo .total td { font-weight: 700; border-top: 2px solid #999; }
      </style>
    </head><body>
      <h1>Fechados em ${esc(MESES_LONG[mesFechamento-1])} para ${esc(labelComp)}</h1>
      <div class="sub">Comparando ${esc(String(dados.anoAnterior))} x ${esc(String(dados.anoAtual))}</div>
      ${blocoAno(dados.anoAnterior, dados.diasAnterior)}
      ${blocoAno(dados.anoAtual, dados.diasAtual)}
      <table class="resumo">
        <thead><tr><th></th><th>${esc(String(dados.anoAnterior))}</th><th>${esc(String(dados.anoAtual))}</th><th>Diferença</th></tr></thead>
        <tbody>
          <tr><td>Nº de negócios</td><td>${dados.totalAnterior.qtd}</td><td>${dados.totalAtual.qtd}</td><td>${dados.diferenca.qtd >= 0 ? '+' : ''}${dados.diferenca.qtd}</td></tr>
          <tr class="total"><td>Valor total</td><td>${esc(fmt(dados.totalAnterior.valor))}</td><td>${esc(fmt(dados.totalAtual.valor))}</td><td>${dados.diferenca.valor >= 0 ? '+' : ''}${esc(fmt(dados.diferenca.valor))}</td></tr>
        </tbody>
      </table>
    </body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'
    iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); alert('Não consegui preparar a impressão — tenta de novo.'); return }
    doc.open(); doc.write(html); doc.close()
    function limpar() { if (iframe.parentNode) document.body.removeChild(iframe) }
    iframe.onload = () => { iframe.contentWindow?.focus(); iframe.contentWindow?.print() }
    setTimeout(limpar, 4000)
  }

  const deltaGeral = dados && dados.geralAno.acumuladoAnterior > 0
    ? ((dados.geralAno.acumuladoAtual - dados.geralAno.acumuladoAnterior) / dados.geralAno.acumuladoAnterior) * 100
    : null

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' }}>

      {/* Geral do ano */}
      {dados && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Geral do ano · Fechamento</div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 14 }}>Acumulado de 01/jan até {fmtDataBR(dados.geralAno.corteData)} (ontem), nos dois anos — comparação de ritmo, dia equivalente.</div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 11, color: '#9a9c9f' }}>{dados.anoAnterior}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#8a8c8f' }}>{fmt(dados.geralAno.acumuladoAnterior)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#9a9c9f' }}>{dados.anoAtual}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#185FA5' }}>{fmt(dados.geralAno.acumuladoAtual)}</div>
            </div>
            {deltaGeral !== null && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: deltaGeral >= 0 ? '#eaf3de' : '#fdeaea', color: deltaGeral >= 0 ? '#3B6D11' : '#a32d2d' }}>
                {deltaGeral >= 0 ? '↑' : '↓'} {Math.abs(deltaGeral).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controles */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Fechados em [mês] para [competência]</div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Ano</div>
            <select value={ano} onChange={e => setAno(parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 13 }}>
              {Array.from({ length: 9 }, (_, i) => hoje.getFullYear() - i).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Mês de fechamento</div>
            <select value={mesFechamento} onChange={e => setMesFechamento(parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 13 }}>
              {MESES.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Formato</div>
            <div style={{ display: 'flex', border: '0.5px solid #E8E8E2', borderRadius: 20, overflow: 'hidden' }}>
              <button onClick={() => setModoNumero('compacto')} style={{ padding: '6px 12px', border: 'none', background: modoNumero==='compacto'?'#0D0F14':'#fff', color: modoNumero==='compacto'?'#97A624':'#5a5c5f', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Resumido</button>
              <button onClick={() => setModoNumero('completo')} style={{ padding: '6px 12px', border: 'none', background: modoNumero==='completo'?'#0D0F14':'#fff', color: modoNumero==='completo'?'#97A624':'#5a5c5f', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Completo</button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Meses de competência (pra onde é o evento)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MESES.map((m, i) => (
            <button key={m} onClick={() => toggleCompetencia(i+1)} style={competenciaSelecionada.includes(i+1) ? botaoPillAtivo : botaoPill}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 28, textAlign: 'center', color: '#9a9c9f', fontSize: 13 }}>
          Calculando...
        </div>
      )}
      {erro && (
        <div style={{ background: '#fdeaea', border: '0.5px solid #f0c0c0', borderRadius: 14, padding: 20, color: '#a32d2d', fontSize: 13 }}>
          Erro: {erro}
        </div>
      )}

      {!loading && !erro && dados && !dados.temDrillDown && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 28, textAlign: 'center', color: '#9a9c9f', fontSize: 13 }}>
          Selecione pelo menos um mês de competência acima pra ver o dia a dia.
        </div>
      )}

      {!loading && !erro && dados && dados.temDrillDown && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              Fechados em {MESES_LONG[mesFechamento-1]} para {competenciaSelecionada.map(m => MESES_LONG[m-1]).join(' e ')}
            </span>
            <button onClick={imprimir} style={botaoPill}>🖨 Imprimir</button>
          </div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 18 }}>
            Comparando {dados.anoAnterior} ({dados.competenciaAnterior.map(c => c).join(', ')}) × {dados.anoAtual} ({dados.competenciaAtual.map(c => c).join(', ')})
          </div>

          {[{ anoLabel: dados.anoAnterior, dias: dados.diasAnterior, cor: '#8a8c8f' }, { anoLabel: dados.anoAtual, dias: dados.diasAtual, cor: '#185FA5' }].map(bloco => (
            <div key={bloco.anoLabel} style={{ marginBottom: 20, overflowX: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: bloco.cor, marginBottom: 6 }}>{bloco.anoLabel}</div>
              <table style={{ borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '3px 8px 3px 0', fontSize: 10, color: '#9a9c9f' }}></th>
                    {bloco.dias.map(d => <th key={d.dia} style={{ textAlign: 'right', padding: '3px 8px', fontSize: 10, color: '#9a9c9f' }}>{String(d.dia).padStart(2,'0')}/{MESES[mesFechamento-1].toLowerCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: '0.5px solid #F0F0EC' }}>
                    <td style={{ padding: '4px 8px 4px 0', fontWeight: 700, fontSize: 11, color: '#9a9c9f' }}>Nº</td>
                    {bloco.dias.map(d => <td key={d.dia} style={{ textAlign: 'right', padding: '4px 8px', fontSize: 12, fontWeight: d.qtd ? 700 : 400, color: d.qtd ? '#0D0F14' : '#d8d8d4' }}>{d.qtd || '—'}</td>)}
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px 6px 0', fontWeight: 700, fontSize: 11, color: '#9a9c9f' }}>Valor</td>
                    {bloco.dias.map(d => <td key={d.dia} style={{ textAlign: 'right', padding: '2px 8px 6px', fontSize: 11, fontFamily: 'DM Mono, monospace', color: d.valor ? '#5a5c5f' : '#d8d8d4' }}>{d.valor ? fmt(d.valor) : '—'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ borderTop: '0.5px solid #F0F0EC', paddingTop: 14, marginTop: 4 }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 16px 4px 0', fontSize: 10, color: '#9a9c9f', textTransform: 'uppercase' }}></th>
                  <th style={{ textAlign: 'right', padding: '4px 16px', fontSize: 10, color: '#9a9c9f', textTransform: 'uppercase' }}>{dados.anoAnterior}</th>
                  <th style={{ textAlign: 'right', padding: '4px 16px', fontSize: 10, color: '#9a9c9f', textTransform: 'uppercase' }}>{dados.anoAtual}</th>
                  <th style={{ textAlign: 'right', padding: '4px 0 4px 16px', fontSize: 10, color: '#9a9c9f', textTransform: 'uppercase' }}>Diferença</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 16px 6px 0', fontSize: 13, fontWeight: 600 }}>Nº de negócios</td>
                  <td style={{ textAlign: 'right', padding: '6px 16px', fontSize: 13 }}>{dados.totalAnterior.qtd}</td>
                  <td style={{ textAlign: 'right', padding: '6px 16px', fontSize: 13, fontWeight: 700 }}>{dados.totalAtual.qtd}</td>
                  <td style={{ textAlign: 'right', padding: '6px 0 6px 16px', fontSize: 13, fontWeight: 700, color: dados.diferenca.qtd >= 0 ? '#3B6D11' : '#a32d2d' }}>
                    {dados.diferenca.qtd >= 0 ? '+' : ''}{dados.diferenca.qtd}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid #0D0F14' }}>
                  <td style={{ padding: '8px 16px 0 0', fontSize: 14, fontWeight: 700 }}>Valor total</td>
                  <td style={{ textAlign: 'right', padding: '8px 16px 0', fontSize: 14, fontFamily: 'DM Mono, monospace' }}>{fmt(dados.totalAnterior.valor)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 16px 0', fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmt(dados.totalAtual.valor)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 0 0 16px', fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: dados.diferenca.valor >= 0 ? '#3B6D11' : '#a32d2d' }}>
                    {dados.diferenca.valor >= 0 ? '+' : ''}{fmt(dados.diferenca.valor)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
