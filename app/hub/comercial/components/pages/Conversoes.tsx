'use client'

import { useState } from 'react'
import { Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

const GAS_URL = '/api/pipedrive'

function fmtDate(s: string) {
  if (!s) return '—'
  const p = s.split('T')[0].split('-')
  if (p.length < 3) return s
  return `${p[2]}/${p[1]}/${p[0]}`
}

function fmtBRL(v: any) {
  const n = parseFloat(String(v || 0))
  if (!n) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function statusColor(s: string) {
  return s === 'won' ? '#97A624' : s === 'lost' ? '#A32D2D' : '#185FA5'
}

const today     = new Date()
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const PERIODOS = [
  { label: 'Ontem',           inicio: toDateStr(yesterday),   fim: toDateStr(yesterday) },
  { label: 'Esta semana',     inicio: toDateStr(new Date(Date.now() - 6*86400000)), fim: toDateStr(today) },
  { label: 'Últimos 30 dias', inicio: toDateStr(new Date(Date.now() - 29*86400000)), fim: toDateStr(today) },
  { label: 'Este mês',        inicio: toDateStr(firstOfMonth), fim: toDateStr(today) },
  { label: 'Personalizado',   inicio: '', fim: '' },
]

function useConversoes(unidade: string, inicio: string, fim: string) {
  const [deals, setDeals]     = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  function buscar() {
    if (!inicio || !fim) return
    setLoading(true)
    setErro(null)
    setFetched(false)

    const p = new URLSearchParams({ tipo: 'conversoes', dataInicio: inicio, dataFim: fim, limit: '1000' })
    if (unidade) p.set('unidade', unidade)

    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setDeals(data.deals || [])
        setFetched(true)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }

  return { deals, loading, erro, fetched, buscar }
}

export default function Conversoes({ filtros }: { filtros: { status: any; unidade: string; ano: string; mes: string } }) {
  const [periodoIdx, setPeriodoIdx] = useState(3) // Este mês por padrão
  const [customInicio, setCustomInicio] = useState(toDateStr(firstOfMonth))
  const [customFim, setCustomFim]       = useState(toDateStr(today))
  const [selected, setSelected]         = useState<Deal | null>(null)

  const isCustom = periodoIdx === 4
  const inicio   = isCustom ? customInicio : PERIODOS[periodoIdx].inicio
  const fim      = isCustom ? customFim    : PERIODOS[periodoIdx].fim

  const { deals, loading, erro, fetched, buscar } = useConversoes(filtros.unidade, inicio, fim)

  // Agrupa por data de fechamento (won_time)
  const porDia: Record<string, Deal[]> = {}
  deals.forEach(d => {
    const dia = String(d.won_time || '').substring(0, 10)
    if (!dia) return
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(d)
  })
  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a))

  // KPIs
  const receitaTotal = deals.reduce((s, d) => s + (parseFloat(String(d.valor || 0)) || 0), 0)
  const ticketMedio  = deals.length ? receitaTotal / deals.length : 0
  const paxTotal     = deals.reduce((s, d) => s + (parseInt(String(d.qtd_pessoas || '0').replace(/[^0-9]/g, '')) || 0), 0)

  return (
    <div style={{ padding: '20px' }}>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      {/* Filtros de período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
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

        <button onClick={buscar} disabled={loading}
          style={{ padding: '6px 18px', borderRadius: 20, border: 'none', background: '#97A624', color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginLeft: 4 }}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {erro && <div style={{ padding: '10px 16px', background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13, marginBottom: 16 }}>Erro: {erro}</div>}

      {/* KPIs — só mostra após buscar */}
      {fetched && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #3B6D11' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Conversões</div>
              <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{deals.length}</div>
              <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>{dias.length} dias com fechamento</div>
            </div>
            <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #97A624' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Receita total</div>
              <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRL(receitaTotal)}</div>
              <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>no período</div>
            </div>
            <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #185FA5' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Ticket médio</div>
              <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{fmtBRL(ticketMedio)}</div>
              <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>por conversão</div>
            </div>
            <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 18px', borderTop: '3px solid #D9B504' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 6 }}>Total pax</div>
              <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{paxTotal.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>pessoas nos eventos</div>
            </div>
          </div>

          {/* Lista por dia */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dias.map(dia => (
              <div key={dia} style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#F5F5F2', borderBottom: '0.5px solid #E8E8E2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(dia)}</span>
                    <span style={{ fontSize: 11, color: '#9a9c9f' }}>
                      {new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#3B6D11', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                      {fmtBRL(porDia[dia].reduce((s, d) => s + (parseFloat(String(d.valor || 0)) || 0), 0))}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', background: '#3B6D11', color: '#fff', padding: '3px 12px', borderRadius: 20 }}>
                      {porDia[dia].length} fechados
                    </span>
                  </div>
                </div>

                <div style={{ padding: '4px 8px' }}>
                  {porDia[dia].map(d => {
                    const pax = parseInt(String(d.qtd_pessoas || '0').replace(/[^0-9]/g, '')) || 0
                    return (
                      <div key={d.id} onClick={() => setSelected(d)}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 110px 80px 100px 80px', gap: 10, padding: '8px 8px', borderRadius: 6, alignItems: 'center', fontSize: 12, borderBottom: '0.5px solid #F5F5F2', cursor: 'pointer' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#F5F5F2')}
                        onMouseOut={e => (e.currentTarget.style.background = '')}>
                        <div>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa || d.titulo}</div>
                          <div style={{ fontSize: 10, color: '#9a9c9f', marginTop: 1 }}>{d.unidade_nome?.split(',')[0] || '—'}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#9a9c9f', fontFamily: 'DM Mono, monospace' }}>ev: {fmtDate(d.data_evento)}</span>
                        <span style={{ fontSize: 11, color: '#9a9c9f', textAlign: 'center' }}>{pax ? `${pax} pax` : '—'}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRL(d.valor)}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#eaf3de', color: '#27500A', textAlign: 'center' }}>Ganho</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {fetched && deals.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 40, background: '#fff', borderRadius: 14, border: '0.5px solid #E8E8E2' }}>
                Nenhuma conversão no período selecionado
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
