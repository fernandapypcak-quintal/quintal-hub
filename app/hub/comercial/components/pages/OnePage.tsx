'use client'

import { useState, useEffect } from 'react'
import { useOnePage } from '../../useComercial'

function fmtBRLCompacto(v: number) {
  if (!v && v !== 0) return '—'
  if (Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}
function delta(atual: number, ant: number) {
  if (!ant) return null
  const pct = ((atual - ant) / ant * 100)
  return { pct: Math.abs(pct).toFixed(1), up: atual >= ant }
}

function fmtVariacao(atual: number, anterior: number) {
  const d = delta(atual, anterior)
  if (!d) return anterior === 0 && atual > 0 ? 'Novo' : '—'
  return `${d.up ? '↑' : '↓'} ${d.pct}%`
}

function DeltaTag({ atual, ant, label }: { atual: number; ant: number; label: string }) {
  const d = delta(atual, ant)
  if (!d) return null
  return (
    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: d.up ? '#eaf3de' : '#fdeaea', color: d.up ? '#3B6D11' : '#a32d2d', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {d.up ? '↑' : '↓'} {d.pct}% {label}
    </span>
  )
}

function hojeYm() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`
}

const GAS_URL = '/api/pipedrive'

type DealResumo = {
  id: string; empresa: string; titulo: string; status: string; stage_nome: string
  valor: number; data_evento: string; won_time: string; vendedor: string; unidade_nome: string
}

// Modal de comparação: mostra os negócios que compuseram o valor de um mês
// específico, nos dois anos (atual e anterior), lado a lado — pra
// investigar diferenças ou conferir contra outra fonte (ex: planilha).
function ModalComparacaoMeses({ titulo, campoData, mesNum, anoAtual, anoAnterior, filtros, onClose }: {
  titulo: string; campoData: 'won_time' | 'data_evento'; mesNum: number
  anoAtual: number; anoAnterior: number; filtros: any; onClose: () => void
}) {
  const [dealsAtual, setDealsAtual] = useState<DealResumo[]>([])
  const [dealsAnterior, setDealsAnterior] = useState<DealResumo[]>([])
  const [loading, setLoading] = useState(true)
  const mesStr = String(mesNum).padStart(2, '0')
  const ehFechamento = campoData === 'won_time'

  useEffect(() => {
    setLoading(true)
    function buscar(ano: number) {
      const p = new URLSearchParams({ tipo: 'deals', limit: '500', status: 'won', campo_data: campoData, ano: String(ano), mes: mesStr })
      if (filtros?.unidade)  p.set('unidade',  filtros.unidade)
      if (filtros?.vendedor) p.set('vendedor', filtros.vendedor)
      return fetch(`${GAS_URL}?${p}`).then(r => r.json()).then(d => d.deals || [])
    }
    Promise.all([buscar(anoAtual), buscar(anoAnterior)])
      .then(([a, b]) => { setDealsAtual(a); setDealsAnterior(b) })
      .finally(() => setLoading(false))
  }, [campoData, mesNum, anoAtual, anoAnterior, filtros?.unidade, filtros?.vendedor])

  // Corte por dia: só se aplica no gráfico de FECHAMENTO, e só quando o mês
  // clicado é o mês corrente de verdade (ainda em curso) — nos dois anos, no
  // mesmo dia, senão o ano fechado inteiro sempre pareceria maior que o mês
  // que ainda não terminou. Mês já encerrado não corta (mês cheio dos dois lados).
  const hoje = new Date()
  const ehMesCorrente = ehFechamento && anoAtual === hoje.getFullYear() && mesNum === (hoje.getMonth()+1)
  // Hoje ainda não terminou, então não conta como dia fechado — corta em
  // dia 01 até ONTEM nos dois anos, pra comparar só dias completos.
  const diaCorte = ehMesCorrente ? hoje.getDate() : 31

  function filtrarPorDia(deals: DealResumo[]) {
    if (!ehFechamento) return deals
    return deals.filter(d => {
      const dia = parseInt(String(d.won_time||'').substring(8,10))
      return !dia || dia <= diaCorte
    })
  }
  const dealsAtualCortado = filtrarPorDia(dealsAtual)
  const dealsAnteriorCortado = filtrarPorDia(dealsAnterior)

  const totalAtual = dealsAtualCortado.reduce((s,d) => s + (parseFloat(String(d.valor))||0), 0)
  const totalAnterior = dealsAnteriorCortado.reduce((s,d) => s + (parseFloat(String(d.valor))||0), 0)

  // Pra onde foi a competência: agrupa os deals que FECHARAM nesse mês pelo
  // mês do EVENTO (data_evento) — só faz sentido no gráfico de Fechamento.
  // Por loja/unidade — vale nos dois gráficos (Competência e Fechamento),
  // não só no de Fechamento (diferente do "pra onde foi a competência",
  // que só faz sentido lá).
  function agruparPorLoja(deals: DealResumo[]) {
    const mapa: Record<string, { valor: number; qtd: number }> = {}
    deals.forEach(d => {
      const nomes = String(d.unidade_nome||'').split(',').map(x=>x.trim()).filter(Boolean)
      const lista = nomes.length ? nomes : ['Não informado']
      lista.forEach(loja => {
        if (!mapa[loja]) mapa[loja] = { valor: 0, qtd: 0 }
        mapa[loja].valor += parseFloat(String(d.valor))||0
        mapa[loja].qtd++
      })
    })
    return Object.entries(mapa).sort((a,b) => b[1].valor - a[1].valor)
  }
  // Tabela cruzada Loja × Competência — só faz sentido no gráfico de
  // Fechamento (onde já existem as duas dimensões separadas). Junta as duas
  // listas soltas numa coisa só, tipo pivot table, pra ficar claro qual
  // loja recebeu qual competência.
  type Celula = { valor: number; qtd: number }
  function pivotLojaCompetencia(deals: DealResumo[]) {
    const porLoja: Record<string, Record<string, Celula>> = {}
    const totalMes: Record<string, Celula> = {}
    const totalLoja: Record<string, Celula> = {}
    deals.forEach(d => {
      const mes = String(d.data_evento||'').substring(0,7) || 'Sem data'
      const nomes = String(d.unidade_nome||'').split(',').map(x=>x.trim()).filter(Boolean)
      const lojas = nomes.length ? nomes : ['Não informado']
      const valor = parseFloat(String(d.valor))||0
      lojas.forEach(loja => {
        if (!porLoja[loja]) porLoja[loja] = {}
        if (!porLoja[loja][mes]) porLoja[loja][mes] = { valor: 0, qtd: 0 }
        porLoja[loja][mes].valor += valor; porLoja[loja][mes].qtd++
        if (!totalLoja[loja]) totalLoja[loja] = { valor: 0, qtd: 0 }
        totalLoja[loja].valor += valor; totalLoja[loja].qtd++
        if (!totalMes[mes]) totalMes[mes] = { valor: 0, qtd: 0 }
        totalMes[mes].valor += valor; totalMes[mes].qtd++
      })
    })
    const meses = Object.keys(totalMes).sort()
    const lojas = Object.keys(totalLoja).sort((a,b) => totalLoja[b].valor - totalLoja[a].valor)
    return { meses, lojas, porLoja, totalMes, totalLoja }
  }

  const pivotAtual = ehFechamento ? pivotLojaCompetencia(dealsAtualCortado) : null
  const pivotAnterior = ehFechamento ? pivotLojaCompetencia(dealsAnteriorCortado) : null
  const lojaAtual = agruparPorLoja(dealsAtualCortado)
  const lojaAnterior = agruparPorLoja(dealsAnteriorCortado)

  // Comparativo consolidado: uma linha fixa por casa, com os dois anos e a
  // variação percentual. Assim a leitura não depende da ordem/ranking de
  // cada coluna e a mesma casa nunca "muda de linha" entre os anos.
  const mapaLojaAtual = Object.fromEntries(lojaAtual)
  const mapaLojaAnterior = Object.fromEntries(lojaAnterior)
  const casasComparativo = Array.from(new Set([
    ...Object.keys(mapaLojaAnterior),
    ...Object.keys(mapaLojaAtual),
  ])).sort((a, b) => {
    const totalA = (mapaLojaAtual[a]?.valor || 0) + (mapaLojaAnterior[a]?.valor || 0)
    const totalB = (mapaLojaAtual[b]?.valor || 0) + (mapaLojaAnterior[b]?.valor || 0)
    return totalB - totalA || a.localeCompare(b, 'pt-BR')
  })

  // No fechamento, compara também "pra onde foi" mês a mês. Nesta visão só
  // entram competências do próprio ano comparado: 2025 na coluna de 2025 e
  // 2026 na coluna de 2026. Eventos de 2027 não aparecem enquanto a análise
  // estiver em 2026; serão exibidos quando 2027 virar o ano da comparação.
  // As casas usam uma lista única e permanecem sempre na mesma linha.
  const mesesAbrev = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  type MapaMesCasa = Record<string, Record<number, { valor: number; qtd: number }>>
  function mapaCompetenciaRelativa(deals: DealResumo[], anoBase: number): MapaMesCasa {
    const mapa: MapaMesCasa = {}
    deals.forEach(d => {
      const data = String(d.data_evento || '')
      if (!/^\d{4}-\d{2}/.test(data)) return
      const anoEvento = parseInt(data.substring(0,4))
      const mesEvento = parseInt(data.substring(5,7))
      if (anoEvento !== anoBase) return
      const chaveMes = mesEvento - 1
      const casas = String(d.unidade_nome||'').split(',').map(x=>x.trim()).filter(Boolean)
      const lista = casas.length ? casas : ['Não informado']
      const valor = parseFloat(String(d.valor)) || 0
      lista.forEach(casa => {
        if (!mapa[casa]) mapa[casa] = {}
        if (!mapa[casa][chaveMes]) mapa[casa][chaveMes] = { valor: 0, qtd: 0 }
        mapa[casa][chaveMes].valor += valor
        mapa[casa][chaveMes].qtd++
      })
    })
    return mapa
  }
  const compRelAnterior = ehFechamento ? mapaCompetenciaRelativa(dealsAnteriorCortado, anoAnterior) : {}
  const compRelAtual = ehFechamento ? mapaCompetenciaRelativa(dealsAtualCortado, anoAtual) : {}
  const chavesMesesCompetencia = Array.from(new Set([
    ...Object.values(compRelAnterior).flatMap(m => Object.keys(m).map(Number)),
    ...Object.values(compRelAtual).flatMap(m => Object.keys(m).map(Number)),
  ])).sort((a,b) => a-b)
  function labelMesRelativo(chave: number) {
    return mesesAbrev[chave]
  }

  const Coluna = ({ ano, deals, total, cor, loja, pivot }: {
    ano: number; deals: DealResumo[]; total: number; cor: string
    loja: [string,{valor:number;qtd:number}][]
    pivot: { meses: string[]; lojas: string[]; porLoja: Record<string,Record<string,{valor:number;qtd:number}>>; totalMes: Record<string,{valor:number;qtd:number}>; totalLoja: Record<string,{valor:number;qtd:number}> } | null
  }) => (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${cor}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{ano}</span>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(total)} <span style={{ fontWeight: 400, color: '#9a9c9f' }}>({deals.length})</span></span>
      </div>

      {/* Fechamento: uma tabela só cruzando Loja × Competência, em vez de
          duas listas soltas que obrigavam ficar cruzando de cabeça */}
      {ehFechamento && pivot && pivot.lojas.length > 0 && (
        <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px dashed #E8E8E2', overflowX: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>Loja × competência (pra onde foi)</div>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#fff', textAlign: 'left', padding: '3px 12px 3px 0', color: '#9a9c9f', fontWeight: 600, minWidth: 150 }}>Casa</th>
                {pivot.meses.map(m => <th key={m} style={{ textAlign: 'right', padding: '3px 8px', color: '#9a9c9f', fontWeight: 600 }}>{m}</th>)}
                <th style={{ textAlign: 'right', padding: '3px 0 3px 8px', color: '#9a9c9f', fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {pivot.lojas.map(loj => (
                <tr key={loj} style={{ borderTop: '0.5px solid #F0F0EC' }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '4px 12px 4px 0', fontWeight: 600, color: '#3a3c3f', minWidth: 150 }}>{loj}</td>
                  {pivot.meses.map(m => {
                    const c = pivot.porLoja[loj][m]
                    return <td key={m} style={{ textAlign: 'right', padding: '4px 8px', fontFamily: 'DM Mono, monospace', color: c ? '#3a3c3f' : '#d8d8d2' }}>{c ? fmtBRLCompacto(c.valor) : '—'}</td>
                  })}
                  <td style={{ textAlign: 'right', padding: '4px 0 4px 8px', fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{fmtBRLCompacto(pivot.totalLoja[loj].valor)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1.5px solid #ccc' }}>
                <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '5px 12px 0 0', fontWeight: 700 }}>Total</td>
                {pivot.meses.map(m => <td key={m} style={{ textAlign: 'right', padding: '5px 8px 0', fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{fmtBRLCompacto(pivot.totalMes[m].valor)}</td>)}
                <td style={{ textAlign: 'right', padding: '5px 0 0 8px', fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{fmtBRLCompacto(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Competência: não tem segunda dimensão de data, então só a lista simples por loja */}
      {!ehFechamento && loja.length > 0 && (
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px dashed #E8E8E2' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Por loja</div>
          {loja.map(([nome, v]) => (
            <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
              <span style={{ color: '#5a5c5f' }}>{nome}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{fmtBRLCompacto(v.valor)} <span style={{ color: '#9a9c9f' }}>({v.qtd})</span></span>
            </div>
          ))}
        </div>
      )}

      {deals.length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f', padding: '10px 0' }}>Nenhum negócio nesse mês.</div>}
      {deals.length > 0 && (
        <details>
          <summary style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 8 }}>Ver os {deals.length} negócios individuais</summary>
          {deals.map(d => (
            <div key={d.id} style={{ padding: '7px 0', borderBottom: '0.5px solid #F0F0EC', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, color: '#3a3c3f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa || d.titulo}</span>
                <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{fmtBRLCompacto(parseFloat(String(d.valor))||0)}</span>
              </div>
              <div style={{ color: '#9a9c9f', fontSize: 10 }}>evento: {d.data_evento||'—'} · fechou: {d.won_time||'—'} · {d.unidade_nome||'—'} · {d.vendedor}</div>
            </div>
          ))}
        </details>
      )}
    </div>
  )

  function exportarCSV() {
    const linhas = [['Ano','Empresa','Unidade/Casa do evento','Valor','DataEvento','Fechou','Vendedor']]
    dealsAnteriorCortado.forEach(d => linhas.push([String(anoAnterior), d.empresa||d.titulo, d.unidade_nome||'Não informado', String(parseFloat(String(d.valor))||0), d.data_evento||'', d.won_time||'', d.vendedor||'']))
    dealsAtualCortado.forEach(d => linhas.push([String(anoAtual), d.empresa||d.titulo, d.unidade_nome||'Não informado', String(parseFloat(String(d.valor))||0), d.data_evento||'', d.won_time||'', d.vendedor||'']))
    const csv = linhas.map(l => l.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${titulo.replace(/[^\w]+/g,'_')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const deltaAnual = delta(totalAtual, totalAnterior)

  // Impressão via iframe escondido na própria página — mais confiável que
  // window.open (que pode ser bloqueado silenciosamente e, nesse caso,
  // acabar imprimindo a aba de trás em vez da janela nova).
  function imprimir() {
    function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
    function linhasHtml(deals: DealResumo[]) {
      if (deals.length === 0) return '<div style="color:#999;padding:10px 0;">Nenhum negócio nesse mês.</div>'
      return deals.map(d => `
        <div style="padding:8px 0;border-bottom:1px solid #eee;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;gap:10px;">
            <strong>${esc(d.empresa||d.titulo)}</strong>
            <strong>${esc(fmtBRLCompacto(parseFloat(String(d.valor))||0))}</strong>
          </div>
          <div style="color:#888;font-size:12px;">evento: ${esc(d.data_evento)||'—'} · fechou: ${esc(d.won_time)||'—'} · casa: ${esc(d.unidade_nome)||'Não informado'} · ${esc(d.vendedor)}</div>
        </div>`).join('')
    }
    function lojaHtml(loj: [string,{valor:number;qtd:number}][]) {
      if (ehFechamento || loj.length === 0) return ''
      return `<div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px dashed #ddd;">
        <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:8px;">Por loja</div>
        ${loj.map(([m,v]) => `<div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0;"><span>${esc(m)}</span><span>${esc(fmtBRLCompacto(v.valor))} (${v.qtd})</span></div>`).join('')}
      </div>`
    }
    function pivotHtml(pivot: typeof pivotAtual, total: number) {
      if (!ehFechamento || !pivot || pivot.lojas.length === 0) return ''
      return `<div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px dashed #ddd;overflow-x:auto;">
        <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:8px;">Loja × competência (pra onde foi)</div>
        <table style="border-collapse:collapse;font-size:12px;white-space:nowrap;width:100%;">
          <thead><tr>
            <th style="text-align:left;padding:3px 8px 3px 0;color:#888;">Loja</th>
            ${pivot.meses.map(m => `<th style="text-align:right;padding:3px 8px;color:#888;">${esc(m)}</th>`).join('')}
            <th style="text-align:right;padding:3px 0 3px 8px;color:#888;">Total</th>
          </tr></thead>
          <tbody>
            ${pivot.lojas.map(loj => `<tr style="border-top:1px solid #eee;">
              <td style="padding:4px 8px 4px 0;font-weight:600;">${esc(loj)}</td>
              ${pivot.meses.map(m => { const c = pivot.porLoja[loj][m]; return `<td style="text-align:right;padding:4px 8px;${c?'':'color:#ccc;'}">${c ? esc(fmtBRLCompacto(c.valor)) : '—'}</td>` }).join('')}
              <td style="text-align:right;padding:4px 0 4px 8px;font-weight:700;">${esc(fmtBRLCompacto(pivot.totalLoja[loj].valor))}</td>
            </tr>`).join('')}
            <tr style="border-top:2px solid #999;">
              <td style="padding:5px 8px 0 0;font-weight:700;">Total</td>
              ${pivot.meses.map(m => `<td style="text-align:right;padding:5px 8px 0;font-weight:700;">${esc(fmtBRLCompacto(pivot.totalMes[m].valor))}</td>`).join('')}
              <td style="text-align:right;padding:5px 0 0 8px;font-weight:700;">${esc(fmtBRLCompacto(total))}</td>
            </tr>
          </tbody>
        </table>
      </div>`
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: landscape; margin: 14mm; }
        body { font-family: Arial, Helvetica, sans-serif; padding: 0; color: #222; font-size: 14px; line-height: 1.5; margin: 0; }
        h1 { font-size: 19px; margin: 0 0 6px; }
        .cols { display: flex; flex-direction: row; gap: 40px; margin-top: 18px; align-items: flex-start; }
        .cols > div { flex: 1; min-width: 0; }
        .col-header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; font-size: 15px; font-weight: 700; }
      </style>
    </head><body>
      <h1>${esc(titulo)}</h1>
      ${deltaAnual ? `<span style="display:inline-block;font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;background:${deltaAnual.up?'#eaf3de':'#fdeaea'};color:${deltaAnual.up?'#3B6D11':'#a32d2d'};">${deltaAnual.up?'↑':'↓'} ${deltaAnual.pct}% vs ${anoAnterior}</span>` : ''}
      ${ehMesCorrente ? `<div style="font-size:12px;color:#8a7405;margin-top:10px;">Mês em curso — comparando dia 01 a ${String(diaCorte).padStart(2,'0')} (hoje) nos dois anos.</div>` : ''}
      <div class="cols">
        <div>
          <div class="col-header"><span>${anoAnterior}</span><span>${esc(fmtBRLCompacto(totalAnterior))} (${dealsAnteriorCortado.length})</span></div>
          ${pivotHtml(pivotAnterior, totalAnterior)}
          ${lojaHtml(lojaAnterior)}
          ${linhasHtml(dealsAnteriorCortado)}
        </div>
        <div>
          <div class="col-header"><span>${anoAtual}</span><span>${esc(fmtBRLCompacto(totalAtual))} (${dealsAtualCortado.length})</span></div>
          ${pivotHtml(pivotAtual, totalAtual)}
          ${lojaHtml(lojaAtual)}
          ${linhasHtml(dealsAtualCortado)}
        </div>
      </div>
    </body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); alert('Não consegui preparar a impressão — tenta de novo.'); return }
    doc.open(); doc.write(html); doc.close()

    function limpar() { if (iframe.parentNode) document.body.removeChild(iframe) }
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    }
    // Fallback, pra garantir que o iframe some mesmo se onload não disparar,
    // ou se a caixa de diálogo de impressão for cancelada.
    setTimeout(limpar, 4000)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 820, maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {deltaAnual && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: deltaAnual.up ? '#eaf3de' : '#fdeaea', color: deltaAnual.up ? '#3B6D11' : '#a32d2d' }}>
                {deltaAnual.up ? '↑' : '↓'} {deltaAnual.pct}% vs {anoAnterior}
              </span>
            )}
            <button onClick={exportarCSV} style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#5a5c5f' }}>⬇ Exportar CSV</button>
            <button onClick={imprimir} style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#5a5c5f' }}>🖨 Imprimir</button>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#9a9c9f' }}>×</button>
          </div>
        </div>
        {ehMesCorrente && (
          <div style={{ fontSize: 11, color: '#8a7405', marginBottom: 14 }}>Mês em curso — comparando dia 01 a {String(diaCorte).padStart(2,'0')} (hoje) nos dois anos.</div>
        )}
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
        ) : (
          <>
            <div style={{ marginTop: ehMesCorrente ? 0 : 14, marginBottom: 20, border: '0.5px solid #E8E8E2', borderRadius: 10, overflowX: 'auto' }}>
              <div style={{ padding: '10px 12px 6px', fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Comparativo por casa</div>
              <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E8E8E2' }}>
                    <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#fff', textAlign: 'left', padding: '7px 12px', color: '#9a9c9f', minWidth: 170 }}>Casa</th>
                    <th style={{ textAlign: 'right', padding: '7px 12px', color: '#9a9c9f' }}>{anoAnterior}</th>
                    <th style={{ textAlign: 'right', padding: '7px 12px', color: '#185FA5' }}>{anoAtual}</th>
                    <th style={{ textAlign: 'right', padding: '7px 12px', color: '#9a9c9f' }}>Var. %</th>
                  </tr>
                </thead>
                <tbody>
                  {casasComparativo.map(casa => {
                    const anterior = mapaLojaAnterior[casa]?.valor || 0
                    const atual = mapaLojaAtual[casa]?.valor || 0
                    const d = delta(atual, anterior)
                    return (
                      <tr key={casa} style={{ borderBottom: '0.5px solid #F0F0EC' }}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '7px 12px', fontWeight: 600, color: '#3a3c3f' }}>{casa}</td>
                        <td style={{ textAlign: 'right', padding: '7px 12px', fontFamily: 'DM Mono, monospace', color: '#8a8c8f' }}>{fmtBRLCompacto(anterior)}</td>
                        <td style={{ textAlign: 'right', padding: '7px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#185FA5' }}>{fmtBRLCompacto(atual)}</td>
                        <td style={{ textAlign: 'right', padding: '7px 12px', fontWeight: 700, color: d ? (d.up ? '#3B6D11' : '#a32d2d') : '#9a9c9f' }}>{fmtVariacao(atual, anterior)}</td>
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop: '1.5px solid #ccc' }}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '8px 12px', fontWeight: 700 }}>Total</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{fmtBRLCompacto(totalAnterior)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#185FA5' }}>{fmtBRLCompacto(totalAtual)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, color: deltaAnual ? (deltaAnual.up ? '#3B6D11' : '#a32d2d') : '#9a9c9f' }}>{fmtVariacao(totalAtual, totalAnterior)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {ehFechamento && chavesMesesCompetencia.length > 0 && (
              <div style={{ marginBottom: 20, border: '0.5px solid #E8E8E2', borderRadius: 10 }}>
                <div style={{ padding: '10px 12px 3px', fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Casa × competência — comparação mensal (pra onde foi)</div>
                <div style={{ padding: '0 12px 9px', fontSize: 10, color: '#9a9c9f' }}>Exibe somente competências do respectivo ano comparado. A casa permanece fixa durante a rolagem.</div>
                <div style={{ overflowX: 'auto', position: 'relative' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, whiteSpace: 'nowrap', minWidth: '100%' }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ position: 'sticky', left: 0, zIndex: 5, background: '#fff', textAlign: 'left', padding: '6px 14px', minWidth: 175, borderRight: '1px solid #E8E8E2', borderBottom: '1px solid #E8E8E2', boxShadow: '5px 0 7px -7px rgba(0,0,0,.45)' }}>Casa</th>
                        {chavesMesesCompetencia.map(chave => (
                          <th key={chave} colSpan={3} style={{ textAlign: 'center', padding: '6px 10px', color: '#5a5c5f', borderBottom: '0.5px solid #E8E8E2', borderRight: '1px solid #E8E8E2' }}>{labelMesRelativo(chave)}</th>
                        ))}
                        <th rowSpan={2} style={{ textAlign: 'right', padding: '6px 12px', borderBottom: '1px solid #E8E8E2' }}>Total var.</th>
                      </tr>
                      <tr>
                        {chavesMesesCompetencia.map(chave => (
                          <th key={chave} colSpan={3} style={{ padding: 0, borderRight: '1px solid #E8E8E2', borderBottom: '1px solid #E8E8E2' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(82px, 1fr))' }}>
                              <span style={{ textAlign: 'right', padding: '5px 8px', color: '#8a8c8f' }}>{anoAnterior}</span>
                              <span style={{ textAlign: 'right', padding: '5px 8px', color: '#185FA5' }}>{anoAtual}</span>
                              <span style={{ textAlign: 'right', padding: '5px 8px', color: '#9a9c9f' }}>Var. %</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {casasComparativo.map(casa => {
                        const totalAnt = mapaLojaAnterior[casa]?.valor || 0
                        const totalAtualCasa = mapaLojaAtual[casa]?.valor || 0
                        const dTotal = delta(totalAtualCasa, totalAnt)
                        return (
                          <tr key={casa}>
                            <td style={{ position: 'sticky', left: 0, zIndex: 4, background: '#fff', padding: '7px 14px', minWidth: 175, fontWeight: 600, color: '#3a3c3f', borderRight: '1px solid #E8E8E2', borderBottom: '0.5px solid #F0F0EC', boxShadow: '5px 0 7px -7px rgba(0,0,0,.45)' }}>{casa}</td>
                            {chavesMesesCompetencia.map(chave => {
                              const ant = compRelAnterior[casa]?.[chave]?.valor || 0
                              const atual = compRelAtual[casa]?.[chave]?.valor || 0
                              const d = delta(atual, ant)
                              return (
                                <td key={chave} colSpan={3} style={{ padding: 0, borderRight: '1px solid #E8E8E2', borderBottom: '0.5px solid #F0F0EC' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(82px, 1fr))' }}>
                                    <span style={{ textAlign: 'right', padding: '7px 8px', fontFamily: 'DM Mono, monospace', color: '#8a8c8f' }}>{ant ? fmtBRLCompacto(ant) : '—'}</span>
                                    <span style={{ textAlign: 'right', padding: '7px 8px', fontFamily: 'DM Mono, monospace', fontWeight: atual ? 700 : 400, color: atual ? '#185FA5' : '#d8d8d2' }}>{atual ? fmtBRLCompacto(atual) : '—'}</span>
                                    <span style={{ textAlign: 'right', padding: '7px 8px', fontWeight: 700, color: d ? (d.up ? '#3B6D11' : '#a32d2d') : '#9a9c9f' }}>{fmtVariacao(atual, ant)}</span>
                                  </div>
                                </td>
                              )
                            })}
                            <td style={{ textAlign: 'right', padding: '7px 12px', fontWeight: 700, color: dTotal ? (dTotal.up ? '#3B6D11' : '#a32d2d') : '#9a9c9f', borderBottom: '0.5px solid #F0F0EC' }}>{fmtVariacao(totalAtualCasa, totalAnt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Coluna ano={anoAnterior} deals={dealsAnteriorCortado} total={totalAnterior} cor="#8a8c8f" loja={lojaAnterior} pivot={null} />
              <Coluna ano={anoAtual} deals={dealsAtualCortado} total={totalAtual} cor="#185FA5" loja={lojaAtual} pivot={null} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function GraficoAnual({ titulo, campo, anos, corAtual, corAnterior, mesAtualNum, filtros }: {
  titulo: string
  campo: 'receitaCompetencia' | 'receitaFechamento'
  anos: { atual: { ano: number; meses: any[] }; anterior: { ano: number; meses: any[] } }
  corAtual: string
  corAnterior: string
  mesAtualNum: number
  filtros: any
}) {
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null)
  const campoData: 'won_time' | 'data_evento' = campo === 'receitaFechamento' ? 'won_time' : 'data_evento'
  const todosValores = [...anos.atual.meses.map(m => m[campo]), ...anos.anterior.meses.map(m => m[campo])]

  // Acumulado: soma Jan..mês atual, comparando os dois anos na MESMA janela
  // (senão o ano anterior, com 12 meses fechados, sempre pareceria "maior").
  const acumuladoAtual = anos.atual.meses.slice(0, mesAtualNum).reduce((s,m) => s+m[campo], 0)
  const acumuladoAnterior = anos.anterior.meses.slice(0, mesAtualNum).reduce((s,m) => s+m[campo], 0)
  const deltaAcumulado = delta(acumuladoAtual, acumuladoAnterior)

  // Eixo cortado: se o maior valor for um "fora da curva" (bem maior que o
  // segundo maior), a escala visual usa o segundo maior como teto — senão um
  // único mês gigante achata todos os outros no gráfico. O valor exato
  // continua sempre escrito por cima da barra e na tabela; só a ALTURA da
  // barra que estoura o teto fica cortada (marcada com um "zigue-zague").
  const ordenados = [...todosValores].sort((a,b) => b-a)
  const maior = ordenados[0] || 1
  const segundoMaior = ordenados[1] || maior
  const teto = (segundoMaior > 0 && maior > segundoMaior * 2.2) ? Math.ceil(segundoMaior * 1.2) : maior
  const max = Math.max(teto, 1)

  function alturaPx(valor: number) {
    return Math.max((Math.min(valor, max) / max) * 150, 3)
  }
  function estourou(valor: number) {
    return valor > max
  }

  const CorteTopo = ({ cor }: { cor: string }) => (
    <div style={{ width: 24, height: 6, marginBottom: -1, background: `repeating-linear-gradient(-45deg, ${cor}, ${cor} 3px, transparent 3px, transparent 6px)` }} />
  )

  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#5a5c5f' }}><span style={{ width: 11, height: 11, borderRadius: 3, background: corAnterior, display: 'inline-block' }} />{anos.anterior.ano}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#5a5c5f' }}><span style={{ width: 11, height: 11, borderRadius: 3, background: corAtual, display: 'inline-block' }} />{anos.atual.ano}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: teto < maior ? 4 : 20 }}>
        <span style={{ fontSize: 12, color: '#9a9c9f' }}>Acumulado Jan-{anos.atual.meses[mesAtualNum-1]?.label} {anos.atual.ano}:</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: corAtual, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(acumuladoAtual)}</span>
        <span style={{ fontSize: 12, color: '#9a9c9f' }}>vs {anos.anterior.ano}: {fmtBRLCompacto(acumuladoAnterior)}</span>
        {deltaAcumulado && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: deltaAcumulado.up ? '#eaf3de' : '#fdeaea', color: deltaAcumulado.up ? '#3B6D11' : '#a32d2d', fontWeight: 600 }}>
            {deltaAcumulado.up ? '↑' : '↓'} {deltaAcumulado.pct}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: teto < maior ? 8 : 0 }}>Clique num mês pra ver os negócios que compõem o valor, nos dois anos.</div>
      {teto < maior && (
        <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 16 }}>
          Escala com corte — barras hachuradas no topo estouram o teto do gráfico (valor exato sempre escrito, e na tabela abaixo).
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 260, overflowX: 'auto', paddingBottom: 8, marginTop: teto < maior ? 0 : 20 }}>
        {anos.atual.meses.map((mAtualMes, i) => {
          const mAnt = anos.anterior.meses[i]
          return (
            <div key={i} onClick={() => setMesSelecionado(i+1)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 78, flex: '1 0 78px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 200 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#8a8c8f', fontFamily: 'DM Mono, monospace', marginBottom: 4, whiteSpace: 'nowrap' }}>{fmtBRLCompacto(mAnt[campo])}</span>
                  {estourou(mAnt[campo]) && <CorteTopo cor={corAnterior} />}
                  <div style={{ width: 24, height: `${alturaPx(mAnt[campo])}px`, background: corAnterior, borderRadius: '4px 4px 0 0' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: corAtual, fontFamily: 'DM Mono, monospace', marginBottom: 4, whiteSpace: 'nowrap' }}>{fmtBRLCompacto(mAtualMes[campo])}</span>
                  {estourou(mAtualMes[campo]) && <CorteTopo cor={corAtual} />}
                  <div style={{ width: 24, height: `${alturaPx(mAtualMes[campo])}px`, background: corAtual, borderRadius: '4px 4px 0 0' }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#3a3c3f', textAlign: 'center' }}>{mAtualMes.label}</span>
            </div>
          )
        })}
      </div>

      {/* Tabela — números exatos, sempre legíveis mesmo quando um mês fora
          da curva (ex: um Dezembro gigante) esmaga as barras dos outros */}
      <div style={{ marginTop: 18, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E8E2' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>Mês</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>{anos.anterior.ano}</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>{anos.atual.ano}</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>Var.</th>
            </tr>
          </thead>
          <tbody>
            {anos.atual.meses.map((mAtualMes, i) => {
              const mAnt = anos.anterior.meses[i]
              const d = delta(mAtualMes[campo], mAnt[campo])
              return (
                <tr key={i} onClick={() => setMesSelecionado(i+1)} style={{ borderBottom: '0.5px solid #F5F5F2', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#3a3c3f' }}>{mAtualMes.label}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#8a8c8f' }}>{fmtBRLCompacto(mAnt[campo])}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: corAtual }}>{fmtBRLCompacto(mAtualMes[campo])}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{d && <span style={{ color: d.up ? '#3B6D11' : '#a32d2d', fontWeight: 600 }}>{d.up ? '↑' : '↓'} {d.pct}%</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {mesSelecionado !== null && (
        <ModalComparacaoMeses
          titulo={`${titulo} · ${anos.atual.meses[mesSelecionado-1]?.label}`}
          campoData={campoData}
          mesNum={mesSelecionado}
          anoAtual={anos.atual.ano}
          anoAnterior={anos.anterior.ano}
          filtros={filtros}
          onClose={() => setMesSelecionado(null)}
        />
      )}
    </div>
  )
}

type DealGranular = {
  empresa: string; data_evento: string; vendedor: string; unidade_nome: string
  valor: number; qtd_pessoas: any; cardapio_nome: string; won_time: string; add_time: string
}
type TicketBucket = { qtd: number; receita: number; pax: number; ticketMedio: number; ticketMedioPax: number; deals: DealGranular[] }
type LinhaGranular = { periodo: string; label: string; leads: number; fechados: number; taxa: number; receita: number; deals: DealGranular[]; fechamento: TicketBucket; competencia: TicketBucket }
type DadosGranular = { mensal: LinhaGranular[]; semanal: LinhaGranular[]; diario: LinhaGranular[] }

function PainelDesempenho({ filtros, mesFiltro }: { filtros: any; mesFiltro: string }) {
  const [dados, setDados] = useState<DadosGranular | null>(null)
  const [granularidade, setGranularidade] = useState<'mensal' | 'semanal' | 'diario'>('diario')
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [metricaTicket, setMetricaTicket] = useState<'evento' | 'pax'>('evento')
  const [pacoteAberto, setPacoteAberto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ tipo: 'taxa_conversao', mes_filtro: mesFiltro })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (!data.erro) setDados(data) })
      .finally(() => setLoading(false))
  }, [filtros.unidade, filtros.vendedor, mesFiltro])

  if (loading || !dados) return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20, textAlign: 'center', color: '#9a9c9f', fontSize: 13 }}>
      Carregando leads, conversão e ticket médio...
    </div>
  )

  const linhas = [...(dados[granularidade] || [])].reverse().slice(-16)
  const maxLeads = Math.max(...linhas.map(l => l.leads), 1)
  const maxTaxa = Math.max(...linhas.map(l => l.taxa), 1)
  const maxTicket = Math.max(...linhas.map(l => metricaTicket==='pax' ? Math.max(l.fechamento?.ticketMedioPax||0, l.competencia?.ticketMedioPax||0) : Math.max(l.fechamento?.ticketMedio||0, l.competencia?.ticketMedio||0)), 1)

  const periodoAtivo = selecionado && linhas.some(l => l.periodo === selecionado) ? selecionado : (linhas[linhas.length-1]?.periodo || null)
  const linhaAtiva = linhas.find(l => l.periodo === periodoAtivo)

  // Pacotes: base competência (mesmo critério do painel geral de pacotes —
  // "o que vendemos pra acontecer nesse período", não "o que foi criado nesse período")
  const pacotesMap: Record<string, { pacote: string; qtd: number; receita: number; clientes: DealGranular[] }> = {}
  ;(linhaAtiva?.competencia?.deals || []).forEach(d => {
    const nome = String(d.cardapio_nome || 'Não informado').trim()
    if (!pacotesMap[nome]) pacotesMap[nome] = { pacote: nome, qtd: 0, receita: 0, clientes: [] }
    pacotesMap[nome].qtd++
    pacotesMap[nome].receita += parseFloat(String(d.valor)) || 0
    pacotesMap[nome].clientes.push(d)
  })
  const receitaTotalPacotes = Object.values(pacotesMap).reduce((s,p) => s+p.receita, 0) || 1
  const pacotesAtivos = Object.values(pacotesMap)
    .map(p => ({ ...p, ticketMedio: p.qtd ? Math.round(p.receita/p.qtd) : 0, pctFaturamento: parseFloat(((p.receita/receitaTotalPacotes)*100).toFixed(1)) }))
    .sort((a,b) => b.receita - a.receita)
  const maxPacoteReceita = Math.max(...pacotesAtivos.map(p => p.receita), 1)

  function BotaoGran({ v, label }: { v: typeof granularidade; label: string }) {
    return (
      <button onClick={() => { setGranularidade(v); setSelecionado(null) }}
        style={{ padding: '5px 12px', borderRadius: 20, border: '0.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: granularidade===v ? '#0D0F14' : '#fff', color: granularidade===v ? '#97A624' : '#5a5c5f', borderColor: granularidade===v ? '#0D0F14' : '#E8E8E2' }}>
        {label}
      </button>
    )
  }

  const seletorGranularidade = (
    <div style={{ display: 'flex', gap: 6 }}>
      <BotaoGran v="diario" label="Diário" />
      <BotaoGran v="semanal" label="Semanal" />
      <BotaoGran v="mensal" label="Mensal" />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Leads que entram</span>
            {seletorGranularidade}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, overflowX: 'auto', paddingBottom: 8 }}>
            {linhas.map(l => (
              <div key={l.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 40, flex: '1 0 40px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#185FA5', fontFamily: 'DM Mono, monospace' }}>{l.leads}</span>
                <div style={{ width: '100%', maxWidth: 26, height: `${Math.max((l.leads/maxLeads)*140,4)}px`, background: '#185FA5', borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 10, color: '#9a9c9f', textAlign: 'center' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Taxa de conversão</span>
            {seletorGranularidade}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, overflowX: 'auto', paddingBottom: 8 }}>
            {linhas.map(l => (
              <div key={l.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 40, flex: '1 0 40px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#3B6D11', fontFamily: 'DM Mono, monospace' }}>{l.taxa}%</span>
                <div style={{ width: '100%', maxWidth: 26, height: `${Math.max((l.taxa/maxTaxa)*140,4)}px`, background: '#3B6D11', borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 10, color: '#9a9c9f', textAlign: 'center' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ticket médio clicável + pacotes do período clicado ──── */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Evolução do ticket médio</span>
          {seletorGranularidade}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5a5c5f' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#185FA5', display: 'inline-block' }} />Fechamento</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 10 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#97A624', display: 'inline-block' }} />Competência</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button onClick={() => setMetricaTicket('evento')}
              style={{ padding: '4px 10px', borderRadius: 20, border: '0.5px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: metricaTicket==='evento' ? '#0D0F14' : '#fff', color: metricaTicket==='evento' ? '#97A624' : '#5a5c5f', borderColor: metricaTicket==='evento' ? '#0D0F14' : '#E8E8E2' }}>
              Por evento
            </button>
            <button onClick={() => setMetricaTicket('pax')}
              style={{ padding: '4px 10px', borderRadius: 20, border: '0.5px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: metricaTicket==='pax' ? '#0D0F14' : '#fff', color: metricaTicket==='pax' ? '#97A624' : '#5a5c5f', borderColor: metricaTicket==='pax' ? '#0D0F14' : '#E8E8E2' }}>
              Por pessoa
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 14 }}>Clique num par de barras pra ver os pacotes vendidos (competência) naquele período.</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, overflowX: 'auto', paddingBottom: 8 }}>
          {linhas.map(l => {
            const valFech = metricaTicket === 'pax' ? (l.fechamento?.ticketMedioPax||0) : (l.fechamento?.ticketMedio||0)
            const valComp = metricaTicket === 'pax' ? (l.competencia?.ticketMedioPax||0) : (l.competencia?.ticketMedio||0)
            return (
            <div key={l.periodo} onClick={() => setSelecionado(l.periodo)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 68, flex: '1 0 68px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#185FA5', fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(valFech)}</span>
                  <div style={{
                    width: 22, height: `${Math.max((valFech/maxTicket)*130,3)}px`,
                    background: l.periodo === periodoAtivo ? '#0d3b66' : '#185FA5',
                    border: l.periodo === periodoAtivo ? '2px solid #072238' : 'none',
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#3B6D11', fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(valComp)}</span>
                  <div style={{
                    width: 22, height: `${Math.max((valComp/maxTicket)*130,3)}px`,
                    background: l.periodo === periodoAtivo ? '#254d0a' : '#97A624',
                    border: l.periodo === periodoAtivo ? '2px solid #173007' : 'none',
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: l.periodo === periodoAtivo ? '#0D0F14' : '#9a9c9f', fontWeight: l.periodo === periodoAtivo ? 700 : 400, textAlign: 'center' }}>{l.label}</span>
            </div>
          )})}
        </div>

        {/* Pacotes do período selecionado */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #E8E8E2' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Pacotes vendidos (competência) {linhaAtiva ? `· ${linhaAtiva.label}` : ''} <span style={{ fontWeight: 400, color: '#9a9c9f', fontSize: 11 }}>(barra = peso no faturamento do período · clique pra ver os clientes)</span></div>
          {pacotesAtivos.length === 0 && <div style={{ fontSize: 13, color: '#9a9c9f' }}>Nenhum pacote vendido nesse período.</div>}
          {pacotesAtivos.map(p => (
            <div key={p.pacote} style={{ marginBottom: 8 }}>
              <div onClick={() => setPacoteAberto(pacoteAberto === p.pacote ? null : p.pacote)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: 10, color: '#9a9c9f', width: 12, flexShrink: 0 }}>{pacoteAberto === p.pacote ? '▾' : '▸'}</span>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#3a3c3f', width: 150, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pacote}</div>
                <div style={{ flex: 1, height: 22, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max((p.receita/maxPacoteReceita)*100,5)}%`, background: '#7d5ac9', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{p.pctFaturamento}%</div>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#5a5c5f', width: 55, textAlign: 'right', flexShrink: 0 }}>{p.qtd}x</div>
                <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#5a5c5f', width: 90, textAlign: 'right', flexShrink: 0 }}>{fmtBRLCompacto(p.receita)}</div>
                <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#9a9c9f', width: 80, textAlign: 'right', flexShrink: 0 }}>tkt {fmtBRLCompacto(p.ticketMedio)}</div>
              </div>
              {pacoteAberto === p.pacote && (
                <div style={{ marginLeft: 22, marginTop: 6, marginBottom: 4, background: '#FAFAF8', border: '0.5px solid #E8E8E2', borderRadius: 8, padding: '8px 12px' }}>
                  {p.clientes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0', borderBottom: i < p.clientes.length-1 ? '0.5px solid #F0F0EC' : 'none', fontSize: 12 }}>
                      <span style={{ color: '#3a3c3f', fontWeight: 500 }}>{c.empresa || 'Não informado'}</span>
                      <span style={{ color: '#9a9c9f', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{c.data_evento ? c.data_evento.substring(8,10)+'/'+c.data_evento.substring(5,7) : '—'} · {fmtBRLCompacto(parseFloat(String(c.valor))||0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OnePage({ filtros }: { filtros: any }) {
  // Usa o MESMO filtro de ano/mês que já existe no topo do dashboard —
  // sem seletor duplicado aqui. Se "Todos os meses" estiver selecionado lá em
  // cima, cai no mês corrente de verdade (a onepage sempre mostra um mês só).
  // A comparação anual nunca antecipa competência futura. Em 2026 mostra
  // somente 2026 x 2025; 2027 só passa a entrar quando o próprio ano virar.
  const anoVigente = new Date().getFullYear()
  const anoSolicitado = Number(filtros?.ano) || anoVigente
  const anoRelatorio = Math.min(anoSolicitado, anoVigente)
  const filtrosRelatorio = { ...filtros, ano: String(anoRelatorio) }
  const mesFiltro = filtros?.mes ? `${anoRelatorio}-${String(filtros.mes).padStart(2,'0')}` : `${anoRelatorio}-${hojeYm().split('-')[1]}`
  const { dados, loading, erro } = useOnePage(filtrosRelatorio, mesFiltro)

  const nomesMesesLong = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!dados || !dados.atual) return (
    <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>
      Resposta do servidor incompleta — provavelmente o Apps Script precisa de uma nova versão do deployment.
    </div>
  )

  const { atual, mesAnterior, anoAnterior, anos, funil, meta, tendencia } = dados
  const nomeMesAtual = nomesMesesLong[parseInt(atual.mes.split('-')[1])-1]

  const maxFunil = Math.max(...funil.map(f => f.count), 1)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Faturamento: competência x fechamento (destaque) ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #97A624' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Faturamento · Competência</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11', lineHeight: 1, marginBottom: 8 }}>{fmtBRLCompacto(atual.receitaCompetencia)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <DeltaTag atual={atual.receitaCompetencia} ant={mesAnterior.receitaCompetencia} label="vs mês ant." />
            <DeltaTag atual={atual.receitaCompetencia} ant={anoAnterior.receitaCompetencia} label="vs ano ant." />
          </div>
          {tendencia.ehMesCorrente ? (
            <div style={{ fontSize: 11, color: '#9a9c9f' }}>Tendência do mês: <strong style={{ color: '#3B6D11' }}>{fmtBRLCompacto(tendencia.projecaoCompetencia)}</strong></div>
          ) : (
            <div style={{ fontSize: 11, color: '#9a9c9f' }}>Eventos que acontecem em {nomeMesAtual.toLowerCase()}</div>
          )}
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Faturamento · Fechamento</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#185FA5', lineHeight: 1, marginBottom: 8 }}>{fmtBRLCompacto(atual.receitaFechamento)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <DeltaTag atual={atual.receitaFechamento} ant={mesAnterior.receitaFechamento} label="vs mês ant." />
            <DeltaTag atual={atual.receitaFechamento} ant={anoAnterior.receitaFechamento} label="vs ano ant." />
          </div>
          {tendencia.ehMesCorrente && (
            <div style={{ fontSize: 11, color: '#9a9c9f' }}>Tendência do mês: <strong style={{ color: '#185FA5' }}>{fmtBRLCompacto(tendencia.projecaoFechamento)}</strong></div>
          )}
        </div>
      </div>


      {/* ── KPIs principais ────────────────────────────────── */}
      {!tendencia.ehMesCorrente ? null : (
        <div style={{ fontSize: 11, color: '#9a9c9f' }}>
          Comparações "vs mês/ano anterior" usam do dia 01 até hoje (dia {tendencia.diasComparacao}) desses períodos, pra comparar com o mesmo tanto de dias que já passou este mês.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #97A624' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Leads</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', lineHeight: 1, marginBottom: 6 }}>{atual.leads}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.leads} ant={mesAnterior.leads} label="mês ant." />
            <DeltaTag atual={atual.leads} ant={anoAnterior.leads} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #3B6D11' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Conversões</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11', lineHeight: 1, marginBottom: 6 }}>{atual.won}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.won} ant={mesAnterior.won} label="mês ant." />
            <DeltaTag atual={atual.won} ant={anoAnterior.won} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Taxa de conversão</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#185FA5', lineHeight: 1, marginBottom: 6 }}>{atual.taxaConversao}%</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.taxaConversao} ant={mesAnterior.taxaConversao} label="mês ant." />
            <DeltaTag atual={atual.taxaConversao} ant={anoAnterior.taxaConversao} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #D9B504' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Pax (pessoas)</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#8a7405', lineHeight: 1, marginBottom: 6 }}>{atual.pax}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.pax} ant={mesAnterior.pax} label="mês ant." />
            <DeltaTag atual={atual.pax} ant={anoAnterior.pax} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #c9855a' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Ticket médio (fechamento)</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#a05a2c', lineHeight: 1, marginBottom: 6 }}>{fmtBRLCompacto(atual.ticketMedio)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.ticketMedio} ant={mesAnterior.ticketMedio} label="mês ant." />
            <DeltaTag atual={atual.ticketMedio} ant={anoAnterior.ticketMedio} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #3B6D11' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Ticket médio (competência)</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11', lineHeight: 1, marginBottom: 6 }}>{fmtBRLCompacto(atual.ticketMedioCompetencia)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.ticketMedioCompetencia} ant={mesAnterior.ticketMedioCompetencia} label="mês ant." />
            <DeltaTag atual={atual.ticketMedioCompetencia} ant={anoAnterior.ticketMedioCompetencia} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #7d5ac9' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Ticket médio / pax</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#5a3ea3', lineHeight: 1, marginBottom: 6 }}>{fmtBRLCompacto(atual.ticketMedioPax)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.ticketMedioPax} ant={mesAnterior.ticketMedioPax} label="mês ant." />
            <DeltaTag atual={atual.ticketMedioPax} ant={anoAnterior.ticketMedioPax} label="ano ant." />
          </div>
        </div>
      </div>

      {/* ── Meta do mês (faixas) + tendência ───────────────── */}
      {meta && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Meta de faturamento (competência) · {nomeMesAtual}</span>
            <span style={{ fontSize: 12, color: '#9a9c9f' }}>Fechado até agora: <strong style={{ color: '#0D0F14' }}>{fmtBRLCompacto(meta.atingido)}</strong></span>
          </div>
          <div style={{ position: 'relative', height: 28, background: '#F5F5F2', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(meta.percentualFaixa3, 100)}%`,
              background: meta.faixaAtual >= 3 ? '#3B6D11' : meta.faixaAtual === 2 ? '#97A624' : meta.faixaAtual === 1 ? '#D9B504' : '#c9855a',
              borderRadius: 8, transition: 'width 0.5s',
            }} />
            {!meta.mesFechado && meta.projecao > meta.atingido && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(meta.percentualFaixa3, 100)}%`, width: `${Math.max(Math.min(meta.percentualProjecaoFaixa3, 100) - Math.min(meta.percentualFaixa3, 100), 0)}%`, background: 'repeating-linear-gradient(45deg, #d8d8d0, #d8d8d0 4px, #ececE6 4px, #ececE6 8px)' }} />
            )}
            {[meta.faixa1, meta.faixa2].map((f, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min((f/meta.faixa3)*100, 100)}%`, width: 2, background: '#fff' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#9a9c9f' }}>
            <span>Faixa 1: {fmtBRLCompacto(meta.faixa1)}</span>
            <span>Faixa 2: {fmtBRLCompacto(meta.faixa2)}</span>
            <span>Faixa 3: {fmtBRLCompacto(meta.faixa3)}</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: meta.faixaAtual > 0 ? '#3B6D11' : '#9a9c9f' }}>
              {meta.faixaAtual > 0 ? `Faixa ${meta.faixaAtual} atingida · ${meta.percentualFaixa3}% da faixa 3` : `${meta.percentualFaixa1}% do caminho até a Faixa 1`}
            </span>
            {!meta.mesFechado && (
              <span style={{ fontSize: 12, color: '#9a9c9f' }}>
                Tendência no ritmo atual: <strong style={{ color: '#0D0F14' }}>{fmtBRLCompacto(meta.projecao)}</strong> ({meta.percentualProjecaoFaixa3}% da faixa 3)
              </span>
            )}
          </div>
        </div>
      )}
      {!meta && (
        <div style={{ background: '#fff', border: '0.5px dashed #E8E8E2', borderRadius: 14, padding: '14px 18px', fontSize: 12, color: '#9a9c9f' }}>
          Sem meta cadastrada pra {nomeMesAtual} — adicione uma linha na aba <code>metas_b2b_mensal</code>.
        </div>
      )}

      {/* ── Faturamento por Competência: ano atual x ano anterior ── */}
      <GraficoAnual
        titulo={`Faturamento por Competência · ${anos.atual.ano} x ${anos.anterior.ano}`}
        campo="receitaCompetencia"
        anos={anos}
        corAtual="#3B6D11"
        corAnterior="#c3d89a"
        mesAtualNum={parseInt(atual.mes.split('-')[1])}
        filtros={filtros}
      />

      {/* ── Faturamento por Fechamento: ano atual x ano anterior ─── */}
      <GraficoAnual
        titulo={`Faturamento por Fechamento · ${anos.atual.ano} x ${anos.anterior.ano}`}
        campo="receitaFechamento"
        anos={anos}
        corAtual="#185FA5"
        corAnterior="#a8c8e8"
        mesAtualNum={parseInt(atual.mes.split('-')[1])}
        filtros={filtros}
      />

      {/* ── Leads, conversão e ticket médio (com pacotes), granularidade ── */}
      <PainelDesempenho filtros={filtros} mesFiltro={mesFiltro} />

      {/* ── Funil ──────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Funil (aberto agora)</div>
        {funil.length === 0 && <div style={{ fontSize: 13, color: '#9a9c9f' }}>Sem deals em aberto no filtro atual.</div>}
        {funil.map(f => (
          <div key={f.etapa} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#3a3c3f', width: 125, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.etapa}</div>
            <div style={{ flex: 1, height: 26, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max((f.count/maxFunil)*100,5)}%`, background: '#97A624', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{f.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
