import React, { useMemo } from 'react'
import { fmt, fmtPct } from '../../utils.js'
import { sortMesLabel } from '../../hooks/useFinanceiro.jsx'

function corCelula(pct) {
  if (pct === null || isNaN(pct)) return { bg:'#F5F5F5', color:'#BBB', text:'—' }
  const abs = Math.abs(pct)
  if (pct > 30)  return { bg:'#FEF2F2', color:'#dc2626', text:`+${pct.toFixed(0)}%` }
  if (pct > 15)  return { bg:'#FFFBEB', color:'#d97706', text:`+${pct.toFixed(0)}%` }
  if (pct > 5)   return { bg:'#FFF9F0', color:'#c28a00', text:`+${pct.toFixed(0)}%` }
  if (pct > -5)  return { bg:'#F5F5F5', color:'#888',    text:`${pct.toFixed(0)}%`  }
  if (pct > -15) return { bg:'#F0FDF4', color:'#16a34a', text:`${pct.toFixed(0)}%`  }
  return             { bg:'#DCFCE7', color:'#15803d', text:`${pct.toFixed(0)}%`  }
}

/**
 * Heatmap de categorias × lojas
 * Mostra % de desvio de cada loja vs média da rede por categoria
 */
export default function HeatmapLojas({ historicoCatRaw }) {
  const { lojas, categorias, grid, mediaRede } = useMemo(() => {
    if (!historicoCatRaw || historicoCatRaw.length === 0)
      return { lojas:[], categorias:[], grid:{}, mediaRede:{} }

    // Pega o último mês disponível
    const meses = sortMesLabel([...new Set(historicoCatRaw.map(h => h.mes))])
    const ult   = meses[meses.length - 1]
    const dados = historicoCatRaw.filter(h => h.mes === ult)

    const lojas      = [...new Set(dados.map(h => h.loja))].sort()
    const categorias = [...new Set(dados.map(h => h.categoria))].sort()

    // Monta grid: cat → loja → valor
    const grid = {}
    categorias.forEach(cat => {
      grid[cat] = {}
      lojas.forEach(loja => {
        grid[cat][loja] = dados
          .filter(h => h.categoria === cat && h.loja === loja)
          .reduce((s,h) => s + h.realizado, 0)
      })
    })

    // Média da rede por categoria
    const mediaRede = {}
    categorias.forEach(cat => {
      const vals = lojas.map(l => grid[cat][l]).filter(v => v > 0)
      mediaRede[cat] = vals.length ? vals.reduce((s,v) => s+v, 0) / vals.length : 0
    })

    // Filtra categorias com valor relevante
    const catsRelevantes = categorias
      .filter(cat => mediaRede[cat] > 0)
      .sort((a,b) => mediaRede[b] - mediaRede[a])
      .slice(0, 12) // top 12 categorias

    return { lojas, categorias: catsRelevantes, grid, mediaRede, ultMes: ult }
  }, [historicoCatRaw])

  if (categorias.length === 0 || lojas.length === 0) return null

  return (
    <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #F7F7F7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>Heatmap — Custo por Loja vs Média da Rede</div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>% de desvio em relação à média das unidades · vermelho = acima · verde = abaixo</div>
        </div>
        <div style={{ display:'flex', gap:8, fontSize:11, color:'#888' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:'#FEF2F2', border:'1px solid #dc2626', display:'inline-block' }}/>&gt;30%</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:'#FFFBEB', border:'1px solid #d97706', display:'inline-block' }}/>&gt;15%</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:'#F0FDF4', border:'1px solid #16a34a', display:'inline-block' }}/>&lt;-5%</span>
        </div>
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
          <thead>
            <tr>
              <th style={{ padding:'8px 14px', textAlign:'left', color:'#888', fontWeight:500, background:'#FAFAFA', borderBottom:'1px solid #F0F0F0', whiteSpace:'nowrap', minWidth:130 }}>Categoria</th>
              <th style={{ padding:'8px 10px', textAlign:'right', color:'#888', fontWeight:500, background:'#FAFAFA', borderBottom:'1px solid #F0F0F0', whiteSpace:'nowrap' }}>Média rede</th>
              {lojas.map(loja => (
                <th key={loja} style={{ padding:'8px 6px', textAlign:'center', color:'#555', fontWeight:500, background:'#FAFAFA', borderBottom:'1px solid #F0F0F0', whiteSpace:'nowrap', minWidth:72 }}>
                  {loja === 'Holding (Consolidado)' ? 'Holding' : loja}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat, ci) => (
              <tr key={cat} style={{ background: ci%2===0?'#fff':'#FAFAFA' }}>
                <td style={{ padding:'8px 14px', fontWeight:500, color:'#1a1a1a', borderBottom:'1px solid #F7F7F7', whiteSpace:'nowrap' }}>
                  {cat}
                </td>
                <td style={{ padding:'8px 10px', textAlign:'right', color:'#888', fontVariantNumeric:'tabular-nums', borderBottom:'1px solid #F7F7F7', whiteSpace:'nowrap' }}>
                  {fmt(mediaRede[cat])}
                </td>
                {lojas.map(loja => {
                  const val  = grid[cat]?.[loja] || 0
                  const med  = mediaRede[cat] || 0
                  const pct  = med > 0 ? ((val - med) / med) * 100 : null
                  const cfg  = val > 0 ? corCelula(pct) : { bg:'#F5F5F5', color:'#DDD', text:'—' }
                  return (
                    <td key={loja} style={{ padding:'6px', textAlign:'center', borderBottom:'1px solid #F7F7F7', minWidth:72 }}>
                      <div title={val > 0 ? fmt(val) : 'sem dados'} style={{
                        background: cfg.bg,
                        color: cfg.color,
                        borderRadius:6,
                        padding:'4px 6px',
                        fontSize:11,
                        fontWeight: 600,
                        fontVariantNumeric:'tabular-nums',
                        cursor: val > 0 ? 'default' : 'default',
                      }}>
                        {cfg.text}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
