import KpiCard from './KpiCard.jsx'
import { CFG_DEFAULT, UNIDADES, MESES } from '../useGASData.js'

const fmt = v => (v == null || isNaN(Number(v))) ? '—' : Math.round(Number(v)).toLocaleString('pt-BR')

export default function PageCustos({ mesIdx, unidade, gas, loading }) {
  const cfg  = gas?.configuracoes ?? CFG_DEFAULT
  const CADM = cfg.custo_contratacao   ?? 2514
  const CDEM = cfg.custo_demissao      ?? 2724

  // Custo: novo formato { folha, rescisao_real, total } ou número direto
  function custoTotal(u)    { const c = gas?.custos?.[u]; if (!c) return 0; return typeof c === 'object' ? (c.total ?? 0) : Number(c) ?? 0 }
  function custoFolha(u)    { const c = gas?.custos?.[u]; if (!c) return 0; return typeof c === 'object' ? (c.folha ?? 0) : 0 }
  function custoRescisao(u) { const c = gas?.custos?.[u]; if (!c) return 0; return typeof c === 'object' ? (c.rescisao_real ?? 0) : 0 }
  function fonteFolha(u)    { const c = gas?.custos?.[u]; return typeof c === 'object' ? (c.fonte_folha ?? 'estimado') : 'estimado' }
  function hcReal(u)  { return gas?.resumo?.[u]?.hc_real  ?? 0 }
  function hcIdeal(u) { return gas?.hc_ideal?.[u]         ?? 0 }
  function adms(u)    { return gas?.resumo?.[u]?.admissoes      ?? 0 }
  function desls(u)   { return gas?.resumo?.[u]?.desligamentos  ?? 0 }

  // Custo ideal: custo por pessoa × HC ideal
  function custoIdealCalc(u) {
    const cr = custoTotal(u); const hcR = hcReal(u); const hcI = hcIdeal(u)
    if (!hcR || !hcI || !cr) return 0
    return Math.round((cr / hcR) * hcI)
  }

  const uns = unidade === 'Todas' ? UNIDADES : [unidade]
  let cr=0, ci=0, adm=0, des=0, hcAt=0, hcId=0, rescTotal=0
  uns.forEach(u => {
    cr += custoTotal(u); ci += custoIdealCalc(u)
    adm += adms(u); des += desls(u)
    hcAt += hcReal(u); hcId += hcIdeal(u)
    rescTotal += custoRescisao(u)
  })

  const custoTurn = rescTotal > 0 ? rescTotal : des * CDEM
  const cpp       = hcAt > 0 ? Math.round(cr / hcAt) : 0
  const gapCusto  = ci - cr

  // Verificar se temos custos reais ou estimados
  const temCustoReal = UNIDADES.some(u => fonteFolha(u) === 'real')

  const rankCusto = UNIDADES.map(u => ({
    u, cr:custoTotal(u), ci:custoIdealCalc(u),
    folha: custoFolha(u), rescisao: custoRescisao(u),
    hcR:hcReal(u), hcI:hcIdeal(u),
    cpp: hcReal(u) > 0 ? Math.round(custoTotal(u)/hcReal(u)) : 0,
    gap: custoIdealCalc(u) - custoTotal(u),
    fonte: fonteFolha(u),
    ocup: hcIdeal(u) > 0 ? Math.round((hcReal(u)/hcIdeal(u))*1000)/10 : 0,
  })).sort((a,b) => b.cr - a.cr)
  const rankFilt = unidade === 'Todas' ? rankCusto : rankCusto.filter(r => r.u === unidade)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom:40 }}>
      {loading && <Aviso msg="⏳ Carregando dados do Google Sheets..." />}

      {!temCustoReal && !loading && (
        <div style={{ background:'#FDF9E0', border:'1px solid #D9B504', borderRadius:8, padding:'10px 20px', fontSize:12, color:'#8C6800' }}>
          ⚠️ Custos exibidos são <strong>estimados</strong> — preencha a coluna do mês na aba <strong>4_Custo_Folha</strong> para ver valores reais.
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Custo Total Mensal"        valor={`R$ ${fmt(cr)}`}        cor="preto"  sub={temCustoReal ? 'Valores reais da folha' : 'Estimado via salários'} />
        <KpiCard label="Custo se HC Completo"      valor={`R$ ${fmt(ci)}`}        cor="ambar"  sub={`Gap de R$ ${fmt(Math.abs(gapCusto))}`} />
        <KpiCard label="Custo Médio / Colaborador" valor={`R$ ${fmt(cpp)}`}       cor="preto"  sub={`${hcAt} colaboradores ativos`} />
        <KpiCard label="Custo do Turnover"         valor={`R$ ${fmt(custoTurn)}`} cor={rescTotal > 0 ? 'vermelho' : 'ambar'} sub={rescTotal > 0 ? 'Rescisão real (TOTVS)' : 'Estimado'} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Desligamentos no Mês" valor={des} cor={des > 0 ? 'vermelho' : 'verde'} sub={des === 0 ? 'Sem desligamentos' : `Rescisão: R$ ${fmt(rescTotal)}`} />
        <KpiCard label="Admissões no Mês"     valor={adm} cor={adm > 0 ? 'ambar' : 'cinza'}   sub={`Custo est.: R$ ${fmt(adm * CADM)}`} />
        <KpiCard label="HC Atual / Ideal"     valor={`${hcAt} / ${hcId}`} cor={hcAt >= hcId ? 'verde' : 'ambar'} sub={`${hcId > 0 ? Math.round((hcAt/hcId)*100) : 0}% de ocupação`} />
        <KpiCard label="Vagas Abertas"        valor={Math.max(0, hcId - hcAt)} cor={hcAt >= hcId ? 'verde' : 'vermelho'} sub={`${hcId > 0 ? Math.round(((hcId-hcAt)/hcId)*100) : 0}% do quadro ideal`} />
      </div>

      {/* Tabela custos */}
      <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #E8E8E2', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:'#0D0D0D' }}>Custos por Unidade</div>
            <div style={{ fontSize:11, color:'#ABABAB' }}>{MESES[mesIdx]} · folha + rescisão real</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 100px 90px 90px 90px 90px 80px', background:'#0D0D0D', padding:'8px 20px' }}>
          {['Unidade','Folha','Rescisão','Total','R$/Pessoa','Gap Ideal','HC R/I'].map((h,i) => (
            <div key={h} style={{ fontSize:9.5, fontWeight:600, color:'#fff', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:i===0?'left':'center' }}>{h}</div>
          ))}
        </div>

        {rankFilt.map((row, i) => (
          <div key={row.u} style={{ display:'grid', gridTemplateColumns:'1.4fr 100px 90px 90px 90px 90px 80px', padding:'11px 20px', borderBottom:i<rankFilt.length-1?'1px solid #E8E8E2':'none' }}>
            <div style={{ fontWeight:500, fontSize:13, color:'#0D0D0D', display:'flex', alignItems:'center', gap:6 }}>
              {row.u}
              {row.fonte === 'estimado' && <span style={{ fontSize:9, color:'#D9B504', background:'#FDF9E0', border:'1px solid #D9B504', borderRadius:99, padding:'1px 5px' }}>est.</span>}
            </div>
            <div style={{ textAlign:'center', fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(row.folha)}</div>
            <div style={{ textAlign:'center', fontSize:12, color: row.rescisao > 0 ? '#8C1414' : '#ABABAB', fontFamily:"'DM Mono',monospace" }}>{row.rescisao > 0 ? `R$ ${fmt(row.rescisao)}` : '—'}</div>
            <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(row.cr)}</div>
            <div style={{ textAlign:'center', fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(row.cpp)}</div>
            <div style={{ textAlign:'center', fontSize:12, color: row.gap > 0 ? '#D9B504' : '#97A624', fontFamily:"'DM Mono',monospace" }}>{row.gap > 0 ? `+${fmt(row.gap)}` : 'OK'}</div>
            <div style={{ textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
              <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>{row.hcR}</span>
              <span style={{ fontSize:11, color:'#ABABAB' }}>/</span>
              <span style={{ fontSize:12, color:'#ABABAB', fontFamily:"'DM Mono',monospace" }}>{row.hcI || '—'}</span>
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 100px 90px 90px 90px 90px 80px', padding:'11px 20px', background:'#F5F5F0', borderTop:'2px solid #0D0D0D' }}>
          <div style={{ fontWeight:700, fontSize:13 }}>TOTAL</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(uns.reduce((s,u)=>s+custoFolha(u),0))}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, color:'#8C1414', fontFamily:"'DM Mono',monospace" }}>{rescTotal > 0 ? `R$ ${fmt(rescTotal)}` : '—'}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(cr)}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(cpp)}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, color:'#D9B504', fontFamily:"'DM Mono',monospace" }}>+{fmt(gapCusto)}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>{hcAt}/{hcId}</div>
        </div>
      </div>
    </div>
  )
}

function Aviso({ msg }) {
  return <div style={{ background:'#F5F5F0', border:'1px solid #E8E8E2', borderRadius:8, padding:'10px 20px', fontSize:12, color:'#ABABAB' }}>{msg}</div>
}
