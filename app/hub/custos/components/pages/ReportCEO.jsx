import React, { useMemo, useState } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { fmtK, fmtData, mesAnteriorISO, mesISOLabel, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Vazio, SemDadosNF, botaoSecundario } from '../ui/nf.jsx'
import { ListasArea } from './GestorArea.jsx'
import CaixaTotal from '../ui/CaixaTotal.jsx'
import Projecao, { calcularProjecao } from '../ui/Projecao.jsx'

// v27.2 — Report do mês pro CEO: o grupo inteiro numa página, com
// variação vs mês anterior, áreas lado a lado e o que puxou o mês.
// "Baixar PDF" usa a impressão do navegador (Salvar como PDF).

const soma = (arr, f, k = 'valor') => arr.filter(f).reduce((t, x) => t + (x[k] || 0), 0)
const varPct = (a, b) => (b ? (a / b - 1) * 100 : null)
const pctTxt = p => `${Math.abs(p).toFixed(1).replace('.', ',')}%`
const pctSinal = p => (p === null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${pctTxt(p)}`)
const corVar = p => (p !== null && p > 10 ? '#9A3C06' : p !== null && p < -10 ? '#4F6B14' : COR.suave)

function leitura(vp, aberto, pago, maiorAlta, maiorQueda) {
  const partes = []
  if (vp === null) partes.push('Sem mês anterior pra comparar.')
  else if (Math.abs(vp) <= 10) partes.push('Pago estável.')
  else if (vp > 10) partes.push(`Pago subiu ${pctTxt(vp)}.${maiorAlta ? ` Maior alta: ${maiorAlta.toLowerCase()}.` : ''}`)
  else partes.push(`Pago caiu ${pctTxt(vp)}.${maiorQueda ? ` Maior queda: ${maiorQueda.toLowerCase()}.` : ''}`)
  if (aberto > 0 && pago > 0 && aberto >= pago * 0.5) partes.push(`${fmtK(aberto)} em notas esperando pagamento.`)
  return partes.join(' ')
}

function ReportFechado() {
  const { nfResumo, busConfig, grupoBU, corBU } = useFinanceiro()
  const [mesEscolhido, setMesEscolhido] = useState('')
  const [areaSel, setAreaSel] = useState('')

  const meses = useMemo(() => (nfResumo ? nfResumo.meses.map(m => m.mes).filter(Boolean).sort().reverse() : []), [nfResumo])
  // abre no último mês FECHADO (o atual ainda está em andamento)
  // o report é do mês FECHADO; o mês em andamento fica no bloco "Prévia" do topo
  const fechados = nfResumo ? meses.filter(m => !nfResumo.mes_atual || m < nfResumo.mes_atual) : []
  const mesPadrao = fechados[0] || meses[0] || ''
  const mes = mesEscolhido && fechados.includes(mesEscolhido) ? mesEscolhido : mesPadrao
  const ant = mesAnteriorISO(mes)

  const r = useMemo(() => {
    if (!nfResumo || !mes) return null
    const noTotal = bu => grupoBU(bu) !== 'Fora dos totais'                 // inclui "Revisar": é dinheiro de verdade
    const naLista = bu => grupoBU(bu) === 'Operacional'
    const P = nfResumo.pago, E = nfResumo.entrou, T = nfResumo.pago_tipo || [], C = nfResumo.pago_cat || []
    const tot = (arr, m) => soma(arr, x => x.mes === m && noTotal(x.bu))
    const tipo = (m, t) => soma(T, x => x.mes === m && x.tipo === t && noTotal(x.bu))

    const A = nfResumo.aberto || []
    const kpis = [
      ['Pago no mês', tot(P, mes), tot(P, ant), 'Custo fixo + variável pago no mês, pela data do pagamento (relatório de contas pagas).'],
      ['Custo fixo', tipo(mes, 'Fixo'), tipo(ant, 'Fixo'), 'Aluguel, folha fixa, sistemas e contratos mensais.'],
      ['Custo variável', tipo(mes, 'Variável'), tipo(ant, 'Variável'), 'Insumos, mão de obra variável, manutenção, eventos.'],
    ]
    const comNota = soma(P, x => x.mes === mes && noTotal(x.bu), 'valor_com_nf')
    const abertoTot = soma(A, x => noTotal(x.bu)), abertoQtd = soma(A, x => noTotal(x.bu), 'qtd')
    const vencidoTot = soma(A, x => noTotal(x.bu), 'vencido')
    // "a pagar" só existe pro mês atual (o que ficou em aberto de meses passados cai no atual)
    const aPagarTot = mes === nfResumo.mes_atual ? soma(nfResumo.a_pagar_mes || [], x => x.mes === mes && noTotal(x.bu)) : 0
    // conciliação com o "Tudo" das páginas por casa: o que saiu do caixa no total
    const investMes = soma(T, x => x.mes === mes && x.tipo === 'Investimento')
    const foraMes = soma(T, x => x.mes === mes && x.tipo === 'Fora')

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
      const pn = soma(P, x => x.mes === mes && x.bu === bu, 'valor_com_nf')
      const ab = soma(A, x => x.bu === bu), abQ = soma(A, x => x.bu === bu, 'qtd')
      const ap = mes === nfResumo.mes_atual ? soma(nfResumo.a_pagar_mes || [], x => x.bu === bu && x.mes === mes) : 0
      const alta = altas.find(m => m.bu === bu), queda = quedas.find(m => m.bu === bu)
      const vp = varPct(p + ap, pa)   // no mês atual compara o previsto (pago + a pagar)
      return { bu, p, pa, pn, ab, abQ, ap, vp, leitura: leitura(vp, ab, p, alta && alta.cat, queda && queda.cat) }
    }).filter(a => a.p || a.pa || a.ab).sort((a, b) => b.p - a.p)

    const semAreaAnt = soma(P, x => x.mes === ant && x.bu === 'Revisar')
    const semAreaMes = soma(P, x => x.mes === mes && x.bu === 'Revisar')

    const ult = meses.filter(m => m <= mes).sort().slice(-6)
    const hist = ult.map(m => ({ m, fixo: tipo(m, 'Fixo'), vari: tipo(m, 'Variável') }))
    const maxH = Math.max(1, ...hist.map(h => h.fixo + h.vari))

    // "Com o que gastamos": custo do mês por tipo de gasto (todas as áreas e casas)
    const catsMes = [...new Set(C.filter(x => (x.mes === mes || x.mes === ant) && noTotal(x.bu)).map(x => x.categoria))]
    const totCat = soma(C, x => x.mes === mes && noTotal(x.bu))
    let cats = catsMes.map(cat => ({
      cat, v: soma(C, x => x.mes === mes && x.categoria === cat && noTotal(x.bu)), a: soma(C, x => x.mes === ant && x.categoria === cat && noTotal(x.bu)),
    })).filter(c => c.v || c.a).sort((x, y) => y.v - x.v)
    const pequenas = cats.filter(c => totCat && c.v / totCat < 0.01)
    if (pequenas.length > 1) {
      cats = cats.filter(c => !pequenas.includes(c))
      cats.push({ cat: `Outros (${pequenas.map(c => c.cat.toLowerCase()).join(', ')})`, v: pequenas.reduce((t, c) => t + c.v, 0), a: pequenas.reduce((t, c) => t + c.a, 0), outros: true })
    }

    return { cats, totCat, aPagarTot, kpis, investMes, foraMes, comNota, abertoTot, abertoQtd, vencidoTot, areas, puxou, semAreaAnt, semAreaMes, hist, maxH, temTipo: T.length > 0 }
  }, [nfResumo, busConfig, mes, ant, meses])

  if (!nfResumo) return <SemDadosNF />
  if (!r) return <div style={{ padding: 24 }}><Vazio>Ainda não tem mês com dados.</Vazio></div>

  const [pagoK] = r.kpis
  const emAndamento = false   // v27.8: mês em andamento só no bloco Prévia
  const previsto = pagoK[1] + r.aPagarTot
  const vp = varPct(emAndamento ? previsto : pagoK[1], pagoK[2])
  let frase
  if (emAndamento) {
    frase = `${mesNome(mes)[0].toUpperCase()}${mesNome(mes).slice(1)} está em andamento: o grupo já pagou ${fmtK(pagoK[1])} e tem ${fmtK(r.aPagarTot)} em notas a pagar no mês, o que dá ${fmtK(previsto)}`
    frase += vp === null ? '.' : ` (${mesNome(ant)} fechou em ${fmtK(pagoK[2])}).`
  } else {
    frase = `Em ${mesNome(mes)}, o grupo pagou ${fmtK(pagoK[1])}`
    if (vp !== null) frase += Math.abs(vp) < 1 ? `, praticamente igual a ${mesNome(ant)}.` : `, ${pctTxt(vp)} ${vp > 0 ? 'a mais' : 'a menos'} que em ${mesNome(ant)}.`
    else frase += '.'
  }
  const [areaDetalhe, setAreaDetalhe] = [areaSel, setAreaSel]
  const mesAt = nfResumo.mes_atual
  const mesAntAt = mesAt ? mesAnteriorISO(mesAt) : ''
  const busPrevia = [...new Set([...(nfResumo.pago || []).filter(x => x.mes === mesAt || x.mes === mesAntAt).map(x => x.bu), ...(nfResumo.a_pagar_mes || []).filter(x => x.mes === mesAt).map(x => x.bu)])]
    .filter(b => grupoBU(b) !== 'Fora dos totais')
  const linhasPrevia = busPrevia.map(b => ({
    bu: b,
    pago: soma(nfResumo.pago || [], x => x.bu === b && x.mes === mesAt),
    aPagar: soma(nfResumo.a_pagar_mes || [], x => x.bu === b && x.mes === mesAt),
    anterior: soma(nfResumo.pago || [], x => x.bu === b && x.mes === mesAntAt),
  }))
  const card = { background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, minWidth: 0, breakInside: 'avoid' }
  const gridAreas = 'minmax(150px, 1.4fr) 110px 80px 80px 120px minmax(170px, 1.8fr)'

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
        <div style={{ fontSize: 13, color: COR.suave }}>Consulta de um mês que já fechou.</div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Mês
          <select value={mes} onChange={e => setMesEscolhido(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
            {fechados.map(m => <option key={m} value={m}>{mesNomeCurto(m)}</option>)}
          </select>
        </label>
        <button onClick={() => window.print()} style={{ ...botaoSecundario, background: '#4F6B14', color: '#fff', border: 'none', fontWeight: 600, padding: '8px 14px', fontSize: 13 }}>Baixar PDF</button>
      </div>

      <section aria-labelledby="ceo-frase" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: COR.suave }}>Custos do grupo · {mesNomeCurto(mes)}{nfResumo.baixas_ate ? ` · pagamentos arquivados até ${fmtData(nfResumo.baixas_ate)}` : ''}</div>
        <h1 id="ceo-frase" style={{ margin: 0, fontSize: 26, fontWeight: 600, lineHeight: 1.3, maxWidth: 840 }}>{frase}</h1>
        {emAndamento && (
          <div style={{ fontSize: 12, color: '#7A5A00', background: '#FBF1D2', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5, maxWidth: 840 }}>
            Mês em andamento: os pagamentos entram conforme as baixas são arquivadas. Fixo, variável, tipos de gasto e "o que puxou o mês" comparam um mês incompleto com um mês fechado: use o mês anterior pra comparar de verdade.
          </div>
        )}
      </section>

      <section aria-label="Números do mês" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {r.kpis.filter((k, i) => i < 1 || r.temTipo).map(([rot, v, a, exp]) => {
          const p = varPct(v, a)
          return (
            <div key={rot} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{rot}</div>
              <div style={{ ...num, fontSize: 26 }}>{fmtK(v)}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 99, color: corVar(p), background: p !== null && p > 10 ? '#FDEBDD' : p !== null && p < -10 ? '#EEF3DD' : '#F0F0EC' }}>{pctSinal(p)} vs {mesNome(ant)}</span>
                <span style={{ fontSize: 12, color: COR.suave }}>{mesNome(ant)}: {fmtK(a)}</span>
              </div>
              <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.4 }}>{exp}{rot === 'Pago no mês' && pagoK[1] ? ` ${Math.round(r.comNota / pagoK[1] * 100)}% com nota fiscal.` : ''}</div>
            </div>
          )
        })}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Notas não pagas (últimos 40 dias)</div>
          <div style={{ ...num, fontSize: 26 }}>{fmtK(r.abertoTot)}</div>
          <div style={{ fontSize: 12, color: COR.suave }}>{r.abertoQtd.toLocaleString('pt-BR')} notas{r.vencidoTot ? ` · ${fmtK(r.vencidoTot)} já passaram da data prevista` : ''}</div>
          <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.4 }}>Notas que entraram desde {fmtData(nfResumo.aberto_desde)} e ainda não estão nas contas pagas.</div>
        </div>
      </section>

      {r.temTipo && (nfResumo.caixa_fora || []).length > 0 && (
        <CaixaTotal caixaFora={nfResumo.caixa_fora} custo={pagoK[1]} custoAnt={pagoK[2]} mes={mes} ant={ant} />
      )}

      <section aria-labelledby="ceo-areas" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 id="ceo-areas" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Áreas</h2>
          <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, maxWidth: 720, lineHeight: 1.5 }}>O que cada área pagou no mês, quanto disso tinha nota fiscal e quanto ela tem em notas dos últimos 40 dias ainda não pagas. Em destaque, variações acima de 10%. Clique numa área pra ver o detalhe.</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridAreas, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
              <div>Área</div><div style={{ textAlign: 'right' }}>Pago</div>
              <div style={{ textAlign: 'right' }}>vs {mesISOLabel(ant).split('/')[0].toLowerCase()}</div>
              <div style={{ textAlign: 'right' }}>Com nota</div><div style={{ textAlign: 'right' }}>Notas não pagas (40 dias)</div><div>Leitura</div>
            </div>
            {r.areas.map(a => (
              <div key={a.bu} style={{ display: 'grid', gridTemplateColumns: gridAreas, gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13, breakInside: 'avoid' }}>
                <button onClick={() => { setAreaDetalhe(a.bu); setTimeout(() => { const el = document.getElementById('ceo-detalhe'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 50) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: COR.texto, textAlign: 'left', textDecoration: 'underline', textDecorationColor: '#D9D9D2', textUnderlineOffset: 3 }}>
                  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: corBU(a.bu), flexShrink: 0 }} />{a.bu}
                </button>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(a.p)}</div>
                <div style={{ ...num, textAlign: 'right', color: corVar(a.vp), fontWeight: a.vp !== null && Math.abs(a.vp) > 10 ? 600 : 400 }}>{pctSinal(a.vp)}</div>
                <div style={{ ...num, textAlign: 'right', color: COR.suave }}>{a.p ? `${Math.round(a.pn / a.p * 100)}%` : '—'}</div>
                <div style={{ ...num, textAlign: 'right' }}>{a.ab ? fmtK(a.ab) : '—'}</div>
                <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.4 }}>{a.leitura}</div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: gridAreas, gap: 10, padding: '12px 4px 4px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
              <div>Grupo</div>
              <div style={{ ...num, textAlign: 'right' }}>{fmtK(pagoK[1])}</div>
              <div style={{ ...num, textAlign: 'right' }}>{pctSinal(vp)}</div>
              <div style={{ ...num, textAlign: 'right' }}>{pagoK[1] ? `${Math.round(r.comNota / pagoK[1] * 100)}%` : '—'}</div>
              <div style={{ ...num, textAlign: 'right' }}>{fmtK(r.abertoTot)}</div><div />
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

      {r.cats.length > 0 && (
        <section aria-labelledby="ceo-tipo" style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h2 id="ceo-tipo" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Com o que gastamos</h2>
            <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>Custo do mês por tipo de gasto, somando todas as áreas e casas. A barra mostra quanto cada tipo pesa no total de {fmtK(r.totCat)}.</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 620 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.2fr) minmax(140px, 1.6fr) 100px 84px 110px', gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Tipo de gasto</div><div>Peso no custo</div><div style={{ textAlign: 'right' }}>{mesNomeCurto(mes).split('/')[0]}</div><div style={{ textAlign: 'right' }}>vs {mesNome(ant).substring(0, 3)}</div><div style={{ textAlign: 'right' }}>Diferença</div>
              </div>
              {r.cats.map(c => {
                const p = varPct(c.v, c.a), dif = c.v - c.a, maxV = r.cats[0].v || 1
                return (
                  <div key={c.cat} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.2fr) minmax(140px, 1.6fr) 100px 84px 110px', gap: 10, alignItems: 'center', padding: '9px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13, breakInside: 'avoid' }}>
                    <div style={{ fontWeight: c.outros ? 400 : 500, fontSize: c.outros ? 12 : 13, color: c.outros ? COR.suave : COR.texto }}>{c.cat}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: '#EEEDE6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(c.v / maxV * 100).toFixed(1)}%`, background: '#4F6B14', borderRadius: 4, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
                      </div>
                      <span style={{ ...num, fontSize: 11, color: COR.suave, width: 34, textAlign: 'right' }}>{r.totCat ? Math.round(c.v / r.totCat * 100) : 0}%</span>
                    </div>
                    <div style={{ ...num, textAlign: 'right' }}>{fmtK(c.v)}</div>
                    <div style={{ ...num, textAlign: 'right', color: corVar(p), fontWeight: p !== null && Math.abs(p) > 10 ? 600 : 400 }}>{pctSinal(p)}</div>
                    <div style={{ ...num, textAlign: 'right', fontSize: 12, color: dif >= 0 ? '#9A3C06' : '#4F6B14' }}>{dif >= 0 ? '+' : ''}{fmtK(dif)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

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

      <section id="ceo-detalhe" className="no-print" aria-labelledby="ceo-det-tit" style={{ display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 id="ceo-det-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Detalhe por área</h2>
            <div style={{ fontSize: 12, color: COR.suave, marginTop: 3 }}>Cada pagamento com conta, fornecedor, valor, data do pagamento e a nota (com data de entrada), mais as notas ainda não pagas. Dá pra exportar pra Excel.</div>
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Área
            <select value={areaDetalhe || (r.areas[0] && r.areas[0].bu) || ''} onChange={e => setAreaDetalhe(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
              {r.areas.map(a => <option key={a.bu} value={a.bu}>{a.bu}</option>)}
            </select>
          </label>
        </div>
        {r.areas.length > 0 && <ListasArea key={(areaDetalhe || r.areas[0].bu) + mes} bu={areaDetalhe || r.areas[0].bu} mes={mes} semRevisao />}
      </section>

      <div style={{ fontSize: 12, color: COR.suave }}>"Pago" = contas pagas pela data do pagamento. "Notas não pagas" = notas fiscais já recebidas (MTR090) sem pagamento localizado. Impostos, tarifas e intercompany ficam fora.</div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// v27.10 — Report: o padrão é olhar pra frente (mês atual + próximos);
// os meses fechados ficam na aba "Meses anteriores".
// ══════════════════════════════════════════════════════════════
export default function ReportCEO() {
  const { nfResumo, busConfig, grupoBU, corBU } = useFinanceiro()
  const [aba, setAba] = useState('atual')
  const [areaDet, setAreaDet] = useState('')

  const proj = useMemo(() => {
    if (!nfResumo || !nfResumo.mes_atual) return null
    const bus = (busConfig.length ? busConfig.map(b => b.bu) : [...new Set((nfResumo.pago || []).map(x => x.bu))])
      .filter(b => grupoBU(b) !== 'Fora dos totais')
    return calcularProjecao({ pago: nfResumo.pago || [], aPagarMes: nfResumo.a_pagar_mes || [], mesAtual: nfResumo.mes_atual, bus })
  }, [nfResumo, busConfig])

  if (!nfResumo) return <SemDadosNF />

  const tab = id => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minHeight: 36,
    background: aba === id ? '#fff' : 'transparent', color: aba === id ? COR.texto : COR.suave, fontWeight: aba === id ? 600 : 400,
  })
  const areasDet = proj ? proj.linhas.map(l => l.bu).filter(b => b !== 'Revisar') : []
  const areaSel = areaDet || areasDet[0] || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="no-print" style={{ padding: '20px 20px 0', maxWidth: 1180, width: '100%', boxSizing: 'border-box', margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="tablist" style={{ display: 'flex', gap: 4, background: '#F0F0EA', padding: 4, borderRadius: 10 }}>
          <button role="tab" aria-selected={aba === 'atual'} onClick={() => setAba('atual')} style={tab('atual')}>Mês atual e próximos</button>
          <button role="tab" aria-selected={aba === 'anteriores'} onClick={() => setAba('anteriores')} style={tab('anteriores')}>Meses anteriores</button>
        </div>
        {aba === 'atual' && <button onClick={() => window.print()} style={{ ...botaoSecundario, background: '#4F6B14', color: '#fff', border: 'none', fontWeight: 600, padding: '8px 14px', fontSize: 13 }}>Baixar PDF</button>}
      </div>

      {aba === 'anteriores' ? <ReportFechado /> : (
        <div className="report-ceo" style={{ padding: '16px 20px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1180, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
          <style>{`
            @media print {
              .no-print { display: none !important; }
              .h-screen { height: auto !important; }
              .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
              body { background: #fff !important; }
              .report-ceo { padding: 0 !important; max-width: none !important; }
              @page { size: A4 landscape; margin: 12mm; }
            }
          `}</style>
          {!proj ? <Vazio>Publique o Apps Script mais novo e recalcule o cache pra ver a projeção.</Vazio> : (
            <Projecao proj={proj} baixasAte={nfResumo.baixas_ate} corBU={corBU}
              onArea={bu => { setAreaDet(bu); setTimeout(() => { const el = document.getElementById('ceo-det-atual'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 50) }} />
          )}

          {proj && areaSel && (
            <section id="ceo-det-atual" className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Detalhe por área</h2>
                  <div style={{ fontSize: 12, color: COR.suave, marginTop: 3 }}>Pagamentos de {mesNome(proj.mesAtual)} e notas não pagas dos últimos 40 dias, com previsão de pagamento. Dá pra exportar pra Excel.</div>
                </div>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Área
                  <select value={areaSel} onChange={e => setAreaDet(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
                    {areasDet.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <ListasArea key={areaSel + proj.mesAtual} bu={areaSel} mes={proj.mesAtual} semRevisao />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
