'use client'

import { useState, useEffect } from 'react'
import { useDeals, Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

const GAS_URL = '/api/pipedrive'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function statusColor(s: string) { return s==='won'?'#97A624':s==='lost'?'#A32D2D':'#185FA5' }
function statusLabel(s: string) { return s==='won'?'Ganho':s==='lost'?'Perdido':'Em aberto' }
function fmtDate(s: string) {
  if (!s || s.length < 10) return '—'
  const [y,m,d] = s.split('-')
  return `${d}/${m}/${y}`
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtBRL(v: any) {
  const n = parseFloat(String(v||0))
  if (!n) return '—'
  return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
}

// ─── Exportar CSV ─────────────────────────────────────────────
function exportarCSV(deals: Deal[], titulo: string) {
  const headers = ['Empresa','Data Evento','Unidade','Vendedor','Pax','Cardápio','Valor','Status','Horário Início','Horário Fim','Responsável']
  const rows = deals.map(d => [
    d.empresa||d.titulo,
    fmtDate(d.data_evento),
    d.unidade_nome,
    d.vendedor,
    d.qtd_pessoas||'',
    d.cardapio_nome,
    d.valor||'',
    statusLabel(d.status),
    d.horario_inicio||'',
    d.horario_fim||'',
    d.responsavel_evento||'',
  ])
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`eventos_${titulo}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Exportar PDF ─────────────────────────────────────────────
function exportarPDF(deals: Deal[], titulo: string) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1a1a1a;font-size:12px}
  h1{font-size:18px;margin-bottom:4px}
  h2{font-size:12px;color:#666;margin-bottom:20px;font-weight:normal}
  .kpi{display:inline-block;margin-right:24px;margin-bottom:16px}
  .kpi-label{font-size:10px;color:#888;text-transform:uppercase}
  .kpi-value{font-size:22px;font-weight:700;color:#3B6D11}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#0D0F14;color:#97A624;padding:7px 10px;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:.05em}
  td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11px}
  tr:nth-child(even) td{background:#fafaf8}
  @media print{body{padding:0}}
</style></head><body>
<h1>Quintal do Espeto — Agenda de Eventos</h1>
<h2>${titulo} · ${new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</h2>
<div>
  <div class="kpi"><div class="kpi-label">Total de eventos</div><div class="kpi-value">${deals.length}</div></div>
  <div class="kpi"><div class="kpi-label">Receita total</div><div class="kpi-value">${fmtBRL(deals.reduce((s,d)=>s+(parseFloat(String(d.valor||0))||0),0))}</div></div>
  <div class="kpi"><div class="kpi-label">Total pax</div><div class="kpi-value">${deals.reduce((s,d)=>s+(parseInt(String(d.qtd_pessoas||'0').replace(/[^0-9]/g,''))||0),0)}</div></div>
</div>
<table><thead><tr>
  <th>Data Evento</th><th>Empresa</th><th>Unidade</th><th>Pax</th><th>Cardápio</th><th>Valor</th><th>Vendedor</th><th>Status</th>
</tr></thead><tbody>
${deals.sort((a,b)=>a.data_evento.localeCompare(b.data_evento)).map(d=>`<tr>
  <td>${fmtDate(d.data_evento)}</td>
  <td>${d.empresa||d.titulo}</td>
  <td>${d.unidade_nome||'—'}</td>
  <td style="text-align:center">${d.qtd_pessoas||'—'}</td>
  <td>${d.cardapio_nome||'—'}</td>
  <td>${fmtBRL(d.valor)}</td>
  <td>${d.vendedor||'—'}</td>
  <td>${statusLabel(d.status)}</td>
</tr>`).join('')}
</tbody></table>
</body></html>`
  const w = window.open('','_blank')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus()
  setTimeout(()=>w.print(),400)
}

// ─── ABA CALENDÁRIO ───────────────────────────────────────────
function CalendarioView({ filtros }: { filtros: any }) {
  const today = new Date()
  const [year, setYear]       = useState(today.getFullYear())
  const [month, setMonth]     = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string|null>(null)
  const [semana, setSemana]   = useState<number|null>(null)
  const [selected, setSelected] = useState<Deal|null>(null)

  const filtrosCal = {
    status:   filtros.status,
    unidade:  filtros.unidade,
    vendedor: filtros.vendedor,
    ano:      String(year),
    mes:      String(month+1).padStart(2,'0'),
  }
  const { deals, loading } = useDeals(filtrosCal, 1)

  const byDate: Record<string,Deal[]> = {}
  deals.forEach(d => {
    const dt = d.data_evento; if (!dt) return
    if (!byDate[dt]) byDate[dt] = []
    byDate[dt].push(d)
  })

  const firstDay    = new Date(year,month,1).getDay()
  const daysInMonth = new Date(year,month+1,0).getDate()
  const prevDays    = new Date(year,month,0).getDate()

  let listDeals: Deal[] = []
  let listTitle = `${MONTHS_SHORT[month]}/${year} — ${deals.length} eventos`

  if (selectedDay) {
    listDeals = byDate[selectedDay]||[]
    listTitle = `${fmtDate(selectedDay)} — ${listDeals.length} eventos`
  } else if (semana !== null) {
    const semDias: string[] = []
    for (let d=1;d<=daysInMonth;d++) {
      const idx = Math.floor((d+firstDay-1)/7)
      if (idx===semana) semDias.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
    }
    listDeals = semDias.flatMap(dia=>byDate[dia]||[]).sort((a,b)=>a.data_evento.localeCompare(b.data_evento))
    listTitle = `Semana ${semana+1} — ${listDeals.length} eventos`
  } else {
    listDeals = [...deals].sort((a,b)=>a.data_evento.localeCompare(b.data_evento))
  }

  const semanas: number[] = []
  for (let d=1;d<=daysInMonth;d++) {
    const idx = Math.floor((d+firstDay-1)/7)
    if (!semanas.includes(idx)) semanas.push(idx)
  }

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1); setSelectedDay(null);setSemana(null) }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1); setSelectedDay(null);setSemana(null) }

  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
      {selected && <DealModal deal={selected} onClose={()=>setSelected(null)} />}

      {/* Calendário */}
      <div style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,padding:18 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <button onClick={prevMonth} style={{ width:28,height:28,borderRadius:6,background:'#F5F5F2',border:'none',cursor:'pointer',fontSize:16,color:'#5a5c5f' }}>‹</button>
          <span style={{ fontSize:13,fontWeight:600 }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ width:28,height:28,borderRadius:6,background:'#F5F5F2',border:'none',cursor:'pointer',fontSize:16,color:'#5a5c5f' }}>›</button>
        </div>

        {/* Filtro semana */}
        <div style={{ display:'flex',gap:4,marginBottom:10,flexWrap:'wrap',alignItems:'center' }}>
          <span style={{ fontSize:10,color:'#9a9c9f',marginRight:2 }}>Semana:</span>
          {semanas.map(s => (
            <button key={s} onClick={()=>{ setSemana(semana===s?null:s); setSelectedDay(null) }}
              style={{ padding:'3px 10px',borderRadius:20,border:'0.5px solid',fontSize:11,cursor:'pointer',
                background:semana===s?'#0D0F14':'#F5F5F2',color:semana===s?'#97A624':'#5a5c5f',borderColor:semana===s?'#0D0F14':'#E8E8E2' }}>
              {s+1}ª
            </button>
          ))}
          {(semana!==null||selectedDay) && (
            <button onClick={()=>{setSemana(null);setSelectedDay(null)}}
              style={{ padding:'3px 8px',borderRadius:20,border:'0.5px solid #E8E8E2',fontSize:11,cursor:'pointer',background:'#fff',color:'#9a9c9f' }}>
              × limpar
            </button>
          )}
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2 }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>(
            <div key={d} style={{ fontSize:10,textAlign:'center',color:'#9a9c9f',padding:'4px 0',textTransform:'uppercase',fontWeight:500 }}>{d}</div>
          ))}
          {Array.from({length:firstDay},(_,i)=>(
            <div key={`p${i}`} style={{ aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ccc' }}>{prevDays-firstDay+1+i}</div>
          ))}
          {Array.from({length:daysInMonth},(_,i)=>{
            const d=i+1
            const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const evs=byDate[dateStr]||[]
            const hasEvent=evs.length>0
            const statuses=[...new Set(evs.map(e=>e.status))]
            const isSelected=selectedDay===dateStr
            const weekIdx=Math.floor((d+firstDay-1)/7)
            const isInSemana=semana===weekIdx
            return (
              <div key={d} onClick={()=>{ setSelectedDay(isSelected?null:dateStr); setSemana(null) }}
                style={{ aspectRatio:'1',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  fontSize:11,fontWeight:hasEvent?700:500,cursor:hasEvent?'pointer':'default',
                  background:isSelected?'#0D0F14':isInSemana?'#f0f4e0':'transparent',
                  color:isSelected?'#fff':hasEvent?statusColor(statuses[0]):'#5a5c5f',
                  outline:isInSemana&&!isSelected?'1px solid #97A62444':'none' }}
                onMouseOver={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.background='#F5F5F2'}}
                onMouseOut={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.background=isInSemana?'#f0f4e0':'transparent'}}>
                {d}
                {hasEvent&&(
                  statuses.length>1
                    ?<div style={{display:'flex',gap:2,marginTop:2}}>{statuses.slice(0,3).map(s=><div key={s} style={{width:4,height:4,borderRadius:'50%',background:isSelected?'rgba(255,255,255,0.7)':statusColor(s)}}/>)}</div>
                    :<div style={{width:4,height:4,borderRadius:'50%',background:isSelected?'rgba(255,255,255,0.7)':statusColor(statuses[0]),marginTop:2}}/>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex',gap:14,marginTop:12,flexWrap:'wrap' }}>
          {[['#185FA5','Em aberto'],['#97A624','Ganho'],['#A32D2D','Perdido']].map(([c,l])=>(
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
          <div style={{ display:'flex',gap:6 }}>
            {(selectedDay||semana!==null) && (
              <button onClick={()=>{setSelectedDay(null);setSemana(null)}}
                style={{ background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#9a9c9f' }}>ver mês</button>
            )}
            {listDeals.length>0 && (
              <button onClick={()=>exportarCSV(listDeals, selectedDay||`semana${semana||0}`)}
                style={{ padding:'4px 10px',borderRadius:8,border:'0.5px solid #E8E8E2',background:'#fff',fontSize:11,cursor:'pointer',color:'#5a5c5f' }}>
                ↓ CSV
              </button>
            )}
          </div>
        </div>
        {loading?<div style={{ textAlign:'center',color:'#9a9c9f',padding:20 }}>Carregando...</div>:(
          <div style={{ display:'flex',flexDirection:'column',gap:4,maxHeight:460,overflowY:'auto' }}>
            {listDeals.map(d=>(
              <div key={d.id} onClick={()=>setSelected(d)}
                style={{ background:'#F5F5F2',borderRadius:7,padding:'8px 10px',fontSize:12,display:'flex',alignItems:'center',gap:8,cursor:'pointer' }}
                onMouseOver={e=>(e.currentTarget.style.background='#e8eddc')}
                onMouseOut={e=>(e.currentTarget.style.background='#F5F5F2')}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:statusColor(d.status),flexShrink:0 }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.empresa||d.titulo}</div>
                  <div style={{ fontSize:10,color:'#9a9c9f' }}>{d.unidade_nome?.split(',')[0]||'—'} · {d.cardapio_nome||'—'}</div>
                </div>
                {d.qtd_pessoas && <span style={{ fontSize:11,color:'#9a9c9f',flexShrink:0 }}>{d.qtd_pessoas} pax</span>}
                <span style={{ fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,background:statusColor(d.status)+'22',color:statusColor(d.status),flexShrink:0 }}>
                  {statusLabel(d.status)}
                </span>
                <span style={{ fontSize:11,color:'#9a9c9f',flexShrink:0,fontFamily:'DM Mono, monospace' }}>{fmtDate(d.data_evento)}</span>
              </div>
            ))}
            {listDeals.length===0&&<div style={{ textAlign:'center',color:'#9a9c9f',fontSize:12,padding:20 }}>Nenhum evento</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ABA AGENDA ───────────────────────────────────────────────
function AgendaView({ filtros }: { filtros: any }) {
  const today = new Date()
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`

  const [tipoData, setTipoData]   = useState<'mes'|'range'>('mes')
  const [mesSel, setMesSel]       = useState(mesAtual)
  const [inicio, setInicio]       = useState(toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [fim, setFim]             = useState(toDateStr(today))
  const [statusFiltro, setStatusFiltro] = useState('won')
  const [deals, setDeals]         = useState<Deal[]>([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<Deal|null>(null)
  const [fetched, setFetched]     = useState(false)

  // Gera opções de mês (18 meses)
  const meses = Array.from({length:18},(_,i)=>{
    const d = new Date(today.getFullYear(), today.getMonth()-i, 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  function buscar(unidadeOverride?: string, vendedorOverride?: string) {
    setLoading(true); setFetched(false)
    const dataIni = tipoData==='mes' ? `${mesSel}-01` : inicio
    const dataFimStr = tipoData==='mes'
      ? `${mesSel}-${new Date(parseInt(mesSel.split('-')[0]), parseInt(mesSel.split('-')[1]), 0).getDate()}`
      : fim

    const p = new URLSearchParams({ tipo: 'agenda', dataInicio: dataIni, dataFim: dataFimStr, limit: '1000' })
    if (statusFiltro) p.set('status_evento', statusFiltro)
    const unid = unidadeOverride !== undefined ? unidadeOverride : filtros.unidade
    const vend = vendedorOverride !== undefined ? vendedorOverride : filtros.vendedor
    if (unid)  p.set('unidade',  unid)
    if (vend)  p.set('vendedor', vend)

    fetch(`/api/pipedrive?${p}`)
      .then(r=>r.json())
      .then(data=>{ if(data.erro) throw new Error(data.erro); setDeals(data.deals||[]); setFetched(true) })
      .catch(e=>console.error(e))
      .finally(()=>setLoading(false))
  }

  // Rebusca automaticamente quando filtros globais mudam (se já buscou antes)
  useEffect(() => {
    if (fetched) buscar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor])

  const titulo = tipoData==='mes'
    ? `${MONTHS_SHORT[parseInt(mesSel.split('-')[1])-1]}/${mesSel.split('-')[0]}`
    : `${fmtDate(inicio)} a ${fmtDate(fim)}`

  const receitaTotal = deals.reduce((s,d)=>s+(parseFloat(String(d.valor||0))||0),0)
  const paxTotal     = deals.reduce((s,d)=>s+(parseInt(String(d.qtd_pessoas||'0').replace(/[^0-9]/g,''))||0),0)

  return (
    <div>
      {selected && <DealModal deal={selected} onClose={()=>setSelected(null)} />}

      {/* Filtros */}
      <div style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,padding:16,marginBottom:16 }}>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>

          {/* Tipo de filtro */}
          <div style={{ display:'flex',gap:2,background:'#F5F5F2',padding:3,borderRadius:8 }}>
            {(['mes','range'] as const).map(t=>(
              <button key={t} onClick={()=>setTipoData(t)}
                style={{ padding:'5px 12px',borderRadius:6,border:'none',fontSize:12,fontWeight:500,cursor:'pointer',
                  background:tipoData===t?'#0D0F14':'transparent',color:tipoData===t?'#97A624':'#5a5c5f' }}>
                {t==='mes'?'Por mês':'Período'}
              </button>
            ))}
          </div>

          {tipoData==='mes' ? (
            <select value={mesSel} onChange={e=>setMesSel(e.target.value)}
              style={{ padding:'6px 12px',borderRadius:8,border:'0.5px solid #E8E8E2',fontSize:13,background:'#fff',cursor:'pointer' }}>
              {meses.map(m=>{
                const [y,mo] = m.split('-')
                return <option key={m} value={m}>{MONTHS_SHORT[parseInt(mo)-1]}/{y}{m===mesAtual?' (atual)':''}</option>
              })}
            </select>
          ) : (
            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
              <input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}
                style={{ padding:'6px 10px',borderRadius:8,border:'0.5px solid #E8E8E2',fontSize:12 }}/>
              <span style={{ fontSize:12,color:'#9a9c9f' }}>até</span>
              <input type="date" value={fim} onChange={e=>setFim(e.target.value)}
                style={{ padding:'6px 10px',borderRadius:8,border:'0.5px solid #E8E8E2',fontSize:12 }}/>
            </div>
          )}

          {/* Status */}
          <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)}
            style={{ padding:'6px 12px',borderRadius:8,border:'0.5px solid #E8E8E2',fontSize:12,background:'#fff',cursor:'pointer' }}>
            <option value="won">Só ganhos</option>
            <option value="">Todos os status</option>
            <option value="open">Em aberto</option>
            <option value="lost">Perdidos</option>
          </select>

          <button onClick={() => buscar()} disabled={loading}
            style={{ padding:'7px 20px',borderRadius:8,border:'none',background:'#97A624',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1 }}>
            {loading?'Buscando...':'Buscar'}
          </button>

          {fetched && deals.length>0 && (
            <div style={{ display:'flex',gap:6,marginLeft:'auto' }}>
              <button onClick={()=>exportarCSV(deals,titulo)}
                style={{ padding:'6px 14px',borderRadius:8,border:'0.5px solid #E8E8E2',background:'#fff',fontSize:12,cursor:'pointer',color:'#5a5c5f' }}>
                ↓ Excel/CSV
              </button>
              <button onClick={()=>exportarPDF(deals,titulo)}
                style={{ padding:'6px 14px',borderRadius:8,border:'none',background:'#0D0F14',color:'#97A624',fontSize:12,cursor:'pointer',fontWeight:600 }}>
                🖨 PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      {fetched && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:16 }}>
          {[
            { label:'Eventos', value:String(deals.length), color:'#97A624' },
            { label:'Receita total', value:fmtBRL(receitaTotal), color:'#3B6D11' },
            { label:'Total pax', value:String(paxTotal), color:'#185FA5' },
            { label:'Ticket médio', value:fmtBRL(deals.length?receitaTotal/deals.length:0), color:'#D9B504' },
          ].map(k=>(
            <div key={k.label} style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:12,padding:'14px 16px',borderTop:`3px solid ${k.color}` }}>
              <div style={{ fontSize:10,fontWeight:600,color:'#9a9c9f',textTransform:'uppercase',marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:20,fontWeight:700,fontFamily:'DM Mono, monospace',color:k.color==='#3B6D11'?k.color:'#0D0F14' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {fetched && deals.length>0 && (
        <div style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,overflow:'hidden' }}>
          <div style={{ display:'grid',gridTemplateColumns:'90px 1fr 120px 60px 120px 100px 80px',gap:8,padding:'10px 16px',background:'#0D0F14' }}>
            {['Data Evento','Empresa','Unidade','Pax','Cardápio','Valor','Status'].map(h=>(
              <span key={h} style={{ fontSize:10,fontWeight:700,color:'#97A624',textTransform:'uppercase',letterSpacing:'0.05em' }}>{h}</span>
            ))}
          </div>
          <div style={{ padding:'4px 8px' }}>
            {[...deals].sort((a,b)=>a.data_evento.localeCompare(b.data_evento)).map(d=>(
              <div key={d.id} onClick={()=>setSelected(d)}
                style={{ display:'grid',gridTemplateColumns:'90px 1fr 120px 60px 120px 100px 80px',gap:8,padding:'10px 8px',borderRadius:6,alignItems:'center',fontSize:12,borderBottom:'0.5px solid #F5F5F2',cursor:'pointer' }}
                onMouseOver={e=>(e.currentTarget.style.background='#F5F5F2')}
                onMouseOut={e=>(e.currentTarget.style.background='')}>
                <span style={{ fontFamily:'DM Mono, monospace',fontSize:11 }}>{fmtDate(d.data_evento)}</span>
                <div>
                  <div style={{ fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.empresa||d.titulo}</div>
                  {d.vendedor && <div style={{ fontSize:10,color:'#9a9c9f' }}>{d.vendedor}</div>}
                </div>
                <span style={{ fontSize:11,color:'#9a9c9f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.unidade_nome?.split(',')[0]||'—'}</span>
                <span style={{ fontSize:12,fontFamily:'DM Mono, monospace',textAlign:'center' }}>{d.qtd_pessoas||'—'}</span>
                <span style={{ fontSize:11,color:'#9a9c9f',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{d.cardapio_nome||'—'}</span>
                <span style={{ fontSize:12,fontFamily:'DM Mono, monospace',color:'#3B6D11',fontWeight:600 }}>{fmtBRL(d.valor)}</span>
                <span style={{ fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,background:statusColor(d.status)+'22',color:statusColor(d.status) }}>{statusLabel(d.status)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fetched && deals.length===0 && (
        <div style={{ textAlign:'center',color:'#9a9c9f',fontSize:13,padding:60,background:'#fff',borderRadius:14,border:'0.5px solid #E8E8E2' }}>
          Nenhum evento encontrado no período
        </div>
      )}

      {!fetched && !loading && (
        <div style={{ textAlign:'center',color:'#9a9c9f',fontSize:13,padding:60,background:'#fff',borderRadius:14,border:'0.5px dashed #E8E8E2' }}>
          Selecione o período e clique em <strong>Buscar</strong>
        </div>
      )}
    </div>
  )
}

// ─── PRINCIPAL ────────────────────────────────────────────────
export default function Calendario({ filtros }: { filtros: any }) {
  const [aba, setAba] = useState<'calendario'|'agenda'>('calendario')

  return (
    <div style={{ padding:'20px' }}>
      {/* Toggle */}
      <div style={{ display:'flex',gap:4,marginBottom:20,background:'#F5F5F2',padding:4,borderRadius:10,width:'fit-content' }}>
        <button onClick={()=>setAba('calendario')}
          style={{ padding:'7px 20px',borderRadius:8,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',
            background:aba==='calendario'?'#0D0F14':'transparent',color:aba==='calendario'?'#97A624':'#5a5c5f' }}>
          📅 Calendário
        </button>
        <button onClick={()=>setAba('agenda')}
          style={{ padding:'7px 20px',borderRadius:8,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',
            background:aba==='agenda'?'#0D0F14':'transparent',color:aba==='agenda'?'#97A624':'#5a5c5f' }}>
          📋 Agenda & Export
        </button>
      </div>

      {aba==='calendario' ? <CalendarioView filtros={filtros}/> : <AgendaView filtros={filtros}/>}
    </div>
  )
}
