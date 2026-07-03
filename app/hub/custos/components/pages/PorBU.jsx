import React, { useMemo, useState } from 'react'
import { useFinanceiro, sortMesLabel } from '../../hooks/useFinanceiro.jsx'
import Header from '../layout/Header.jsx'
import { fmt, fmtPct } from '../../utils.js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'

const CORES = ['#1a1a1a','#97A624','#D9B504','#3b82f6','#8C1414','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#22c55e']
const TH = ({ ch, right }) => (
  <th style={{ fontSize:10, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#fff', background:'#1a1a1a', padding:'10px 14px', textAlign:right?'right':'left', whiteSpace:'nowrap' }}>{ch}</th>
)
const TD = ({ ch, mono, muted, right, color }) => (
  <td style={{ padding:'10px 14px', fontSize:13, borderBottom:'1px solid #F7F7F7', color:color||(muted?'#888':'#1a1a1a'), fontVariantNumeric:mono?'tabular-nums':undefined, textAlign:right?'right':'left' }}>{ch}</td>
)
function VarBadge({ pct }) {
  const color = pct>10?'#dc2626':pct>0?'#d97706':'#16a34a'
  const bg    = pct>10?'#FEF2F2':pct>0?'#FFFBEB':'#F0FDF4'
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, fontVariantNumeric:'tabular-nums', background:bg, color }}>{fmtPct(pct)}</span>
}
function TabBtn({ label, ativo, onClick }) {
  return <button onClick={onClick} style={{ padding:'6px 16px', borderRadius:8, border:ativo?'none':'1px solid #E8E8E8', background:ativo?'#1a1a1a':'#fff', color:ativo?'#fff':'#666', fontSize:13, fontWeight:ativo?600:400, cursor:'pointer', fontFamily:'inherit' }}>{label}</button>
}

export default function PorBU() {
  const { historicoBUFiltrado, mesFiltro, lojaFiltro } = useFinanceiro()
  const [topMode, setTopMode] = useState('todos')
  const [modo, setModo] = useState('geral') // geral | porloja

  const mesesOrdenados = useMemo(() => (
    sortMesLabel([...new Set(historicoBUFiltrado.map(h => h.mes))])
  ), [historicoBUFiltrado])

  const mesAtual    = mesFiltro && mesesOrdenados.includes(mesFiltro) ? mesFiltro : mesesOrdenados[mesesOrdenados.length - 1]
  const mesAnterior = mesesOrdenados[mesesOrdenados.indexOf(mesAtual) - 1]

  // Total do mês atual e anterior
  const { totalMes, totalAnterior, varR, varPct } = useMemo(() => {
    const t = historicoBUFiltrado.filter(h => h.mes === mesAtual).reduce((s, h) => s + h.realizado, 0)
    const p = mesAnterior ? historicoBUFiltrado.filter(h => h.mes === mesAnterior).reduce((s, h) => s + h.realizado, 0) : 0
    return { totalMes: t, totalAnterior: p, varR: t - p, varPct: p > 0 ? ((t - p) / p) * 100 : 0 }
  }, [historicoBUFiltrado, mesAtual, mesAnterior])

  // Quantas BUs ainda estão "Revisar" (sem classificação de fornecedor)
  const pctRevisar = useMemo(() => {
    const doMes = historicoBUFiltrado.filter(h => h.mes === mesAtual)
    const total = doMes.reduce((s, h) => s + h.realizado, 0)
    const revisar = doMes.filter(h => h.centro_custo === 'Revisar').reduce((s, h) => s + h.realizado, 0)
    return total > 0 ? (revisar / total) * 100 : 0
  }, [historicoBUFiltrado, mesAtual])

  // Por BU — mês atual vs anterior
  const porBU = useMemo(() => {
    const bus = [...new Set(historicoBUFiltrado.map(h => h.centro_custo))]
    return bus.map(bu => {
      const atual    = historicoBUFiltrado.filter(h => h.mes === mesAtual && h.centro_custo === bu).reduce((s, h) => s + h.realizado, 0)
      const anterior = historicoBUFiltrado.filter(h => h.mes === mesAnterior && h.centro_custo === bu).reduce((s, h) => s + h.realizado, 0)
      const difR   = atual - anterior
      const difPct = anterior > 0 ? (difR / anterior) * 100 : 0
      return { bu, atual, anterior, difR, difPct }
    }).sort((a, b) => b.atual - a.atual)
  }, [historicoBUFiltrado, mesAtual, mesAnterior])

  // Por BU + Loja (só quando "Todas as lojas" estiver selecionado, senão não faz sentido)
  const porBULoja = useMemo(() => {
    const map = {}
    historicoBUFiltrado.forEach(({ mes, loja, centro_custo, realizado }) => {
      const k = `${centro_custo}||${loja}`
      if (!map[k]) map[k] = { bu: centro_custo, loja, atual: 0, anterior: 0 }
      if (mes === mesAtual)    map[k].atual    += realizado
      if (mes === mesAnterior) map[k].anterior += realizado
    })
    return Object.values(map).map(r => ({
      ...r, difR: r.atual - r.anterior, difPct: r.anterior > 0 ? ((r.atual - r.anterior) / r.anterior) * 100 : 0,
    }))
  }, [historicoBUFiltrado, mesAtual, mesAnterior])

  const baseItens = modo === 'geral' ? porBU.map(r => ({ ...r, loja: '— todas —' })) : porBULoja

  const dadosExibidos = useMemo(() => {
    const sorted = [...baseItens].sort((a, b) => b.atual - a.atual)
    if (topMode === 'top10') return sorted.slice(0, 10)
    return sorted
  }, [baseItens, topMode])

  // Evolução mensal por BU (linhas)
  const { dadosGrafico, topBUs } = useMemo(() => {
    const totaisPorBU = {}
    historicoBUFiltrado.forEach(h => { totaisPorBU[h.centro_custo] = (totaisPorBU[h.centro_custo] || 0) + h.realizado })
    const top = Object.entries(totaisPorBU).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([bu]) => bu)

    const porMes = {}
    historicoBUFiltrado.forEach(({ mes, centro_custo, realizado }) => {
      if (!top.includes(centro_custo)) return
      if (!porMes[mes]) porMes[mes] = { mes }
      porMes[mes][centro_custo] = (porMes[mes][centro_custo] || 0) + realizado
    })
    const arr = sortMesLabel(Object.keys(porMes)).map(m => porMes[m])
    return { dadosGrafico: arr, topBUs: top }
  }, [historicoBUFiltrado])

  const totalExibido = dadosExibidos.reduce((s, c) => s + c.atual, 0)

  return (
    <div style={{ background:'#fff', minHeight:'100vh' }}>
      <Header title="Custos por BU" subtitle="Classificação automática por Fornecedor + Natureza"/>
      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {[
            { label:`Realizado — ${mesAtual||'mês atual'}`, valor:fmt(totalMes), color:'#1a1a1a', sub:null },
            { label:`Mês Anterior — ${mesAnterior||''}`,    valor:fmt(totalAnterior), color:'#888', sub:null },
            { label:'Variação Mês a Mês', valor:fmtPct(varPct),
              color:varPct>5?'#dc2626':varPct>0?'#d97706':'#16a34a',
              sub:`${varR>=0?'+':''}${fmt(varR)}` },
            { label:'% Ainda sem BU (Revisar)', valor:fmtPct(pctRevisar),
              color: pctRevisar>5?'#dc2626':pctRevisar>0?'#d97706':'#16a34a',
              sub:'Fornecedor não mapeado' },
          ].map(({label,valor,color,sub})=>(
            <div key={label} style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.05em', textTransform:'uppercase', color:'#999', marginBottom:8 }}>{label}</div>
              <div style={{ fontSize:24, fontWeight:700, color, fontVariantNumeric:'tabular-nums' }}>{valor}</div>
              {sub && <div style={{ fontSize:12, fontWeight:500, color:'#999', marginTop:6 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Gráfico mês atual por BU */}
        {porBU.length>0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Mês Atual vs Anterior por BU</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:18 }}>{mesAnterior} → {mesAtual}</div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={porBU} margin={{ top:4, right:4, left:0, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="bu" tick={{ fontSize:10, fill:'#BBB' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={70}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={44}/>
                <Tooltip formatter={(v,n)=>[fmt(v),n==='anterior'?mesAnterior:mesAtual]} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                <Legend formatter={n=>n==='anterior'?mesAnterior:mesAtual} iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                <Bar dataKey="anterior" name="anterior" fill="#F0F0F0" radius={[4,4,0,0]}/>
                <Bar dataKey="atual" name="atual" radius={[4,4,0,0]}>
                  {porBU.map(e=><Cell key={e.bu} fill={e.bu==='Revisar'?'#D9B504':(e.difPct>10?'#dc2626':e.difPct>0?'#f59e0b':'#22c55e')}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Evolução histórica por BU */}
        {dadosGrafico.length>0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Evolução por BU</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:18 }}>8 maiores BUs · custo realizado mês a mês</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dadosGrafico} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={44}/>
                <Tooltip formatter={v=>fmt(v)} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                {topBUs.map((bu,i)=>(
                  <Line key={bu} type="monotone" dataKey={bu} stroke={CORES[i%CORES.length]} strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela Geral/Por Loja */}
        <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F7F7F7', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>BUs — {mesAtual}</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{dadosExibidos.length} itens · {fmt(totalExibido)}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {lojaFiltro==='Todas' && (
                <div style={{ display:'flex', gap:6 }}>
                  <TabBtn label="Geral"    ativo={modo==='geral'}   onClick={()=>setModo('geral')}/>
                  <TabBtn label="Por Loja" ativo={modo==='porloja'} onClick={()=>setModo('porloja')}/>
                </div>
              )}
              <div style={{ display:'flex', gap:6 }}>
                <TabBtn label="Todos"     ativo={topMode==='todos'} onClick={()=>setTopMode('todos')}/>
                <TabBtn label="Top 10"    ativo={topMode==='top10'} onClick={()=>setTopMode('top10')}/>
              </div>
            </div>
          </div>
          <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'480px', borderRadius:8, border:'1px solid #E8E8E2' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>
                <TH ch="Centro de Custo (BU)"/>
                {modo==='porloja' && <TH ch="Loja"/>}
                <TH ch={mesAnterior||'Anterior'} right/>
                <TH ch={mesAtual||'Atual'} right/>
                <TH ch="Var. R$" right/>
                <TH ch="Var. %" right/>
              </tr></thead>
              <tbody>
                {dadosExibidos.map((c,i)=>(
                  <tr key={i}>
                    <TD ch={c.bu} color={c.bu==='Revisar' ? '#D9B504' : undefined}/>
                    {modo==='porloja' && <TD ch={c.loja} muted/>}
                    <TD ch={fmt(c.anterior)} mono muted right/>
                    <TD ch={fmt(c.atual)} mono right/>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600, color:c.difR>0?'#dc2626':'#16a34a', textAlign:'right' }}>{c.difR>=0?'+':''}{fmt(c.difR)}</td>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', textAlign:'right' }}><VarBadge pct={c.difPct}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
