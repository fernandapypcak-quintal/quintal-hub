'use client'

import { useState } from 'react'
import { useDeals, Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function statusColor(s: string) { return s==='won'?'#97A624':s==='lost'?'#A32D2D':'#185FA5' }
function fmtDate(s: string) { if(!s)return'—'; const p=s.split('-'); return`${p[2]}/${p[1]}/${p[0]}` }

export default function Calendario({ filtros }: { filtros: any }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null) // null = nenhum selecionado
  const [semana, setSemana]           = useState<number | null>(null) // 0-4 semana do mês
  const [selected, setSelected]       = useState<Deal | null>(null)

  const filtrosCal = { status: filtros.status, unidade: filtros.unidade, vendedor: filtros.vendedor, ano: String(year), mes: String(month+1).padStart(2,'0') }
  const { deals, loading } = useDeals(filtrosCal, 1)

  const byDate: Record<string, Deal[]> = {}
  deals.forEach(d => { const dt=d.data_evento; if(!dt)return; if(!byDate[dt])byDate[dt]=[]; byDate[dt].push(d) })

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const prevDays    = new Date(year, month, 0).getDate()

  // Deals a mostrar: semana, dia ou mês inteiro
  let listDeals: Deal[] = []
  let listTitle = `${MONTHS_SHORT[month]}/${year} — ${deals.length} eventos`

  if (selectedDay) {
    listDeals = byDate[selectedDay] || []
    listTitle = `${fmtDate(selectedDay)} — ${listDeals.length} eventos`
  } else if (semana !== null) {
    // Dias da semana selecionada
    const semDias: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const idx = Math.floor((d + firstDay - 1) / 7)
      if (idx === semana) {
        semDias.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
      }
    }
    listDeals = semDias.flatMap(dia => byDate[dia] || []).sort((a,b)=>a.data_evento.localeCompare(b.data_evento))
    listTitle = `Semana ${semana+1} — ${listDeals.length} eventos`
  } else {
    listDeals = [...deals].sort((a,b)=>a.data_evento.localeCompare(b.data_evento))
  }

  function handleDayClick(dateStr: string) {
    if (selectedDay === dateStr) { setSelectedDay(null); return }
    setSelectedDay(dateStr); setSemana(null)
  }

  function handleSemanaClick(s: number) {
    if (semana === s) { setSemana(null); return }
    setSemana(s); setSelectedDay(null)
  }

  // Semanas do mês
  const semanas: number[] = []
  for (let d=1; d<=daysInMonth; d++) {
    const idx = Math.floor((d+firstDay-1)/7)
    if (!semanas.includes(idx)) semanas.push(idx)
  }

  return (
    <div style={{ padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      {/* Calendário */}
      <div style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,padding:18 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <button onClick={() => { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1); setSelectedDay(null);setSemana(null) }}
            style={{ width:28,height:28,borderRadius:6,background:'#F5F5F2',border:'none',cursor:'pointer',fontSize:16,color:'#5a5c5f' }}>‹</button>
          <span style={{ fontSize:13,fontWeight:600 }}>{MONTHS[month]} {year}</span>
          <button onClick={() => { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1); setSelectedDay(null);setSemana(null) }}
            style={{ width:28,height:28,borderRadius:6,background:'#F5F5F2',border:'none',cursor:'pointer',fontSize:16,color:'#5a5c5f' }}>›</button>
        </div>

        {/* Filtro por semana */}
        <div style={{ display:'flex',gap:4,marginBottom:10,flexWrap:'wrap' }}>
          <span style={{ fontSize:10,color:'#9a9c9f',alignSelf:'center',marginRight:4 }}>Semana:</span>
          {semanas.map(s => (
            <button key={s} onClick={() => handleSemanaClick(s)}
              style={{ padding:'3px 10px',borderRadius:20,border:'0.5px solid',fontSize:11,cursor:'pointer',
                background:semana===s?'#0D0F14':'#F5F5F2', color:semana===s?'#97A624':'#5a5c5f',
                borderColor:semana===s?'#0D0F14':'#E8E8E2',fontWeight:semana===s?600:400 }}>
              {s+1}ª
            </button>
          ))}
          {(semana!==null || selectedDay) && (
            <button onClick={() => { setSemana(null); setSelectedDay(null) }}
              style={{ padding:'3px 8px',borderRadius:20,border:'0.5px solid #E8E8E2',fontSize:11,cursor:'pointer',background:'#fff',color:'#9a9c9f' }}>
              × limpar
            </button>
          )}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2 }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} style={{ fontSize:10,textAlign:'center',color:'#9a9c9f',padding:'4px 0',textTransform:'uppercase',fontWeight:500 }}>{d}</div>
          ))}

          {Array.from({length:firstDay},(_,i) => (
            <div key={`prev-${i}`} style={{ aspectRatio:'1',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ccc' }}>
              {prevDays-firstDay+1+i}
            </div>
          ))}

          {Array.from({length:daysInMonth},(_,i) => {
            const d = i+1
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const evs = byDate[dateStr]||[]
            const hasEvent = evs.length > 0
            const statuses = [...new Set(evs.map(e=>e.status))]
            const isSelected = selectedDay === dateStr
            const weekIdx = Math.floor((d+firstDay-1)/7)
            const isInSemana = semana === weekIdx

            return (
              <div key={d} onClick={() => handleDayClick(dateStr)}
                style={{ aspectRatio:'1',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',
                  justifyContent:'center',fontSize:11,
                  fontWeight: hasEvent ? 700 : 500,
                  cursor: hasEvent ? 'pointer' : 'default',
                  // Destaque: só se selecionado manualmente
                  background: isSelected ? '#0D0F14' : isInSemana ? '#f0f4e0' : 'transparent',
                  color: isSelected ? '#fff' : hasEvent ? statusColor(statuses[0]) : '#5a5c5f',
                  outline: isInSemana && !isSelected ? '1px solid #97A62444' : 'none',
                }}
                onMouseOver={e => { if(!isSelected) e.currentTarget.style.background='#F5F5F2' }}
                onMouseOut={e => { if(!isSelected) e.currentTarget.style.background=isInSemana?'#f0f4e0':'transparent' }}>
                {d}
                {hasEvent && (
                  statuses.length > 1
                    ? <div style={{ display:'flex',gap:2,marginTop:2 }}>{statuses.slice(0,3).map(s=><div key={s} style={{ width:4,height:4,borderRadius:'50%',background:isSelected?'rgba(255,255,255,0.7)':statusColor(s) }}/>)}</div>
                    : <div style={{ width:4,height:4,borderRadius:'50%',background:isSelected?'rgba(255,255,255,0.7)':statusColor(statuses[0]),marginTop:2 }}/>
                )}
              </div>
            )
          })}
        </div>

        {/* Legenda */}
        <div style={{ display:'flex',gap:14,marginTop:12,flexWrap:'wrap' }}>
          {[['#185FA5','Em aberto'],['#97A624','Ganho'],['#A32D2D','Perdido']].map(([c,l]) => (
            <span key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#9a9c9f' }}>
              <span style={{ width:8,height:8,borderRadius:'50%',background:c,display:'inline-block' }}/>{l}
            </span>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,padding:18 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <span style={{ fontSize:13,fontWeight:600 }}>{listTitle}</span>
          {(selectedDay||semana!==null) && (
            <button onClick={() => { setSelectedDay(null); setSemana(null) }}
              style={{ background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#9a9c9f' }}>
              ver mês
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign:'center',color:'#9a9c9f',fontSize:13,padding:20 }}>Carregando...</div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:4,maxHeight:460,overflowY:'auto' }}>
            {listDeals.map(d => (
              <div key={d.id} onClick={() => setSelected(d)}
                style={{ background:'#F5F5F2',borderRadius:7,padding:'8px 10px',fontSize:12,display:'flex',alignItems:'center',gap:8,cursor:'pointer' }}
                onMouseOver={e=>(e.currentTarget.style.background='#e8eddc')}
                onMouseOut={e=>(e.currentTarget.style.background='#F5F5F2')}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:statusColor(d.status),flexShrink:0 }}/>
                <div style={{ flex:1,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.empresa||d.titulo}</div>
                {d.unidade_nome && <span style={{ fontSize:10,background:'#fff',padding:'2px 6px',borderRadius:4,color:'#9a9c9f',flexShrink:0 }}>{d.unidade_nome.split(',')[0]}</span>}
                <span style={{ fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,background:statusColor(d.status)+'22',color:statusColor(d.status),flexShrink:0 }}>
                  {d.status==='won'?'Ganho':d.status==='lost'?'Perdido':'Aberto'}
                </span>
                <span style={{ fontSize:11,color:'#9a9c9f',flexShrink:0,fontFamily:'DM Mono, monospace' }}>{fmtDate(d.data_evento)}</span>
              </div>
            ))}
            {listDeals.length===0 && (
              <div style={{ textAlign:'center',color:'#9a9c9f',fontSize:12,padding:20 }}>Nenhum evento</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
