'use client'

import { useState } from 'react'
import { usePorLoja } from '../../useComercial'

function fmtBRL(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }

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
