'use client'

import { useState } from 'react'
import { usePorLoja, usePorLojaDetalhe } from '../../useComercial'

function fmtBRL(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }
function fmtBRLCompacto(v: number) {
  if (!v && v !== 0) return '—'
  if (Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}
function hojeYm() { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}` }

function VarBadge({ v }: { v: number | null }) {
  if (v === null) return <span style={{ fontSize: 11, color: '#c9ccd1' }}>—</span>
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: v >= 0 ? '#eaf3de' : '#fdeaea', color: v >= 0 ? '#3B6D11' : '#a32d2d' }}>
      {v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%
    </span>
  )
}

// Painel principal "Por Loja", no padrão do módulo Faturamento (Stores.jsx):
// card por loja com YoY cortado no dia, tendência, tendência vs ano anterior,
// peso na rede, melhor dia, e evolução mensal. Sem Meta/Atingimento — não
// existe meta por loja pro B2B, só a meta única da empresa (3 faixas).
function PainelPorLojaDetalhe({ filtros }: { filtros: any }) {
  const mesFiltro = filtros?.mes ? `${filtros.ano}-${String(filtros.mes).padStart(2,'0')}` : hojeYm()
  const { dados, loading, erro } = usePorLojaDetalhe(filtros, mesFiltro)
  const [expandida, setExpandida] = useState<string | null>(null)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!dados || !dados.lojas) return null

  const { lojas, diaCorte, ehMesCorrente } = dados
  const nomesMesesLong = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const nomeMes = nomesMesesLong[parseInt(mesFiltro.split('-')[1])-1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
      {ehMesCorrente && diaCorte && (
        <div style={{ background: '#fffbe6', border: '0.5px solid #f0e0a0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#8a7405' }}>
          Comparações YoY cortadas no dia {diaCorte} — {nomeMes}/{mesFiltro.split('-')[0]} vs mesmo período do ano anterior. Tend Fat = projeção do mês cheio no ritmo atual.
        </div>
      )}

      {lojas.map(l => {
        const isExp = expandida === l.loja
        const maxEvolucao = Math.max(...l.evolucaoMensal.map((e: any) => e.receita), 1)
        return (
          <div key={l.loja} style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderLeft: '4px solid #97A624', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setExpandida(isExp ? null : l.loja)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.loja}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRLCompacto(l.realAtual)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>YoY {ehMesCorrente ? `(dia ${diaCorte})` : ''}</div>
                  <VarBadge v={l.yoy} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Tend Fat</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#185FA5' }}>{fmtBRLCompacto(l.tendFat)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Tend vs AA</div>
                  <VarBadge v={l.tendVsAA} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Peso</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{l.peso}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Melhor dia</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{l.melhorDia || '—'}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
                  {l.evolucaoMensal.map((e: any) => (
                    <div key={e.periodo} title={`${e.label}: ${fmtBRLCompacto(e.receita)}`} style={{ width: 7, height: `${Math.max((e.receita/maxEvolucao)*36,2)}px`, background: '#c3d89a', borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            </div>

            {isExp && (
              <div style={{ padding: '16px 20px', borderTop: '0.5px solid #E8E8E2', background: '#FAFAF8' }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Fechamentos no mês</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{l.won}</div></div>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Ticket médio</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.ticketMedio)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Mesmo período ano ant.</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.realAnoAnterior)}</div></div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>Evolução mensal</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130, overflowX: 'auto' }}>
                  {l.evolucaoMensal.map((e: any) => (
                    <div key={e.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 50, flex: '1 0 50px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#3B6D11', fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(e.receita)}</span>
                      <div style={{ width: '100%', maxWidth: 30, height: `${Math.max((e.receita/maxEvolucao)*90,3)}px`, background: '#97A624', borderRadius: '3px 3px 0 0' }} />
                      <span style={{ fontSize: 10, color: '#9a9c9f' }}>{e.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PorLoja({ filtros }: { filtros: any }) {
  const { lojas, loading, erro } = usePorLoja(filtros)
  const [expandida, setExpandida] = useState<string | null>(null)

  if (loading) return <div style={{ padding:40,textAlign:'center',color:'#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding:20,background:'#fdeaea',borderRadius:10,color:'#a32d2d',fontSize:13 }}>Erro: {erro}</div>

  const entries = Object.entries(lojas).sort((a,b) => b[1].receita - a[1].receita)
  const totalReceita = entries.reduce((s,[,l])=>s+l.receita, 0)
  const totalWon     = entries.reduce((s,[,l])=>s+l.won, 0)
  const totalOpen    = entries.reduce((s,[,l])=>s+l.open, 0)

  return (
    <div style={{ padding:'20px' }}>
      <PainelPorLojaDetalhe filtros={filtros} />

      {/* Totais */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { label:'Lojas ativas', value:String(entries.length), color:'#97A624' },
          { label:'Receita total', value:fmtBRL(totalReceita), color:'#3B6D11' },
          { label:'Eventos ganhos', value:String(totalWon), color:'#185FA5' },
          { label:'Em aberto', value:String(totalOpen), color:'#D9B504' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,padding:'14px 18px',borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:10,fontWeight:600,color:'#9a9c9f',textTransform:'uppercase',marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:22,fontWeight:600,fontFamily:'DM Mono, monospace' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Cards por loja */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14 }}>
        {entries.map(([nome, loja]) => {
          const taxa       = loja.total > 0 ? ((loja.won/loja.total)*100).toFixed(1) : '0'
          const ticketMedio= loja.won > 0 ? Math.round(loja.receita/loja.won) : 0
          const receitaPct = totalReceita > 0 ? ((loja.receita/totalReceita)*100).toFixed(1) : '0'
          const isExp      = expandida === nome
          const topPacotes = Object.entries(loja.pacotes).sort((a,b)=>b[1]-a[1]).slice(0,3)

          return (
            <div key={nome} style={{ background:'#fff',border:'0.5px solid #E8E8E2',borderRadius:14,overflow:'hidden',cursor:'pointer' }}
              onClick={() => setExpandida(isExp ? null : nome)}>
              {/* Header da loja */}
              <div style={{ padding:'14px 16px',background:'linear-gradient(135deg,#4F6B14,#97A624)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{nome}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.75)',marginTop:2 }}>{loja.total} deals · {taxa}% conv.</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16,fontWeight:700,color:'#fff',fontFamily:'DM Mono, monospace' }}>{fmtBRL(loja.receita)}</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,0.65)',marginTop:2 }}>{receitaPct}% da rede</div>
                </div>
              </div>

              {/* Métricas */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:'0.5px solid #E8E8E2' }}>
                {[
                  { label:'Ganhos',  value:String(loja.won),  color:'#3B6D11' },
                  { label:'Abertos', value:String(loja.open), color:'#185FA5' },
                  { label:'Perdidos',value:String(loja.lost), color:'#a32d2d' },
                  { label:'Ticket',  value:fmtBRL(ticketMedio), color:'#0D0F14' },
                ].map((m,i) => (
                  <div key={m.label} style={{ padding:'10px 12px',borderRight:i<3?'0.5px solid #E8E8E2':'none',textAlign:'center' }}>
                    <div style={{ fontSize:10,color:'#9a9c9f',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:3 }}>{m.label}</div>
                    <div style={{ fontSize:14,fontWeight:700,fontFamily:'DM Mono, monospace',color:m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Barra de receita relativa */}
              <div style={{ height:4,background:'#F5F5F2' }}>
                <div style={{ height:'100%',width:`${receitaPct}%`,background:'#97A624',transition:'width 0.3s' }} />
              </div>

              {/* Pacotes (expansível) */}
              {isExp && topPacotes.length > 0 && (
                <div style={{ padding:'12px 16px',borderTop:'0.5px solid #E8E8E2' }}>
                  <div style={{ fontSize:11,fontWeight:600,color:'#9a9c9f',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Top pacotes</div>
                  {topPacotes.map(([pac,n]) => (
                    <div key={pac} style={{ display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid #F5F5F2',fontSize:12 }}>
                      <span style={{ color:'#5a5c5f' }}>{pac}</span>
                      <span style={{ fontFamily:'DM Mono, monospace',fontWeight:600 }}>{n}x</span>
                    </div>
                  ))}
                </div>
              )}

              {!isExp && topPacotes.length > 0 && (
                <div style={{ padding:'8px 16px',fontSize:11,color:'#9a9c9f',textAlign:'center' }}>
                  clique para ver pacotes ↓
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
