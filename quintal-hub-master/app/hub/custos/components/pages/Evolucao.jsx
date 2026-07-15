import React, { useMemo, useState } from 'react'
import { useFinanceiro, sortMesLabel } from '../../hooks/useFinanceiro.jsx'
import Header from '../layout/Header.jsx'
import { fmt, fmtPct } from '../../utils.js'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'

const CORES_LOJAS = ['#1a1a1a','#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']
const CORES_CAT   = ['#1a1a1a','#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']


function SecaoTitle({ title, sub }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a' }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:'#999', marginTop:3 }}>{sub}</div>}
    </div>
  )
}

function VarBadge({ pct }) {
  if (pct === 0) return <span style={{ fontSize:11, color:'#BBB' }}>—</span>
  const color=pct>10?'#dc2626':pct>0?'#d97706':'#16a34a'
  const bg=pct>10?'#FEF2F2':pct>0?'#FFFBEB':'#F0FDF4'
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, background:bg, color }}>{fmtPct(pct)}</span>
}

export default function Evolucao() {
  const {
    historicoRaw,
    historicoFiltrado, historicoVariavelFiltrado,
    historicoCatFixoFiltrado, historicoCatVariavelFiltrado,
    lojaFiltro,
  } = useFinanceiro()

  // Deriva historico e historicoVariavel do raw para os gráficos por loja
  const historico         = React.useMemo(() => (historicoRaw||[]).filter(h => h.tipo === 'Fixo'),    [historicoRaw])
  const historicoVariavel = React.useMemo(() => (historicoRaw||[]).filter(h => h.tipo !== 'Fixo' && h.tipo !== 'Fora'), [historicoRaw])

  // ── 1. Total consolidado (fixo + variável) ───────────────────
  const consolidado = useMemo(() => {
    const map = {}
    const add = (arr, campo) => arr.forEach(({ mes, total_realizado }) => {
      if (!map[mes]) map[mes] = { mes, fixo:0, variavel:0 }
      map[mes][campo] += total_realizado
    })
    add(historicoFiltrado, 'fixo')
    add(historicoVariavelFiltrado, 'variavel')
    const vals = Object.values(map)
    const mesOrdem = sortMesLabel(vals.map(x => x.mes))
    vals.sort((a, b) => mesOrdem.indexOf(a.mes) - mesOrdem.indexOf(b.mes))
    return vals.map(r => ({ ...r, total: r.fixo + r.variavel }))
  }, [historicoFiltrado, historicoVariavelFiltrado])

  // ── 2. Por loja ao longo do tempo ────────────────────────────
  const lojas = useMemo(() => Array.from(new Set([...historico,...historicoVariavel].map(h=>h.loja))), [historico,historicoVariavel])
  const mesesHist = useMemo(() => sortMesLabel(Array.from(new Set([...historico,...historicoVariavel].map(h=>h.mes))).map(m=>({mes:m}))).map(x=>x.mes), [historico,historicoVariavel])

  const dadosPorLoja = useMemo(() => {
    const allH = [...historico, ...historicoVariavel]
    return mesesHist.map(mes => {
      const row = { mes }
      lojas.forEach(loja => {
        const entries = allH.filter(h => h.mes === mes && h.loja === loja)
        row[loja] = entries.reduce((s,h) => s + h.total_realizado, 0)
      })
      return row
    })
  }, [mesesHist, lojas, historico, historicoVariavel])

  // ── 3. Fixo separado por categoria ──────────────────────────
  const catsFixo = useMemo(() => Array.from(new Set(historicoCatFixoFiltrado.map(h=>h.categoria))), [historicoCatFixoFiltrado])
  const mesesFixo = useMemo(() => sortMesLabel(Array.from(new Set(historicoCatFixoFiltrado.map(h=>h.mes))).map(m=>({mes:m}))).map(x=>x.mes), [historicoCatFixoFiltrado])
  const dadosFixoCat = useMemo(() => mesesFixo.map(mes => {
    const row = { mes }
    catsFixo.forEach(cat => {
      const entries = historicoCatFixoFiltrado.filter(h=>h.mes===mes&&h.categoria===cat)
      row[cat] = entries.reduce((s,h)=>s+h.realizado,0)
    })
    return row
  }), [mesesFixo, catsFixo, historicoCatFixoFiltrado])

  // ── 4. Variável separado por categoria ───────────────────────
  const catsVar = useMemo(() => Array.from(new Set(historicoCatVariavelFiltrado.map(h=>h.categoria))), [historicoCatVariavelFiltrado])
  const mesesVar = useMemo(() => sortMesLabel(Array.from(new Set(historicoCatVariavelFiltrado.map(h=>h.mes))).map(m=>({mes:m}))).map(x=>x.mes), [historicoCatVariavelFiltrado])
  const dadosVarCat = useMemo(() => mesesVar.map(mes => {
    const row = { mes }
    catsVar.forEach(cat => {
      const entries = historicoCatVariavelFiltrado.filter(h=>h.mes===mes&&h.categoria===cat)
      row[cat] = entries.reduce((s,h)=>s+h.realizado,0)
    })
    return row
  }), [mesesVar, catsVar, historicoCatVariavelFiltrado])

  // ── 5. Ranking categorias que mais cresceram (fixo+var) ──────
  const ranking = useMemo(() => {
    const todos = [...historicoCatFixoFiltrado, ...historicoCatVariavelFiltrado]
    const cats  = Array.from(new Set(todos.map(h=>h.categoria)))
    const meses = sortMesLabel(Array.from(new Set(todos.map(h=>h.mes))).map(m=>({mes:m}))).map(x=>x.mes)
    const ult = meses[meses.length-1], prev = meses[meses.length-2]
    if (!ult || !prev) return []
    return cats.map(cat => {
      const u = todos.filter(h=>h.mes===ult&&h.categoria===cat).reduce((s,h)=>s+h.realizado,0)
      const p = todos.filter(h=>h.mes===prev&&h.categoria===cat).reduce((s,h)=>s+h.realizado,0)
      return { categoria:cat, atual:u, anterior:p, difR:u-p, difPct:p>0?((u-p)/p)*100:0 }
    }).filter(r=>r.atual>0||r.anterior>0).sort((a,b)=>b.difR-a.difR)
  }, [historicoCatFixoFiltrado, historicoCatVariavelFiltrado])

  // ── 6. Tabela resumo mensal consolidado ──────────────────────
  const resumoMensal = useMemo(() => {
    return consolidado.map((r,i) => {
      const prev = i>0 ? consolidado[i-1] : null
      const varR   = prev ? r.total - prev.total : 0
      const varPct = prev && prev.total>0 ? (varR/prev.total)*100 : 0
      return { ...r, varR, varPct }
    })
  }, [consolidado])

  const TH = ({ch,right}) => <th style={{ fontSize:10, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#fff', background:'#1a1a1a', padding:'10px 14px', textAlign:right?'right':'left', whiteSpace:'nowrap' }}>{ch}</th>

  return (
    <div style={{ background:'#fff', minHeight:'100vh' }}>
      <Header title="Evolução Histórica"/>
      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:28 }}>

        {/* ── 1. Total Consolidado ── */}
        <div>
          <SecaoTitle title="Total Consolidado" sub="Fixo + Variável · evolução do custo total"/>
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={consolidado} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="gF2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a1a1a" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={48}/>
                <Tooltip formatter={(v,n)=>[fmt(v),n==='fixo'?'Fixo':n==='variavel'?'Variável':'Total']} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                <Legend formatter={n=>n==='fixo'?'Custo Fixo':n==='variavel'?'Custo Variável':'Total'} iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                <Area type="monotone" dataKey="variavel" stackId="1" stroke="#22c55e" strokeWidth={1.5} fill="url(#gV2)" dot={false}/>
                <Area type="monotone" dataKey="fixo"     stackId="1" stroke="#1a1a1a" strokeWidth={2}   fill="url(#gF2)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela resumo */}
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden', marginTop:14 }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontWeight:600 }}>Resumo Mensal</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  <TH ch="Mês"/>
                  <TH ch="Custo Fixo" right/>
                  <TH ch="Custo Variável" right/>
                  <TH ch="Total" right/>
                  <TH ch="Var. R$ MoM" right/>
                  <TH ch="Var. % MoM" right/>
                </tr></thead>
                <tbody>
                  {resumoMensal.map((r,i)=>(
                    <tr key={i}>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontWeight:600 }}>{r.mes}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', color:'#888', textAlign:'right' }}>{fmt(r.fixo)}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', color:'#888', textAlign:'right' }}>{fmt(r.variavel)}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:700, textAlign:'right' }}>{fmt(r.total)}</td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600, color:r.varR>0?'#dc2626':'#16a34a', textAlign:'right' }}>
                        {i===0?'—':`${r.varR>=0?'+':''}${fmt(r.varR)}`}
                      </td>
                      <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', textAlign:'right' }}>
                        {i===0?<span style={{ color:'#BBB' }}>—</span>:<VarBadge pct={r.varPct}/>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── 2. Por Loja ── */}
        <div>
          <SecaoTitle title="Por Loja" sub="Custo total (fixo + variável) por unidade ao longo do tempo"/>
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dadosPorLoja} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={48}/>
                <Tooltip formatter={v=>fmt(v)} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                {lojas.map((loja,i)=>(
                  <Line key={loja} type="monotone" dataKey={loja} stroke={CORES_LOJAS[i%CORES_LOJAS.length]} strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 3. Custo Fixo por Categoria ── */}
        {dadosFixoCat.length > 0 && (
          <div>
            <SecaoTitle title="Custo Fixo por Categoria" sub="Evolução de cada categoria de custo fixo"/>
            <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dadosFixoCat} margin={{ top:4, right:4, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                  <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={44}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                  <Legend iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                  {catsFixo.map((cat,i)=>(
                    <Line key={cat} type="monotone" dataKey={cat} stroke={CORES_CAT[i%CORES_CAT.length]} strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── 4. Custo Variável por Categoria ── */}
        {dadosVarCat.length > 0 && (
          <div>
            <SecaoTitle title="Custo Variável por Categoria" sub="CMV, Comissões, Embalagens e Mão de obra"/>
            <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dadosVarCat} margin={{ top:4, right:4, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                  <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={44}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                  <Legend iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                  {catsVar.map((cat,i)=>(
                    <Line key={cat} type="monotone" dataKey={cat} stroke={CORES_CAT[i%CORES_CAT.length]} strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── 5. Ranking de crescimento ── */}
        {ranking.length > 0 && (
          <div>
            <SecaoTitle title="Ranking de Variação" sub={`Categorias que mais variaram — comparativo último mês disponível`}/>
            <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    <TH ch="#"/>
                    <TH ch="Categoria"/>
                    <TH ch="Mês Anterior" right/>
                    <TH ch="Mês Atual" right/>
                    <TH ch="Var. R$" right/>
                    <TH ch="Var. %" right/>
                  </tr></thead>
                  <tbody>
                    {ranking.map((r,i)=>(
                      <tr key={i}>
                        <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:12, color:'#BBB', fontWeight:600, width:40 }}>{i+1}</td>
                        <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontWeight:500 }}>{r.categoria}</td>
                        <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', color:'#888', textAlign:'right' }}>{fmt(r.anterior)}</td>
                        <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600, textAlign:'right' }}>{fmt(r.atual)}</td>
                        <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600, color:r.difR>0?'#dc2626':'#16a34a', textAlign:'right' }}>{r.difR>=0?'+':''}{fmt(r.difR)}</td>
                        <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', textAlign:'right' }}><VarBadge pct={r.difPct}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
