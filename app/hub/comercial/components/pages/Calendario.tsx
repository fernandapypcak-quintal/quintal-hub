'use client'

import { useState } from 'react'
import { useDeals, Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function statusColor(s: string) {
  return s === 'won' ? '#97A624' : s === 'lost' ? '#A32D2D' : '#185FA5'
}

function fmtDate(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export default function Calendario({ filtros }: { filtros: { status: any; unidade: string; ano: string; mes: string } }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<Deal | null>(null)
  const [dayEvents, setDayEvents] = useState<Deal[] | null>(null)
  const [dayLabel, setDayLabel]   = useState('')

  // Calendário usa ano/mês próprios (controles ‹ ›) — ignora filtro de mês do header
  // Mas respeita unidade e status do header
  const filtrosCal = {
    status:  filtros.status,
    unidade: filtros.unidade,
    ano:     String(year),
    mes:     String(month + 1).padStart(2, '0'),
  }

  const { deals, loading } = useDeals(filtrosCal, 1)

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  // Agrupa por data_evento
  const byDate: Record<string, Deal[]> = {}
  deals.forEach(d => {
    const dt = d.data_evento
    if (!dt) return
    if (!byDate[dt]) byDate[dt] = []
    byDate[dt].push(d)
  })

  const monthDeals = [...deals].sort((a, b) => a.data_evento.localeCompare(b.data_evento))

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays    = new Date(year, month, 0).getDate()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setDayEvents(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setDayEvents(null)
  }

  function handleDayClick(dateStr: string) {
    const evs = byDate[dateStr]
    if (!evs?.length) return
    setDayEvents(evs)
    setDayLabel(fmtDate(dateStr))
  }

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      {/* Calendário */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth}
            style={{ width: 28, height: 28, borderRadius: 6, background: '#F5F5F2', border: 'none', cursor: 'pointer', fontSize: 16, color: '#5a5c5f' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth}
            style={{ width: 28, height: 28, borderRadius: 6, background: '#F5F5F2', border: 'none', cursor: 'pointer', fontSize: 16, color: '#5a5c5f' }}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} style={{ fontSize: 10, textAlign: 'center', color: '#9a9c9f', padding: '4px 0', textTransform: 'uppercase', fontWeight: 500 }}>{d}</div>
          ))}

          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`prev-${i}`} style={{ aspectRatio: '1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#ccc' }}>
              {prevDays - firstDay + 1 + i}
            </div>
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const evs = byDate[dateStr] || []
            const isToday = dateStr === todayStr
            const hasEvent = evs.length > 0
            const statuses = [...new Set(evs.map(e => e.status))]
            const multiStatus = statuses.length > 1

            return (
              <div key={d} onClick={() => handleDayClick(dateStr)}
                style={{ aspectRatio: '1', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: hasEvent ? 700 : 500, cursor: hasEvent ? 'pointer' : 'default', background: isToday ? '#0D0F14' : 'transparent', color: isToday ? '#fff' : hasEvent ? statusColor(statuses[0]) : '#5a5c5f', transition: 'background 0.1s' }}
                onMouseOver={e => { if (!isToday) e.currentTarget.style.background = '#F5F5F2' }}
                onMouseOut={e => { if (!isToday) e.currentTarget.style.background = '' }}>
                {d}
                {hasEvent && (
                  multiStatus
                    ? <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                        {statuses.slice(0,3).map(s => (
                          <div key={s} style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? 'rgba(255,255,255,0.7)' : statusColor(s) }} />
                        ))}
                      </div>
                    : <div style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? 'rgba(255,255,255,0.7)' : statusColor(statuses[0]), marginTop: 2 }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {[['#185FA5','Em aberto'],['#97A624','Ganho'],['#A32D2D','Perdido']].map(([c,l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9a9c9f' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* Lista do mês / dia */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {dayEvents
              ? `Eventos em ${dayLabel} (${dayEvents.length})`
              : `${MONTHS_SHORT[month]}/${year} — ${monthDeals.length} eventos`}
          </span>
          {dayEvents && (
            <button onClick={() => setDayEvents(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9a9c9f' }}>
              ver mês
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 20 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 440, overflowY: 'auto' }}>
            {(dayEvents || monthDeals).map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ background: '#F5F5F2', borderRadius: 7, padding: '8px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(d.status), flexShrink: 0 }} />
                <div style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa || d.titulo}</div>
                {d.unidade_nome && (
                  <span style={{ fontSize: 10, background: '#fff', padding: '2px 6px', borderRadius: 4, color: '#9a9c9f', flexShrink: 0 }}>
                    {d.unidade_nome.split(',')[0]}
                  </span>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: statusColor(d.status) + '22', color: statusColor(d.status), flexShrink: 0 }}>
                  {d.status === 'won' ? 'Ganho' : d.status === 'lost' ? 'Perdido' : 'Aberto'}
                </span>
                <span style={{ fontSize: 11, color: '#9a9c9f', flexShrink: 0, fontFamily: 'DM Mono, monospace' }}>
                  {fmtDate(d.data_evento)}
                </span>
              </div>
            ))}
            {!(dayEvents || monthDeals).length && (
              <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 12, padding: 20 }}>
                Nenhum evento em {MONTHS_SHORT[month]}/{year}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
