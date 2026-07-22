'use client'

import { useState } from 'react'
import { useSumario, useComparativo, Deal } from '../../useComercial'
import DealModal from '../ui/DealModal'

const STAGE_ORDER = ['[LEADS] Campanhas','1º Contato SDR','Follow UP SDR','RMKT','Clientes Qualificados','1º Contato Vendas','Em Negociação','Orçamento','Visitas','Ficha Técnica','Aguardando Assinatura']
const STAGE_COLORS: Record<string, string> = {
  '[LEADS] Campanhas':'#b0c84a','1º Contato SDR':'#97A624','Follow UP SDR':'#7d9120',
  'RMKT':'#c5a813','Clientes Qualificados':'#c5a813','1º Contato Vendas':'#e09420',
  'Em Negociação':'#d97b1a','Orçamento':'#185FA5','Visitas':'#2472bd',
  'Ficha Técnica':'#1a8a6e','Aguardando Assinatura':'#3B6D11',
}

function fmtBRL(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }
function delta(atual: number, ant: number) {
  if (!ant) return null
  const pct = ((atual - ant) / ant * 100).toFixed(1)
  const up = atual >= ant
  return { pct, up }
}

function KpiCard({ label, value, sub, color = '#97A624', deltaVal }: {
  label: string; value: string; sub?: string; color?: string
  deltaVal?: { atual: number; ant: number; label: string } | null
}) {
  const d = deltaVal ? delta(deltaVal.atual, deltaVal.ant) : null
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>{sub}</div>}
      {d && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: d.up ? '#eaf3de' : '#fdeaea', color: d.up ? '#3B6D11' : '#a32d2d', fontWeight: 600 }}>
            {d.up ? '↑' : '↓'} {Math.abs(parseFloat(d.pct))}% {deltaVal!.label}
          </span>
        </div>
      )}
    </div>
  )
}

export default function Funil({ filtros }: { filtros: any }) {
  const { sumario, loading, erro } = useSumario(filtros)
  const { comparativo } = useComparativo(filtros)
  const [selected, setSelected] = useState<Deal | null>(null)
  const [funiView, setFunilView] = useState<'barras' | 'vendedor'>('barras')

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!sumario) return null

  const ant = comparativo?.anoAnterior
  const maxFunil = Math.max(...STAGE_ORDER.map(s => sumario.funil[s] || 0), 1)

  return (
    <div style={{ padding: '20px' }}>
      {selected && <DealModal deal={selected} onClose={() => setSelected(null)} />}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total de deals" value={String(sumario.total)} sub={`${sumario.open} em aberto`}
          deltaVal={ant ? { atual: sumario.total, ant: ant.total, label: 'vs ano ant.' } : null} />
        <KpiCard label="Eventos ganhos" value={String(sumario.won)} sub={`Taxa: ${sumario.taxaConversao}%`} color="#3B6D11"
          deltaVal={ant ? { atual: sumario.won, ant: ant.won, label: 'vs ano ant.' } : null} />
        <KpiCard label="Receita total" value={fmtBRL(sumario.receitaTotal)}
          deltaVal={ant ? { atual: sumario.receitaTotal, ant: ant.receita, label: 'vs ano ant.' } : null} />
        <KpiCard label="Ticket médio / pax" value={fmtBRL(sumario.ticketPorPax)} sub={`R$${sumario.ticketMedio?.toLocaleString('pt-BR')} por evento`} color="#185FA5"
          deltaVal={ant ? { atual: sumario.ticketPorPax, ant: ant.ticketPorPax, label: 'vs ano ant.' } : null} />
      </div>

      {/* Funil + vendedores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Funil comercial</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['barras','vendedor'] as const).map(v => (
                <button key={v} onClick={() => setFunilView(v)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid #E8E8E2', fontSize: 11, cursor: 'pointer', background: funiView===v ? '#0D0F14' : '#fff', color: funiView===v ? '#97A624' : '#5a5c5f', fontWeight: funiView===v ? 600 : 400 }}>
                  {v === 'barras' ? 'Funil' : 'Por vendedor'}
                </button>
              ))}
            </div>
          </div>

          {funiView === 'barras' ? (
            <>
              {/* Funil visual */}
              {STAGE_ORDER.map((stage, i) => {
                const count = sumario.funil[stage] || 0
                if (!count) return null
                const pct = Math.max((count / maxFunil) * 100, 3)
                const conv = sumario.funilConversao?.[stage]
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#5a5c5f', width: 150, textAlign: 'right', flexShrink: 0 }}>{stage}</div>
                    <div style={{ flex: 1, height: 26, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: STAGE_COLORS[stage]||'#97A624', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{count}</div>
                    </div>
                    {conv !== undefined && (
                      <div style={{ fontSize: 10, color: '#9a9c9f', width: 40, textAlign: 'right', flexShrink: 0 }}>{conv}%</div>
                    )}
                  </div>
                )
              })}
              <div style={{ height: 0.5, background: '#E8E8E2', margin: '10px 0' }} />
              {[['#3B6D11', '✓ Ganhos', sumario.won], ['#A32D2D', '✗ Perdidos', sumario.lost]].map(([c,l,n]) => (
                <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: String(c), fontWeight: 600, width: 150, textAlign: 'right' }}>{String(l)}</div>
                  <div style={{ flex: 1, height: 26, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max((Number(n)/maxFunil)*100,3)}%`, background: String(c), borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{Number(n)}</div>
                  </div>
                  <div style={{ width: 40 }} />
                </div>
              ))}
            </>
          ) : (
            // Funil por vendedor
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
              {Object.entries(sumario.funilVendedor || {})
                .sort((a,b) => b[1].total - a[1].total)
                .map(([v, d]) => (
                  <div key={v} style={{ background: '#F5F5F2', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                      <span style={{ fontSize: 11, color: '#3B6D11', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{fmtBRL(d.receita)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['Aberto', d.open, '#185FA5'], ['Ganho', d.won, '#3B6D11'], ['Perdido', d.lost, '#a32d2d']].map(([l,n,c]) => (
                        <span key={String(l)} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: String(c)+'22', color: String(c), fontWeight: 600 }}>{n} {l}</span>
                      ))}
                      <span style={{ fontSize: 10, color: '#9a9c9f', marginLeft: 'auto' }}>
                        {d.total > 0 ? ((d.won/d.total)*100).toFixed(0) : 0}% conv.
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div style={{ height: 0.5, background: '#E8E8E2', margin: '12px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Taxa conv.', value: `${sumario.taxaConversao}%`, color: '#3B6D11' },
              { label: 'Ticket / evento', value: fmtBRL(sumario.ticketMedio) },
              { label: 'Ciclo médio', value: `${sumario.cicloMedio}d` },
            ].map(s => (
              <div key={s.label} style={{ background: '#F5F5F2', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'DM Mono, monospace', color: s.color || '#0D0F14' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pacotes + Gráfico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Pacotes */}
          <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Tipos de pacote</div>
            {Object.entries(sumario.pacotes || {}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([nome, n]) => {
              const total = Object.values(sumario.pacotes||{}).reduce((s,v)=>s+v,0)
              const pct   = total > 0 ? (n/total*100).toFixed(0) : 0
              return (
                <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ fontSize: 11, color: '#5a5c5f', width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{nome}</div>
                  <div style={{ flex: 1, height: 16, background: '#F5F5F2', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#97A624', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#5a5c5f', width: 30, textAlign: 'right' }}>{n}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Gráfico linha conversão mensal */}
      {(sumario.serieConversao||[]).length > 1 && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Conversão mês a mês</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, overflowX: 'auto', paddingBottom: 8 }}>
            {sumario.serieConversao.map(item => {
              const max = Math.max(...sumario.serieConversao.map(x=>x.taxa), 1)
              const h   = Math.max((item.taxa / max) * 100, 4)
              const [y, m] = item.mes.split('-')
              return (
                <div key={item.mes} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 44, flex: '1 0 44px' }}>
                  <span style={{ fontSize: 10, color: '#9a9c9f', fontFamily: 'DM Mono, monospace' }}>{item.taxa}%</span>
                  <div style={{ width: '100%', maxWidth: 40, height: `${h}%`, background: item.taxa > 30 ? '#97A624' : '#D9B504', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                  <span style={{ fontSize: 9, color: '#9a9c9f', textAlign: 'center' }}>{m}/{y?.slice(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
