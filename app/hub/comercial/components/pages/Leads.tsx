'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLeadsDiarios, Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

const GAS_URL      = '/api/pipedrive'
const LIVE_URL     = '/api/pipedrive-live'

function fmtDate(s: string) {
  if (!s) return '—'
  const p = s.split('T')[0].split('-')
  if (p.length < 3) return s
  return `${p[2]}/${p[1]}/${p[0]}`
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function statusColor(s: string) { return s==='won'?'#97A624':s==='lost'?'#A32D2D':'#185FA5' }
function statusLabel(s: string) { return s==='won'?'Ganho':s==='lost'?'Perdido':'Aberto' }

const today        = new Date()
const yesterday    = new Date(today); yesterday.setDate(today.getDate()-1)
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

// ─── ABA HOJE (tempo real) ────────────────────────────────────
function LeadsHoje({ filtros }: { filtros: any }) {
  const [deals, setDeals]        = useState<Deal[]>([])
  const [loading, setLoading]    = useState(true)
  const [erro, setErro]          = useState<string | null>(null)
  const [ultimaAtual, setUltima] = useState<string>('')
  const [selected, setSelected]  = useState<Deal | null>(null)
  const [pausado, setPausado]    = useState(false)
  const [contador, setContador]  = useState(120)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const INTERVALO = 120

  const buscar = useCallback(() => {
    setErro(null)
    const p = new URLSearchParams()
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${LIVE_URL}?${p}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setDeals(data.deals || [])
        setUltima(data.atualizado_em || new Date().toLocaleTimeString('pt-BR'))
        setContador(INTERVALO)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [filtros.unidade, filtros.vendedor])

  useEffect(() => { buscar() }, [buscar])

  useEffect(() => {
    if (pausado) return
    timerRef.current = setInterval(() => {
      setContador(c => { if (c <= 1) { buscar(); return INTERVALO } return c - 1 })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [pausado, buscar])

  const pctContador = Math.round((contador / INTERVALO) * 100)

  return (
    <div>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      {/* Barra de status */}
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'10px 14px',background:'#fff',borderRadius:12,border:'0.5px solid #E8E8E2',flexWrap:'wrap' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <div style={{ width:8,height:8,borderRadius:'50%',background:pausado?'#9a9c9f':'#3B6D11' }} />
          <span style={{ fontSize:12,fontWeight:600,color:pausado?'#9a9c9f':'#3B6D11' }}>{pausado?'Pausado':'Ao vivo'}</span>
        </div>
        <div style={{ flex:1,minWidth:80,height:4,background:'#F5F5F2',borderRadius:2,overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${pctContador}%`,background:'#97A624',transition:'width 1s linear',borderRadius:2 }}/>
        </div>
        <span style={{ fontSize:11,color:'#9a9c9f' }}>próx. em {contador}s</span>
        {ultimaAtual && <span style={{ fontSize:11,color:'#9a9c9f' }}>última: {ultimaAtual}</span>}
        <button onClick={() => setPausado(p=>!p)}
          style={{ padding:'4px 12px',borderRadius:8,border:'0.5px solid #E8E8E2',background:'#fff',fontSize:11,cursor:'pointer',color:'#5a5c5f' }}>
          {pausado?'▶ Retomar':'⏸ Pausar'}
        </button>
        <button onClick={() => { setLoading(true); buscar() }}
          style={{ padding:'4px 12px',borderRadius:8,border:'none',background:'#97A624',color:'#fff',fontSize:11,cursor:'pointer',fontWeight:600 }}>
          ↻ Agora
        </button>
      </div>

      {erro && <div style={{ padding:'10px 14px',background:'#fdeaea',borderRadius:10,color:'#a32d2d',fontSize:13,marginBottom:12 }}>{erro}</div>}

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16 }}>
        {[
          { label:'Leads hoje', value:loading?'…':String(deals.length), sub:toDateStr(today), color:'#0D0F14' },
          { label:'Em aberto',  value:loading?'…':String(deals.filter(d=>d.status==='open').length), color:'#185FA5' },
          { label:'Ganhos',     value:loading?'…':String(deals.filter(d=>d.status==='won').length), color:'#3B6D11' },
          { label:'Por vendedor', value:loading?'…':String(new Set(deals.map(d=>d.vendedor).filter(Boolean)).size), sub:'vendedores ativos', color:'#D9B504' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:12,padding:'12px 14px',borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:10,fontWeight:600,color:'#9a9c9f',textTransform:'uppercase',marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:26,fontWeight:700,fontFamily:'DM Mono, monospace',color:k.color==='#3B6D11'?k.color:'#0D0F14' }}>{k.value}</div>
            {k.sub && <div style={{ fontSize:11,color:'#9a9c9f',marginTop:2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign:'center',color:'#9a9c9f',padding:40 }}>Buscando no Pipedrive...</div>
      ) : deals.length === 0 ? (
        <div style={{ textAlign:'center',color:'#9a9c9f',fontSize:13,padding:60,background:'#fff',borderRadius:14,border:'0.5px solid #E8E8E2' }}>
          Nenhum lead cadastrado hoje ainda
        </div>
      ) : (
        <div style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,overflow:'hidden' }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 140px 120px 100px 80px 70px',gap:8,padding:'10px 16px',fontSize:10,fontWeight:600,color:'#9a9c9f',textTransform:'uppercase',letterSpacing:'0.05em',background:'#F5F5F2' }}>
            <span>Empresa</span><span>Etapa</span><span>Unidade</span><span>Vendedor</span><span style={{textAlign:'center'}}>Pax</span><span>Status</span>
          </div>
          <div style={{ padding:'6px 8px' }}>
            {deals.map(d => (
              <div key={d.id} onClick={() => setSelected(d)}
                style={{ display:'grid',gridTemplateColumns:'1fr 140px 120px 100px 80px 70px',gap:8,padding:'9px 8px',borderRadius:6,alignItems:'center',fontSize:12,borderBottom:'0.5px solid #F5F5F2',cursor:'pointer' }}
                onMouseOver={e=>(e.currentTarget.style.background='#F5F5F2')}
                onMouseOut={e=>(e.currentTarget.style.background='')}>
                <div>
                  <div style={{ fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.empresa||d.titulo}</div>
                  {d.data_evento && <div style={{ fontSize:10,color:'#9a9c9f' }}>ev: {fmtDate(d.data_evento)}</div>}
                </div>
                <span style={{ fontSize:10,padding:'2px 7px',borderRadius:4,background:'#F5F5F2',color:'#5a5c5f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block',maxWidth:'100%' }}>{d.stage_nome}</span>
                <span style={{ fontSize:10,color:'#9a9c9f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.unidade_nome?.split(',')[0]||'—'}</span>
                <span style={{ fontSize:10,color:'#9a9c9f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.vendedor||'—'}</span>
                <span style={{ fontSize:11,fontFamily:'DM Mono, monospace',textAlign:'center',color:'#5a5c5f' }}>{d.qtd_pessoas||'—'}</span>
                <span style={{ fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,background:statusColor(d.status)+'22',color:statusColor(d.status),whiteSpace:'nowrap' }}>
                  {statusLabel(d.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ABA HISTÓRICO ────────────────────────────────────────────
function LeadsHistorico({ filtros }: { filtros: any }) {
  const [periodoIdx, setPeriodoIdx]     = useState(0)
  const [customInicio, setCustomInicio] = useState(toDateStr(yesterday))
  const [customFim, setCustomFim]       = useState(toDateStr(today))
  const [selected, setSelected]         = useState<Deal | null>(null)

  const isCustom = periodoIdx === 4
  const inicio   = isCustom ? customInicio : PERIODOS[periodoIdx].inicio
  const fim      = isCustom ? customFim    : PERIODOS[periodoIdx].fim

  const { leads, loading, erro } = useLeadsDiarios(filtros, inicio, fim)

  const porDia: Record<string, Deal[]> = {}
  leads.forEach(d => {
    const dia = String(d.add_time||'').substring(0,10)
    if (!dia) return
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(d)
  })
  const dias = Object.keys(porDia).sort((a,b)=>b.localeCompare(a))
  const ontemStr    = toDateStr(yesterday)
  const mediaDiaria = dias.length ? (leads.length/dias.length).toFixed(1) : '0'

  return (
    <div>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      <div style={{ display:'flex',gap:8,marginBottom:20,flexWrap:'wrap',alignItems:'center' }}>
        {PERIODOS.map((p,i) => (
          <button key={i} onClick={() => setPeriodoIdx(i)}
            style={{ padding:'6px 14px',borderRadius:20,border:'0.5px solid',fontSize:12,fontWeight:500,cursor:'pointer',
              background:periodoIdx===i?'#0D0F14':'#fff',color:periodoIdx===i?'#97A624':'#5a5c5f',borderColor:periodoIdx===i?'#0D0F14':'#E8E8E2' }}>
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

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Ontem',         value:String(porDia[ontemStr]?.length||0), sub:fmtDate(ontemStr), color:'#0D0F14' },
          { label:'Total período', value:String(leads.length), sub:`${dias.length} dias`, color:'#97A624' },
          { label:'Média diária',  value:mediaDiaria, sub:'leads/dia', color:'#185FA5' },
          { label:'Pico',          value:String(dias.length?Math.max(...dias.map(d=>porDia[d].length)):0), sub:'maior dia', color:'#D9B504' },
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
      ) : erro ? (
        <div style={{ padding:'10px 14px',background:'#fdeaea',borderRadius:10,color:'#a32d2d',fontSize:13 }}>{erro}</div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {dias.map(dia => {
            const isOntem = dia === ontemStr
            return (
              <div key={dia} style={{ background:'#fff',border:`0.5px solid ${isOntem?'#97A624':'#E8E8E2'}`,borderRadius:12,overflow:'hidden' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:isOntem?'#f0f4e0':'#F5F5F2',borderBottom:'0.5px solid #E8E8E2' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    {isOntem && <span style={{ fontSize:10,fontWeight:700,background:'#97A624',color:'#fff',padding:'2px 8px',borderRadius:20 }}>Ontem</span>}
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
                        <div style={{ fontSize:10,color:'#9a9c9f' }}>{d.stage_nome}</div>
                      </div>
                      <span style={{ fontSize:11,color:'#9a9c9f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.unidade_nome||'—'}</span>
                      <span style={{ fontFamily:'DM Mono, monospace',fontSize:11,color:'#9a9c9f' }}>ev: {fmtDate(d.data_evento)}</span>
                      <span style={{ fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:statusColor(d.status)+'22',color:statusColor(d.status) }}>
                        {statusLabel(d.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {dias.length===0 && (
            <div style={{ textAlign:'center',color:'#9a9c9f',fontSize:13,padding:40,background:'#fff',borderRadius:14,border:'0.5px solid #E8E8E2' }}>
              Nenhum lead no período
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PRINCIPAL ────────────────────────────────────────────────
export default function Leads({ filtros }: { filtros: any }) {
  const [aba, setAba] = useState<'hoje'|'historico'>('hoje')

  return (
    <div style={{ padding:'20px' }}>
      <div style={{ display:'flex',gap:4,marginBottom:20,background:'#F5F5F2',padding:4,borderRadius:10,width:'fit-content' }}>
        <button onClick={() => setAba('hoje')}
          style={{ padding:'7px 20px',borderRadius:8,border:'none',fontSize:13,fontWeight:600,cursor:'pointer',
            background:aba==='hoje'?'#0D0F14':'transparent',
            color:aba==='hoje'?'#97A624':'#5a5c5f',
            display:'flex',alignItems:'center',gap:6 }}>
          <span style={{ width:7,height:7,borderRadius:'50%',background:aba==='hoje'?'#97A624':'#9a9c9f',display:'inline-block' }}/>
          Hoje (ao vivo)
        </button>
        <button onClick={() => setAba('historico')}
          style={{ padding:'7px 20px',borderRadius:8,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',
            background:aba==='historico'?'#0D0F14':'transparent',
            color:aba==='historico'?'#97A624':'#5a5c5f' }}>
          Histórico
        </button>
      </div>
      {aba==='hoje' ? <LeadsHoje filtros={filtros}/> : <LeadsHistorico filtros={filtros}/>}
    </div>
  )
}
