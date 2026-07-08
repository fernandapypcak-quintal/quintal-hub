import React, { useMemo, useState } from 'react'
import { useFinanceiro, sortMesLabel } from '../../hooks/useFinanceiro.jsx'
import { useVariacaoMensal } from '../../hooks/useVariacaoMensal.js'
import Header from '../layout/Header.jsx'
import TabelaHistoricaExpandivel from '../ui/TabelaHistoricaExpandivel.jsx'
import RankingCategorias from '../ui/RankingCategorias.jsx'
import { fmt, fmtPct } from '../../utils.js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'

const CORES_CAT = { 'CMV':'#1a1a1a', 'Comissões':'#22c55e', 'Embalagens':'#f59e0b', 'Mão de obra variável':'#ef4444' }
const CORES = Object.values(CORES_CAT)
const TH = ({ ch, right }) => <th style={{ fontSize:10, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#fff', background:'#1a1a1a', padding:'10px 14px', textAlign:right?'right':'left', whiteSpace:'nowrap' }}>{ch}</th>
const TD = ({ ch, mono, muted, right, color }) => <td style={{ padding:'10px 14px', fontSize:13, borderBottom:'1px solid #F7F7F7', color:color||(muted?'#888':'#1a1a1a'), fontVariantNumeric:mono?'tabular-nums':undefined, textAlign:right?'right':'left' }}>{ch}</td>

function VarBadge({ pct }) {
  const color=pct>10?'#dc2626':pct>0?'#d97706':'#16a34a'
  const bg=pct>10?'#FEF2F2':pct>0?'#FFFBEB':'#F0FDF4'
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, fontVariantNumeric:'tabular-nums', background:bg, color }}>{fmtPct(pct)}</span>
}
function TabBtn({ label, ativo, onClick }) {
  return <button onClick={onClick} style={{ padding:'6px 16px', borderRadius:8, border:ativo?'none':'1px solid #E8E8E8', background:ativo?'#1a1a1a':'#fff', color:ativo?'#fff':'#666', fontSize:13, fontWeight:ativo?600:400, cursor:'pointer', fontFamily:'inherit' }}>{label}</button>
}

function useMoM(historicoCat, historicoTotal, mesFiltro) {
  return useMemo(() => {
    const totalMap = {}
    historicoTotal.forEach(({mes,total_realizado})=>{ if(!totalMap[mes]) totalMap[mes]=0; totalMap[mes]+=total_realizado })
    const sorted = sortMesLabel(Object.keys(totalMap))
    let ult, prev
    if (mesFiltro && totalMap[mesFiltro] !== undefined) {
      ult = mesFiltro
      const idx = sorted.indexOf(mesFiltro)
      prev = idx > 0 ? sorted[idx - 1] : null
    } else {
      ult  = sorted[sorted.length-1]
      prev = sorted[sorted.length-2]
    }
    const t=totalMap[ult]||0, p=prev?(totalMap[prev]||0):0
    return { mesAtual:ult||'', mesAnterior:prev||'', totalMes:t, totalAnterior:p, varR:t-p, varPct:p>0?((t-p)/p)*100:0 }
  }, [historicoCat, historicoTotal, mesFiltro])
}

export default function CustoVariavel() {
  const { historicoCatVariavelFiltrado, historicoVariavelFiltrado, historicoDetalheVariavelFiltrado, lojaFiltro, mesFiltro } = useFinanceiro()
  const [topMode,  setTopMode]  = useState('todos')
  const [lojaMode, setLojaMode] = useState('geral')

  const { meses, categorias, dadosGrafico, tabelaHistorica, ranking } = useVariacaoMensal(historicoCatVariavelFiltrado)
  const { mesAtual, mesAnterior, totalMes, totalAnterior, varR, varPct } = useMoM(historicoCatVariavelFiltrado, historicoVariavelFiltrado, mesFiltro)

  const porCategoria = useMemo(() => {
    const cats = [...new Set(historicoCatVariavelFiltrado.map(h=>h.categoria))]
    return cats.map(cat => {
      const atual    = historicoCatVariavelFiltrado.filter(h=>h.mes===mesAtual&&h.categoria===cat).reduce((s,h)=>s+h.realizado,0)
      const anterior = historicoCatVariavelFiltrado.filter(h=>h.mes===mesAnterior&&h.categoria===cat).reduce((s,h)=>s+h.realizado,0)
      return { categoria:cat, atual, anterior, difR:atual-anterior, difPct:anterior>0?((atual-anterior)/anterior)*100:0 }
    }).sort((a,b)=>b.atual-a.atual)
  }, [historicoCatVariavelFiltrado, mesAtual, mesAnterior])

  const porLoja = useMemo(() => {
    const lojas = [...new Set(historicoVariavelFiltrado.map(h=>h.loja))]
    return lojas.map(loja => {
      const atual    = historicoVariavelFiltrado.filter(h=>h.mes===mesAtual&&h.loja===loja).reduce((s,h)=>s+h.total_realizado,0)
      const anterior = historicoVariavelFiltrado.filter(h=>h.mes===mesAnterior&&h.loja===loja).reduce((s,h)=>s+h.total_realizado,0)
      return { loja, atual, anterior, difR:atual-anterior, difPct:anterior>0?((atual-anterior)/anterior)*100:0 }
    }).sort((a,b)=>b.atual-a.atual)
  }, [historicoVariavelFiltrado, mesAtual, mesAnterior])

  const porItem = useMemo(() => {
    const map = {}
    historicoCatVariavelFiltrado.forEach(({ mes, loja, categoria, realizado }) => {
      const k = `${categoria}||${loja}`
      if (!map[k]) map[k] = { categoria, loja, atual:0, anterior:0 }
      if (mes===mesAtual)    map[k].atual    += realizado
      if (mes===mesAnterior) map[k].anterior += realizado
    })
    return Object.values(map).map(r=>({ ...r, difR:r.atual-r.anterior, difPct:r.anterior>0?((r.atual-r.anterior)/r.anterior)*100:0 }))
  }, [historicoCatVariavelFiltrado, mesAtual, mesAnterior])

  const baseItens = lojaMode==='geral' ? porCategoria.map(r=>({...r,loja:'— todas —'})) : porItem
  const dadosExibidos = useMemo(() => {
    const s=[...baseItens].sort((a,b)=>b.atual-a.atual)
    if(topMode==='top20') return s.slice(0,20)
    if(topMode==='bot20') return [...s].reverse().slice(0,20)
    return s
  }, [baseItens, topMode])

  const totalExibido = dadosExibidos.reduce((s,c)=>s+c.atual,0)

  return (
    <div style={{ background:'#fff', minHeight:'100vh' }}>
      <Header title="Custo Variável"/>
      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
          {[
            { label:`Realizado — ${mesAtual||'mês atual'}`, valor:fmt(totalMes),     color:'#1a1a1a' },
            { label:`Mês Anterior — ${mesAnterior||''}`,    valor:fmt(totalAnterior), color:'#888' },
            { label:'Variação Mês a Mês', valor:fmtPct(varPct), color:varPct>5?'#dc2626':varPct>0?'#d97706':'#16a34a', sub:`${varR>=0?'+':''}${fmt(varR)}` },
          ].map(({label,valor,color,sub})=>(
            <div key={label} style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'18px 20px' }}>
              <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.05em', textTransform:'uppercase', color:'#999', marginBottom:8 }}>{label}</div>
              <div style={{ fontSize:28, fontWeight:700, color, fontVariantNumeric:'tabular-nums' }}>{valor}</div>
              {sub && <div style={{ fontSize:12, fontWeight:500, color, marginTop:6 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Ranking visual */}
        <RankingCategorias
          historicoCat={historicoCatVariavelFiltrado}
          titulo="Ranking de Custo Variável por Categoria"
        />

        {/* Ranking */}
        {(ranking.maioresAltas.length>0||ranking.maioresBaixas.length>0) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[{titulo:'Maiores Altas — mês a mês',dados:ranking.maioresAltas,up:true},{titulo:'Maiores Quedas — mês a mês',dados:ranking.maioresBaixas,up:false}].map(({titulo,dados,up})=>(
              <div key={titulo} style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #F7F7F7', fontSize:11, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'#999' }}>{titulo}</div>
                {dados.length===0 ? <div style={{ padding:'16px 18px', fontSize:13, color:'#CCC' }}>Nenhum dado</div>
                  : dados.map((r,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderBottom:'1px solid #F7F7F7' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:CORES_CAT[r.categoria]||'#ccc', flexShrink:0 }}/>
                        <span style={{ fontSize:13 }}>{r.categoria}</span>
                      </span>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <span style={{ fontSize:12, fontVariantNumeric:'tabular-nums', fontWeight:600, color:up?'#dc2626':'#16a34a' }}>{up?'+':''}{fmt(r.variacaoR)}</span>
                        <VarBadge pct={r.variacaoPct}/>
                      </div>
                    </div>
                  ))
                }
              </div>
            ))}
          </div>
        )}

        {/* Histórico por categoria */}
        {dadosGrafico.length>0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Evolução por Categoria</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:18 }}>Custo realizado mês a mês</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dadosGrafico} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={44}/>
                <Tooltip formatter={v=>fmt(v)} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                {categorias.map((cat,i)=>(
                  <Line key={cat} type="monotone" dataKey={cat} stroke={CORES_CAT[cat]||CORES[i%CORES.length]} strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela histórica expansível */}
        {meses.length > 0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F7F7F7' }}>
              <div style={{ fontSize:13, fontWeight:600 }}>Histórico por Categoria</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Clique na categoria para expandir as subcategorias · Vermelho = subiu · Verde = caiu vs mês anterior</div>
            </div>
            <TabelaHistoricaExpandivel
              historicoCat={historicoCatVariavelFiltrado}
              historicoDetalhe={historicoDetalheVariavelFiltrado}
              meses={meses}
            />
          </div>
        )}

        {/* Por loja */}
        {lojaFiltro==='Todas' && porLoja.length>0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F7F7F7' }}>
              <div style={{ fontSize:13, fontWeight:600 }}>Por Loja — {mesAtual}</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Comparativo com {mesAnterior}</div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><TH ch="Loja"/><TH ch={mesAnterior||'Anterior'} right/><TH ch={mesAtual||'Atual'} right/><TH ch="Var. R$" right/><TH ch="Var. %" right/></tr></thead>
              <tbody>
                {porLoja.map((l,i)=>(
                  <tr key={i}>
                    <TD ch={l.loja}/>
                    <TD ch={fmt(l.anterior)} mono muted right/>
                    <TD ch={fmt(l.atual)} mono right/>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600, color:l.difR>0?'#dc2626':'#16a34a', textAlign:'right' }}>{l.difR>=0?'+':''}{fmt(l.difR)}</td>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', textAlign:'right' }}><VarBadge pct={l.difPct}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Gráfico mês atual vs anterior */}
        {porCategoria.length>0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Mês Atual vs Anterior por Categoria</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:18 }}>{mesAnterior} → {mesAtual}</div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={porCategoria} margin={{ top:4, right:4, left:0, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="categoria" tick={{ fontSize:10, fill:'#BBB' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={44}/>
                <Tooltip formatter={(v,n)=>[fmt(v),n==='anterior'?mesAnterior:mesAtual]} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                <Legend formatter={n=>n==='anterior'?mesAnterior:mesAtual} iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                <Bar dataKey="anterior" name="anterior" fill="#F0F0F0" radius={[4,4,0,0]}/>
                <Bar dataKey="atual" name="atual" radius={[4,4,0,0]}>
                  {porCategoria.map(e=><Cell key={e.categoria} fill={CORES_CAT[e.categoria]||'#22c55e'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela itens */}
        <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F7F7F7', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Itens — {mesAtual}</div>
              <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{dadosExibidos.length} itens · {fmt(totalExibido)}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:6 }}>
                <TabBtn label="Geral"    ativo={lojaMode==='geral'}   onClick={()=>setLojaMode('geral')}/>
                <TabBtn label="Por Loja" ativo={lojaMode==='porloja'} onClick={()=>setLojaMode('porloja')}/>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <TabBtn label="Todos"      ativo={topMode==='todos'} onClick={()=>setTopMode('todos')}/>
                <TabBtn label="20 Maiores" ativo={topMode==='top20'} onClick={()=>setTopMode('top20')}/>
                <TabBtn label="20 Menores" ativo={topMode==='bot20'} onClick={()=>setTopMode('bot20')}/>
              </div>
            </div>
          </div>
          <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'480px', borderRadius:8, border:'1px solid #E8E8E2' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>
                <TH ch="Categoria"/>
                {lojaMode==='porloja' && <TH ch="Loja"/>}
                <TH ch={mesAnterior||'Anterior'} right/>
                <TH ch={mesAtual||'Atual'} right/>
                <TH ch="Var. R$" right/>
                <TH ch="Var. %" right/>
              </tr></thead>
              <tbody>
                {dadosExibidos.map((c,i)=>(
                  <tr key={i}>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:CORES_CAT[c.categoria]||'#ccc', flexShrink:0 }}/>
                        {c.categoria}
                      </span>
                    </td>
                    {lojaMode==='porloja' && <TD ch={c.loja} muted/>}
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
