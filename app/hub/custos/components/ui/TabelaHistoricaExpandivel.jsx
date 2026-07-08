import React, { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { fmt, fmtPct } from '../../utils.js'
import { sortMesLabel } from '../../hooks/useFinanceiro.jsx'

function VarBadge({ pct }) {
  if (pct === 0 || pct === undefined) return <span style={{ fontSize:11, color:'#CCC' }}>—</span>
  const color = pct > 10 ? '#dc2626' : pct > 0 ? '#d97706' : '#16a34a'
  const bg    = pct > 10 ? '#FEF2F2' : pct > 0 ? '#FFFBEB' : '#F0FDF4'
  return (
    <span style={{ display:'inline-block', padding:'2px 7px', borderRadius:99, fontSize:11, fontWeight:600, fontVariantNumeric:'tabular-nums', background:bg, color }}>
      {fmtPct(pct)}
    </span>
  )
}

function ValorCelula({ val, prevVal }) {
  if (!val) return <span style={{ color:'#CCC', fontSize:12 }}>—</span>
  const changed = prevVal !== null && prevVal !== undefined && val !== prevVal
  const up = changed && val > prevVal
  return (
    <span style={{
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      color: changed ? (up ? '#dc2626' : '#16a34a') : '#1a1a1a',
      fontWeight: changed ? 600 : 400,
    }}>
      {fmt(val)}
    </span>
  )
}

/**
 * Tabela histórica expansível por categoria → subcategoria
 *
 * Props:
 *   historicoCat: [{ mes, loja, categoria, realizado }]
 *   historicoDetalhe: [{ mes, loja, categoria, subcategoria, realizado }]
 *   meses: string[] — lista de meses ordenados
 */
export default function TabelaHistoricaExpandivel({ historicoCat, historicoDetalhe, meses }) {
  const [expandidos, setExpandidos] = useState({})

  const toggle = (cat) => setExpandidos(e => ({ ...e, [cat]: !e[cat] }))

  // Categorias com totais por mês
  const categorias = useMemo(() => {
    const map = {}
    historicoCat.forEach(({ categoria, mes, realizado }) => {
      if (!map[categoria]) map[categoria] = { categoria }
      map[categoria][mes] = (map[categoria][mes] || 0) + realizado
    })
    return Object.values(map).map(row => {
      const ult  = meses[meses.length - 1]
      const prev = meses[meses.length - 2]
      const ultVal  = row[ult]  || 0
      const prevVal = row[prev] || 0
      return {
        ...row,
        varR:   ultVal - prevVal,
        varPct: prevVal > 0 ? ((ultVal - prevVal) / prevVal) * 100 : 0,
      }
    }).sort((a, b) => (b[meses[meses.length-1]] || 0) - (a[meses[meses.length-1]] || 0))
  }, [historicoCat, meses])

  // Subcategorias por categoria
  const subMap = useMemo(() => {
    const map = {}
    if (!historicoDetalhe) return map
    historicoDetalhe.forEach(({ categoria, subcategoria, mes, realizado }) => {
      if (!map[categoria]) map[categoria] = {}
      if (!map[categoria][subcategoria]) map[categoria][subcategoria] = {}
      map[categoria][subcategoria][mes] = (map[categoria][subcategoria][mes] || 0) + realizado
    })
    return map
  }, [historicoDetalhe])

  const TH = ({ ch, right }) => (
    <th style={{ fontSize:10, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#fff', background:'#1a1a1a', padding:'10px 14px', textAlign:right?'right':'left', whiteSpace:'nowrap' }}>{ch}</th>
  )

  return (
    <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'520px', borderRadius:8, border:'1px solid #E8E8E2' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead style={{ position:'sticky', top:0, zIndex:2 }}>
          <tr>
            <TH ch="Categoria"/>
            {meses.map(m => <TH key={m} ch={m}/>)}
            <TH ch="Var. R$" right/>
            <TH ch="Var. %" right/>
          </tr>
        </thead>
        <tbody>
          {categorias.map((row) => {
            const cat      = row.categoria
            const aberto   = expandidos[cat]
            const subs     = subMap[cat] ? Object.entries(subMap[cat]) : []
            // Ordena subcategorias pelo valor do último mês
            const subsSorted = subs.sort((a, b) => (b[1][meses[meses.length-1]] || 0) - (a[1][meses[meses.length-1]] || 0))

            return (
              <React.Fragment key={cat}>
                {/* Linha da categoria */}
                <tr
                  onClick={() => subs.length > 0 && toggle(cat)}
                  style={{
                    cursor: subs.length > 0 ? 'pointer' : 'default',
                    background: aberto ? '#FAFAF8' : '#fff',
                    borderBottom: '1px solid #F0F0F0',
                  }}
                  onMouseEnter={e => { if (!aberto) e.currentTarget.style.background = '#FAFAF8' }}
                  onMouseLeave={e => { if (!aberto) e.currentTarget.style.background = '#fff' }}
                >
                  {/* Nome categoria com chevron */}
                  <td style={{ padding:'11px 14px', borderBottom:'1px solid #F0F0F0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {subs.length > 0
                        ? (aberto ? <ChevronDown size={13} color="#888"/> : <ChevronRight size={13} color="#888"/>)
                        : <span style={{ width:13 }}/>
                      }
                      <span style={{ fontSize:13.5, fontWeight:600, color:'#1a1a1a' }}>{cat}</span>
                      {subs.length > 0 && (
                        <span style={{ fontSize:10, color:'#BBB', fontWeight:400 }}>({subs.length} itens)</span>
                      )}
                    </div>
                  </td>

                  {/* Valores por mês */}
                  {meses.map((m, mi) => {
                    const val  = row[m] || 0
                    const prev = mi > 0 ? (row[meses[mi-1]] || 0) : null
                    return (
                      <td key={m} style={{ padding:'11px 14px', borderBottom:'1px solid #F0F0F0', textAlign:'right', whiteSpace:'nowrap' }}>
                        <ValorCelula val={val} prevVal={prev}/>
                      </td>
                    )
                  })}

                  {/* Variação */}
                  <td style={{ padding:'11px 14px', borderBottom:'1px solid #F0F0F0', textAlign:'right', whiteSpace:'nowrap' }}>
                    <span style={{ fontSize:12, fontVariantNumeric:'tabular-nums', fontWeight:600, color: row.varR > 0 ? '#dc2626' : '#16a34a' }}>
                      {row.varR >= 0 ? '+' : ''}{fmt(row.varR)}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px', borderBottom:'1px solid #F0F0F0', textAlign:'right' }}>
                    <VarBadge pct={row.varPct}/>
                  </td>
                </tr>

                {/* Linhas de subcategoria (expandido) */}
                {aberto && subsSorted.map(([sub, valPorMes]) => {
                  const ult  = valPorMes[meses[meses.length-1]] || 0
                  const prev = valPorMes[meses[meses.length-2]] || 0
                  const subVarR   = ult - prev
                  const subVarPct = prev > 0 ? ((ult - prev) / prev) * 100 : 0

                  return (
                    <tr key={sub} style={{ background:'#FAFAF8', borderBottom:'1px solid #F5F5F5' }}>
                      <td style={{ padding:'8px 14px 8px 36px', borderBottom:'1px solid #F5F5F5' }}>
                        <span style={{ fontSize:12.5, color:'#555' }}>{sub}</span>
                      </td>
                      {meses.map((m, mi) => {
                        const val  = valPorMes[m] || 0
                        const prev = mi > 0 ? (valPorMes[meses[mi-1]] || 0) : null
                        return (
                          <td key={m} style={{ padding:'8px 14px', borderBottom:'1px solid #F5F5F5', textAlign:'right', whiteSpace:'nowrap' }}>
                            {val > 0 ? <ValorCelula val={val} prevVal={prev}/> : <span style={{ color:'#DDD', fontSize:11 }}>—</span>}
                          </td>
                        )
                      })}
                      <td style={{ padding:'8px 14px', borderBottom:'1px solid #F5F5F5', textAlign:'right', whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:11, fontVariantNumeric:'tabular-nums', fontWeight:600, color: subVarR > 0 ? '#dc2626' : subVarR < 0 ? '#16a34a' : '#BBB' }}>
                          {subVarR !== 0 ? (subVarR >= 0 ? '+' : '') + fmt(subVarR) : '—'}
                        </span>
                      </td>
                      <td style={{ padding:'8px 14px', borderBottom:'1px solid #F5F5F5', textAlign:'right' }}>
                        <VarBadge pct={subVarPct}/>
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
