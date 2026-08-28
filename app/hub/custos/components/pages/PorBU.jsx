import React, { useMemo, useState, useEffect } from 'react'
import { useFinanceiro, sortMesLabel } from '../../hooks/useFinanceiro.jsx'
import { loadDetalheLancamentosPorBU } from '../../data/loader.js'
import Header from '../layout/Header.jsx'
import { fmt, fmtPct } from '../../utils.js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'
import { X, Loader2, ChevronRight, ChevronDown, Download, Search, Flag } from 'lucide-react'
import { reportarDivergenciaBU } from '../../data/loader.js'

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

// Exporta uma lista de lançamentos como CSV e dispara o download no navegador
function exportarCSV(linhas, nomeArquivo) {
  if (!linhas || linhas.length === 0) return
  const colunas = ['mes','loja','fornecedor','descricao','categoria','tipo','centro_custo','valor','vencto','dt_baixa']
  const escapar = v => `"${String(v ?? '').replace(/"/g,'""')}"`
  const cabecalho = ['Mês','Loja','Fornecedor','Descrição','Categoria','Tipo','BU','Valor','Vencimento','Dt. Baixa']
  const linhasCsv = [
    cabecalho.join(';'),
    ...linhas.map(l => colunas.map(c => escapar(l[c])).join(';')),
  ]
  const csv = '\uFEFF' + linhasCsv.join('\r\n') // BOM pro Excel abrir acentuação certa
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Botão "🚩 Reportar" — abre um mini-formulário inline pra dizer que aquele
// lançamento não é da BU que está sendo mostrada, e sugerir a BU certa.
// Autocontido (cada linha tem seu próprio estado de aberto/fechado).
function BotaoReportarDivergencia({ item, busDisponiveis, mesAtual }) {
  const [aberto, setAberto] = useState(false)
  const [buSugerida, setBuSugerida] = useState('')
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const opcoesBu = busDisponiveis.filter(b => b !== 'Todas' && b !== item.centro_custo)

  const enviar = async () => {
    if (!buSugerida) return
    setEnviando(true)
    const ok = await reportarDivergenciaBU({
      fornecedor: item.fornecedor,
      descricao: item.descricao,
      buAtual: item.centro_custo,
      buSugerido: buSugerida,
      mes: item.mes || mesAtual,
      loja: item.loja,
      valor: item.valor,
      observacao,
    })
    setEnviando(false)
    if (ok) { setEnviado(true); setTimeout(() => setAberto(false), 1500) }
  }

  if (enviado) {
    return <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>✓ Reportado</span>
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} title="Essa conta não é dessa BU?"
        style={{ border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', padding:4, opacity:0.5 }}>
        <Flag size={14} color="#8C1414"/>
      </button>
    )
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', background:'#FFF9E8', padding:'6px 8px', borderRadius:8 }}>
      <select value={buSugerida} onChange={e => setBuSugerida(e.target.value)}
        style={{ fontSize:12, padding:'4px 6px', borderRadius:6, border:'1px solid #E8E8E8', fontFamily:'inherit' }}>
        <option value="">Qual BU é a certa?</option>
        {opcoesBu.map(bu => <option key={bu} value={bu}>{bu}</option>)}
      </select>
      <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observação (opcional)"
        style={{ fontSize:12, padding:'4px 6px', borderRadius:6, border:'1px solid #E8E8E8', width:140, fontFamily:'inherit' }}/>
      <button onClick={enviar} disabled={!buSugerida || enviando}
        style={{ fontSize:12, padding:'4px 10px', borderRadius:6, border:'none', background: buSugerida ? '#1a1a1a' : '#DDD', color:'#fff', cursor: buSugerida ? 'pointer' : 'default', fontFamily:'inherit' }}>
        {enviando ? '...' : 'Enviar'}
      </button>
      <button onClick={() => setAberto(false)} style={{ border:'none', background:'transparent', cursor:'pointer', display:'flex' }}>
        <X size={13} color="#999"/>
      </button>
    </div>
  )
}

export default function PorBU() {
  const { historicoBUFiltrado, mesFiltro, lojaFiltro } = useFinanceiro()
  const [topMode, setTopMode] = useState('todos')
  const [modo, setModo] = useState('geral') // geral | porloja
  const [tipoView, setTipoView] = useState('tudo') // tudo | Fixo | Variável — afeta os gráficos
  const [buscaFornecedor, setBuscaFornecedor] = useState('')
  const [buscaFornecedorAtiva, setBuscaFornecedorAtiva] = useState('') // termo que efetivamente disparou a busca
  const [resultadoBusca, setResultadoBusca] = useState([])
  const [buscandoFornecedor, setBuscandoFornecedor] = useState(false)

  const [buSelecionada, setBuSelecionada] = useState(null)   // >>> NOVO — BU escolhida pro detalhe
  const [buFiltroLocal, setBuFiltroLocal] = useState('Todas') // >>> NOVO — filtro de BU dentro da própria página
  const [detalhe, setDetalhe] = useState([])                  // >>> NOVO
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false) // >>> NOVO
  const [categoriaExpandida, setCategoriaExpandida] = useState(null) // >>> NOVO — qual categoria está expandida mostrando os lançamentos

  const mesesOrdenados = useMemo(() => (
    sortMesLabel([...new Set(historicoBUFiltrado.map(h => h.mes))])
  ), [historicoBUFiltrado])

  // Lista de BUs pro seletor local da página                              // >>> NOVO
  const busParaFiltro = useMemo(() => (
    ['Todas', ...Array.from(new Set(historicoBUFiltrado.map(h => h.centro_custo))).sort()]
  ), [historicoBUFiltrado])

  // Aplica o filtro de BU local (independente do filtro global do Header) // >>> NOVO
  const dadosBase = useMemo(() => (
    buFiltroLocal === 'Todas' ? historicoBUFiltrado : historicoBUFiltrado.filter(h => h.centro_custo === buFiltroLocal)
  ), [historicoBUFiltrado, buFiltroLocal])

  const mesAtual    = mesFiltro && mesesOrdenados.includes(mesFiltro) ? mesFiltro : mesesOrdenados[mesesOrdenados.length - 1]
  const mesAnterior = mesesOrdenados[mesesOrdenados.indexOf(mesAtual) - 1]

  // Total do mês atual e anterior
  const { totalMes, totalAnterior, varR, varPct } = useMemo(() => {
    const t = dadosBase.filter(h => h.mes === mesAtual).reduce((s, h) => s + h.realizado, 0)
    const p = mesAnterior ? dadosBase.filter(h => h.mes === mesAnterior).reduce((s, h) => s + h.realizado, 0) : 0
    return { totalMes: t, totalAnterior: p, varR: t - p, varPct: p > 0 ? ((t - p) / p) * 100 : 0 }
  }, [dadosBase, mesAtual, mesAnterior])

  // Quantas BUs ainda estão "Revisar" (sem classificação de fornecedor)
  const pctRevisar = useMemo(() => {
    const doMes = dadosBase.filter(h => h.mes === mesAtual)
    const total = doMes.reduce((s, h) => s + h.realizado, 0)
    const revisar = doMes.filter(h => h.centro_custo === 'Revisar').reduce((s, h) => s + h.realizado, 0)
    return total > 0 ? (revisar / total) * 100 : 0
  }, [dadosBase, mesAtual])

  // Por BU — mês atual vs anterior, já com o comparativo Fixo x Variável
  const porBU = useMemo(() => {
    const bus = [...new Set(dadosBase.map(h => h.centro_custo))]
    return bus.map(bu => {
      const doMesAtual = dadosBase.filter(h => h.mes === mesAtual && h.centro_custo === bu)
      const fixoAtual     = doMesAtual.filter(h => h.tipo === 'Fixo').reduce((s, h) => s + h.realizado, 0)
      const variavelAtual = doMesAtual.filter(h => h.tipo === 'Variável').reduce((s, h) => s + h.realizado, 0)
      const atual    = fixoAtual + variavelAtual
      const anterior = dadosBase.filter(h => h.mes === mesAnterior && h.centro_custo === bu).reduce((s, h) => s + h.realizado, 0)
      const difR   = atual - anterior
      const difPct = anterior > 0 ? (difR / anterior) * 100 : 0
      return { bu, fixoAtual, variavelAtual, atual, anterior, difR, difPct }
    }).sort((a, b) => b.atual - a.atual)
  }, [dadosBase, mesAtual, mesAnterior])

  // Por BU + Loja (só quando "Todas as lojas" estiver selecionado, senão não faz sentido)
  const porBULoja = useMemo(() => {
    const map = {}
    dadosBase.forEach(({ mes, loja, centro_custo, tipo, realizado }) => {
      const k = `${centro_custo}||${loja}`
      if (!map[k]) map[k] = { bu: centro_custo, loja, fixoAtual: 0, variavelAtual: 0, atual: 0, anterior: 0 }
      if (mes === mesAtual) {
        map[k].atual += realizado
        if (tipo === 'Fixo')     map[k].fixoAtual     += realizado
        if (tipo === 'Variável') map[k].variavelAtual += realizado
      }
      if (mes === mesAnterior) map[k].anterior += realizado
    })
    return Object.values(map).map(r => ({
      ...r, difR: r.atual - r.anterior, difPct: r.anterior > 0 ? ((r.atual - r.anterior) / r.anterior) * 100 : 0,
    }))
  }, [dadosBase, mesAtual, mesAnterior])

  // Base filtrada por tipo — só pros gráficos (Tudo/Fixo/Variável)
  const dadosBaseGrafico = useMemo(() => (
    tipoView === 'tudo' ? dadosBase : dadosBase.filter(h => h.tipo === tipoView)
  ), [dadosBase, tipoView])

  const baseItens = modo === 'geral' ? porBU.map(r => ({ ...r, loja: '— todas —' })) : porBULoja

  const dadosExibidos = useMemo(() => {
    const sorted = [...baseItens].sort((a, b) => b.atual - a.atual)
    if (topMode === 'top10') return sorted.slice(0, 10)
    return sorted
  }, [baseItens, topMode])

  // Por BU pro gráfico de barras — respeita o toggle Tudo/Fixo/Variável
  const porBUGrafico = useMemo(() => {
    const bus = [...new Set(dadosBaseGrafico.map(h => h.centro_custo))]
    return bus.map(bu => {
      const atual    = dadosBaseGrafico.filter(h => h.mes === mesAtual && h.centro_custo === bu).reduce((s, h) => s + h.realizado, 0)
      const anterior = dadosBaseGrafico.filter(h => h.mes === mesAnterior && h.centro_custo === bu).reduce((s, h) => s + h.realizado, 0)
      const difPct = anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0
      return { bu, atual, anterior, difPct }
    }).sort((a, b) => b.atual - a.atual)
  }, [dadosBaseGrafico, mesAtual, mesAnterior])

  // Evolução mensal por BU (linhas) — respeita o toggle Tudo/Fixo/Variável
  const { dadosGrafico, topBUs } = useMemo(() => {
    const totaisPorBU = {}
    dadosBaseGrafico.forEach(h => { totaisPorBU[h.centro_custo] = (totaisPorBU[h.centro_custo] || 0) + h.realizado })
    const top = Object.entries(totaisPorBU).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([bu]) => bu)

    const porMes = {}
    dadosBaseGrafico.forEach(({ mes, centro_custo, realizado }) => {
      if (!top.includes(centro_custo)) return
      if (!porMes[mes]) porMes[mes] = { mes }
      porMes[mes][centro_custo] = (porMes[mes][centro_custo] || 0) + realizado
    })
    const arr = sortMesLabel(Object.keys(porMes)).map(m => porMes[m])
    return { dadosGrafico: arr, topBUs: top }
  }, [dadosBaseGrafico])

  const totalExibido = dadosExibidos.reduce((s, c) => s + c.atual, 0)

  // Busca o detalhe de lançamentos quando uma BU é selecionada na tabela   // >>> NOVO
  useEffect(() => {
    if (!buSelecionada) { setDetalhe([]); return }
    let cancelado = false
    setCarregandoDetalhe(true)
    setCategoriaExpandida(null)
    loadDetalheLancamentosPorBU({
      centroCusto: buSelecionada,
      mes: mesAtual,
      loja: lojaFiltro !== 'Todas' ? lojaFiltro : undefined,
    }).then(rows => { if (!cancelado) setDetalhe(rows) })
      .finally(() => { if (!cancelado) setCarregandoDetalhe(false) })
    return () => { cancelado = true }
  }, [buSelecionada, mesAtual, lojaFiltro])

  // Busca geral por fornecedor — independe da BU selecionada, varre todas
  // as BUs do mês atual e filtra pelo nome digitado.
  useEffect(() => {
    const termo = buscaFornecedorAtiva.trim()
    if (!termo) { setResultadoBusca([]); return }
    let cancelado = false
    setBuscandoFornecedor(true)
    loadDetalheLancamentosPorBU({
      centroCusto: 'Todas',
      mes: mesAtual,
      loja: lojaFiltro !== 'Todas' ? lojaFiltro : undefined,
    }).then(rows => {
      if (cancelado) return
      const termoNorm = termo.toLowerCase()
      setResultadoBusca(rows.filter(r => (r.fornecedor||'').toLowerCase().includes(termoNorm)))
    }).finally(() => { if (!cancelado) setBuscandoFornecedor(false) })
    return () => { cancelado = true }
  }, [buscaFornecedorAtiva, mesAtual, lojaFiltro])

  // Agrupa o detalhe por Categoria — é a camada intermediária antes de
  // chegar nos lançamentos individuais.                                   // >>> NOVO
  const detalhePorCategoria = useMemo(() => {
    const map = {}
    detalhe.forEach(d => {
      const cat = d.categoria || 'Sem categoria'
      if (!map[cat]) map[cat] = { categoria: cat, valor: 0, itens: [] }
      map[cat].valor += d.valor
      map[cat].itens.push(d)
    })
    return Object.values(map).sort((a, b) => b.valor - a.valor)
  }, [detalhe])

  return (
    <div style={{ background:'#fff', minHeight:'100vh' }}>
      <Header title="Custos por BU" subtitle="Fixo x Variável, comparativo mês a mês"/>
      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Filtro de BU da própria página */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em' }}>BU:</span>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {busParaFiltro.map(bu => (
              <TabBtn key={bu} label={bu} ativo={buFiltroLocal===bu} onClick={()=>{ setBuFiltroLocal(bu); setBuSelecionada(null) }}/>
            ))}
          </div>
        </div>

        {/* Busca geral por fornecedor — varre todas as BUs do mês atual */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ position:'relative', flex:'0 1 320px' }}>
            <Search size={14} color="#999" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}/>
            <input
              value={buscaFornecedor}
              onChange={e => setBuscaFornecedor(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setBuscaFornecedorAtiva(buscaFornecedor) }}
              placeholder={`Buscar fornecedor em todas as BUs — ${mesAtual||''}`}
              style={{ width:'100%', fontSize:13, padding:'8px 10px 8px 30px', borderRadius:8, border:'1px solid #E8E8E8', fontFamily:'inherit' }}
            />
          </div>
          <button onClick={() => setBuscaFornecedorAtiva(buscaFornecedor)}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#1a1a1a', color:'#fff', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Buscar
          </button>
          {buscaFornecedorAtiva && (
            <button onClick={() => { setBuscaFornecedor(''); setBuscaFornecedorAtiva('') }}
              style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #E8E8E8', background:'#fff', color:'#666', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Limpar
            </button>
          )}
        </div>

        {/* Resultado da busca geral por fornecedor */}
        {buscaFornecedorAtiva && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F7F7F7', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>Resultado — "{buscaFornecedorAtiva}"</div>
                <div style={{ fontSize:12, color:'#999', marginTop:2 }}>
                  {buscandoFornecedor ? 'Buscando…' : `${resultadoBusca.length} lançamento${resultadoBusca.length===1?'':'s'} · ${fmt(resultadoBusca.reduce((s,d)=>s+d.valor,0))}`}
                </div>
              </div>
              {resultadoBusca.length > 0 && (
                <button onClick={() => exportarCSV(resultadoBusca, `busca-${buscaFornecedorAtiva}-${mesAtual}.csv`)}
                  style={{ display:'flex', alignItems:'center', gap:6, border:'1px solid #E8E8E8', background:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                  <Download size={13}/> Exportar CSV
                </button>
              )}
            </div>
            {buscandoFornecedor ? (
              <div style={{ padding:40, display:'flex', justifyContent:'center', color:'#999' }}><Loader2 size={20} className="animate-spin"/></div>
            ) : resultadoBusca.length === 0 ? (
              <div style={{ padding:30, textAlign:'center', color:'#999', fontSize:13 }}>Nenhum lançamento encontrado pra esse fornecedor nesse mês.</div>
            ) : (
              <div style={{ maxHeight:'420px', overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    <TH ch="Fornecedor"/>
                    <TH ch="Descrição"/>
                    <TH ch="BU"/>
                    <TH ch="Loja"/>
                    <TH ch="Vencimento"/>
                    <TH ch="Valor" right/>
                    <TH ch=""/>
                  </tr></thead>
                  <tbody>
                    {resultadoBusca.sort((a,b)=>b.valor-a.valor).map((d,i) => (
                      <tr key={i}>
                        <TD ch={d.fornecedor}/>
                        <TD ch={d.descricao} muted/>
                        <TD ch={d.centro_custo} color={d.centro_custo==='Revisar' ? '#D9B504' : undefined}/>
                        <TD ch={d.loja} muted/>
                        <TD ch={d.vencto} muted/>
                        <TD ch={fmt(d.valor)} mono right/>
                        <td style={{ padding:'6px 10px', borderBottom:'1px solid #F7F7F7' }}>
                          <BotaoReportarDivergencia item={d} busDisponiveis={busParaFiltro} mesAtual={mesAtual}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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

        {/* Toggle Tudo/Fixo/Variável — afeta os dois gráficos abaixo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#999', textTransform:'uppercase', letterSpacing:'0.05em' }}>Gráficos:</span>
          <div style={{ display:'flex', gap:6 }}>
            <TabBtn label="Tudo"     ativo={tipoView==='tudo'}     onClick={()=>setTipoView('tudo')}/>
            <TabBtn label="Fixo"     ativo={tipoView==='Fixo'}     onClick={()=>setTipoView('Fixo')}/>
            <TabBtn label="Variável" ativo={tipoView==='Variável'} onClick={()=>setTipoView('Variável')}/>
          </div>
        </div>

        {/* Gráfico mês atual por BU */}
        {porBUGrafico.length>0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Mês Atual vs Anterior por BU{tipoView!=='tudo' ? ` — ${tipoView}` : ''}</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:18 }}>{mesAnterior} → {mesAtual}</div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={porBUGrafico} margin={{ top:4, right:4, left:0, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="bu" tick={{ fontSize:10, fill:'#BBB' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={70}/>
                <YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}k`} tick={{ fontSize:11, fill:'#BBB' }} axisLine={false} tickLine={false} width={44}/>
                <Tooltip formatter={(v,n)=>[fmt(v),n==='anterior'?mesAnterior:mesAtual]} contentStyle={{ fontSize:12, border:'1px solid #F0F0F0', borderRadius:10 }}/>
                <Legend formatter={n=>n==='anterior'?mesAnterior:mesAtual} iconSize={8} wrapperStyle={{ fontSize:11 }}/>
                <Bar dataKey="anterior" name="anterior" fill="#F0F0F0" radius={[4,4,0,0]}/>
                <Bar dataKey="atual" name="atual" radius={[4,4,0,0]}>
                  {porBUGrafico.map(e=><Cell key={e.bu} fill={e.bu==='Revisar'?'#D9B504':(e.difPct>10?'#dc2626':e.difPct>0?'#f59e0b':'#22c55e')}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Evolução histórica por BU */}
        {dadosGrafico.length>0 && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, padding:'20px 24px 16px' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Evolução por BU{tipoView!=='tudo' ? ` — ${tipoView}` : ''}</div>
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
                <TH ch="Fixo" right/>
                <TH ch="Variável" right/>
                <TH ch={`Total ${mesAtual||''}`} right/>
                <TH ch={mesAnterior||'Anterior'} right/>
                <TH ch="Var. R$" right/>
                <TH ch="Var. %" right/>
              </tr></thead>
              <tbody>
                {dadosExibidos.map((c,i)=>(
                  <tr key={i}
                    onClick={()=>setBuSelecionada(c.bu === buSelecionada ? null : c.bu)}
                    style={{ cursor:'pointer', background: c.bu===buSelecionada ? '#FAFAF5' : undefined }}
                  >
                    <TD ch={c.bu} color={c.bu==='Revisar' ? '#D9B504' : undefined}/>
                    {modo==='porloja' && <TD ch={c.loja} muted/>}
                    <TD ch={fmt(c.fixoAtual)} mono muted right/>
                    <TD ch={fmt(c.variavelAtual)} mono muted right/>
                    <TD ch={fmt(c.atual)} mono right/>
                    <TD ch={fmt(c.anterior)} mono muted right/>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', fontSize:13, fontVariantNumeric:'tabular-nums', fontWeight:600, color:c.difR>0?'#dc2626':'#16a34a', textAlign:'right' }}>{c.difR>=0?'+':''}{fmt(c.difR)}</td>
                    <td style={{ padding:'10px 14px', borderBottom:'1px solid #F7F7F7', textAlign:'right' }}><VarBadge pct={c.difPct}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhe de lançamentos da BU selecionada — agrupado por Categoria */}
        {buSelecionada && (
          <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F7F7F7', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>Detalhe — {buSelecionada} · {mesAtual}</div>
                <div style={{ fontSize:12, color:'#999', marginTop:2 }}>
                  {carregandoDetalhe ? 'Carregando…' : `${detalhePorCategoria.length} categoria${detalhePorCategoria.length===1?'':'s'} · ${detalhe.length} lançamento${detalhe.length===1?'':'s'} · ${fmt(detalhe.reduce((s,d)=>s+d.valor,0))}`}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {detalhe.length > 0 && (
                  <button onClick={() => exportarCSV(detalhe, `${buSelecionada}-${mesAtual}.csv`)}
                    style={{ display:'flex', alignItems:'center', gap:6, border:'1px solid #E8E8E8', background:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                    <Download size={13}/> Exportar CSV
                  </button>
                )}
                <button onClick={()=>setBuSelecionada(null)} style={{ border:'none', background:'#F5F5F5', borderRadius:8, padding:6, cursor:'pointer', display:'flex' }}>
                  <X size={16} color="#666"/>
                </button>
              </div>
            </div>

            {carregandoDetalhe ? (
              <div style={{ padding:40, display:'flex', justifyContent:'center', color:'#999' }}>
                <Loader2 size={20} className="animate-spin"/>
              </div>
            ) : detalhePorCategoria.length === 0 ? (
              <div style={{ padding:30, textAlign:'center', color:'#999', fontSize:13 }}>Nenhum lançamento encontrado pra essa BU nesse mês.</div>
            ) : (
              <div style={{ maxHeight:'520px', overflowY:'auto' }}>
                {detalhePorCategoria.map(cat => {
                  const expandida = categoriaExpandida === cat.categoria
                  return (
                    <div key={cat.categoria} style={{ borderBottom:'1px solid #F7F7F7' }}>
                      {/* Linha da categoria — clicável pra expandir */}
                      <div
                        onClick={() => setCategoriaExpandida(expandida ? null : cat.categoria)}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', cursor:'pointer', background: expandida ? '#FAFAF5' : '#fff' }}
                      >
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {expandida ? <ChevronDown size={14} color="#999"/> : <ChevronRight size={14} color="#999"/>}
                          <span style={{ fontSize:13, fontWeight:600 }}>{cat.categoria}</span>
                          <span style={{ fontSize:12, color:'#999' }}>({cat.itens.length})</span>
                        </div>
                        <span style={{ fontSize:13, fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{fmt(cat.valor)}</span>
                      </div>

                      {/* Lançamentos da categoria — só aparece expandido */}
                      {expandida && (
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead><tr>
                            <TH ch="Fornecedor"/>
                            <TH ch="Descrição"/>
                            {lojaFiltro==='Todas' && <TH ch="Loja"/>}
                            <TH ch="Vencimento"/>
                            <TH ch="Valor" right/>
                            <TH ch=""/>
                          </tr></thead>
                          <tbody>
                            {cat.itens.map((d,i)=>(
                              <tr key={i} style={{ background:'#FCFCFA' }}>
                                <TD ch={d.fornecedor}/>
                                <TD ch={d.descricao} muted/>
                                {lojaFiltro==='Todas' && <TD ch={d.loja} muted/>}
                                <TD ch={d.vencto} muted/>
                                <TD ch={fmt(d.valor)} mono right/>
                                <td style={{ padding:'6px 10px', borderBottom:'1px solid #F7F7F7' }}>
                                  <BotaoReportarDivergencia item={{...d, centro_custo: buSelecionada}} busDisponiveis={busParaFiltro} mesAtual={mesAtual}/>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
