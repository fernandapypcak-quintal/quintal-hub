import React, { useMemo } from 'react'
import { fmt, fmtPct } from '../../utils.js'
import { sortMesLabel } from '../../hooks/useFinanceiro.jsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function Semaforo({ pct, limiarAlerta = 15, limiarCritico = 30 }) {
  if (Math.abs(pct) < 2) {
    return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:99, fontSize:11, fontWeight:600, background:'#F5F5F5', color:'#888' }}>
      <Minus size={10}/> estável
    </span>
  }
  const up     = pct > 0
  const critico = Math.abs(pct) >= limiarCritico
  const alerta  = Math.abs(pct) >= limiarAlerta
  const bg    = up ? (critico ? '#FEF2F2' : alerta ? '#FFFBEB' : '#F0FDF4') : '#F0FDF4'
  const color = up ? (critico ? '#dc2626' : alerta ? '#d97706' : '#16a34a') : '#16a34a'
  const Icon  = up ? TrendingUp : TrendingDown
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:99, fontSize:11, fontWeight:600, background:bg, color }}>
      <Icon size={10}/> {up?'+':''}{fmtPct(pct)}
    </span>
  )
}

export default function RankingCategorias({ historicoCat, titulo, limiarAlerta = 15, limiarCritico = 30 }) {
  const { ranking, ultMes, prevMes, totalUlt } = useMemo(() => {
    if (!historicoCat || historicoCat.length === 0)
      return { ranking:[], ultMes:'', prevMes:'', totalUlt:0 }

    const meses = sortMesLabel([...new Set(historicoCat.map(h => h.mes))])
    const ult   = meses[meses.length - 1]
    const prev  = meses[meses.length - 2]
    const cats  = [...new Set(historicoCat.map(h => h.categoria))]

    const rows = cats.map(cat => {
      const atual    = historicoCat.filter(h => h.mes === ult  && h.categoria === cat).reduce((s,h) => s+h.realizado, 0)
      const anterior = historicoCat.filter(h => h.mes === prev && h.categoria === cat).reduce((s,h) => s+h.realizado, 0)
      const difPct   = anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0
      return { categoria: cat, atual, anterior, difPct }
    }).filter(r => r.atual > 0).sort((a,b) => b.atual - a.atual)

    const total = rows.reduce((s, r) => s + r.atual, 0)
    return { ranking: rows, ultMes: ult, prevMes: prev, totalUlt: total }
  }, [historicoCat])

  if (ranking.length === 0) return null

  const max = ranking[0]?.atual || 1

  return (
    <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #F7F7F7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>{titulo || 'Ranking por Categoria'}</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>
            {ultMes} vs {prevMes} · total {fmt(totalUlt)}
          </div>
        </div>
        <div style={{ display:'flex', gap:12, fontSize:11, color:'#BBB' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:2, background:'#FEF2F2', border:'1px solid #dc2626', display:'inline-block' }}/> &gt;{limiarCritico}%</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:2, background:'#FFFBEB', border:'1px solid #d97706', display:'inline-block' }}/> &gt;{limiarAlerta}%</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:2, background:'#F0FDF4', border:'1px solid #16a34a', display:'inline-block' }}/> normal</span>
        </div>
      </div>

      <div style={{ padding:'8px 0' }}>
        {ranking.map((row, i) => {
          const pct     = row.atual / totalUlt * 100
          const barW    = row.atual / max * 100
          const critico = Math.abs(row.difPct) >= limiarCritico
          const alerta  = Math.abs(row.difPct) >= limiarAlerta
          const barColor = row.difPct > 0
            ? (critico ? '#ef4444' : alerta ? '#f59e0b' : '#22c55e')
            : '#22c55e'

          return (
            <div key={row.categoria} style={{
              padding: '10px 20px',
              borderBottom: i < ranking.length-1 ? '1px solid #F7F7F7' : 'none',
              display: 'grid',
              gridTemplateColumns: '160px 1fr 110px 90px',
              alignItems: 'center',
              gap: 12,
            }}>
              {/* Nome */}
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {row.categoria}
                </div>
                <div style={{ fontSize:11, color:'#BBB', marginTop:2 }}>{pct.toFixed(1)}% do total</div>
              </div>

              {/* Barra */}
              <div>
                <div style={{ height:6, background:'#F5F5F5', borderRadius:99, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', width:`${barW}%`,
                    background: barColor,
                    borderRadius:99,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }}/>
                </div>
              </div>

              {/* Valor */}
              <div style={{ textAlign:'right', fontSize:13, fontWeight:600, fontVariantNumeric:'tabular-nums', color:'#1a1a1a' }}>
                {fmt(row.atual)}
              </div>

              {/* Semáforo */}
              <div style={{ textAlign:'right' }}>
                <Semaforo pct={row.difPct} limiarAlerta={limiarAlerta} limiarCritico={limiarCritico}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
