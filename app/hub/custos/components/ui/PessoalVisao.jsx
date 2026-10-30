import React from 'react'
import { loadLancamentos } from '../../data/loader.js'
import { fmtK, mesNome, mesAnteriorISO } from '../../utils.js'
import { COR, num, useCarga, Carregando } from './nf.jsx'

// v27.21 — BU Pessoal com duas visões (não são áreas separadas):
//   Pessoas: folha, encargos, benefícios, gorjeta, rescisão — de todas as unidades
//   RH: treinamento, saúde ocupacional, uniforme, lavanderia, sistema, time de RH…
// + quanto cada área informou que gasta com o próprio time (lançamentos "Pessoal da área").

const Cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '')
const soma = (arr, f) => (arr || []).filter(f).reduce((t, x) => t + (x.valor || 0), 0)

const CATS_PESSOAS = ['FOLHA', 'ENCARGOS', 'BENEFICIOS', 'BENEFÍCIOS', 'COMISSOES', 'COMISSÕES', 'RESCISAO', 'RESCISÃO']

export default function PessoalVisao({ pessoalSub: subOrig, pagoCat = [], mesAtual }) {
  const ant = mesAnteriorISO(mesAtual)
  const meses = [mesAnteriorISO(ant), ant, mesAtual]
  // v27.22: mês sem a separação pronta (cache antigo, ou o mês acabou de começar) → monta pelas categorias de Pessoal
  const pessoalSub = [...(subOrig || [])]
  meses.forEach(m => {
    if (pessoalSub.some(x => x.mes === m)) return
    pagoCat.filter(x => x.bu === 'Pessoal' && x.mes === m).forEach(x => {
      pessoalSub.push({ mes: m, sub: CATS_PESSOAS.includes(String(x.categoria).toUpperCase()) ? 'Pessoas' : 'RH', categoria: x.categoria, valor: x.valor })
    })
  })
  const c = useCarga(() => loadLancamentos('Pessoal', true), [])

  const bloco = (sub, explica) => {
    const cats = [...new Set(pessoalSub.filter(x => x.sub === sub).map(x => x.categoria))]
      .map(cat => ({ cat, v: meses.map(m => soma(pessoalSub, x => x.sub === sub && x.categoria === cat && x.mes === m)) }))
      .filter(x => x.v.some(Boolean)).sort((a, b) => b.v[1] - a.v[1])
    const tot = meses.map(m => soma(pessoalSub, x => x.sub === sub && x.mes === m))
    const grid = 'minmax(140px, 1fr) repeat(3, 100px)'
    return (
      <div style={{ flex: '1 1 380px', minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, alignItems: 'end', borderBottom: `1.5px solid ${COR.texto}`, paddingBottom: 6 }}>
          <div><div style={{ fontSize: 14, fontWeight: 600 }}>{sub}</div><div style={{ fontSize: 11, color: COR.suave }}>{explica}</div></div>
          {meses.map(m => <div key={m} style={{ textAlign: 'right', fontSize: 12, color: m === mesAtual ? '#4F6B14' : COR.suave, fontWeight: 600, background: m === mesAtual ? '#F4F8EC' : 'transparent', borderRadius: 4, padding: '0 4px' }}>{m === mesAtual && <div style={{ fontSize: 9, letterSpacing: 0.3 }}>MÊS ATUAL</div>}{Cap(mesNome(m).substring(0, 3))}{m === mesAtual ? ' (até agora)' : ''}</div>)}
        </div>
        {cats.map(x => (
          <div key={x.cat} style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '6px 0', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
            <span>{x.cat}</span>{x.v.map((v, i) => <span key={i} style={{ ...num, textAlign: 'right', color: v ? COR.texto : COR.fraco }}>{v ? fmtK(v) : '—'}</span>)}
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '8px 0 0', fontSize: 13, fontWeight: 700 }}>
          <span>Total {sub}</span>{tot.map((v, i) => <span key={i} style={{ ...num, textAlign: 'right' }}>{fmtK(v)}</span>)}
        </div>
      </div>
    )
  }

  const lancs = (c.dados || []).filter(l => l.tipo === 'Pessoal da área' && meses.includes(l.mes))
  const areas = [...new Set(lancs.map(l => l.bu))].map(bu => ({
    bu, v: meses.map(m => soma(lancs, l => l.bu === bu && l.mes === m)),
    q: meses.map(m => lancs.filter(l => l.bu === bu && l.mes === m).reduce((t, l) => t + (l.qtd || 0), 0)),
  })).sort((a, b) => b.v[1] - a.v[1] || b.v[2] - a.v[2])

  return (
    <section aria-labelledby="pv-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 id="pv-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Pessoal: Pessoas × RH</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>Tudo continua na BU Pessoal; aqui ela aparece em duas visões. Valores pagos, pela data do pagamento.</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {bloco('Pessoas', 'folha, encargos, benefícios, gorjeta e rescisão de todas as unidades')}
        {bloco('RH', 'treinamento, saúde ocupacional, uniforme, lavanderia, sistema, time de RH')}
      </div>

      <div style={{ borderTop: `0.5px solid ${COR.borda}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Custo com pessoal por área (informado pelas áreas)</div>
        <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.5 }}>Quanto cada área lançou que gasta com o próprio time. A folha já está toda em Pessoas: isso mostra como ela se divide entre as áreas.</div>
        {c.carregando && !c.dados ? <Carregando texto="Carregando…" /> : !areas.length ? (
          <div style={{ fontSize: 13, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: 12 }}>Nenhuma área informou ainda. Cada gestor lança na Minha área, em "+ Lançar receita, economia ou pessoal", com o tipo "Pessoal da área".</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 520 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) repeat(3, 120px)', gap: 8, fontSize: 12, color: COR.suave, padding: '6px 0', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Área</div>{meses.map(m => <div key={m} style={{ textAlign: 'right', color: m === mesAtual ? '#4F6B14' : COR.suave, fontWeight: m === mesAtual ? 600 : 400 }}>{Cap(mesNome(m))}{m === mesAtual ? ' · atual' : ''}</div>)}
              </div>
              {areas.map(a => (
                <div key={a.bu} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) repeat(3, 120px)', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{a.bu}</span>
                  {a.v.map((v, i) => <span key={i} style={{ ...num, textAlign: 'right', color: v ? COR.texto : COR.fraco }}>{v ? fmtK(v) : '—'}{a.q[i] ? <span style={{ fontSize: 11, color: COR.suave }}> · {a.q[i]} p.</span> : null}</span>)}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) repeat(3, 120px)', gap: 8, padding: '8px 0 0', fontSize: 13, fontWeight: 700 }}>
                <span>Total informado</span>{meses.map((m, i) => <span key={m} style={{ ...num, textAlign: 'right' }}>{fmtK(areas.reduce((t, a) => t + a.v[i], 0))}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
