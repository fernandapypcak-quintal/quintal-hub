'use client'

import { useState } from 'react'
import { useLeadsDiarios } from '../../useComercial'

function fmtDate(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function statusColor(s: string) {
  return s === 'won' ? '#97A624' : s === 'lost' ? '#A32D2D' : '#185FA5'
}

function StatusTag({ status }: { status: string }) {
  const c = statusColor(status)
  const l = status === 'won' ? 'Ganho' : status === 'lost' ? 'Perdido' : 'Aberto'
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c + '22', color: c, whiteSpace: 'nowrap' }}>{l}</span>
}

const today     = new Date()
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

// Gera opções de período
const PERIODOS = [
  { label: 'Ontem',          inicio: toDateStr(yesterday), fim: toDateStr(yesterday) },
  { label: 'Últimos 7 dias', inicio: toDateStr(new Date(Date.now() - 6*86400000)), fim: toDateStr(today) },
  { label: 'Últimos 30 dias',inicio: toDateStr(new Date(Date.now() - 29*86400000)), fim: toDateStr(today) },
  { label: 'Este mês',       inicio: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`, fim: toDateStr(today) },
  { label: 'Personalizado',  inicio: '', fim: '' },
]

export default function Leads({ filtros }: { filtros: { status: any; unidade: string; ano: string; mes: string } }) {
  const [periodoIdx, setPeriodoIdx] = useState(0)
  const [customInicio, setCustomInicio] = useState(toDateStr(yesterday))
  const [customFim, setCustomFim]       = useState(toDateStr(today))

  const isCustom = periodoIdx === 4
  const inicio   = isCustom ? customInicio : PERIODOS[periodoIdx].inicio
  const fim      = isCustom ? customFim    : PERIODOS[periodoIdx].fim

  const { leads, loading, erro } = useLeadsDiarios(
    { ...filtros, status: '', ano: '', mes: '' },
    inicio,
    fim
  )

  // Agrupa por data de criação (add_time)
  const porDia: Record<string, typeof leads> = {}
  leads.forEach(d => {
    const dia = String(d.add_time || '').substring(0, 10)
    if (!dia) return
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(d)
  })
  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a))

  // KPIs
  const totalLeads  = leads.length
  const mediaDiaria = dias.length ? (totalLeads / dias.length).toFixed(1) : '0'
  const pico        = dias.length ? Math.max(...dias.map(d => porDia[d].length)) : 0
  const ontemStr    = toDateStr(yesterday)
  const ontemCount  = porDia[ontemStr]?.length || 0

  if (erro) return (
    <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>
      Erro: {erro}
    </div>
  )

  return (
    <div style={{ padding: '20px' }}>

      {/* Filtro de período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODOS.map((p, i) => (
          <button key={i} onClick={() => setPeriodoIdx(i)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '0.5px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: periodoIdx === i ? '#0D0F14' : '#fff',
              color:      periodoIdx === i ? '#97A624'  : '#5a5c5f',
              borderColor:periodoIdx === i ? '#0D0F14'  : '#E8E8E2',
            }}>
            {p.label}
          </button>
        ))}

        {isCustom && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12 }} />
            <span style={{ fontSize: 12, color: '#9a9c9f' }}>até</span>
            <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12 }} />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #0D0F14' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Ontem</div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{ontemCount}</div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>{fmtDate(ontemStr)}</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #97A624' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Total no período</div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{totalLeads}</div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>{dias.length} dias com entrada</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Média diária</div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{mediaDiaria}</div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>leads por dia</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #D9B504' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Pico do período</div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{pico}</div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>maior dia</div>
        </div>
      </div>

      {/* Lista por dia */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#9a9c9f', padding: 40 }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dias.map(dia => {
            const isOntem = dia === ontemStr
            return (
              <div key={dia} style={{ background: '#fff', border: `0.5px solid ${isOntem ? '#97A624' : '#E8E8E2'}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: isOntem ? '#f0f4e0' : '#F5F5F2', borderBottom: '0.5px solid #E8E8E2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isOntem && <span style={{ fontSize: 10, fontWeight: 700, background: '#97A624', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>Ontem</span>}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(dia)}</span>
                    <span style={{ fontSize: 11, color: '#9a9c9f' }}>
                      {new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', background: '#0D0F14', color: '#97A624', padding: '3px 12px', borderRadius: 20 }}>
                    {porDia[dia].length} leads
                  </span>
                </div>

                <div style={{ padding: '4px 8px' }}>
                  {porDia[dia].map(d => (
                    <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 70px', gap: 10, padding: '8px 8px', borderRadius: 6, alignItems: 'center', fontSize: 12, borderBottom: '0.5px solid #F5F5F2' }}>
                      <div>
                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa || d.titulo}</div>
                        <div style={{ fontSize: 10, color: '#9a9c9f', marginTop: 1 }}>{d.stage_nome}</div>
                      </div>
                      <span style={{ fontSize: 11, color: '#9a9c9f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.unidade_nome || '—'}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#9a9c9f' }}>
                        ev: {fmtDate(d.data_evento)}
                      </span>
                      <StatusTag status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {dias.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 40, background: '#fff', borderRadius: 14, border: '0.5px solid #E8E8E2' }}>
              Nenhum lead encontrado no período selecionado
            </div>
          )}
        </div>
      )}
    </div>
  )
}
