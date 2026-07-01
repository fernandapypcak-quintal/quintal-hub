import KpiCard from './KpiCard.jsx'
import { CFG_DEFAULT, CUSTO_IDEAL_KEY, UNIDADES, MESES } from '../useGASData.js'

const fmt = v => (v == null || isNaN(Number(v))) ? '—' : Math.round(Number(v)).toLocaleString('pt-BR')

export default function PageCustos({ mesIdx, unidade, gas, loading }) {
  // gas e loading vêm do App.jsx via props
  const erro = null

  const cfg  = gas?.configuracoes ?? CFG_DEFAULT
  const CADM = cfg.custo_contratacao   ?? 2514
  const CDEM = cfg.custo_demissao      ?? 2724
  const FOLHA= cfg.folha_mensal        ?? 1800000
  const TANO = cfg.custo_turnover_ano  ?? 1185202
  const AREF = cfg.admissoes_ano_ref   ?? 193
  const DREF = cfg.desligamentos_ano_ref ?? 257

  const COMPOSICAO = [
    { label:'Salário Base', pct: cfg.comp_salario_base ?? 52, cor:'#0D0D0D' },
    { label:'Encargos',     pct: cfg.comp_encargos     ?? 21, cor:'#8C1414' },
    { label:'Benefícios',   pct: cfg.comp_beneficios   ?? 12, cor:'#D9B504' },
    { label:'Provisões',    pct: cfg.comp_provisoes    ?? 15, cor:'#97A624' },
  ]

  function custoReal(u)  {
    const c = gas?.custos?.[u]
    if (!c) return 0
    // novo formato: { folha, rescisao_real, total } — fallback para número direto
    return typeof c === 'object' ? (c.total ?? c.folha ?? 0) : Number(c) ?? 0
  }
  function custoFolha(u)    { const c = gas?.custos?.[u]; return typeof c === 'object' ? (c.folha ?? 0) : 0 }
  function custoRescisao(u) { const c = gas?.custos?.[u]; return typeof c === 'object' ? (c.rescisao_real ?? 0) : 0 }
  function custoIdeal(u) {
    // Calcula dinamicamente: custo por pessoa × HC ideal
    const cr  = custoReal(u)
    const hcR = hcReal(u)
    const hcI = hcIdeal(u)
    if (!hcR || !hcI || !cr) return 0
    const cpp = cr / hcR
    return Math.round(cpp * hcI)
  }
  function hcReal(u)     { return gas?.resumo?.[u]?.hc_real              ?? 0 }
  function hcIdeal(u)    { return gas?.hc_ideal?.[u]                     ?? 0 }
  function adms(u)       { return gas?.resumo?.[u]?.admissoes            ?? 0 }
  function desls(u)      { return gas?.resumo?.[u]?.desligamentos        ?? 0 }

  const uns = unidade === 'Todas' ? UNIDADES : [unidade]
  let cr=0, ci=0, adm=0, des=0, hcAt=0, hcId=0
  uns.forEach(u => { cr+=custoReal(u); ci+=custoIdeal(u); adm+=adms(u); des+=desls(u); hcAt+=hcReal(u); hcId+=hcIdeal(u) })

  // Custo turnover: usa rescisão real se disponível, senão estimativa
  const rescisaoTotal = uns.reduce((s, u) => s + custoRescisao(u), 0)
  const custoTurn = rescisaoTotal > 0 ? rescisaoTotal : des * CDEM
  const cpp       = hcAt > 0 ? Math.round(cr / hcAt) : 0
  const gapCusto  = ci - cr
  const pesoTurn  = FOLHA > 0 ? Math.round((custoTurn / FOLHA) * 1000) / 10 : 0

  const rankCusto = UNIDADES.map(u => ({
    u,
    cr:   custoReal(u),
    ci:   custoIdeal(u),
    hcR:  hcReal(u),
    hcI:  hcIdeal(u),
    cpp:  hcReal(u) > 0 ? Math.round(custoReal(u) / hcReal(u)) : 0,
    gap:  custoIdeal(u) - custoReal(u),
    cturn:Math.round(custoRescisao(u) > 0 ? custoRescisao(u) : desls(u)*CDEM),
    ocup: hcIdeal(u) > 0 ? Math.round((hcReal(u)/hcIdeal(u))*1000)/10 : 0,
  })).sort((a, b) => b.cr - a.cr)

  const rankFilt = unidade === 'Todas' ? rankCusto : rankCusto.filter(r => r.u === unidade)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom:40 }}>

      {loading && <Aviso tipo="info" msg="⏳ Carregando dados do Google Sheets..." />}
      {erro    && <Aviso tipo="erro" msg={`⚠️ Erro: ${erro}`} />}

      {/* KPIs linha 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Custo Total Mensal"        valor={`R$ ${fmt(cr)}`}        cor="preto"  sub={unidade === 'Todas' ? 'Todas as unidades' : unidade} />
        <KpiCard label="Custo se HC Completo"      valor={`R$ ${fmt(ci)}`}        cor="ambar"  sub={`Gap de R$ ${fmt(gapCusto)} com ${Math.max(0,hcId-hcAt)} vagas abertas`} />
        <KpiCard label="Custo Médio / Colaborador" valor={`R$ ${fmt(cpp)}`}       cor="preto"  sub={`Base: ${hcAt} colaboradores ativos`} />
        <KpiCard label="Custo do Turnover"         valor={`R$ ${fmt(custoTurn)}`} cor={pesoTurn > 5 ? 'vermelho' : 'ambar'} sub={`${pesoTurn}% da folha mensal`} />
      </div>

      {/* KPIs linha 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Desligamentos no Mês" valor={des} cor={des > 0 ? 'vermelho' : 'verde'} sub={des === 0 ? 'Sem desligamentos no período' : `× R$ ${fmt(CDEM)} = R$ ${fmt(des*CDEM)}`} />
        <KpiCard label="Admissões no Mês"     valor={adm} cor={adm > 0 ? 'ambar' : 'cinza'}   sub={`× R$ ${fmt(CADM)} = R$ ${fmt(adm*CADM)}`} />
        {/* Composição */}
        <div style={{ gridColumn:'span 2', background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, padding:'16px 20px' }}>
          <div style={{ fontSize:10.5, fontWeight:600, color:'#ABABAB', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Composição do Custo</div>
          <div style={{ display:'flex', height:20, borderRadius:4, overflow:'hidden', gap:2, marginBottom:10 }}>
            {COMPOSICAO.map(c => <div key={c.label} style={{ width:`${c.pct}%`, background:c.cor }} />)}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
            {COMPOSICAO.map(c => (
              <div key={c.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:c.cor, display:'inline-block' }} />
                <span style={{ fontSize:12, color:'#3D3D3D' }}>{c.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:c.cor, fontFamily:"'DM Mono', monospace" }}>{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel custo turnover */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>

        {/* Tabela custo por unidade resumida */}
        <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #E8E8E2' }}>
            <div style={{ fontWeight:600, fontSize:14, color:'#0D0D0D' }}>Custos por Unidade</div>
            <div style={{ fontSize:11, color:'#ABABAB' }}>{MESES[mesIdx]} · ordenado por custo total</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 110px 110px 90px 100px', background:'#0D0D0D', padding:'8px 20px' }}>
            {['Unidade','Custo Real','Custo Ideal','Gap','R$/Pessoa'].map((h, i) => (
              <div key={h} style={{ fontSize:9.5, fontWeight:600, color:'#fff', letterSpacing:'0.07em', textTransform:'uppercase', textAlign: i===0 ? 'left' : 'center' }}>{h}</div>
            ))}
          </div>
          {rankFilt.length === 0 ? (
            <div style={{ padding:20, fontSize:12, color:'#ABABAB' }}>Aguardando dados...</div>
          ) : rankFilt.map((row, i) => (
            <div key={row.u} style={{ display:'grid', gridTemplateColumns:'1.4fr 110px 110px 90px 100px', padding:'10px 20px', borderBottom: i < rankFilt.length-1 ? '1px solid #E8E8E2' : 'none' }}>
              <div style={{ fontWeight:500, fontSize:13, color:'#0D0D0D' }}>{row.u}</div>
              <div style={{ textAlign:'center', fontWeight:700, fontSize:13, fontFamily:"'DM Mono', monospace" }}>R$ {fmt(row.cr)}</div>
              <div style={{ textAlign:'center', fontSize:13, color:'#ABABAB', fontFamily:"'DM Mono', monospace" }}>R$ {fmt(row.ci)}</div>
              <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color: row.gap > 0 ? '#D9B504' : '#97A624', fontFamily:"'DM Mono', monospace" }}>
                {row.gap > 0 ? `+${fmt(row.gap)}` : 'OK'}
              </div>
              <div style={{ textAlign:'center', fontSize:13, fontFamily:"'DM Mono', monospace" }}>R$ {fmt(row.cpp)}</div>
            </div>
          ))}
          {/* Total */}
          {rankFilt.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 110px 110px 90px 100px', padding:'10px 20px', background:'#F5F5F0', borderTop:'2px solid #0D0D0D' }}>
              <div style={{ fontWeight:700, fontSize:13 }}>TOTAL</div>
              <div style={{ textAlign:'center', fontWeight:700, fontSize:13, fontFamily:"'DM Mono', monospace" }}>R$ {fmt(cr)}</div>
              <div style={{ textAlign:'center', fontWeight:700, fontSize:13, color:'#ABABAB', fontFamily:"'DM Mono', monospace" }}>R$ {fmt(ci)}</div>
              <div style={{ textAlign:'center', fontWeight:700, fontSize:13, color:'#D9B504', fontFamily:"'DM Mono', monospace" }}>+{fmt(gapCusto)}</div>
              <div style={{ textAlign:'center', fontWeight:700, fontSize:13, fontFamily:"'DM Mono', monospace" }}>R$ {fmt(cpp)}</div>
            </div>
          )}
        </div>

        {/* Painel referência turnover */}
        <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #E8E8E2' }}>
            <div style={{ fontWeight:600, fontSize:14, color:'#0D0D0D' }}>Custo do Turnover</div>
            <div style={{ fontSize:11, color:'#ABABAB' }}>Metodologia interna RH</div>
          </div>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Por Contratação',  val:CADM, cor:'#D9B504', desc:'ATS + recrutamento + exame + uniforme' },
              { label:'Por Desligamento', val:CDEM, cor:'#8C1414', desc:'Rescisão + multa FGTS + aviso prévio' },
            ].map(item => (
              <div key={item.label} style={{ background:'#FAFAF8', border:'1px solid #E8E8E2', borderRadius:8, padding:14 }}>
                <div style={{ fontSize:9, color:'#ABABAB', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:item.cor, fontFamily:"'DM Mono', monospace" }}>R$ {fmt(item.val)}</div>
                <div style={{ fontSize:11, color:'#ABABAB', marginTop:4 }}>{item.desc}</div>
              </div>
            ))}
            <div style={{ background:'#0D0D0D', borderRadius:8, padding:14 }}>
              <div style={{ fontSize:9, color:'#97A624', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Referência anual</div>
              <div style={{ fontSize:22, fontWeight:700, color:'#fff', fontFamily:"'DM Mono', monospace" }}>R$ {fmt(TANO)}</div>
              <div style={{ fontSize:11, color:'#888', marginTop:4 }}>{AREF} admissões · {DREF} desligamentos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Aviso({ tipo, msg }) {
  const bg  = tipo === 'erro' ? '#FFF5E0' : '#F5F5F0'
  const bdr = tipo === 'erro' ? '#D9B504' : '#E8E8E2'
  const cor = tipo === 'erro' ? '#8C1414' : '#ABABAB'
  return (
    <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:8, padding:'10px 20px', fontSize:12, color:cor }}>
      {msg}
    </div>
  )
}
