'use client'

import { useState } from 'react'
import { useFechamentoDiarioCompetencia, useMatrizFechamentoCompetencia, DiaFD, BlocoFD } from '../../useComercial'

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
function labelMesAno(ym: string) {
  if (!ym || !ym.includes('-')) return '—'
  const [ano, mes] = ym.split('-')
  return `${MESES[parseInt(mes,10)-1]}/${ano.slice(-2)}`
}

const botaoPill: React.CSSProperties = { padding: '6px 12px', borderRadius: 20, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 12, fontWeight: 600, color: '#5a5c5f', cursor: 'pointer' }
const botaoPillAtivo: React.CSSProperties = { ...botaoPill, background: '#0D0F14', color: '#97A624', borderColor: '#0D0F14' }

function abrirImpressao(html: string) {
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
function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

export default function FechamentoDiario({ filtros }: { filtros: any }) {
  const hoje = new Date()
  const anoPadrao = (filtros.ano && filtros.ano !== '') ? parseInt(filtros.ano) : hoje.getFullYear()
  const [ano, setAno] = useState(anoPadrao)
  const [mesesFechamentoSelecionados, setMesesFechamentoSelecionados] = useState<number[]>([hoje.getMonth() + 1])
  // Default: próximos 2 meses a partir de hoje — o caso de uso mais comum
  // (vendas feitas agora pra eventos dos próximos meses).
  const mesSeguinte1 = (hoje.getMonth() + 1) % 12 + 1
  const mesSeguinte2 = (hoje.getMonth() + 2) % 12 + 1
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<number[]>([mesSeguinte1, mesSeguinte2].sort((a,b)=>a-b))
  const [modoNumero, setModoNumero] = useState<'compacto' | 'completo'>('compacto')

  const [anoMatriz, setAnoMatriz] = useState(anoPadrao)

  const { dados, loading, erro } = useFechamentoDiarioCompetencia(filtros, String(ano), mesesFechamentoSelecionados, competenciaSelecionada)
  const matriz = useMatrizFechamentoCompetencia(filtros, String(anoMatriz))
  const fmt = modoNumero === 'completo' ? fmtBRLCompleto : fmtBRLCompacto

  function toggleMesFechamento(m: number) {
    setMesesFechamentoSelecionados(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b) => a-b))
  }
  function toggleCompetencia(m: number) {
    setCompetenciaSelecionada(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b) => a-b))
  }

  function imprimirDiario() {
    if (!dados || !dados.temDrillDown || !Array.isArray(dados.blocos)) return
    const labelComp = competenciaSelecionada.map(m => MESES_LONG[m-1]).join(' e ')
    const labelFech = dados.blocos.map(b => MESES_LONG[b.mesFechamento-1]).join(' + ')
    function blocoAnoHtml(anoLabel: number, mesFechamento: number, dias: DiaFD[]) {
      return `<div class="bloco">
        <h3>${esc(String(anoLabel))}</h3>
        <table><thead><tr><th>Dia</th>${dias.map(d => `<th>${String(d.dia).padStart(2,'0')}/${esc(MESES[mesFechamento-1].toLowerCase())}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><td>Nº</td>${dias.map(d => `<td>${d.qtd||'—'}</td>`).join('')}</tr>
          <tr><td>Valor</td>${dias.map(d => `<td>${d.valor?esc(fmt(d.valor)):'—'}</td>`).join('')}</tr>
        </tbody></table>
      </div>`
    }
    // Agrupa por MÊS (não por ano) — cada mês mostra seus dois anos e o
    // subtotal dele logo embaixo, antes de passar pro próximo mês. Mesma
    // ordem que já aparece na tela.
    function secaoMes(b: typeof dados.blocos[number]) {
      return `<div class="secao-mes">
        <h2>${esc(MESES_LONG[b.mesFechamento-1])}</h2>
        ${b.mesEmCurso ? `<div class="sub" style="color:#8a7405;">Mês em curso — comparando dia 01 até ontem nos dois anos.</div>` : ''}
        ${blocoAnoHtml(dados!.anoAnterior, b.mesFechamento, b.diasAnterior)}
        ${blocoAnoHtml(dados!.anoAtual, b.mesFechamento, b.diasAtual)}
        <table class="resumo">
          <thead><tr><th></th><th>${esc(String(dados!.anoAnterior))}</th><th>${esc(String(dados!.anoAtual))}</th><th>Diferença</th></tr></thead>
          <tbody>
            <tr><td>Nº de negócios</td><td>${b.totalAnterior.qtd}</td><td>${b.totalAtual.qtd}</td><td>${b.diferenca.qtd >= 0 ? '+' : ''}${b.diferenca.qtd}</td></tr>
            <tr class="total"><td>Valor total</td><td>${esc(fmt(b.totalAnterior.valor))}</td><td>${esc(fmt(b.totalAtual.valor))}</td><td>${b.diferenca.valor >= 0 ? '+' : ''}${esc(fmt(b.diferenca.valor))}</td></tr>
          </tbody>
        </table>
      </div>`
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fechados em ${esc(labelFech)} para ${esc(labelComp)}</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 10px; margin: 0; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        h2 { font-size: 13px; margin: 14px 0 2px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        h3 { font-size: 11px; margin: 10px 0 4px; color: #555; }
        .sub { font-size: 11px; color: #888; margin-bottom: 10px; }
        table { border-collapse: collapse; white-space: nowrap; margin-bottom: 4px; }
        th, td { padding: 3px 6px; border-bottom: 1px solid #e8e8e8; text-align: right; }
        th:first-child, td:first-child { text-align: left; font-weight: 700; }
        .bloco { break-inside: avoid; }
        .secao-mes { break-inside: avoid; margin-bottom: 16px; }
        .resumo { margin-top: 14px; width: auto; }
        .resumo th, .resumo td { text-align: right; padding: 5px 12px; }
        .resumo th:first-child, .resumo td:first-child { text-align: left; }
        .resumo .total td { font-weight: 700; border-top: 2px solid #999; }
      </style>
    </head><body>
      <h1>Fechados em ${esc(labelFech)} para ${esc(labelComp)}</h1>
      <div class="sub">Comparando ${esc(String(dados.anoAnterior))} x ${esc(String(dados.anoAtual))}</div>
      ${dados.blocos.map(b => secaoMes(b)).join('')}
      <h2>Total geral (todos os meses de fechamento selecionados)</h2>
      <table class="resumo">
        <thead><tr><th></th><th>${esc(String(dados.anoAnterior))}</th><th>${esc(String(dados.anoAtual))}</th><th>Diferença</th></tr></thead>
        <tbody>
          <tr><td>Nº de negócios</td><td>${dados.totalGeralAnterior.qtd}</td><td>${dados.totalGeralAtual.qtd}</td><td>${dados.diferencaGeral.qtd >= 0 ? '+' : ''}${dados.diferencaGeral.qtd}</td></tr>
          <tr class="total"><td>Valor total</td><td>${esc(fmt(dados.totalGeralAnterior.valor))}</td><td>${esc(fmt(dados.totalGeralAtual.valor))}</td><td>${dados.diferencaGeral.valor >= 0 ? '+' : ''}${esc(fmt(dados.diferencaGeral.valor))}</td></tr>
        </tbody>
      </table>
    </body></html>`
    abrirImpressao(html)
  }

  function imprimirMatriz() {
    if (!matriz.dados || !Array.isArray(matriz.dados.colunas) || !Array.isArray(matriz.dados.linhas) || !Array.isArray(matriz.dados.totalPorColuna)) return
    const d = matriz.dados
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fechamento x Competência ${esc(String(anoMatriz))}</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 11px; margin: 0; }
        h1 { font-size: 18px; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; white-space: nowrap; }
        th, td { padding: 4px 8px; border-bottom: 1px solid #e8e8e8; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        thead th { color: #888; font-weight: 700; }
        .total td, .total th { font-weight: 700; border-top: 2px solid #999; }
        .qtd { font-weight: 700; } .valor { color: #888; display: block; font-size: 10px; }
      </style>
    </head><body>
      <h1>Fechamento × Competência — ${esc(String(anoMatriz))} (quantidade e valor de negócios ganhos por mês de fechamento, abertos por mês de competência do evento)</h1>
      <div style="font-size:11px;color:#888;margin-bottom:8px;">Dados até ${esc(new Date().toLocaleDateString('pt-BR'))} — o mês de fechamento em curso ainda está incompleto.</div>
      <table>
        <thead><tr><th>Fechamento \\ Competência</th>${d.colunas.map(c => `<th>${esc(labelMesAno(c))}</th>`).join('')}<th>Total</th></tr></thead>
        <tbody>
          ${d.linhas.filter(l => l.qtdTotal > 0).map(l => `<tr>
            <td>${esc(labelMesAno(l.mesFechamento))}</td>
            ${l.porCompetencia.map(c => c.qtd > 0 ? `<td><span class="qtd">${c.qtd}</span><span class="valor">${esc(fmt(c.valor))}</span></td>` : `<td style="color:#ccc;">—</td>`).join('')}
            <td><span class="qtd">${l.qtdTotal}</span><span class="valor">${esc(fmt(l.valorTotal))}</span></td>
          </tr>`).join('')}
          <tr class="total">
            <td>Total</td>
            ${d.totalPorColuna.map(c => `<td><span class="qtd">${c.qtd}</span><span class="valor">${esc(fmt(c.valor))}</span></td>`).join('')}
            <td><span class="qtd">${d.qtdGeral}</span><span class="valor">${esc(fmt(d.valorGeral))}</span></td>
          </tr>
        </tbody>
      </table>
    </body></html>`
    abrirImpressao(html)
  }

  const deltaGeral = dados && dados.geralAno && dados.geralAno.acumuladoAnterior > 0
    ? ((dados.geralAno.acumuladoAtual - dados.geralAno.acumuladoAnterior) / dados.geralAno.acumuladoAnterior) * 100
    : null

  // Checa a forma da resposta antes de usar — se o backend ainda estiver
  // numa versão antiga (sem 'blocos'/'colunas' etc.) ou devolver algo
  // inesperado, essas seções simplesmente não aparecem, em vez de
  // derrubar a página inteira.
  const matrizValida = !!matriz.dados && Array.isArray(matriz.dados.colunas) && Array.isArray(matriz.dados.linhas) && Array.isArray(matriz.dados.totalPorColuna)
  const linhasMatrizComDados = matrizValida ? matriz.dados!.linhas.filter(l => l.qtdTotal > 0) : []
  const diarioValido = !!dados && Array.isArray(dados.blocos)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' }}>

      {/* Geral do ano */}
      {dados && dados.geralAno && (
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

      {/* Controles do drill-down diário */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Fechados em [mês(es)] para [competência]</div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Ano</div>
            <select value={ano} onChange={e => setAno(parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 13 }}>
              {Array.from({ length: 9 }, (_, i) => hoje.getFullYear() - i).map(a => <option key={a} value={a}>{a}</option>)}
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

        <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Mês(es) de fechamento (pode escolher mais de um)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {MESES.map((m, i) => (
            <button key={m} onClick={() => toggleMesFechamento(i+1)} style={mesesFechamentoSelecionados.includes(i+1) ? botaoPillAtivo : botaoPill}>
              {m}
            </button>
          ))}
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

      {!loading && !erro && dados && diarioValido && !dados.temDrillDown && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 28, textAlign: 'center', color: '#9a9c9f', fontSize: 13 }}>
          Selecione pelo menos um mês de fechamento e um de competência acima pra ver o dia a dia.
        </div>
      )}

      {!loading && !erro && dados && diarioValido && dados.temDrillDown && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              Fechados em {dados.blocos.map(b => MESES_LONG[b.mesFechamento-1]).join(' + ')} para {competenciaSelecionada.map(m => MESES_LONG[m-1]).join(' e ')}
            </span>
            <button onClick={imprimirDiario} style={botaoPill}>🖨 Imprimir</button>
          </div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 18 }}>
            Comparando {dados.anoAnterior} × {dados.anoAtual}
          </div>

          {dados.blocos.map((bloco: BlocoFD) => (
            <div key={bloco.mesFechamento} style={{ marginBottom: 24, paddingBottom: 18, borderBottom: '0.5px solid #F0F0EC' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: bloco.mesEmCurso ? 2 : 10 }}>{MESES_LONG[bloco.mesFechamento-1]}</div>
              {bloco.mesEmCurso && (
                <div style={{ fontSize: 11, color: '#8a7405', marginBottom: 10 }}>
                  Mês em curso — comparando dia 01 até ontem nos dois anos, pra não comparar um mês cheio com um pela metade.
                </div>
              )}
              {[{ anoLabel: dados.anoAnterior, dias: bloco.diasAnterior, cor: '#8a8c8f' }, { anoLabel: dados.anoAtual, dias: bloco.diasAtual, cor: '#185FA5' }].map(linha => (
                <div key={linha.anoLabel} style={{ marginBottom: 14, overflowX: 'auto' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: linha.cor, marginBottom: 6 }}>{linha.anoLabel}</div>
                  <table style={{ borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '3px 8px 3px 0', fontSize: 10, color: '#9a9c9f' }}></th>
                        {linha.dias.map(d => <th key={d.dia} style={{ textAlign: 'right', padding: '3px 8px', fontSize: 10, color: '#9a9c9f' }}>{String(d.dia).padStart(2,'0')}/{MESES[bloco.mesFechamento-1].toLowerCase()}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderTop: '0.5px solid #F0F0EC' }}>
                        <td style={{ padding: '4px 8px 4px 0', fontWeight: 700, fontSize: 11, color: '#9a9c9f' }}>Nº</td>
                        {linha.dias.map(d => <td key={d.dia} style={{ textAlign: 'right', padding: '4px 8px', fontSize: 12, fontWeight: d.qtd ? 700 : 400, color: d.qtd ? '#0D0F14' : '#d8d8d4' }}>{d.qtd || '—'}</td>)}
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 8px 6px 0', fontWeight: 700, fontSize: 11, color: '#9a9c9f' }}>Valor</td>
                        {linha.dias.map(d => <td key={d.dia} style={{ textAlign: 'right', padding: '2px 8px 6px', fontSize: 11, fontFamily: 'DM Mono, monospace', color: d.valor ? '#5a5c5f' : '#d8d8d4' }}>{d.valor ? fmt(d.valor) : '—'}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
              <table style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '3px 14px 3px 0', fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}></th>
                    <th style={{ textAlign: 'right', padding: '3px 14px', fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>{dados.anoAnterior}</th>
                    <th style={{ textAlign: 'right', padding: '3px 14px', fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>{dados.anoAtual}</th>
                    <th style={{ textAlign: 'right', padding: '3px 0 3px 14px', fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 14px 4px 0', fontSize: 12, fontWeight: 600 }}>Nº de negócios</td>
                    <td style={{ textAlign: 'right', padding: '4px 14px', fontSize: 12 }}>{bloco.totalAnterior.qtd}</td>
                    <td style={{ textAlign: 'right', padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>{bloco.totalAtual.qtd}</td>
                    <td style={{ textAlign: 'right', padding: '4px 0 4px 14px', fontSize: 12, fontWeight: 700, color: bloco.diferenca.qtd >= 0 ? '#3B6D11' : '#a32d2d' }}>
                      {bloco.diferenca.qtd >= 0 ? '+' : ''}{bloco.diferenca.qtd}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1.5px solid #0D0F14' }}>
                    <td style={{ padding: '6px 14px 0 0', fontSize: 13, fontWeight: 700 }}>Valor total</td>
                    <td style={{ textAlign: 'right', padding: '6px 14px 0', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>{fmt(bloco.totalAnterior.valor)}</td>
                    <td style={{ textAlign: 'right', padding: '6px 14px 0', fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmt(bloco.totalAtual.valor)}</td>
                    <td style={{ textAlign: 'right', padding: '6px 0 0 14px', fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: bloco.diferenca.valor >= 0 ? '#3B6D11' : '#a32d2d' }}>
                      {bloco.diferenca.valor >= 0 ? '+' : ''}{fmt(bloco.diferenca.valor)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ paddingTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Total geral (todos os meses de fechamento selecionados)</div>
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
                  <td style={{ textAlign: 'right', padding: '6px 16px', fontSize: 13 }}>{dados.totalGeralAnterior.qtd}</td>
                  <td style={{ textAlign: 'right', padding: '6px 16px', fontSize: 13, fontWeight: 700 }}>{dados.totalGeralAtual.qtd}</td>
                  <td style={{ textAlign: 'right', padding: '6px 0 6px 16px', fontSize: 13, fontWeight: 700, color: dados.diferencaGeral.qtd >= 0 ? '#3B6D11' : '#a32d2d' }}>
                    {dados.diferencaGeral.qtd >= 0 ? '+' : ''}{dados.diferencaGeral.qtd}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid #0D0F14' }}>
                  <td style={{ padding: '8px 16px 0 0', fontSize: 14, fontWeight: 700 }}>Valor total</td>
                  <td style={{ textAlign: 'right', padding: '8px 16px 0', fontSize: 14, fontFamily: 'DM Mono, monospace' }}>{fmt(dados.totalGeralAnterior.valor)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 16px 0', fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmt(dados.totalGeralAtual.valor)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 0 0 16px', fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: dados.diferencaGeral.valor >= 0 ? '#3B6D11' : '#a32d2d' }}>
                    {dados.diferencaGeral.valor >= 0 ? '+' : ''}{fmt(dados.diferencaGeral.valor)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo do ano todo — matriz Fechamento × Competência */}
      {matrizValida && linhasMatrizComDados.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Resumo do ano · Fechamento × Competência</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select value={anoMatriz} onChange={e => setAnoMatriz(parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: 20, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 12, fontWeight: 600, color: '#5a5c5f', cursor: 'pointer' }}>
                {Array.from({ length: 9 }, (_, i) => hoje.getFullYear() - i).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={imprimirMatriz} style={botaoPill}>🖨 Imprimir</button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 4 }}>
            Quantos negócios fecharam em cada mês do ano, e pra qual mês de competência (evento) eles são — visão completa, mês a mês.
          </div>
          <div style={{ fontSize: 11, color: '#8a7405', marginBottom: 14 }}>
            Dados até {new Date().toLocaleDateString('pt-BR')} — o mês de fechamento em curso ainda está incompleto.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 10px 8px 0', fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Fechamento \ Competência</th>
                  {matriz.dados!.colunas.map(c => (
                    <th key={c} style={{ textAlign: 'right', padding: '4px 10px 8px', fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>{labelMesAno(c)}</th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '4px 0 8px 10px', fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {linhasMatrizComDados.map(l => (
                  <tr key={l.mesFechamento} style={{ borderTop: '0.5px solid #F0F0EC' }}>
                    <td style={{ padding: '6px 10px 6px 0', fontWeight: 600, fontSize: 12 }}>{labelMesAno(l.mesFechamento)}</td>
                    {l.porCompetencia.map(c => (
                      <td key={c.mesCompetencia} style={{ textAlign: 'right', padding: '6px 10px', fontSize: 12 }}>
                        {c.qtd > 0 ? (
                          <>
                            <div style={{ fontWeight: 700 }}>{c.qtd}</div>
                            <div style={{ fontSize: 10, color: '#9a9c9f', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{fmt(c.valor)}</div>
                          </>
                        ) : <span style={{ color: '#d8d8d4' }}>—</span>}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', padding: '6px 0 6px 10px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{l.qtdTotal}</div>
                      <div style={{ fontSize: 10, color: '#9a9c9f', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{fmt(l.valorTotal)}</div>
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #0D0F14' }}>
                  <td style={{ padding: '8px 10px 0 0', fontWeight: 700, fontSize: 12 }}>Total</td>
                  {matriz.dados!.totalPorColuna.map(c => (
                    <td key={c.mesCompetencia} style={{ textAlign: 'right', padding: '8px 10px 0' }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{c.qtd}</div>
                      <div style={{ fontSize: 10, color: '#9a9c9f', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{fmt(c.valor)}</div>
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', padding: '8px 0 0 10px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{matriz.dados!.qtdGeral}</div>
                    <div style={{ fontSize: 10, color: '#9a9c9f', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{fmt(matriz.dados!.valorGeral)}</div>
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
