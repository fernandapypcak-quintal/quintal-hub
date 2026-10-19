import React, { useMemo, useState } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { fmtK, fmtData, mesAnteriorISO, mesISOLabel, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Vazio, SemDadosNF, botaoSecundario } from '../ui/nf.jsx'

// v27.2 — Report do mês pro CEO: o grupo inteiro numa página, com
// variação vs mês anterior, áreas lado a lado e o que puxou o mês.
// "Baixar PDF" usa a impressão do navegador (Salvar como PDF).

const soma = (arr, f, k = 'valor') => arr.filter(f).reduce((t, x) => t + (x[k] || 0), 0)
const varPct = (a, b) => (b ? (a / b - 1) * 100 : null)
const pctTxt = p => `${Math.abs(p).toFixed(1).replace('.', ',')}%`
const pctSinal = p => (p === null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${pctTxt(p)}`)
const corVar = p => (p !== null && p > 10 ? '#9A3C06' : p !== null && p < -10 ? '#4F6B14' : COR.suave)

function leitura(vp, vn, maiorAlta, maiorQueda) {
  if (vp === null && vn === null) return 'Sem mês anterior pra comparar.'
  const pequeno = p => p === null || Math.abs(p) <= 10
  if (pequeno(vp) && pequeno(vn)) return 'Estável nos dois.'
  if (vn !== null && vn > 10 && (vp === null || vn - vp > 15)) {
    const pago = vp === null ? '' : ` e o pago ${vp >= 0 ? `subiu ${pctTxt(vp)}` : `caiu ${pctTxt(vp)}`}`
    return `Notas subiram ${pctTxt(vn)}${pago}: gasto que ainda vai aparecer no caixa.`
  }
  if (vp !== null && vp > 10) return `Pago subiu ${pctTxt(vp)}.${maiorAlta ? ` Maior alta: ${maiorAlta.toLowerCase()}.` : ''}`
  if (vp !== null && vp < -10) return `Pago caiu ${pctTxt(vp)}.${maiorQueda ? ` Maior queda: ${maiorQueda.toLowerCase()}.` : ''}`
  if (vn !== null && vn < -10) return `Notas caíram ${pctTxt(vn)}.`
  return 'Variação pequena.'
}

export default function ReportCEO() {
  const { nfResumo, busConfig, grupoBU, corBU } = useFinanceiro()
  const [mesEscolhido, setMesEscolhido] = useState('')

  const meses = useMemo(() => (nfResumo ? nfResumo.meses.map(m => m.mes).filter(Boolean).sort().reverse() : []), [nfResumo])
  const mesPadrao = nfResumo ? ((nfResumo.baixas_ate && meses.includes(nfResumo.baixas_ate.substring(0, 7))) ? nfResumo.baixas_ate.substring(0, 7) : meses[0]) : ''
  const mes = mesEscolhido && meses.includes(mesEscolhido) ? mesEscolhido : mesPadrao
  const ant = mesAnteriorISO(mes)

  const r = useMemo(() => {
    if (!nfResumo || !mes) return null
    const noTotal = bu => grupoBU(bu) !== 'Fora dos totais'                 // inclui "Revisar": é dinheiro de verdade
    const naLista = bu => grupoBU(bu) === 'Operacional'
    const P = nfResumo.pago, E = nfResumo.entrou, T = nfResumo.pago_tipo || [], C = nfResumo.pago_cat || []
    const tot = (arr, m) => soma(arr, x => x.mes === m && noTotal(x.bu))
    const tipo = (m, t) => soma(T, x => x.mes === m && x.tipo === t && noTotal(x.bu))

    const kpis = [
      ['Pago no mês', tot(P, mes), tot(P, ant), 'O que saiu do caixa, pelo relatório de contas pagas.'],
      ['Notas que entraram', tot(E, mes), tot(E, ant), 'O que foi comprado ou contratado no mês, pago ou não.'],
      ['Custo fixo', tipo(mes, 'Fixo'), tipo(ant, 'Fixo'), 'Aluguel, folha fixa, sistemas e contratos mensais.'],
      ['Custo variável', tipo(mes, 'Variável'), tipo(ant, 'Variável'), 'Insumos, mão de obra variável, manutenção, eventos.'],
    ]

    // mudanças por área + categoria
    const chaves = [...new Set(C.filter(x => (x.mes === mes || x.mes === ant) && naLista(x.bu)).map(x => x.bu + '||' + x.categoria))]
    const mud = chaves.map(k => {
      const [bu, cat] = k.split('||')
      const a = soma(C, x => x.mes === ant && x.bu === bu && x.categoria === cat)
      const b = soma(C, x => x.mes === mes && x.bu === bu && x.categoria === cat)
      const semArea = soma(C, x => x.mes === ant && x.bu === 'Revisar' && x.categoria === cat)
      let texto = a === 0 ? `Não teve em ${mesNome(ant)}.` : b === 0 ? `Não teve em ${mesNome(mes)}.` : `De ${fmtK(a)} para ${fmtK(b)}.`
      if (b > a && semArea >= (b - a) * 0.3) texto += ` Em ${mesNome(ant)}, ${fmtK(semArea)} de ${cat.toLowerCase()} estavam sem área: parte é reclassificação.`
      return { bu, cat, dif: b - a, texto }
    })
    const altas = mud.filter(m => m.dif > 0).sort((x, y) => y.dif - x.dif)
    const quedas = mud.filter(m => m.dif < 0).sort((x, y) => x.dif - y.dif)
    const puxou = [...altas.slice(0, 5), ...quedas.slice(0, 2)]

    const lista = (busConfig.length ? busConfig.map(b => b.bu) : [...new Set(P.map(x => x.bu))]).filter(naLista)
    const areas = lista.map(bu => {
      const p = soma(P, x => x.mes === mes && x.bu === bu), pa = soma(P, x => x.mes === ant && x.bu === bu)
      const n = soma(E, x => x.mes === mes && x.bu === bu), na = soma(E, x => x.mes === ant && x.bu === bu)
      const alta = altas.find(m => m.bu === bu), queda = quedas.find(m => m.bu === bu)
      const vp = varPct(p, pa), vn = varPct(n, na)
      return { bu, p, pa, n, na, vp, vn, leitura: leitura(vp, vn, alta && alta.cat, queda && queda.cat) }
    }).filter(a => a.p || a.pa || a.n || a.na).sort((a, b) => b.p - a.p)

    const semAreaAnt = soma(P, x => x.mes === ant && x.bu === 'Revisar')
    const semAreaMes = soma(P, x => x.mes === mes && x.bu === 'Revisar')

    const ult = meses.filter(m => m <= mes).sort().slice(-6)
    const hist = ult.map(m => ({ m, fixo: tipo(m, 'Fixo'), vari: tipo(m, 'Variável') }))
    const maxH = Math.max(1, ...hist.map(h => h.fixo + h.vari))

    return { kpis, areas, puxou, semAreaAnt, semAreaMes, hist, maxH, temTipo: T.length > 0 }
  }, [nfResumo, busConfig, mes, ant, meses])

  if (!nfResumo) return <SemDadosNF />
  if (!r) return <div style={{ padding: 24 }}><Vazio>Ainda não tem mês com dados.</Vazio></div>

  const [pagoK, notasK] = r.kpis
  const vp = varPct(pagoK[1], pagoK[2]), vn = varPct(notasK[1], notasK[2])
  let frase = `O grupo pagou ${fmtK(pagoK[1])}`
  if (vp !== null) frase += Math.abs(vp) < 1 ? `, praticamente igual a ${mesNome(ant)}.` : `, ${pctTxt(vp)} ${vp > 0 ? 'a mais' : 'a menos'} que em ${mesNome(ant)}.`
  else frase += '.'
  if (vn !== null) {
    if (vp !== null && vn - vp > 5 && vn > 0) frase += ` Mas as notas que entraram subiram ${pctTxt(vn)}: tem gasto contratado que ainda não passou pelo caixa.`
    else frase += ` As notas que entraram ${vn >= 0 ? 'subiram' : 'caíram'} ${pctTxt(vn)}.`
  }
  const card = { background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, minWidth: 0, breakInside: 'avoid' }
  const gridAreas = 'minmax(150px, 1.4fr) 110px 90px 110px 90px minmax(160px, 1.8fr)'

  return (
    <div className="report-ceo" style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1080, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .h-screen { height: auto !important; }
          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          body { background: #fff !important; }
          .report-ceo { padding: 0 !important; max-width: none !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Mês
          <select value={mes} onChange={e => setMesEscolhido(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
            {meses.map(m => <option key={m} value={m}>{mesNomeCurto(m)}</option>)}
          </select>
        </label>
        <button onClick={() => window.print()} style={{ ...botaoSecundario, background: '#4F6B14', color: '#fff', border: 'none', fontWeight: 600, padding: '8px 14px', fontSize: 13 }}>Baixar PDF</button>
      </div>

      <section aria-labelledby="ceo-frase" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: COR.suave }}>Custos do grupo · {mesNomeCurto(mes)}{nfResumo.baixas_ate ? ` · pagamentos arquivados até ${fmtData(nfResumo.baixas_ate)}` : ''}</div>
        <h1 id="ceo-frase" style={{ margin: 0, fontSize: 26, fontWeight: 600, lineHeight: 1.3, maxWidth: 840 }}>{frase}</h1>
      </section>

      <section aria-label="Números do mês" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {r.kpis.filter((k, i) => i < 2 || r.temTipo).map(([rot, v, a, exp]) => {
          const p = varPct(v, a)
          return (
            <div key={rot} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{rot}</div>
              <div style={{ ...num, fontSize: 26 }}>{fmtK(v)}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 99, color: corVar(p), background: p !== null && p > 10 ? '#FDEBDD' : p !== null && p < -10 ? '#EEF3DD' : '#F0F0EC' }}>{pctSinal(p)} vs {mesNome(ant)}</span>
                <span style={{ fontSize: 12, color: COR.suave }}>{mesNome(ant)}: {fmtK(a)}</span>
              </div>
              <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.4 }}>{exp}</div>
            </div>
          )
        })}
      </section>

      <section aria-labelledby="ceo-areas" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 id="ceo-areas" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Áreas: o que pagaram e o que contrataram</h2>
          <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, maxWidth: 720, lineHeight: 1.5 }}>Quando as notas sobem bem mais que o pago, a área contratou mais do que já apareceu no caixa. Em destaque, variações acima de 10%.</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridAreas, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
              <div>Área</div><div style={{ textAlign: 'right' }}>Pago</div><div style={{ textAlign: 'right' }}>vs {mesISOLabel(ant).split('/')[0].toLowerCase()}</div>
              <div style={{ textAlign: 'right' }}>Notas</div><div style={{ textAlign: 'right' }}>vs {mesISOLabel(ant).split('/')[0].toLowerCase()}</div><div>Leitura</div>
            </div>
            {r.areas.map(a => (
              <div key={a.bu} style={{ display: 'grid', gridTemplateColumns: gridAreas, gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13, breakInside: 'avoid' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: corBU(a.bu), flexShrink: 0 }} />{a.bu}</div>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(a.p)}</div>
                <div style={{ ...num, textAlign: 'right', color: corVar(a.vp), fontWeight: a.vp !== null && Math.abs(a.vp) > 10 ? 600 : 400 }}>{pctSinal(a.vp)}</div>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(a.n)}</div>
                <div style={{ ...num, textAlign: 'right', color: corVar(a.vn), fontWeight: a.vn !== null && Math.abs(a.vn) > 10 ? 600 : 400 }}>{pctSinal(a.vn)}</div>
                <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.4 }}>{a.leitura}</div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: gridAreas, gap: 10, padding: '12px 4px 4px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
              <div>Grupo</div>
              <div style={{ ...num, textAlign: 'right' }}>{fmtK(pagoK[1])}</div><div style={{ ...num, textAlign: 'right' }}>{pctSinal(vp)}</div>
              <div style={{ ...num, textAlign: 'right' }}>{fmtK(notasK[1])}</div><div style={{ ...num, textAlign: 'right' }}>{pctSinal(vn)}</div><div />
            </div>
          </div>
        </div>
        {r.semAreaAnt > 0 && r.semAreaMes < r.semAreaAnt && (
          <div style={{ fontSize: 12, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
            Em {mesNome(ant)}, {fmtK(r.semAreaAnt)} de pagamentos estavam sem área definida{r.semAreaMes > 0 ? ` (em ${mesNome(mes)}, ${fmtK(r.semAreaMes)})` : ''}. Quando eles são classificados, parte das altas das áreas é reclassificação, não gasto novo.
          </div>
        )}
        {r.semAreaMes > 0 && r.semAreaMes >= r.semAreaAnt && (
          <div style={{ fontSize: 12, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
            {fmtK(r.semAreaMes)} de pagamentos de {mesNome(mes)} ainda estão sem área definida. Eles entram no total do grupo, mas não em nenhuma área.
          </div>
        )}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        <section aria-labelledby="ceo-puxou" style={{ ...card, flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h2 id="ceo-puxou" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>O que puxou o mês</h2>
            <div style={{ fontSize: 12, color: COR.suave, marginTop: 3 }}>Maiores mudanças em relação a {mesNome(ant)}, por área e tipo de gasto</div>
          </div>
          {!r.puxou.length ? <Vazio>Sem dados de categoria. Publique o Apps Script v27.2 e recalcule o cache.</Vazio> : r.puxou.map(m => (
            <div key={m.bu + m.cat} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', paddingBottom: 10, borderBottom: '0.5px solid #F0F0EC', breakInside: 'avoid' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{m.bu} · {m.cat}</div>
              <div style={{ ...num, fontSize: 14, color: m.dif >= 0 ? '#9A3C06' : '#4F6B14' }}>{m.dif >= 0 ? '+' : ''}{fmtK(m.dif)}</div>
              <div style={{ fontSize: 12, color: COR.suave, gridColumn: '1 / -1', lineHeight: 1.45 }}>{m.texto}</div>
            </div>
          ))}
        </section>

        {r.temTipo && (
          <section aria-labelledby="ceo-tend" style={{ ...card, flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h2 id="ceo-tend" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Fixo e variável do grupo</h2>
              <div style={{ fontSize: 12, color: COR.suave, marginTop: 3 }}>Pago por mês. O variável inclui as compras de insumos (CMV).</div>
            </div>
            <div aria-label="Fixo e variável nos últimos meses" style={{ display: 'flex', gap: 14, alignItems: 'flex-end', height: 220, paddingTop: 6 }}>
              {r.hist.map((h, i) => (
                <div key={h.m} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ ...num, fontSize: 11 }}>{fmtK(h.fixo + h.vari)}</div>
                  <div style={{ width: '100%', maxWidth: 52, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: Math.round(h.vari / r.maxH * 170), background: '#97A624', borderRadius: '3px 3px 0 0', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
                    <div style={{ height: Math.round(h.fixo / r.maxH * 170), background: '#2B4C7E', borderRadius: '0 0 3px 3px', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
                  </div>
                  <div style={{ fontSize: 12, color: i === r.hist.length - 1 ? COR.texto : COR.suave, fontWeight: i === r.hist.length - 1 ? 600 : 400 }}>{mesISOLabel(h.m).split('/')[0]}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COR.suave, flexWrap: 'wrap' }}>
              <span><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#2B4C7E', marginRight: 5 }} />Fixo</span>
              <span><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#97A624', marginRight: 5 }} />Variável</span>
              <span>Investimentos ficam fora do gráfico</span>
            </div>
          </section>
        )}
      </div>

      <div style={{ fontSize: 12, color: COR.suave }}>"Pago" = contas pagas pela data do pagamento. "Notas" = notas fiscais pela data de entrada (MTR090). Impostos, tarifas e intercompany ficam fora.</div>
    </div>
  )
}
