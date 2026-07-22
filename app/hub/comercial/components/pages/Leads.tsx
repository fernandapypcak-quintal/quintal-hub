'use client'

import { useState } from 'react'
import { useLeadsDiarios, Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

function fmtDate(s: string) { if(!s)return'—'; const p=s.split('T')[0].split('-'); if(p.length<3)return s; return`${p[2]}/${p[1]}/${p[0]}` }
function toDateStr(d: Date) { return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function statusColor(s: string) { return s==='won'?'#97A624':s==='lost'?'#A32D2D':'#185FA5' }

const today     = new Date()
const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const PERIODOS = [
  { label: 'Ontem',           inicio: toDateStr(yesterday), fim: toDateStr(yesterday) },
  { label: 'Últimos 7 dias',  inicio: toDateStr(new Date(Date.now()-6*86400000)), fim: toDateStr(today) },
  { label: 'Últimos 30 dias', inicio: toDateStr(new Date(Date.now()-29*86400000)), fim: toDateStr(today) },
  { label: 'Este mês',        inicio: toDateStr(firstOfMonth), fim: toDateStr(today) },
  { label: 'Personalizado',   inicio: '', fim: '' },
]

function exportarCSV(leads: Deal[], inicio: string, fim: string) {
  const headers = ['Empresa','Etapa','Data Criação','Data Evento','Unidade','Vendedor','Status']
  const rows = leads.map(d => [d.empresa||d.titulo, d.stage_nome, fmtDate(d.add_time), fmtDate(d.data_evento), d.unidade_nome, d.vendedor, d.status])
  const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`leads_${inicio}_${fim}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function Leads({ filtros }: { filtros: any }) {
  const [periodoIdx, setPeriodoIdx]     = useState(0)
  const [customInicio, setCustomInicio] = useState(toDateStr(yesterday))
  const [customFim, setCustomFim]       = useState(toDateStr(today))
  const [selected, setSelected]         = useState<Deal | null>(null)

  const isCustom = periodoIdx === 4
  const inicio   = isCustom ? customInicio : PERIODOS[periodoIdx].inicio
  const fim      = isCustom ? customFim    : PERIODOS[periodoIdx].fim

  const { leads, loading, erro } = useLeadsDiarios(filtros, inicio, fim)

  // Agrupa por add_time
  const porDia: Record<string, Deal[]> = {}
  leads.forEach(d => { const dia=String(d.add_time||'').substring(0,10); if(!dia)return; if(!porDia[dia])porDia[dia]=[]; porDia[dia].push(d) })
  const dias = Object.keys(porDia).sort((a,b)=>b.localeCompare(a))

  const ontemStr    = toDateStr(yesterday)
  const ontemCount  = porDia[ontemStr]?.length || 0
  const mediaDiaria = dias.length ? (leads.length/dias.length).toFixed(1) : '0'
  const pico        = dias.length ? Math.max(...dias.map(d=>porDia[d].length)) : 0

  return (
    <div style={{ padding: '20px' }}>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODOS.map((p,i) => (
          <button key={i} onClick={() => setPeriodoIdx(i)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '0.5px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: periodoIdx===i ? '#0D0F14' : '#fff', color: periodoIdx===i ? '#97A624' : '#5a5c5f', borderColor: periodoIdx===i ? '#0D0F14' : '#E8E8E2' }}>
            {p.label}
          </button>
        ))}
        {isCustom && (
          <>
            <input type="date" value={customInicio} onChange={e=>setCustomInicio(e.target.value)}
              style={{ padding:'5px 10px',borderRadius:8,border:'0.5px solid #E8E8E2',fontSize:12 }} />
            <span style={{ fontSize:12,color:'#9a9c9f' }}>até</span>
            <input type="date" value={customFim} onChange={e=>setCustomFim(e.target.value)}
              style={{ padding:'5px 10px',borderRadius:8,border:'0.5px solid #E8E8E2',fontSize:12 }} />
          </>
        )}
        {leads.length > 0 && (
          <button onClick={() => exportarCSV(leads, inicio, fim)}
            style={{ padding:'6px 14px',borderRadius:20,border:'0.5px solid #E8E8E2',background:'#fff',fontSize:12,cursor:'pointer',color:'#5a5c5f',marginLeft:4 }}>
            ↓ Exportar CSV
          </button>
        )}
      </div>

      {erro && <div style={{ padding:'10px 16px',background:'#fdeaea',borderRadius:10,color:'#a32d2d',fontSize:13,marginBottom:16 }}>Erro: {erro}</div>}

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Ontem',        value:String(ontemCount), sub:fmtDate(ontemStr), color:'#0D0F14' },
          { label:'Total período',value:String(leads.length), sub:`${dias.length} dias`, color:'#97A624' },
          { label:'Média diária', value:mediaDiaria, sub:'leads/dia', color:'#185FA5' },
          { label:'Pico',         value:String(pico), sub:'maior dia', color:'#D9B504' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,padding:'14px 18px',borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:10,fontWeight:600,color:'#9a9c9f',textTransform:'uppercase',marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:26,fontWeight:600,fontFamily:'DM Mono, monospace' }}>{k.value}</div>
            <div style={{ fontSize:11,color:'#9a9c9f',marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center',color:'#9a9c9f',padding:40 }}>Carregando...</div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {dias.map(dia => {
            const isOntem = dia === ontemStr
            return (
              <div key={dia} style={{ background:'#fff',border:`0.5px solid ${isOntem?'#97A624':'#E8E8E2'}`,borderRadius:12,overflow:'hidden' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:isOntem?'#f0f4e0':'#F5F5F2',borderBottom:'0.5px solid #E8E8E2' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    {isOntem && <span style={{ fontSize:10,fontWeight:700,background:'#97A624',color:'#fff',padding:'2px 8px',borderRadius:20,textTransform:'uppercase' }}>Ontem</span>}
                    <span style={{ fontSize:13,fontWeight:700 }}>{fmtDate(dia)}</span>
                    <span style={{ fontSize:11,color:'#9a9c9f' }}>{new Date(dia+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'})}</span>
                  </div>
                  <span style={{ fontSize:12,fontWeight:600,fontFamily:'DM Mono, monospace',background:'#0D0F14',color:'#97A624',padding:'3px 12px',borderRadius:20 }}>
                    {porDia[dia].length} leads
                  </span>
                </div>
                <div style={{ padding:'4px 8px' }}>
                  {porDia[dia].map(d => (
                    <div key={d.id} onClick={() => setSelected(d)}
                      style={{ display:'grid',gridTemplateColumns:'1fr 130px 110px 70px',gap:10,padding:'8px',borderRadius:6,alignItems:'center',fontSize:12,borderBottom:'0.5px solid #F5F5F2',cursor:'pointer' }}
                      onMouseOver={e=>(e.currentTarget.style.background='#F5F5F2')}
                      onMouseOut={e=>(e.currentTarget.style.background='')}>
                      <div>
                        <div style={{ fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.empresa||d.titulo}</div>
                        <div style={{ fontSize:10,color:'#9a9c9f',marginTop:1 }}>{d.stage_nome}</div>
                      </div>
                      <span style={{ fontSize:11,color:'#9a9c9f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.unidade_nome||'—'}</span>
                      <span style={{ fontFamily:'DM Mono, monospace',fontSize:11,color:'#9a9c9f' }}>ev: {fmtDate(d.data_evento)}</span>
                      <span style={{ fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:statusColor(d.status)+'22',color:statusColor(d.status) }}>
                        {d.status==='won'?'Ganho':d.status==='lost'?'Perdido':'Aberto'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {dias.length===0 && !loading && (
            <div style={{ textAlign:'center',color:'#9a9c9f',fontSize:13,padding:40,background:'#fff',borderRadius:14,border:'0.5px solid #E8E8E2' }}>
              Nenhum lead no período
            </div>
          )}
        </div>
      )}
    </div>
  )
}
