'use client'

import { useState } from 'react'
import { Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

const GAS_URL = '/api/pipedrive'

function fmtDate(s: string) { if(!s)return'—'; const p=s.split('T')[0].split('-'); if(p.length<3)return s; return`${p[2]}/${p[1]}/${p[0]}` }
function fmtBRL(v: any) { const n=parseFloat(String(v||0)); if(!n)return'—'; return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }
function toDateStr(d: Date) { return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

const today = new Date()
const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const PERIODOS = [
  { label: 'Ontem',           inicio: toDateStr(yesterday),   fim: toDateStr(yesterday) },
  { label: 'Esta semana',     inicio: toDateStr(new Date(Date.now()-6*86400000)), fim: toDateStr(today) },
  { label: 'Últimos 30 dias', inicio: toDateStr(new Date(Date.now()-29*86400000)), fim: toDateStr(today) },
  { label: 'Este mês',        inicio: toDateStr(firstOfMonth), fim: toDateStr(today) },
  { label: 'Personalizado',   inicio: '', fim: '' },
]

// Exporta Excel via SheetJS-like via CSV com BOM
function exportarExcel(deals: Deal[], inicio: string, fim: string) {
  const headers = ['Empresa','Contato','Unidade','Data Evento','Data Fechamento','Pax','Valor','Cardápio','Vendedor','Forma Pgto']
  const rows = deals.map(d => [
    d.empresa||d.titulo, d.contato, d.unidade_nome, fmtDate(d.data_evento),
    fmtDate(d.won_time), String(d.qtd_pessoas||''), String(d.valor||''),
    d.cardapio_nome, d.vendedor, d.forma_pgto_nome,
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `conversoes_${inicio}_${fim}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function Conversoes({ filtros }: { filtros: any }) {
  const [periodoIdx, setPeriodoIdx]   = useState(3)
  const [customInicio, setCustomInicio] = useState(toDateStr(firstOfMonth))
  const [customFim, setCustomFim]       = useState(toDateStr(today))
  const [deals, setDeals]             = useState<Deal[]>([])
  const [loading, setLoading]         = useState(false)
  const [erro, setErro]               = useState<string | null>(null)
  const [fetched, setFetched]         = useState(false)
  const [selected, setSelected]       = useState<Deal | null>(null)

  const isCustom = periodoIdx === 4
  const inicio   = isCustom ? customInicio : PERIODOS[periodoIdx].inicio
  const fim      = isCustom ? customFim    : PERIODOS[periodoIdx].fim

  function buscar() {
    if (!inicio || !fim) return
    setLoading(true); setErro(null); setFetched(false)
    const p = new URLSearchParams({ tipo: 'conversoes', dataInicio: inicio, dataFim: fim, limit: '1000' })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDeals(data.deals||[]); setFetched(true) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }

  // Agrupa por won_time
  const porDia: Record<string, Deal[]> = {}
  deals.forEach(d => { const dia=String(d.won_time||'').substring(0,10); if(!dia)return; if(!porDia[dia])porDia[dia]=[]; porDia[dia].push(d) })
  const dias = Object.keys(porDia).sort((a,b)=>b.localeCompare(a))

  const receitaTotal = deals.reduce((s,d)=>s+(parseFloat(String(d.valor||0))||0),0)
  const paxTotal     = deals.reduce((s,d)=>s+(parseInt(String(d.qtd_pessoas||'0').replace(/[^0-9]/g,''))||0),0)

  return (
    <div style={{ padding: '20px' }}>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODOS.map((p,i) => (
          <button key={i} onClick={() => setPeriodoIdx(i)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '0.5px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: periodoIdx===i ? '#0D0F14' : '#fff', color: periodoIdx===i ? '#97A624' : '#5a5c5f', borderColor: periodoIdx===i ? '#0D0F14' : '#E8E8E2' }}>
            {p.label}
          </button>
        ))}
        {isCustom && (
          <>
            <input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12 }} />
            <span style={{ fontSize: 12, color: '#9a9c9f' }}>até</span>
            <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12 }} />
          </>
        )}
        <button onClick={buscar} disabled={loading}
          style={{ padding: '6px 18px', borderRadius: 20, border: 'none', background: '#97A624', color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
        {fetched && deals.length > 0 && (
          <button onClick={() => exportarExcel(deals, inicio, fim)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '0.5px solid #E8E8E2', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#5a5c5f' }}>
            ↓ Exportar CSV
          </button>
        )}
      </div>

      {erro && <div style={{ padding: '10px 16px', background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13, marginBottom: 16 }}>Erro: {erro}</div>}

      {fetched && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Conversões', value: String(deals.length), sub: `${dias.length} dias`, color: '#3B6D11' },
              { label: 'Receita total', value: fmtBRL(receitaTotal), sub: 'no período', color: '#97A624' },
              { label: 'Ticket médio', value: fmtBRL(deals.length ? receitaTotal/deals.length : 0), color: '#185FA5' },
              { label: 'Total pax', value: paxTotal.toLocaleString('pt-BR'), sub: 'pessoas', color: '#D9B504' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                {k.sub && <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>{k.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dias.map(dia => (
              <div key={dia} style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#F5F5F2', borderBottom: '0.5px solid #E8E8E2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(dia)}</span>
                    <span style={{ fontSize: 11, color: '#9a9c9f' }}>{new Date(dia+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'})}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#3B6D11', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                      {fmtBRL(porDia[dia].reduce((s,d)=>s+(parseFloat(String(d.valor||0))||0),0))}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, background: '#3B6D11', color: '#fff', padding: '3px 12px', borderRadius: 20 }}>
                      {porDia[dia].length} fechados
                    </span>
                  </div>
                </div>
                <div style={{ padding: '4px 8px' }}>
                  {porDia[dia].map(d => {
                    const pax = parseInt(String(d.qtd_pessoas||'0').replace(/[^0-9]/g,''))||0
                    return (
                      <div key={d.id} onClick={() => setSelected(d)}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 110px 70px 100px 80px 80px', gap: 8, padding: '8px', borderRadius: 6, alignItems: 'center', fontSize: 12, borderBottom: '0.5px solid #F5F5F2', cursor: 'pointer' }}
                        onMouseOver={e=>(e.currentTarget.style.background='#F5F5F2')}
                        onMouseOut={e=>(e.currentTarget.style.background='')}>
                        <div>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa||d.titulo}</div>
                          <div style={{ fontSize: 10, color: '#9a9c9f' }}>{d.unidade_nome?.split(',')[0]||'—'}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#9a9c9f', fontFamily: 'DM Mono, monospace' }}>ev: {fmtDate(d.data_evento)}</span>
                        <span style={{ fontSize: 11, textAlign: 'center' }}>{pax ? `${pax} pax` : '—'}</span>
                        <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#3B6D11', fontWeight: 600 }}>{fmtBRL(d.valor)}</span>
                        <span style={{ fontSize: 10, color: '#9a9c9f' }}>{d.cardapio_nome||'—'}</span>
                        <span style={{ fontSize: 10, color: '#9a9c9f' }}>{d.vendedor||'—'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {deals.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 40, background: '#fff', borderRadius: 14, border: '0.5px solid #E8E8E2' }}>
                Nenhuma conversão no período
              </div>
            )}
          </div>
        </>
      )}

      {!fetched && !loading && (
        <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 60, background: '#fff', borderRadius: 14, border: '0.5px dashed #E8E8E2' }}>
          Selecione um período e clique em <strong>Buscar</strong>
        </div>
      )}
    </div>
  )
}
