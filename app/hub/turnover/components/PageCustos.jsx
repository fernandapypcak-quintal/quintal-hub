import KpiCard from './KpiCard.jsx'
import { CFG_DEFAULT, UNIDADES, MESES } from '../useGASData.js'

const fmt = v => (v == null || isNaN(Number(v))) ? '—' : Math.round(Number(v)).toLocaleString('pt-BR')

export default function PageCustos({ mesIdx, unidade, gas, loading }) {
  const cfg  = gas?.configuracoes ?? CFG_DEFAULT
  const CADM = cfg.custo_contratacao ?? 2514
  const ENC  = cfg.encargo_multiplicador ?? 1.6377

  // Dados vêm de gas.resumo (não mais gas.custos)
  function r(u, campo, def = 0) {
    if (!gas?.resumo?.[u]) return def
    const v = gas.resumo[u][campo]
    return v == null ? def : Number(v)
  }

  function hcIdeal(u) { return gas?.hc_ideal?.[u] ?? 0 }

  function custoIdeal(u) {
    const cr  = r(u, 'custo_total')
    const hcR = r(u, 'hc_real')
    const hcI = hcIdeal(u)
    if (!hcR || !cr || !hcI) return 0
    return Math.round((cr / hcR) * hcI)
  }

  const uns = unidade === 'Todas' ? UNIDADES : [unidade]

  let cr=0, ci=0, adm=0, des=0, hcAt=0, hcId=0, resc=0, folha=0, folhaBruta=0
  uns.forEach(u => {
    cr         += r(u, 'custo_total')
    ci         += custoIdeal(u)
    adm        += r(u, 'admissoes')
    des        += r(u, 'desligamentos')
    hcAt       += r(u, 'hc_real')
    hcId       += hcIdeal(u)
    resc       += r(u, 'custo_rescisao')
    folha      += r(u, 'custo_folha')
    folhaBruta += r(u, 'custo_folha_bruta')
  })

  const cpp      = hcAt > 0 ? Math.round(cr / hcAt) : 0
  const gapCusto = ci - cr

  const rankCusto = UNIDADES.map(u => ({
    u,
    folhaBruta: r(u, 'custo_folha_bruta'),
    folha:      r(u, 'custo_folha'),
    resc:       r(u, 'custo_rescisao'),
    cr:         r(u, 'custo_total'),
    ci:         custoIdeal(u),
    hcR:        r(u, 'hc_real'),
    hcI:        hcIdeal(u),
    cpp:        r(u, 'custo_por_pessoa'),
    gap:        custoIdeal(u) - r(u, 'custo_total'),
  })).sort((a, b) => b.cr - a.cr)

  const rankFilt = unidade === 'Todas' ? rankCusto : rankCusto.filter(x => x.u === unidade)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom:40 }}>
      {loading && <Aviso msg="⏳ Carregando dados..." />}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Custo Total Mensal"        valor={`R$ ${fmt(cr)}`}   cor="preto"  sub="Folha c/ encargos + rescisões" />
        <KpiCard label="Custo se HC Completo"      valor={`R$ ${fmt(ci)}`}   cor="ambar"  sub={`Gap de R$ ${fmt(Math.abs(gapCusto))}`} />
        <KpiCard label="Custo Médio / Colaborador" valor={`R$ ${fmt(cpp)}`}  cor="preto"  sub={`${hcAt} colaboradores ativos`} />
        <KpiCard label="Rescisões no Mês"          valor={`R$ ${fmt(resc)}`} cor={resc > 0 ? 'vermelho' : 'verde'} sub={resc > 0 ? 'Valores reais TOTVS' : 'Sem rescisões no período'} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Folha Bruta (salários)"  valor={`R$ ${fmt(folhaBruta)}`} cor="preto" sub="Soma dos salários dos ativos" />
        <KpiCard label="Encargos sobre Folha"    valor={`R$ ${fmt(folha - folhaBruta)}`} cor="preto" sub={`Fator ${ENC}×`} />
        <KpiCard label="Admissões no Mês"        valor={adm} cor={adm > 0 ? 'ambar' : 'cinza'} sub={`Custo est.: R$ ${fmt(adm * CADM)}`} />
        <KpiCard label="Desligamentos no Mês"    valor={des} cor={des > 0 ? 'vermelho' : 'verde'} sub={des === 0 ? 'Sem desligamentos' : `Rescisão: R$ ${fmt(resc)}`} />
      </div>

      <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #E8E8E2' }}>
          <div style={{ fontWeight:600, fontSize:14, color:'#0D0D0D' }}>Custos por Unidade</div>
          <div style={{ fontSize:11, color:'#ABABAB' }}>{MESES[mesIdx]} · calculado automaticamente dos dados TOTVS</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 100px 110px 90px 90px 90px 80px', background:'#0D0D0D', padding:'8px 20px' }}>
          {['Unidade','Folha Bruta','Folha c/Enc.','Rescisão','Total','R$/Pessoa','HC R/I'].map((h,i) => (
            <div key={h} style={{ fontSize:9.5, fontWeight:600, color:'#fff', letterSpacing:'0.07em', textTransform:'uppercase', textAlign:i===0?'left':'center' }}>{h}</div>
          ))}
        </div>

        {rankFilt.map((row, i) => (
          <div key={row.u} style={{ display:'grid', gridTemplateColumns:'1.4fr 100px 110px 90px 90px 90px 80px', padding:'11px 20px', borderBottom:i<rankFilt.length-1?'1px solid #E8E8E2':'none' }}>
            <div style={{ fontWeight:500, fontSize:13, color:'#0D0D0D' }}>{row.u}</div>
            <div style={{ textAlign:'center', fontSize:12, color:'#888', fontFamily:"'DM Mono',monospace" }}>R$ {fmt(row.folhaBruta)}</div>
            <div style={{ textAlign:'center', fontSize:12, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(row.folha)}</div>
            <div style={{ textAlign:'center', fontSize:12, color:row.resc>0?'#8C1414':'#ABABAB', fontFamily:"'DM Mono',monospace" }}>{row.resc>0?`R$ ${fmt(row.resc)}`:'—'}</div>
            <div style={{ textAlign:'center', fontSize:12, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(row.cr)}</div>
            <div style={{ textAlign:'center', fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(row.cpp)}</div>
            <div style={{ textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
              <span style={{ fontSize:12, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>{row.hcR}</span>
              <span style={{ fontSize:11, color:'#ABABAB' }}>/</span>
              <span style={{ fontSize:12, color:'#ABABAB', fontFamily:"'DM Mono',monospace" }}>{row.hcI || '—'}</span>
            </div>
          </div>
        ))}

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 100px 110px 90px 90px 90px 80px', padding:'11px 20px', background:'#F5F5F0', borderTop:'2px solid #0D0D0D' }}>
          <div style={{ fontWeight:700, fontSize:13 }}>TOTAL</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, color:'#888', fontFamily:"'DM Mono',monospace" }}>R$ {fmt(folhaBruta)}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(folha)}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, color:'#8C1414', fontFamily:"'DM Mono',monospace" }}>{resc>0?`R$ ${fmt(resc)}`:'—'}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(cr)}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>R$ {fmt(cpp)}</div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:12, fontFamily:"'DM Mono',monospace" }}>{hcAt}/{hcId}</div>
        </div>
      </div>
    </div>
  )
}

function Aviso({ msg }) {
  return <div style={{ background:'#F5F5F0', border:'1px solid #E8E8E2', borderRadius:8, padding:'10px 20px', fontSize:12, color:'#ABABAB' }}>{msg}</div>
}
