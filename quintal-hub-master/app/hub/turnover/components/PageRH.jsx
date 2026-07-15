import { useState } from 'react'
import KpiCard from './KpiCard.jsx'
import AlertasBanner from './AlertasBanner.jsx'
import GraficoMotivos from './GraficoMotivos.jsx'
import { CFG_DEFAULT, UNIDADES, MESES } from '../useGASData.js'

const COR = { ok:'#97A624', atencao:'#D9B504', critico:'#8C1414' }
const BG  = { ok:'#F0F5E0', atencao:'#FDF9E0', critico:'#F5E0E0' }
const fmt = v => v == null ? '—' : Number(v).toLocaleString('pt-BR')

export default function PageRH({ mesIdx, unidade, gas, loading }) {
  const [detalhe, setDetalhe] = useState(null)

  const cfg  = gas?.configuracoes ?? CFG_DEFAULT
  const META = cfg.semaforo_verde_ambar    ?? 5
  const CRIT = cfg.semaforo_ambar_vermelho ?? 9
  const CADM = cfg.custo_contratacao      ?? 2514
  const CDEM = cfg.custo_demissao         ?? 2724

  function st(t) { return t >= CRIT ? 'critico' : t > META ? 'atencao' : 'ok' }

  function r(u, campo, def = 0) {
    if (!gas?.resumo?.[u]) return def
    const v = gas.resumo[u][campo]
    return v == null ? def : v
  }

  const uns = unidade === 'Todas' ? UNIDADES : [unidade]
  let hcAt=0, hcId=0, adm=0, des=0, exp=0, turnSum=0
  uns.forEach(u => {
    hcAt    += r(u, 'hc_real')
    hcId    += r(u, 'hc_ideal')
    adm     += r(u, 'admissoes')
    des     += r(u, 'desligamentos')
    exp     += r(u, 'em_experiencia')
    turnSum += r(u, 'turnover')
  })

  const turnMedio = uns.length > 0 ? Math.round((turnSum / uns.length) * 10) / 10 : 0
  const vagas     = Math.max(0, hcId - hcAt)
  // Custo turnover = só desligamentos (rescisão + FGTS)
  const custoTurn = des * CDEM
  const pctExp    = hcAt > 0 ? Math.round((exp / hcAt) * 1000) / 10 : 0
  const ocup      = hcId > 0 ? Math.round((hcAt / hcId) * 1000) / 10 : 0

  const motivos  = gas?.motivos ?? []
  const totalMot = motivos.reduce((s, m) => s + m.qtd, 0)

  const ranking = gas?.resumo
    ? UNIDADES.map(u => ({
        u,
        hcR:    r(u, 'hc_real'),
        hcI:    r(u, 'hc_ideal'),
        turn:   r(u, 'turnover'),
        adm:    r(u, 'admissoes'),
        des:    r(u, 'desligamentos'),
        exp:    r(u, 'em_experiencia'),
        pctExp: r(u, 'pct_experiencia'),
        desvio: r(u, 'desvio'),
        status: r(u, 'status', 'ok'),
      })).sort((a, b) => b.turn - a.turn)
    : []

  const rankFilt = unidade === 'Todas' ? ranking : ranking.filter(x => x.u === unidade)
  const mesSelecionado = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'][mesIdx] ?? '2026-06'
  const corTurn  = st(turnMedio)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom:40 }}>

      {/* Alertas automáticos */}
      {!loading && <AlertasBanner gas={gas} cfg={cfg} />}
      {loading   && <Aviso tipo="info" msg="⏳ Carregando dados do Google Sheets..." />}

      {/* KPIs linha 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Turnover Médio" valor={`${turnMedio}%`}
          cor={corTurn === 'critico' ? 'vermelho' : corTurn === 'atencao' ? 'ambar' : 'verde'}
          sub={turnMedio === 0 ? 'Sem desligamentos no período' : turnMedio > META ? `↑ ${Math.round((turnMedio-META)*10)/10}pp acima da meta` : `✓ Dentro da meta (${META}%)`} />
        <KpiCard label="Headcount Atual" valor={hcAt}
          cor={hcAt >= hcId ? 'verde' : 'ambar'}
          sub={`Meta: ${hcId} · ${vagas > 0 ? `${vagas} vagas abertas` : 'Quadro completo'}`} />
        <KpiCard label="Admissões / Desligamentos" valor={`${adm} / ${des}`}
          cor={des === 0 ? 'verde' : adm >= des ? 'verde' : 'vermelho'}
          sub={`Saldo ${adm - des >= 0 ? '+' : ''}${adm - des} no período`} />
        <KpiCard label="Custo do Turnover" valor={`R$ ${fmt(custoTurn)}`}
          cor={custoTurn === 0 ? 'verde' : 'vermelho'}
          sub={des === 0 ? 'Sem desligamentos no período' : `${des} deslig. × R$ ${fmt(Math.round(CDEM))}`} />
      </div>

      {/* KPIs linha 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard label="Vagas Abertas" valor={vagas}
          cor={vagas === 0 ? 'verde' : vagas <= 10 ? 'ambar' : 'vermelho'}
          sub={vagas === 0 ? 'Quadro completo' : `${Math.round((vagas/hcId)*1000)/10}% abaixo do ideal`} />
        <KpiCard label="Em Experiência" valor={exp}
          cor={pctExp > 20 ? 'vermelho' : pctExp > 12 ? 'ambar' : 'verde'}
          sub={`${pctExp}% do headcount (<90 dias)`} />
        <KpiCard label="Admissões no Mês" valor={adm}
          cor={adm > 0 ? 'verde' : 'cinza'}
          sub={`Custo estimado: R$ ${fmt(adm * CADM)}`} />
        <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, padding:'16px 20px' }}>
          <div style={{ fontSize:10.5, fontWeight:600, color:'#ABABAB', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Ocupação Geral</div>
          <div style={{ fontSize:26, fontWeight:700, color:'#0D0D0D', fontFamily:"'DM Mono', monospace" }}>{ocup}%</div>
          <div style={{ fontSize:11, color:'#ABABAB', marginBottom:8 }}>{hcAt} de {hcId} colaboradores</div>
          <div style={{ height:8, background:'#E8E8E2', borderRadius:99 }}>
            <div style={{ height:8, borderRadius:99, width:`${Math.min(100, ocup)}%`, background: ocup >= 100 ? '#97A624' : ocup >= 85 ? '#D9B504' : '#8C1414' }} />
          </div>
        </div>
      </div>

      {/* Resumo por unidade */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
        <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #E8E8E2' }}>
            <div style={{ fontWeight:600, fontSize:14, color:'#0D0D0D' }}>Resumo por Unidade</div>
            <div style={{ fontSize:11, color:'#ABABAB' }}>{MESES[mesIdx]} · dados reais da planilha</div>
          </div>
          <div style={{ padding:20 }}>
            {!gas?.resumo ? (
              <div style={{ fontSize:12, color:'#ABABAB' }}>Aguardando dados...</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {UNIDADES.map(u => {
                  const hcR = r(u, 'hc_real')
                  const hcI = r(u, 'hc_ideal')
                  const t   = r(u, 'turnover')
                  const s   = st(t)
                  const oc  = hcI > 0 ? Math.round((hcR / hcI) * 100) : 0
                  return (
                    <div key={u} style={{ padding:'10px 12px', background:'#FAFAF8', borderRadius:6, border:`1px solid ${s !== 'ok' ? COR[s] : '#E8E8E2'}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#0D0D0D' }}>{u}</span>
                        <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:99, background:BG[s], color:COR[s] }}>
                          {t}%
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#ABABAB', marginBottom:4 }}>
                        <span>HC {hcR}/{hcI}</span>
                        <span>{oc}%</span>
                      </div>
                      <div style={{ height:4, background:'#E8E8E2', borderRadius:99 }}>
                        <div style={{ height:4, borderRadius:99, width:`${Math.min(100, oc)}%`, background: oc >= 100 ? '#97A624' : oc >= 85 ? '#D9B504' : '#8C1414' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Motivos — largura total */}
      <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #E8E8E2', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:'#0D0D0D' }}>Motivos de Desligamento</div>
            <div style={{ fontSize:11, color:'#ABABAB' }}>Histórico por mês · todo o período disponível</div>
          </div>
          {gas?.motivos_historico && (
            <div style={{ fontSize:11, color:'#ABABAB' }}>
              {gas.motivos_historico.length} meses · {gas.motivos_historico.reduce((s,m)=>s+Object.values(m.motivos).reduce((a,b)=>a+b,0),0)} desligamentos
            </div>
          )}
        </div>
        <div style={{ padding:24 }}>
          <GraficoMotivos historico={gas?.motivos_historico} gas={gas} unidade={unidade} mesSelecionado={mesSelecionado} />
        </div>
      </div>

      {/* Ranking */}
      <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #E8E8E2', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:'#0D0D0D' }}>Ranking de Unidades</div>
            <div style={{ fontSize:11, color:'#ABABAB' }}>Ordenado por turnover · clique para detalhes</div>
          </div>
          <div style={{ display:'flex', gap:16 }}>
            {['ok','atencao','critico'].map(s => (
              <span key={s} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#ABABAB' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:COR[s], display:'inline-block' }} />
                {s === 'ok' ? 'OK' : s === 'atencao' ? 'Atenção' : 'Crítico'}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 80px 70px 70px 70px 70px 80px 80px 70px', background:'#0D0D0D', padding:'8px 20px' }}>
          {['Unidade','Turnover','HC Atual','HC Ideal','Desvio','Vagas','Admis.','Deslig.','Exp. %'].map((h, i) => (
            <div key={h} style={{ fontSize:9.5, fontWeight:600, color:'#fff', letterSpacing:'0.07em', textTransform:'uppercase', textAlign: i === 0 ? 'left' : 'center' }}>{h}</div>
          ))}
        </div>
        {rankFilt.length === 0 && <div style={{ padding:20, fontSize:12, color:'#ABABAB' }}>Aguardando dados...</div>}
        {rankFilt.map((row, i) => {
          const s = st(row.turn)
          return (
            <button key={row.u} onClick={() => setDetalhe(row.u)}
              style={{ width:'100%', display:'grid', gridTemplateColumns:'1.6fr 80px 70px 70px 70px 70px 80px 80px 70px', padding:'12px 20px', background:'#fff', border:'none', cursor:'pointer', borderBottom: i < rankFilt.length-1 ? '1px solid #E8E8E2' : 'none', textAlign:'left' }}
              onMouseEnter={e => e.currentTarget.style.background='#FAFAF8'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
              <div style={{ fontWeight:500, fontSize:13, color:'#0D0D0D' }}>{row.u}</div>
              <div style={{ textAlign:'center', fontWeight:700, fontSize:13, color:COR[s], fontFamily:"'DM Mono', monospace" }}>{row.turn}%</div>
              <div style={{ textAlign:'center', fontSize:13, fontFamily:"'DM Mono', monospace" }}>{row.hcR}</div>
              <div style={{ textAlign:'center', fontSize:13, color:'#ABABAB', fontFamily:"'DM Mono', monospace" }}>{row.hcI}</div>
              <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color: row.desvio >= 0 ? '#97A624' : '#8C1414', fontFamily:"'DM Mono', monospace" }}>{row.desvio >= 0 ? `+${row.desvio}` : row.desvio}</div>
              <div style={{ textAlign:'center', fontSize:13, color: row.hcI - row.hcR > 0 ? '#8C1414' : '#97A624', fontFamily:"'DM Mono', monospace" }}>{Math.max(0, row.hcI - row.hcR)}</div>
              <div style={{ textAlign:'center', fontSize:13, fontFamily:"'DM Mono', monospace" }}>{row.adm}</div>
              <div style={{ textAlign:'center', fontSize:13, fontFamily:"'DM Mono', monospace" }}>{row.des}</div>
              <div style={{ textAlign:'center', fontSize:13, color: row.pctExp > 20 ? '#8C1414' : row.pctExp > 12 ? '#D9B504' : '#97A624', fontFamily:"'DM Mono', monospace" }}>{Math.round(row.pctExp)}%</div>
            </button>
          )
        })}
      </div>

      {detalhe && <PainelDetalhe unidade={detalhe} gas={gas} cfg={cfg} mesIdx={mesIdx} onClose={() => setDetalhe(null)} />}
    </div>
  )
}

function PainelDetalhe({ unidade, gas, cfg, mesIdx, onClose }) {
  const META = cfg?.semaforo_verde_ambar    ?? 5
  const CRIT = cfg?.semaforo_ambar_vermelho ?? 9
  function st(t) { return t >= CRIT ? 'critico' : t > META ? 'atencao' : 'ok' }

  const res    = gas?.resumo?.[unidade] ?? {}
  const hcR    = res.hc_real       ?? 0
  const hcI    = res.hc_ideal      ?? 0
  const desvio = res.desvio        ?? (hcR - hcI)
  const ocup   = hcI > 0 ? Math.round((hcR / hcI) * 1000) / 10 : 0
  const turn   = res.turnover      ?? 0
  const adm    = res.admissoes     ?? 0
  const des    = res.desligamentos ?? 0
  const exp    = res.em_experiencia   ?? 0
  const pctExp = res.pct_experiencia  ?? 0
  const s      = st(turn)

  const COR = { ok:'#97A624', atencao:'#D9B504', critico:'#8C1414' }
  const BG  = { ok:'#F0F5E0', atencao:'#FDF9E0', critico:'#F5E0E0' }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(13,13,13,0.35)', zIndex:40 }} />
      <div style={{ position:'fixed', top:0, right:0, height:'100%', width:360, background:'#fff', zIndex:50, boxShadow:'-8px 0 40px rgba(0,0,0,0.12)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #E8E8E2', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#0D0D0D' }}>{unidade}</div>
            <div style={{ fontSize:11, color:'#ABABAB' }}>{MESES[mesIdx]} · dados reais</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:6, border:'none', background:'#F5F5F0', cursor:'pointer', fontSize:18 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:BG[s], border:`1px solid ${COR[s]}`, borderRadius:8, padding:'12px 16px' }}>
            <div style={{ fontSize:9, color:COR[s], textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Turnover</div>
            <div style={{ fontSize:28, fontWeight:700, color:COR[s], fontFamily:"'DM Mono', monospace" }}>{turn}%</div>
            <div style={{ fontSize:11, color:COR[s], marginTop:2 }}>
              {turn === 0 ? 'Sem desligamentos no período' : s === 'ok' ? '✓ Dentro da meta' : s === 'atencao' ? '⚠ Acima da meta' : '⚠ Crítico'}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9.5, fontWeight:600, color:'#ABABAB', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Headcount</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[['Atual',hcR,'#0D0D0D'],['Ideal',hcI,'#ABABAB'],['Desvio',desvio>=0?`+${desvio}`:desvio,desvio>=0?'#97A624':'#8C1414']].map(([lbl,val,cor])=>(
                <div key={lbl} style={{ background:'#FAFAF8', border:'1px solid #E8E8E2', borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:9, color:'#ABABAB', textTransform:'uppercase', marginBottom:4 }}>{lbl}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:cor, fontFamily:"'DM Mono', monospace" }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#ABABAB', marginBottom:4 }}>
                <span>Ocupação</span><span style={{ fontFamily:"'DM Mono', monospace" }}>{ocup}%</span>
              </div>
              <div style={{ height:8, background:'#E8E8E2', borderRadius:99 }}>
                <div style={{ height:8, borderRadius:99, width:`${Math.min(100,ocup)}%`, background:ocup>=100?'#97A624':ocup>=85?'#D9B504':'#8C1414' }}/>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize:9.5, fontWeight:600, color:'#ABABAB', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Movimentação no Mês</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Admissões',adm,'#97A624'],['Desligamentos',des,des>0?'#8C1414':'#ABABAB']].map(([lbl,val,cor])=>(
                <div key={lbl} style={{ background:'#FAFAF8', border:'1px solid #E8E8E2', borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:9, color:'#ABABAB', textTransform:'uppercase', marginBottom:4 }}>{lbl}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:cor, fontFamily:"'DM Mono', monospace" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9.5, fontWeight:600, color:'#ABABAB', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Em Experiência (&lt;90 dias)</div>
            <div style={{ background:'#FAFAF8', border:'1px solid #E8E8E2', borderRadius:8, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:22, fontWeight:700, color:pctExp>20?'#8C1414':'#0D0D0D', fontFamily:"'DM Mono', monospace" }}>{exp}</div>
                <div style={{ fontSize:11, color:'#ABABAB' }}>colaboradores</div>
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:pctExp>20?'#8C1414':pctExp>12?'#D9B504':'#97A624', fontFamily:"'DM Mono', monospace" }}>{Math.round(pctExp)}%</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Aviso({ tipo, msg }) {
  return (
    <div style={{ background:'#F5F5F0', border:'1px solid #E8E8E2', borderRadius:8, padding:'10px 20px', fontSize:12, color:'#ABABAB' }}>
      {msg}
    </div>
  )
}
