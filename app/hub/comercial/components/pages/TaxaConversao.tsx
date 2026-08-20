'use client'

import { useState, useEffect } from 'react'

const GAS_URL = '/api/pipedrive'

function fmtBRL(v: number) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtDate(s: string) {
  if (!s || s.length < 10) return s
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function corTaxa(taxa: number) {
  if (taxa >= 30) return '#3B6D11'
  if (taxa >= 15) return '#D9B504'
  return '#A32D2D'
}

type Linha = {
  periodo: string; de?: string; ate?: string
  leads: number; fechados: number; taxa: number; receita: number
  cohort_leads: number; cohort_fechados: number; cohort_taxa: number; cohort_receita: number
}

type Dados = {
  diario: Linha[]; semanal: Linha[]; mensal: Linha[]
  kpis: {
    hoje:   { leads: number; fechados: number; taxa: number; receita: number }
    semana: { leads: number; fechados: number; taxa: number; receita: number }
    mes:    { leads: number; fechados: number; taxa: number; receita: number }
  }
}

// Exporta CSV
function exportarCSV(linhas: Linha[], titulo: string) {
  const h = ['Período','De','Até','Leads','Fechados','Taxa Conv. %','Receita','Cohort Leads','Cohort Fechados','Cohort Taxa %','Cohort Receita']
  const rows = linhas.map(l => [
    l.periodo, fmtDate(l.de||''), fmtDate(l.ate||''),
    l.leads, l.fechados, l.taxa, l.receita,
    l.cohort_leads, l.cohort_fechados, l.cohort_taxa, l.cohort_receita,
  ])
  const csv = [h, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `conversao_${titulo}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// Exporta PDF via print
function exportarPDF(linhas: Linha[], titulo: string, kpis: Dados['kpis']) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; font-size: 13px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 15px; color: #555; margin-bottom: 24px; font-weight: normal; }
  .kpis { display: flex; gap: 24px; margin-bottom: 32px; }
  .kpi { background: #f5f5f2; border-radius: 10px; padding: 16px 20px; flex: 1; border-top: 3px solid #97A624; }
  .kpi-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .kpi-value { font-size: 28px; font-weight: 700; }
  .kpi-sub { font-size: 12px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #0D0F14; color: #97A624; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
  tr:nth-child(even) td { background: #fafaf8; }
  .taxa { font-weight: 700; }
  .footer { margin-top: 32px; font-size: 11px; color: #aaa; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Quintal do Espeto — Taxa de Conversão</h1>
<h2>${titulo} · Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</h2>

<div class="kpis">
  <div class="kpi">
    <div class="kpi-label">Hoje</div>
    <div class="kpi-value">${kpis.hoje.taxa}%</div>
    <div class="kpi-sub">${kpis.hoje.fechados} de ${kpis.hoje.leads} leads</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Esta semana</div>
    <div class="kpi-value">${kpis.semana.taxa}%</div>
    <div class="kpi-sub">${kpis.semana.fechados} de ${kpis.semana.leads} leads</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Este mês</div>
    <div class="kpi-value">${kpis.mes.taxa}%</div>
    <div class="kpi-sub">${kpis.mes.fechados} de ${kpis.mes.leads} leads</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Período</th>
      <th>Leads</th>
      <th>Fechados</th>
      <th>Taxa (simples)</th>
      <th>Taxa (cohort)</th>
      <th>Receita</th>
    </tr>
  </thead>
  <tbody>
    ${linhas.map(l => `
    <tr>
      <td>${l.periodo}</td>
      <td>${l.leads}</td>
      <td>${l.fechados}</td>
      <td class="taxa" style="color:${corTaxa(l.taxa)}">${l.taxa}%</td>
      <td class="taxa" style="color:${corTaxa(l.cohort_taxa)}">${l.cohort_taxa}%</td>
      <td>${fmtBRL(l.receita)}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="footer">
  Simples = fechados ÷ leads do mesmo período &nbsp;|&nbsp;
  Cohort = dos leads que entraram, quantos fecharam (qualquer data)
</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 500)
}

// Barra visual de taxa
function TaxaBar({ taxa, cohort }: { taxa: number; cohort: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 6, background: '#F5F5F2', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(taxa, 100)}%`, background: corTaxa(taxa), borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: corTaxa(taxa), width: 40, textAlign: 'right' }}>{taxa}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 4, background: '#F5F5F2', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(cohort, 100)}%`, background: corTaxa(cohort) + '88', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, color: '#9a9c9f', width: 40, textAlign: 'right' }}>{cohort}%</span>
      </div>
    </div>
  )
}

export default function TaxaConversao({ filtros }: { filtros: any }) {
  const [dados, setDados]   = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]     = useState<string | null>(null)
  const [visao, setVisao]   = useState<'diario' | 'semanal' | 'mensal'>('mensal')

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'taxa_conversao' })
    if (filtros.ano)      p.set('ano',      filtros.ano)
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)

    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(d => { if (d.erro) throw new Error(d.erro); setDados(d) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.ano, filtros.unidade, filtros.vendedor])

  const linhas: Linha[] = dados ? dados[visao] : []
  const tituloVisao = visao === 'diario' ? 'Diário' : visao === 'semanal' ? 'Semanal' : 'Mensal'

  return (
    <div style={{ padding: '20px' }}>

      {/* KPIs grandes — fáceis de ler */}
      {dados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'HOJE', data: dados.kpis.hoje, color: '#0D0F14' },
            { label: 'ESTA SEMANA', data: dados.kpis.semana, color: '#185FA5' },
            { label: 'ESTE MÊS', data: dados.kpis.mes, color: '#97A624' },
          ].map(({ label, data, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E8E8E2', padding: '24px', borderTop: `4px solid ${color}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{label}</div>
              <div style={{ fontSize: 48, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: corTaxa(data.taxa), lineHeight: 1 }}>{data.taxa}%</div>
              <div style={{ fontSize: 13, color: '#5a5c5f', marginTop: 10 }}>
                <strong style={{ color: '#0D0F14' }}>{data.fechados}</strong> fechados de <strong style={{ color: '#0D0F14' }}>{data.leads}</strong> leads
              </div>
              {data.receita > 0 && (
                <div style={{ fontSize: 13, color: '#3B6D11', fontWeight: 600, marginTop: 4 }}>{fmtBRL(data.receita)}</div>
              )}
              {/* Barra simples */}
              <div style={{ marginTop: 12, height: 8, background: '#F5F5F2', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(data.taxa, 100)}%`, background: corTaxa(data.taxa), borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legenda simples + cohort */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#5a5c5f' }}>
            <span style={{ width: 16, height: 6, borderRadius: 3, background: '#97A624', display: 'inline-block' }} />
            Taxa simples (mesmo período)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9a9c9f' }}>
            <span style={{ width: 16, height: 4, borderRadius: 3, background: '#97A62488', display: 'inline-block' }} />
            Cohort (fechou qualquer data)
          </span>
        </div>

        {/* Seletor de visão */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', background: '#F5F5F2', padding: 4, borderRadius: 10 }}>
          {(['mensal', 'semanal', 'diario'] as const).map(v => (
            <button key={v} onClick={() => setVisao(v)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: visao === v ? '#0D0F14' : 'transparent',
                color: visao === v ? '#97A624' : '#5a5c5f' }}>
              {v === 'mensal' ? 'Mensal' : v === 'semanal' ? 'Semanal' : 'Diário'}
            </button>
          ))}
        </div>

        {/* Exportar */}
        {dados && linhas.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => exportarCSV(linhas, tituloVisao)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#5a5c5f' }}>
              ↓ Excel/CSV
            </button>
            <button onClick={() => exportarPDF(linhas, tituloVisao, dados.kpis)}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#0D0F14', color: '#97A624', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              🖨 Imprimir / PDF
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      {loading && <div style={{ textAlign: 'center', color: '#9a9c9f', padding: 60 }}>Carregando...</div>}
      {erro && <div style={{ padding: '12px 16px', background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>}

      {!loading && !erro && linhas.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 70px 80px 1fr 70px', gap: 12, padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#0D0F14' }}>
            <span style={{ color: '#97A624' }}>Período</span>
            <span style={{ color: '#97A624' }}>Leads</span>
            <span style={{ color: '#97A624' }}>Fechados</span>
            <span style={{ color: '#97A624' }}>Taxa de conversão</span>
            <span style={{ color: '#97A624' }}>Receita</span>
          </div>

          {linhas.slice(0, 60).map((l, i) => {
            const labelPeriodo = visao === 'semanal'
              ? `${fmtDate(l.de||'')} → ${fmtDate(l.ate||'')}`
              : visao === 'diario' ? fmtDate(l.periodo) : l.periodo
            const isDestaque = i === 0

            return (
              <div key={l.periodo} style={{ display: 'grid', gridTemplateColumns: '160px 70px 80px 1fr 70px', gap: 12, padding: '12px 16px', borderBottom: '0.5px solid #F5F5F2', alignItems: 'center', background: isDestaque ? '#f0f4e0' : i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: isDestaque ? 700 : 500 }}>{labelPeriodo}</div>
                  {visao === 'semanal' && l.de && (
                    <div style={{ fontSize: 10, color: '#9a9c9f' }}>{l.periodo}</div>
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{l.leads}</span>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{l.fechados}</span>
                  {l.cohort_fechados !== l.fechados && (
                    <span style={{ fontSize: 10, color: '#9a9c9f', marginLeft: 4 }}>({l.cohort_fechados} cohort)</span>
                  )}
                </div>
                <TaxaBar taxa={l.taxa} cohort={l.cohort_taxa} />
                <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRL(l.receita)}</span>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !erro && linhas.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 60, background: '#fff', borderRadius: 14, border: '0.5px solid #E8E8E2' }}>
          Nenhum dado encontrado para o período
        </div>
      )}
    </div>
  )
}
