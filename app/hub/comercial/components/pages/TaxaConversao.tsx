'use client'

import { useState, useEffect } from 'react'

const GAS_URL = '/api/pipedrive'

// ─── Helpers ─────────────────────────────────────────────────
function fmtBRL(v: number) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtDate(s: string) {
  if (!s || s.length < 10) return s
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}
function corTaxa(t: number) {
  if (t >= 25) return '#3B6D11'
  if (t >= 12) return '#D9B504'
  return '#A32D2D'
}
function nomeMes(ym: string) {
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [y, m] = ym.split('-')
  return `${meses[parseInt(m)-1]}/${y?.slice(2)}`
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

type Linha = {
  periodo: string
  label: string
  leads: number
  fechados: number
  taxa: number
  receita: number
  deals: Deal[]
}

type Deal = {
  empresa: string; data_evento: string; vendedor: string
  unidade_nome: string; valor: number; qtd_pessoas: any
  cardapio_nome: string; won_time: string; add_time: string
  status: string; stage_nome: string
}

type Kpi = { leads: number; fechados: number; taxa: number; receita: number }
type Dados = {
  mensal: Linha[]; semanal: Linha[]; diario: Linha[]
  kpis: { hoje: Kpi; semana: Kpi; mes: Kpi }
}

// ─── Export CSV com detalhes dos deals ───────────────────────
function exportarCSV(linhas: Linha[], titulo: string) {
  const headers = ['Período','Empresa','Data Evento','Vendedor','Unidade','Valor (R$)','Pax','Cardápio']
  const rows: any[][] = []
  linhas.forEach(l => {
    if (l.deals && l.deals.length > 0) {
      l.deals.forEach(d => {
        rows.push([
          l.label,
          d.empresa,
          fmtDate(d.data_evento),
          d.vendedor,
          d.unidade_nome,
          d.valor || '',
          d.qtd_pessoas || '',
          d.cardapio_nome,
        ])
      })
    } else {
      rows.push([l.label, '', '', '', '', '', '', ''])
    }
  })
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `conversao_${titulo.toLowerCase().replace(/ /g,'_')}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Export PDF ───────────────────────────────────────────────
function exportarPDF(linhas: Linha[], titulo: string, kpis: Dados['kpis']) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1a1a1a;font-size:13px}
  h1{font-size:20px;margin-bottom:2px}
  h2{font-size:13px;color:#666;margin-bottom:20px;font-weight:normal}
  .kpis{display:flex;gap:16px;margin-bottom:24px}
  .kpi{flex:1;background:#f5f5f2;border-radius:8px;padding:14px 16px;border-top:3px solid #97A624}
  .kpi-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .kpi-value{font-size:32px;font-weight:800}
  .kpi-sub{font-size:12px;color:#555;margin-top:3px}
  table{width:100%;border-collapse:collapse}
  th{background:#0D0F14;color:#97A624;padding:8px 10px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.05em}
  td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px}
  tr:nth-child(even) td{background:#fafaf8}
  .taxa{font-weight:700}
  .footer{margin-top:20px;font-size:10px;color:#aaa}
  @media print{body{padding:0}}
</style></head><body>
<h1>Quintal do Espeto — Taxa de Conversão</h1>
<h2>${titulo} · ${new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</h2>
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Hoje</div><div class="kpi-value" style="color:${corTaxa(kpis.hoje.taxa)}">${kpis.hoje.taxa}%</div><div class="kpi-sub">${kpis.hoje.fechados} de ${kpis.hoje.leads} leads</div></div>
  <div class="kpi"><div class="kpi-label">Esta semana</div><div class="kpi-value" style="color:${corTaxa(kpis.semana.taxa)}">${kpis.semana.taxa}%</div><div class="kpi-sub">${kpis.semana.fechados} de ${kpis.semana.leads} leads</div></div>
  <div class="kpi"><div class="kpi-label">Este mês</div><div class="kpi-value" style="color:${corTaxa(kpis.mes.taxa)}">${kpis.mes.taxa}%</div><div class="kpi-sub">${kpis.mes.fechados} de ${kpis.mes.leads} leads</div></div>
</div>
<table><thead><tr><th>Período</th><th>Leads</th><th>Fechados</th><th>Taxa</th><th>Receita</th></tr></thead>
<tbody>${linhas.map(l=>`<tr>
  <td>${l.label}</td><td>${l.leads}</td><td>${l.fechados}</td>
  <td class="taxa" style="color:${corTaxa(l.taxa)}">${l.taxa}%</td>
  <td>${fmtBRL(l.receita)}</td>
</tr>`).join('')}</tbody></table>
<div class="footer">Gerado pelo Quintal HUB · Taxa = fechados ÷ leads do período</div>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus()
  setTimeout(() => w.print(), 400)
}

// ─── Componente principal ─────────────────────────────────────
export default function TaxaConversao({ filtros }: { filtros: any }) {
  const hoje   = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`

  // Filtro de mês — padrão = mês atual
  const [mesSel, setMesSel] = useState(mesAtual)
  const [dados, setDados]   = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]     = useState<string | null>(null)
  const [aba, setAba]       = useState<'mensal'|'semanal'|'diario'>('mensal')
  const [expandido, setExpandido] = useState<string | null>(null)

  // Gera opções dos últimos 18 meses
  const meses = Array.from({ length: 18 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  useEffect(() => {
    setLoading(true); setErro(null); setExpandido(null)
    const p = new URLSearchParams({ tipo: 'taxa_conversao' })
    if (mesSel)           p.set('mes_filtro', mesSel)
    if (filtros.unidade)  p.set('unidade',    filtros.unidade)
    if (filtros.vendedor) p.set('vendedor',   filtros.vendedor)

    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(d => { if (d.erro) throw new Error(d.erro); setDados(d) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSel, filtros.unidade, filtros.vendedor])

  const linhas: Linha[] = dados ? dados[aba] : []
  const tituloAba = aba === 'mensal' ? 'Mensal' : aba === 'semanal' ? 'Semanal' : 'Diário'

  return (
    <div style={{ padding: '20px' }}>

      {/* KPIs grandes */}
      {dados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'HOJE',        data: dados.kpis.hoje,   color: '#0D0F14' },
            { label: 'ESTA SEMANA', data: dados.kpis.semana, color: '#185FA5' },
            { label: 'ESTE MÊS',    data: dados.kpis.mes,    color: '#97A624' },
          ].map(({ label, data, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E8E8E2', padding: '22px 24px', borderTop: `4px solid ${color}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
              <div style={{ fontSize: 52, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: corTaxa(data.taxa), lineHeight: 1 }}>{data.taxa}%</div>
              <div style={{ fontSize: 14, color: '#5a5c5f', marginTop: 10 }}>
                <strong style={{ color: '#0D0F14', fontSize: 16 }}>{data.fechados}</strong>
                <span> fechados de </span>
                <strong style={{ color: '#0D0F14', fontSize: 16 }}>{data.leads}</strong>
                <span> leads</span>
              </div>
              {data.receita > 0 && (
                <div style={{ fontSize: 13, color: '#3B6D11', fontWeight: 600, marginTop: 6 }}>{fmtBRL(data.receita)}</div>
              )}
              <div style={{ marginTop: 12, height: 8, background: '#F5F5F2', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(data.taxa, 100)}%`, background: corTaxa(data.taxa), borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Seletor de mês */}
        <select value={mesSel} onChange={e => setMesSel(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 13, fontWeight: 500, background: '#fff', cursor: 'pointer' }}>
          {meses.map(m => (
            <option key={m} value={m}>{nomeMes(m)}{m === mesAtual ? ' (atual)' : ''}</option>
          ))}
        </select>

        {/* Toggle diário/semanal/mensal */}
        <div style={{ display: 'flex', gap: 2, background: '#F5F5F2', padding: 3, borderRadius: 9, marginLeft: 'auto' }}>
          {(['mensal','semanal','diario'] as const).map(v => (
            <button key={v} onClick={() => setAba(v)}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: aba === v ? '#0D0F14' : 'transparent',
                color:      aba === v ? '#97A624'  : '#5a5c5f' }}>
              {v === 'mensal' ? 'Mensal' : v === 'semanal' ? 'Semanal' : 'Diário'}
            </button>
          ))}
        </div>

        {/* Exportar */}
        {dados && linhas.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => exportarCSV(linhas, tituloAba)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#5a5c5f' }}>
              ↓ Excel
            </button>
            <button onClick={() => exportarPDF(linhas, tituloAba, dados.kpis)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#0D0F14', color: '#97A624', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              🖨 PDF
            </button>
          </div>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#9a9c9f', padding: 60 }}>Carregando...</div>}
      {erro && <div style={{ padding: '12px 16px', background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>}

      {/* Tabela limpa */}
      {!loading && !erro && linhas.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px 80px 90px 1fr 110px', gap: 12, padding: '12px 20px', background: '#0D0F14' }}>
            {['Período','Leads','Fechados','Taxa de conversão','Receita'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#97A624', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {linhas.map((l, i) => {
            const isExp = expandido === l.periodo
            const isAtual = l.periodo === mesAtual || l.periodo.startsWith(mesAtual)

            return (
              <div key={l.periodo}>
                {/* Linha principal */}
                <div onClick={() => setExpandido(isExp ? null : l.periodo)}
                  style={{ display: 'grid', gridTemplateColumns: '180px 80px 90px 1fr 110px', gap: 12, padding: '14px 20px', borderBottom: `0.5px solid ${isExp ? '#97A624' : '#F5F5F2'}`, alignItems: 'center', cursor: 'pointer', background: isAtual && i === 0 ? '#f0f4e0' : i % 2 === 0 ? '#fff' : '#FAFAF8', borderLeft: isAtual && i === 0 ? '3px solid #97A624' : '3px solid transparent' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f5f7ee')}
                  onMouseOut={e => (e.currentTarget.style.background = isAtual && i === 0 ? '#f0f4e0' : i % 2 === 0 ? '#fff' : '#FAFAF8')}>

                  {/* Período */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: isAtual && i === 0 ? 700 : 500 }}>
                      {l.label}
                      {isAtual && i === 0 && <span style={{ marginLeft: 6, fontSize: 10, background: '#97A624', color: '#fff', padding: '1px 6px', borderRadius: 20 }}>atual</span>}
                    </div>
                  </div>

                  {/* Leads */}
                  <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{l.leads}</span>

                  {/* Fechados */}
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{l.fechados}</span>

                  {/* Taxa — barra simples */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 10, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(l.taxa, 100)}%`, background: corTaxa(l.taxa), borderRadius: 5, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: corTaxa(l.taxa), width: 44, textAlign: 'right', flexShrink: 0 }}>{l.taxa}%</span>
                  </div>

                  {/* Receita */}
                  <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#3B6D11', fontWeight: 600 }}>{fmtBRL(l.receita)}</span>
                </div>

                {/* Expansão — lista dos deals fechados */}
                {isExp && l.deals && l.deals.length > 0 && (
                  <div style={{ background: '#f9fbf4', borderBottom: '0.5px solid #E8E8E2', padding: '8px 20px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      {l.fechados} eventos fechados neste período
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 90px 90px', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #E8E8E2', fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase' }}>
                      <span>Empresa</span><span>Data evento</span><span>Vendedor</span><span>Pax</span><span>Cardápio</span><span>Valor</span>
                    </div>
                    {l.deals.map((d, di) => (
                      <div key={di} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 90px 90px', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #F5F5F2', fontSize: 12, alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#5a5c5f' }}>{fmtDate(d.data_evento)}</span>
                        <span style={{ fontSize: 11, color: '#9a9c9f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.vendedor}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'center' }}>{d.qtd_pessoas || '—'}</span>
                        <span style={{ fontSize: 11, color: '#9a9c9f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.cardapio_nome || '—'}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#3B6D11', fontWeight: 600 }}>{fmtBRL(d.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isExp && (!l.deals || l.deals.length === 0) && (
                  <div style={{ padding: '12px 20px', background: '#f9fbf4', borderBottom: '0.5px solid #E8E8E2', fontSize: 12, color: '#9a9c9f' }}>
                    Nenhum evento fechado neste período
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && !erro && linhas.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 60, background: '#fff', borderRadius: 14, border: '0.5px solid #E8E8E2' }}>
          Nenhum dado encontrado
        </div>
      )}
    </div>
  )
}
