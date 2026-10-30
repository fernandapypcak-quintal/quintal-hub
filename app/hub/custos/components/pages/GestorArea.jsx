import React, { useMemo, useState } from 'react'
import { AREAS_CUSTOS } from '@/lib/bus'
import { loadGestor, loadNFLista, loadPagamentosBU, loadReceitasLista, loadFornecedoresBU, reportarDivergenciaBU, registrarObsNF } from '../../data/loader.js'
import { fmt, fmtK, fmtData, mesAnteriorISO, mesISOLabel, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Busca, Carregando, Erro, Vazio, useCarga, botaoSecundario, exportarExcel, BotaoExportar } from '../ui/nf.jsx'
import DRECustos from '../ui/DRECustos.jsx'
import Projecao, { calcularProjecao, opcoesDeMes } from '../ui/Projecao.jsx'
import NotasEmAberto from '../ui/NotasEmAberto.jsx'
import ResumoBU from '../ui/ResumoBU.jsx'
import PessoalVisao from '../ui/PessoalVisao.jsx'
import MaioresGastos from '../ui/MaioresGastos.jsx'

// v27.3 — "Minha área": tudo pelo MÊS DO PAGAMENTO. O que a área pagou (com
// e sem nota), fixo e variável, de onde veio a diferença, a lista de
// pagamentos com a nota de cada um, e as notas recebidas que ainda não foram
// pagas. Listas exportam pra Excel e têm o botão "Não é da minha área".
// Usada pelo gestor (só as áreas dele) e pela diretoria (todas as áreas).

const soma = (arr, f, k = 'valor') => arr.filter(f).reduce((t, x) => t + (x[k] || 0), 0)
const varPct = (a, b) => (b ? (a / b - 1) * 100 : null)
const pctTxt = p => `${Math.abs(p).toFixed(1).replace('.', ',')}%`

function ChipVar({ p, mesAnt }) {
  if (p === null) return <span style={{ fontSize: 12, color: COR.suave }}>sem {mesNome(mesAnt)} pra comparar</span>
  const alto = p > 10, baixo = p < -10
  const cor = alto ? ['#9A3C06', '#FDEBDD'] : baixo ? ['#4F6B14', '#EEF3DD'] : ['#5a5c5f', '#F0F0EC']
  return <span style={{ fontSize: 13, fontWeight: 600, padding: '3px 9px', borderRadius: 99, color: cor[0], background: cor[1], whiteSpace: 'nowrap' }}>{p > 0 ? '+' : p < 0 ? '−' : ''}{pctTxt(p)} vs {mesNome(mesAnt)}</span>
}

export default function GestorArea({ areas }) {
  const lista = areas && areas.length ? areas : [...AREAS_CUSTOS]
  const [bu, setBu] = useState(lista[0])
  const [mesEscolhido, setMesEscolhido] = useState('')
  const [focoLista, setFocoLista] = useState({ aba: '', n: 0 })   // clique em "Notas a pagar" abre a lista certa
  const verNotasAPagar = () => {
    setFocoLista(f => ({ aba: 'apagar', n: f.n + 1 }))
    setTimeout(() => { const el = document.getElementById('g-lista'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 80)
  }
  const carga = useCarga(() => loadGestor(bu), [bu])
  const g = carga.dados

  const meses = useMemo(() => (g ? g.meses.map(m => m.mes).filter(Boolean).sort().reverse() : []), [g])
  // abre no último mês FECHADO (o atual ainda está em andamento)
  const fechados = g ? meses.filter(m => !g.mes_atual || m < g.mes_atual) : []
  const mesPadrao = fechados[0] || meses[0] || ''
  // v27.11: um filtro só de mês — previsão (próximos), em andamento (atual) ou fechado
  const opcoes = g && g.mes_atual ? opcoesDeMes(g.mes_atual, meses) : []
  const mesSel = mesEscolhido && opcoes.some(o => o.mes === mesEscolhido) ? mesEscolhido : (g && g.mes_atual) || mesPadrao
  const tipoSel = (opcoes.find(o => o.mes === mesSel) || {}).tipo || 'fechado'
  const mes = tipoSel === 'fechado' ? mesSel : mesPadrao   // mês usado nos blocos de mês fechado
  const ant = mesAnteriorISO(mes)

  const seletorArea = lista.length > 1 && (
    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Área
      <select value={bu} onChange={e => setBu(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
        {lista.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </label>
  )
  const seletorMes = meses.length > 0 && (
    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Mês
      <select value={mesSel} onChange={e => setMesEscolhido(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13, fontWeight: 600, minWidth: 220 }}>
        {(opcoes.length ? opcoes : fechados.map(m => ({ mes: m, label: mesNomeCurto(m) }))).map(o => <option key={o.mes} value={o.mes}>{o.label}</option>)}
      </select>
    </label>
  )
  const barraFiltros = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {lista.length > 1 && (
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Área
          <select value={bu} onChange={e => setBu(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
            {lista.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      )}
      {meses.length > 0 && (
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Mês
          <select value={mesSel} onChange={e => setMesEscolhido(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13, fontWeight: 600, minWidth: 220 }}>
            {(opcoes.length ? opcoes : fechados.map(m => ({ mes: m, label: mesNomeCurto(m) }))).map(o => <option key={o.mes} value={o.mes}>{o.label}</option>)}
          </select>
        </label>
      )}
    </div>
  )

  const conteudo = useMemo(() => {
    if (!g || !mes) return null
    const pago = soma(g.pago, x => x.mes === mes), pagoA = soma(g.pago, x => x.mes === ant)
    const comNota = soma(g.pago, x => x.mes === mes, 'valor_com_nf')
    const rec = soma(g.receita || [], x => x.mes === mes), recA = soma(g.receita || [], x => x.mes === ant)
    const abertoValor = soma(g.aberto || [], () => true), abertoQtd = soma(g.aberto || [], () => true, 'qtd')
    const ehAtual = mes === g.mes_atual
    const aPagarMes = ehAtual ? soma(g.a_pagar_mes || [], x => x.mes === mes) : 0, aPagarQtd = ehAtual ? soma(g.a_pagar_mes || [], x => x.mes === mes, 'qtd') : 0
    const tipo = (m, t) => soma(g.pago_tipo, x => x.mes === m && x.tipo === t)
    const fixo = tipo(mes, 'Fixo'), fixoA = tipo(ant, 'Fixo'), vari = tipo(mes, 'Variável'), variA = tipo(ant, 'Variável')
    const invest = tipo(mes, 'Investimento')

    const ult = meses.filter(m => m <= mes).sort().slice(-6)
    const hist = ult.map(m => ({ m, fixo: tipo(m, 'Fixo'), vari: tipo(m, 'Variável') }))
    const maxH = Math.max(1, ...hist.map(h => h.fixo + h.vari))

    const cats = [...new Set(g.pago_cat.filter(x => x.mes === mes || x.mes === ant).map(x => x.categoria))]
    const mudancas = cats.map(c => {
      const a = soma(g.pago_cat, x => x.mes === ant && x.categoria === c)
      const b = soma(g.pago_cat, x => x.mes === mes && x.categoria === c)
      const semArea = soma(g.revisar_cat, x => x.mes === ant && x.categoria === c)
      let texto = a === 0 ? `Não teve em ${mesNome(ant)}.` : b === 0 ? `Não teve em ${mesNome(mes)}.` : `De ${fmtK(a)} para ${fmtK(b)}.`
      if (b > a && semArea >= (b - a) * 0.3) texto += ` Em ${mesNome(ant)}, ${fmtK(semArea)} de ${c.toLowerCase()} estavam sem área, então parte disso não é aumento de verdade.`
      return { c, dif: b - a, texto }
    }).filter(x => Math.abs(x.dif) >= 1).sort((x, y) => Math.abs(y.dif) - Math.abs(x.dif)).slice(0, 5)

    return { pago, pagoA, rec, recA, comNota, abertoValor, abertoQtd, aPagarMes, aPagarQtd, ehAtual, fixo, fixoA, vari, variA, invest, hist, maxH, mudancas }
  }, [g, mes, ant, meses])

  if (carga.carregando) return <div style={{ padding: 20 }}>{barraFiltros}<Carregando texto={`Carregando ${bu}…`} /></div>
  if (carga.erro) return <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>{barraFiltros}<Erro texto={carga.erro} onTentar={carga.tentarDeNovo} /></div>
  if (!conteudo) return <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>{barraFiltros}<Vazio>Ainda não tem dados de {bu}.</Vazio></div>

  const c = conteudo
  const vPago = varPct(c.ehAtual ? c.pago + c.aPagarMes : c.pago, c.pagoA)
  const frasePago = vPago === null ? '' : Math.abs(vPago) < 1 ? `, praticamente igual a ${mesNome(ant)}` : `, ${pctTxt(vPago)} ${vPago > 0 ? 'a mais' : 'a menos'} que em ${mesNome(ant)}`
  const fraseNotas = c.pago ? ` ${fmtK(c.comNota)} desses pagamentos tinham nota fiscal.` : ''
  const fraseAtual = `${mesNome(mes)[0].toUpperCase()}${mesNome(mes).slice(1)} está em andamento: ${bu} já pagou ${fmtK(c.pago)} e tem ${fmtK(c.aPagarMes)} em notas a pagar no mês, o que dá ${fmtK(c.pago + c.aPagarMes)} (${mesNome(ant)} fechou em ${fmtK(c.pagoA)}).`
  const pctNota = c.pago ? Math.round(c.comNota / c.pago * 100) : 0
  const card = { background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }

  return (
    <div style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1180, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
      {seletorArea && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>{seletorArea}</div>}

      {/* v27.21: a BU numa linha do tempo (não depende do filtro de mês) */}
      {g.mes_atual && <ResumoBU key={'rbu-' + bu} bu={bu} mesAtual={g.mes_atual} pago={g.pago} aPagarMes={g.a_pagar_mes || []} receita={g.receita || []} />}

      <MaioresGastos key={'mg-' + bu} bu={bu} />

      {bu === 'Pessoal' && g.mes_atual && <PessoalVisao pessoalSub={g.pessoal_sub || []} mesAtual={g.mes_atual} />}

      {g.mes_atual && (
        <NotasEmAberto aPagarMes={g.a_pagar_mes || []} mesAtual={g.mes_atual} bus={[bu]}
          titulo={`Notas em aberto de ${bu} por mês de pagamento`}
          renderDetalhe={(b, m, ehAtual) => (
            <ListasArea key={b + m} bu={b} mes={g.mes_atual} mesPrevisto={ehAtual ? '' : m} notasAte={ehAtual ? g.mes_atual : ''} abaInicial={ehAtual ? 'apagar' : 'abertas'} />
          )} />
      )}

      <div style={{ borderTop: `0.5px solid ${COR.borda}`, paddingTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Detalhe por mês</div>
          <div style={{ fontSize: 12, color: COR.suave }}>Escolha o mês pra ver de onde vêm os números: o que foi pago, as notas, o que mudou.</div>
        </div>
        {seletorMes}
      </div>

      {tipoSel !== 'fechado' && g.mes_atual && (
        <Projecao proj={calcularProjecao({ pago: g.pago, aPagarMes: g.a_pagar_mes || [], mesAtual: g.mes_atual, mesAlvo: mesSel, bus: [bu], receita: g.receita || [] })} baixasAte={g.baixas_ate}
          onNotas={tipoSel === 'atual' ? verNotasAPagar : undefined} />
      )}

      {tipoSel === 'fechado' && <>
      <section aria-labelledby="g-resumo" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 id="g-resumo" style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.3, maxWidth: 780 }}>
          {c.ehAtual ? fraseAtual : <>Em {mesNome(mes)}, {bu} pagou <span style={num}>{fmtK(c.pago)}</span>{frasePago}.{fraseNotas}</>}
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Pago no mês</div>
            <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.45 }}>Custo fixo + variável pago no mês, pela data do pagamento. É o relatório de contas pagas.</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ ...num, fontSize: 28 }}>{fmtK(c.pago)}</span><ChipVar p={vPago} mesAnt={ant} />
            </div>
            <div style={{ fontSize: 12, color: COR.suave }}>{mesNomeCurto(ant)}: {fmtK(c.pagoA)}{c.pagoA ? ` · diferença de ${c.pago - c.pagoA >= 0 ? '+' : ''}${fmtK(c.pago - c.pagoA)}` : ''}</div>
            <div aria-hidden="true" style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#EEEDE6', marginTop: 6 }}>
              <div style={{ width: `${pctNota}%`, background: '#4F6B14' }} />
            </div>
            <div style={{ fontSize: 12, color: COR.suave, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span><b style={{ color: '#4F6B14', fontWeight: 600 }}>{fmtK(c.comNota)}</b> com nota ({pctNota}%)</span>
              <span><b style={{ color: COR.texto, fontWeight: 600 }}>{fmtK(c.pago - c.comNota)}</b> sem nota: aluguel, cartão, folha, impostos</span>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Notas não pagas (últimos 40 dias)</div>
            <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.45 }}>Notas da área que entraram desde {fmtData(g.aberto_desde)} e ainda não aparecem nas contas pagas.</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ ...num, fontSize: 28 }}>{fmtK(c.abertoValor)}</span>
              <span style={{ fontSize: 13, color: COR.suave }}>{c.abertoQtd.toLocaleString('pt-BR')} notas</span>
            </div>
            <div style={{ fontSize: 12, color: COR.suave }}>A lista está na aba "Notas não pagas", lá embaixo.</div>
          </div>
        </div>
        {c.rec > 0 && (
          <div style={{ ...card, flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flexBasis: '100%', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Receitas extras da área</span>
              <span style={{ fontSize: 12, color: COR.suave }}>rebate, verba e parcerias de marca, fora do faturamento</span>
            </div>
            {[['Custo', c.pago, ''], ['Receitas extras', c.rec, c.recA ? `${mesNomeCurto(ant)}: ${fmtK(c.recA)}` : ''], ['Custo líquido', c.pago - c.rec, c.pago ? `as extras cobrem ${(c.rec / c.pago * 100).toFixed(1).replace('.', ',')}% do custo` : '']].map(([rot, v, sub], i) => (
              <React.Fragment key={rot}>
                {i > 0 && <span aria-hidden="true" style={{ fontSize: 22, color: COR.fraco, alignSelf: 'center' }}>{i === 1 ? '−' : '='}</span>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: i === 2 ? COR.texto : COR.suave, fontWeight: i === 2 ? 600 : 400 }}>{rot}</span>
                  <span style={{ ...num, fontSize: i === 2 ? 26 : 22, fontWeight: i === 2 ? 600 : 400, color: i === 1 ? '#4F6B14' : COR.texto }}>{fmtK(v)}</span>
                  {sub && <span style={{ fontSize: 11, color: COR.suave }}>{sub}</span>}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        <section aria-labelledby="g-fv" style={{ ...card, flex: '999 1 520px', padding: 18, gap: 14 }}>
          <div>
            <h2 id="g-fv" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Custo fixo e variável</h2>
            <div style={{ fontSize: 12, color: COR.suave, marginTop: 2 }}>Fixo: aluguel, sistemas, contratos mensais. Variável: muda conforme o uso, como manutenção, insumos e cartão.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[['Fixo', c.fixo, c.fixoA, '#2B4C7E'], ['Variável', c.vari, c.variA, '#97A624']].map(([t, v, a, cor]) => (
              <div key={t} style={{ borderLeft: `3px solid ${cor}`, paddingLeft: 12 }}>
                <div style={{ fontSize: 12, color: COR.suave }}>{t} em {mesNome(mes)}</div>
                <div style={{ ...num, fontSize: 20 }}>{fmtK(v)}</div>
                <div style={{ marginTop: 4 }}>{v || a ? <ChipVar p={varPct(v, a)} mesAnt={ant} /> : <span style={{ fontSize: 12, color: COR.suave }}>a área não tem {t.toLowerCase()}</span>}</div>
              </div>
            ))}
          </div>
          <div aria-label="Fixo e variável nos últimos meses" style={{ display: 'flex', gap: 14, alignItems: 'flex-end', height: 170, paddingTop: 6 }}>
            {c.hist.map((h, i) => (
              <div key={h.m} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ ...num, fontSize: 11 }}>{fmtK(h.fixo + h.vari)}</div>
                <div style={{ width: '100%', maxWidth: 48, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: Math.round(h.vari / c.maxH * 120), background: '#97A624', borderRadius: '3px 3px 0 0' }} />
                  <div style={{ height: Math.round(h.fixo / c.maxH * 120), background: '#2B4C7E', borderRadius: '0 0 3px 3px' }} />
                </div>
                <div style={{ fontSize: 12, color: i === c.hist.length - 1 ? COR.texto : COR.suave, fontWeight: i === c.hist.length - 1 ? 600 : 400 }}>{mesISOLabel(h.m).split('/')[0]}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COR.suave, flexWrap: 'wrap' }}>
            <span><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#2B4C7E', marginRight: 5 }} />Fixo</span>
            <span><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#97A624', marginRight: 5 }} />Variável</span>
            {c.invest > 1 && <span>Fora do custo: investimentos de {fmtK(c.invest)} no mês</span>}
          </div>
        </section>

        <section aria-labelledby="g-mudou" style={{ ...card, flex: '1 1 320px', padding: 18, gap: 12 }}>
          <div>
            <h2 id="g-mudou" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>De onde veio a diferença</h2>
            <div style={{ fontSize: 12, color: COR.suave, marginTop: 2 }}>O que mais mudou de {mesNome(ant)} para {mesNome(mes)}</div>
          </div>
          {c.mudancas.length === 0 ? <Vazio>Nada mudou de um mês pro outro.</Vazio> : c.mudancas.map(m => (
            <div key={m.c} style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 10, borderBottom: '0.5px solid #F0F0EC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                <span style={{ fontWeight: 500 }}>{m.c}</span>
                <span style={{ ...num, color: m.dif >= 0 ? '#9A3C06' : '#4F6B14' }}>{m.dif >= 0 ? '+' : ''}{fmtK(m.dif)}</span>
              </div>
              <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.45 }}>{m.texto}</div>
            </div>
          ))}
        </section>
      </div>

      </>}

      <DRECustos key={bu} bu={bu} />

      <ListasArea key={bu + mesSel + focoLista.n} bu={bu} mes={tipoSel === 'fechado' ? mes : g.mes_atual}
        mesPrevisto={tipoSel === 'futuro' ? mesSel : ''} notasAte={tipoSel === 'atual' ? g.mes_atual : ''} abaInicial={focoLista.aba}
        temReceita={(g.receita || []).some(x => x.valor > 0)} />
    </div>
  )
}

// ── Pagamentos do mês / Notas ainda não pagas ────────────────
const chip = (txt, cor, fundo) => <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 99, fontSize: 12, fontWeight: 500, color: cor, background: fundo, whiteSpace: 'nowrap' }}>{txt}</span>
const diasDesde = d => (d && d.length >= 10 ? Math.max(0, Math.round((Date.now() - Date.parse(d.substring(0, 10) + 'T12:00:00Z')) / 864e5)) : null)
const elipse = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// mesPrevisto (mês futuro): mostra só as notas com previsão de pagamento naquele mês
// notasAte (mês atual): habilita a aba "Notas a pagar em <mês>" (previsão até o fim do mês)
export function ListasArea({ bu, mes, semRevisao = false, mesPrevisto = '', notasAte = '', abaInicial = '', temReceita = false }) {
  const [aba, setAba] = useState(abaInicial || (mesPrevisto ? 'abertas' : 'pagos'))
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(100)
  const pagos = useCarga(() => (aba === 'pagos' ? loadPagamentosBU({ mes, bu }) : Promise.resolve(null)), [aba, mes, bu])
  const abertas = useCarga(() => (aba === 'abertas' || aba === 'apagar'
    ? loadNFLista(aba === 'apagar' ? { status: 'aberto', bu, prev_ate: notasAte } : mesPrevisto ? { status: 'aberto', bu, prev_mes: mesPrevisto } : { status: 'aberto', bu, dias: 40 })
    : Promise.resolve(null)), [aba, bu, mesPrevisto, notasAte])
  const atual = aba === 'pagos' ? pagos : abertas
  const ehNota = aba !== 'pagos'
  const b = busca.trim().toUpperCase()
  const base = (atual.dados || []).map(l => ehNota ? { ...l, emAberto: Math.max(0, l.valor - (l.valor_pago || 0)) } : l)
  const linhas = base
    .filter(l => !b || [l.fornecedor, l.documento, l.nf_documento, l.descricao, l.categoria, l.item_principal].some(v => String(v || '').toUpperCase().includes(b)))
    .sort((x, y) => ehNota ? String(x.prev_pagto || '9').localeCompare(String(y.prev_pagto || '9')) || String(x.dt_dig).localeCompare(String(y.dt_dig)) : y.valor - x.valor)
  const total = linhas.reduce((t, l) => t + (ehNota ? l.emAberto : l.valor), 0)
  const totalInvest = aba === 'pagos' ? linhas.filter(l => l.tipo !== 'Fixo' && l.tipo !== 'Variável').reduce((t, l) => t + l.valor, 0) : 0

  const exportar = () => aba === 'pagos'
    ? exportarExcel(`${bu} - pagamentos ${mesNomeCurto(mes).replace('/', '-')}`, [
        { titulo: 'Fornecedor', valor: l => l.fornecedor, largura: 40 },
        { titulo: 'Conta', valor: l => l.descricao, largura: 32 },
        { titulo: 'Categoria', valor: l => l.categoria, largura: 20 },
        { titulo: 'Fixo/Variável', valor: l => l.tipo, largura: 14 },
        { titulo: 'Casa', valor: l => l.loja, largura: 14 },
        { titulo: 'Valor pago', valor: l => l.valor, tipo: 'num', largura: 14 },
        { titulo: 'Data do pagamento', valor: l => l.dt_baixa, tipo: 'data', largura: 16 },
        { titulo: 'Vencimento', valor: l => l.vencto, tipo: 'data', largura: 14 },
        { titulo: 'Nota fiscal', valor: l => l.nf_documento || (l.com_nf ? 'sim' : 'sem nota'), largura: 14 },
        { titulo: 'Entrada da nota', valor: l => l.nf_dt_dig, tipo: 'data', largura: 16 },
      ], linhas, 'Pagamentos')
    : exportarExcel(aba === 'apagar' ? `${bu} - notas a pagar em ${mesNomeCurto(notasAte).replace('/', '-')}` : mesPrevisto ? `${bu} - notas previstas pra ${mesNomeCurto(mesPrevisto).replace('/', '-')}` : `${bu} - notas não pagas (últimos 40 dias)`, [
        { titulo: 'Fornecedor', valor: l => l.fornecedor, largura: 40 },
        { titulo: 'Nota fiscal', valor: l => l.documento, largura: 14 },
        { titulo: 'Item principal', valor: l => l.item_principal, largura: 32 },
        { titulo: 'Casa', valor: l => l.unidade, largura: 14 },
        { titulo: 'Valor da nota', valor: l => l.valor, tipo: 'num', largura: 14 },
        { titulo: 'Já pago', valor: l => l.valor_pago, tipo: 'num', largura: 12 },
        { titulo: 'Em aberto', valor: l => l.emAberto, tipo: 'num', largura: 12 },
        { titulo: 'Entrada da nota', valor: l => l.dt_dig, tipo: 'data', largura: 16 },
        { titulo: 'Previsão de pagamento', valor: l => l.prev_pagto, tipo: 'data', largura: 20 },
        { titulo: 'Origem da previsão', valor: l => ORIGEM_PREV[l.origem_prev] || l.origem_prev, largura: 20 },
        { titulo: 'Dias desde a entrada', valor: l => diasDesde(l.dt_dig), tipo: 'num', formato: '0', largura: 18 },
        { titulo: 'Observação do gestor', valor: l => l.obs_tipo ? `${l.obs_tipo}${l.obs_texto ? ': ' + l.obs_texto : ''} (${l.obs_por}, ${l.obs_em})` : '', largura: 40 },
      ], linhas, 'Notas não pagas')

  const tab = id => ({
    padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minHeight: 34,
    background: aba === id ? '#fff' : 'transparent', color: aba === id ? COR.texto : COR.suave, fontWeight: aba === id ? 600 : 400,
  })
  const grid = aba === 'pagos' ? 'minmax(220px, 2fr) 100px 120px 96px minmax(150px, 1fr) 180px' : 'minmax(220px, 2fr) 100px 120px 96px 120px 56px 180px'
  const hojeISO = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)
  const ORIGEM_PREV = { 'Vencimento': 'vencimento', 'Prazo acordado': 'prazo combinado', 'Prazo histórico': 'prazo do fornecedor', 'Prazo padrão': 'estimada (20 dias)' }

  return (
    <section aria-labelledby="g-lista" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <h2 id="g-lista" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Detalhe da área</h2>
          {!semRevisao && <div style={{ fontSize: 12, color: COR.suave, marginTop: 2 }}>Se algo não for da sua área, clique em "Não é da minha área". O financeiro revisa e corrige.</div>}
        </div>
        {mesPrevisto ? (
          <div style={{ fontSize: 14, fontWeight: 600, padding: '8px 4px' }}>Notas previstas pra pagar em {mesNome(mesPrevisto)}</div>
        ) : (
          <div role="tablist" style={{ display: 'flex', gap: 4, background: '#F4F4EF', padding: 3, borderRadius: 9, flexWrap: 'wrap' }}>
            <button role="tab" aria-selected={aba === 'pagos'} onClick={() => { setAba('pagos'); setLimite(100) }} style={tab('pagos')}>Pagamentos de {mesNome(mes)}</button>
            {!semRevisao && <button role="tab" aria-selected={aba === 'fornecedores'} onClick={() => { setAba('fornecedores'); setLimite(100) }} style={tab('fornecedores')}>Fornecedores da área</button>}
            {temReceita && <button role="tab" aria-selected={aba === 'receitas'} onClick={() => { setAba('receitas'); setLimite(100) }} style={tab('receitas')}>Receitas extras de {mesNome(mes)}</button>}
            {notasAte && <button role="tab" aria-selected={aba === 'apagar'} onClick={() => { setAba('apagar'); setLimite(100) }} style={tab('apagar')}>Notas a pagar em {mesNome(notasAte)}</button>}
            <button role="tab" aria-selected={aba === 'abertas'} onClick={() => { setAba('abertas'); setLimite(100) }} style={tab('abertas')}>Notas não pagas (últimos 40 dias)</button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, background: COR.fundo, borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
        {aba === 'fornecedores'
          ? 'Todos os fornecedores que caíram na sua área nos últimos 6 meses (pagamentos e notas). Se algum não for da área, clique em "Não é da minha área": a correção vale pro fornecedor inteiro, em todos os meses e nas próximas notas.'
          : aba === 'receitas'
          ? `O que a área recebeu a mais em ${mesNome(mes)}, fora do faturamento: rebate e bonificação de fornecedor, verba e parcerias de marca (contas a receber, data do recebimento).${semRevisao ? '' : ' Se algum recebimento não for da área, clique em "Não é da minha área" e escolha a área certa (ou "Não é receita").'}`
          : aba === 'apagar'
          ? `As notas que compõem o "Notas a pagar" da projeção: já emitidas e em aberto, com previsão de pagamento até o fim de ${mesNome(notasAte)}, inclusive as que já passaram da data. Pela ordem da previsão. Em laranja: a data já passou e o pagamento ainda não apareceu nas contas pagas.`
          : mesPrevisto
          ? `Notas da área já emitidas e em aberto com previsão de pagamento em ${mesNome(mesPrevisto)}, pela ordem da previsão. A previsão é o vencimento do TOTVS ou, quando ele não vem, o prazo médio de pagamento do fornecedor. Notas que ainda não chegaram não aparecem.`
          : aba === 'pagos'
          ? `Tudo que a área pagou em ${mesNome(mes)}, pela data do pagamento. Quando o pagamento tem nota fiscal, aparece o número e a data em que a nota entrou (muitas vezes no mês anterior). Aluguel, cartão, folha e impostos não têm nota, e isso é normal.`
          : 'Notas da área que entraram nos últimos 40 dias e ainda não foram pagas, pela ordem da previsão de pagamento (o que vence primeiro aparece primeiro). A previsão é o vencimento do TOTVS ou, quando ele não vem, o prazo médio de pagamento do fornecedor. Em laranja: a data já passou e o pagamento ainda não apareceu nas contas pagas.'}
      </div>
      {aba === 'fornecedores' ? <ListaFornecedores bu={bu} /> : aba === 'receitas' ? <ListaReceitas bu={bu} mes={mes} semRevisao={semRevisao} /> : <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} placeholder="Buscar fornecedor, conta ou número da nota" />
        <BotaoExportar onClick={exportar} desabilitado={!linhas.length} />
      </div>

      {atual.carregando ? <Carregando texto={aba === 'pagos' ? 'Buscando pagamentos…' : 'Buscando notas…'} />
        : atual.erro ? <Erro texto={atual.erro} onTentar={atual.tentarDeNovo} />
        : !linhas.length ? <Vazio>{b ? 'Nada encontrado com essa busca.' : aba === 'pagos' ? 'Nenhum pagamento da área nesse mês.' : mesPrevisto ? `Nenhuma nota da área com previsão de pagamento em ${mesNome(mesPrevisto)} ainda.` : 'Nenhuma nota da área esperando pagamento.'}</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 820, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                {aba === 'pagos'
                  ? <><div>Fornecedor e conta</div><div>Casa</div><div style={{ textAlign: 'right' }}>Valor</div><div>Pago em</div><div>Nota fiscal</div><div /></>
                  : <><div>Fornecedor e nota</div><div>Casa</div><div style={{ textAlign: 'right' }}>Em aberto</div><div>Entrou em</div><div>Previsão de pagamento</div><div style={{ textAlign: 'right' }}>Há</div><div /></>}
              </div>
              {linhas.slice(0, limite).map((l, i) => (
                <div key={(l.chave_nf || l.fornecedor) + i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  {aba === 'pagos' ? (
                    <>
                      <div style={{ minWidth: 0 }}>
                        <div style={elipse} title={l.fornecedor}>{l.fornecedor}</div>
                        <div style={{ ...elipse, fontSize: 11, color: COR.suave }}>{[l.descricao, l.categoria, l.tipo].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div>{l.loja}</div>
                      <div style={{ ...num, textAlign: 'right' }}>{fmt(l.valor)}</div>
                      <div style={num}>{fmtData(l.dt_baixa)}</div>
                      <div>{l.com_nf
                        ? <div><div style={{ fontSize: 12 }}>NF {l.nf_documento || '—'}</div><div style={{ fontSize: 11, color: COR.suave }}>entrou {fmtData(l.nf_dt_dig)}</div></div>
                        : chip('Sem nota', '#5a5c5f', '#F0F0EC')}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ minWidth: 0 }}>
                        <div style={elipse} title={l.fornecedor}>{l.fornecedor}</div>
                        <div style={{ ...elipse, fontSize: 11, color: COR.suave }}>NF {l.documento}{l.item_principal ? ` · ${l.item_principal}` : ''}{l.valor_pago ? ` · já pago ${fmt(l.valor_pago)}` : ''}</div>
                        {l.obs_tipo && <div style={{ fontSize: 11, marginTop: 3, color: '#7A5A00', background: '#FBF1D2', borderRadius: 6, padding: '2px 6px', display: 'inline-block', maxWidth: '100%', ...elipse }} title={`${l.obs_tipo}: ${l.obs_texto} (${l.obs_por}, ${l.obs_em})`}>📝 {l.obs_tipo}{l.obs_texto ? `: ${l.obs_texto}` : ''}</div>}
                      </div>
                      <div>{l.unidade}</div>
                      <div style={{ ...num, textAlign: 'right' }}>{fmt(l.emAberto)}</div>
                      <div style={num}>{fmtData(l.dt_dig)}</div>
                      <div>
                        <div style={{ ...num, color: l.prev_pagto && l.prev_pagto < hojeISO ? '#9A3C06' : COR.texto, fontWeight: l.prev_pagto && l.prev_pagto < hojeISO ? 600 : 400 }}>
                          {l.prev_pagto ? fmtData(l.prev_pagto) : '—'}
                        </div>
                        <div style={{ fontSize: 11, color: l.prev_pagto && l.prev_pagto < hojeISO ? '#9A3C06' : COR.suave }}>
                          {l.prev_pagto && l.prev_pagto < hojeISO ? 'já passou' : (ORIGEM_PREV[l.origem_prev] || '')}
                        </div>
                      </div>
                      <div style={{ ...num, textAlign: 'right', color: diasDesde(l.dt_dig) > 45 ? '#9A3C06' : COR.suave }}>{diasDesde(l.dt_dig)}d</div>
                    </>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                    {!semRevisao && <NaoEMinha item={l} tipo={aba === 'pagos' ? 'pagamento' : 'nota'} bu={bu} mes={mes} />}
                    {!semRevisao && aba !== 'pagos' && <ObservacaoNota item={l} bu={bu} />}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 4px 0', fontSize: 13 }}>
                <span style={{ color: COR.suave }}>{linhas.length.toLocaleString('pt-BR')} {aba === 'pagos' ? 'pagamentos' : 'notas'} · {fmt(total)}{totalInvest > 0 ? ` (custo ${fmt(total - totalInvest)} + investimentos ${fmt(totalInvest)})` : ''}</span>
                {linhas.length > limite && <button onClick={() => setLimite(l => l + 200)} style={botaoSecundario}>Mostrar mais {Math.min(200, linhas.length - limite)}</button>}
              </div>
            </div>
          </div>
        )}
      </>}
    </section>
  )
}

function NaoEMinha({ item, tipo, bu, mes }) {
  const [estado, setEstado] = useState('')   // '' | escolhendo | enviando | enviado | erro
  const [area, setArea] = useState('')
  if (estado === 'enviado') return <span style={{ fontSize: 12, color: '#4F6B14' }}>Enviado para revisão</span>
  if (estado === '') return (
    <button onClick={() => setEstado('escolhendo')} style={{ ...botaoSecundario, minHeight: 32 }}>Não é da minha área</button>
  )
  const enviar = async () => {
    setEstado('enviando')
    const ok = await reportarDivergenciaBU(tipo === 'fornecedor'
      ? { origem: 'fornecedor', fornecedor: item.fornecedor, codFor: item.cod_for, descricao: `Fornecedor inteiro (${item.contas || 'todas as contas'})`, buAtual: bu, buSugerido: area, mes: mesISOLabel(String(item.ultimo || '').substring(0, 7)), loja: '', valor: item.pago + item.valor_notas }
      : tipo === 'receita'
      ? { origem: 'receita', chave: item.chave, fornecedor: item.cliente, descricao: item.descricao, buAtual: bu, buSugerido: area, mes: mesISOLabel(String(item.dt_baixa || '').substring(0, 7)), loja: item.loja, valor: item.valor }
      : tipo === 'nota'
      ? { origem: 'nota', fornecedor: item.fornecedor, codFor: item.cod_for, descricao: `NF ${item.documento}`, buAtual: bu, buSugerido: area, mes: mesISOLabel(String(item.dt_dig || '').substring(0, 7)), loja: item.unidade, valor: item.valor }
      : { origem: 'pagamento', fornecedor: item.fornecedor, descricao: item.descricao, buAtual: bu, buSugerido: area, mes: item.mes, loja: item.loja, valor: item.valor })
    setEstado(ok ? 'enviado' : 'erro')
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={area} onChange={e => setArea(e.target.value)} aria-label="Área certa" style={{ fontSize: 12, padding: 5, borderRadius: 6, border: `0.5px solid ${COR.borda}`, fontFamily: 'inherit' }}>
        <option value="">Qual área?</option>
        {AREAS_CUSTOS.filter(a => a !== bu).map(a => <option key={a} value={a}>{a}</option>)}
        {tipo === 'receita' && <option value="Fora">Não é receita</option>}
        <option value="Não sei">Não sei</option>
      </select>
      <button disabled={!area || estado === 'enviando'} onClick={enviar}
        style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: area ? '#4F6B14' : '#C9CCBF', color: '#fff', fontSize: 12, cursor: area ? 'pointer' : 'default', fontFamily: 'inherit' }}>
        {estado === 'enviando' ? 'Enviando…' : estado === 'erro' ? 'Tentar de novo' : 'Enviar'}
      </button>
    </div>
  )
}

// v27.17 — fornecedores da área (6 meses) pra revisão do gestor
function ListaFornecedores({ bu }) {
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(100)
  const c = useCarga(() => loadFornecedoresBU(bu), [bu])
  const b = busca.trim().toUpperCase()
  const linhas = (c.dados || []).filter(l => !b || [l.fornecedor, l.contas].some(v => String(v || '').toUpperCase().includes(b)))
  const exportar = () => exportarExcel(`${bu} - fornecedores (6 meses)`, [
    { titulo: 'Fornecedor', valor: l => l.fornecedor, largura: 42 },
    { titulo: 'Contas', valor: l => l.contas, largura: 36 },
    { titulo: 'Pago (6 meses)', valor: l => l.pago, tipo: 'num', largura: 16 },
    { titulo: 'Pagamentos', valor: l => l.pagamentos, tipo: 'num', formato: '0', largura: 12 },
    { titulo: 'Notas (6 meses)', valor: l => l.valor_notas, tipo: 'num', largura: 16 },
    { titulo: 'Qtd notas', valor: l => l.notas, tipo: 'num', formato: '0', largura: 10 },
    { titulo: 'Último movimento', valor: l => l.ultimo, tipo: 'data', largura: 16 },
  ], linhas, 'Fornecedores')
  const grid = 'minmax(220px, 2fr) minmax(140px, 1.2fr) 120px 120px 100px 190px'
  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} placeholder="Buscar fornecedor ou conta" />
        <BotaoExportar onClick={exportar} desabilitado={!linhas.length} />
      </div>
      {c.carregando ? <Carregando texto="Buscando fornecedores…" />
        : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} />
        : !linhas.length ? <Vazio>Nenhum fornecedor.</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Fornecedor</div><div>Contas</div><div style={{ textAlign: 'right' }}>Pago (6 meses)</div><div style={{ textAlign: 'right' }}>Notas (6 meses)</div><div>Último</div><div />
              </div>
              {linhas.slice(0, limite).map((l, i) => (
                <div key={l.fornecedor + i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '9px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  <div style={{ ...elipse }} title={l.fornecedor}>{l.fornecedor}</div>
                  <div style={{ ...elipse, fontSize: 12, color: COR.suave }} title={l.contas}>{l.contas || '—'}</div>
                  <div style={{ ...num, textAlign: 'right' }}>{l.pago ? fmt(l.pago) : '—'}<div style={{ fontSize: 11, color: COR.suave }}>{l.pagamentos ? `${l.pagamentos} pagto.` : ''}</div></div>
                  <div style={{ ...num, textAlign: 'right' }}>{l.valor_notas ? fmt(l.valor_notas) : '—'}<div style={{ fontSize: 11, color: COR.suave }}>{l.notas ? `${l.notas} notas` : ''}</div></div>
                  <div style={num}>{fmtData(l.ultimo)}</div>
                  <div><NaoEMinha item={l} tipo="fornecedor" bu={bu} mes="" /></div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 4px 0', fontSize: 13 }}>
                <span style={{ color: COR.suave }}>{linhas.length.toLocaleString('pt-BR')} fornecedores</span>
                {linhas.length > limite && <button onClick={() => setLimite(x => x + 200)} style={botaoSecundario}>Mostrar mais {Math.min(200, linhas.length - limite)}</button>}
              </div>
            </div>
          </div>
        )}
    </>
  )
}

// v27.13 — observação do gestor numa nota: já paga (sem conciliação), cancelada ou outro
function ObservacaoNota({ item, bu }) {
  const [estado, setEstado] = useState('')   // '' | escrevendo | enviando | enviado | erro
  const [tipo, setTipo] = useState('Já paga')
  const [texto, setTexto] = useState('')
  if (estado === 'enviado') return <span style={{ fontSize: 12, color: '#4F6B14' }}>Observação registrada</span>
  if (estado === '') return <button onClick={() => setEstado('escrevendo')} style={{ ...botaoSecundario, minHeight: 32 }}>{item.obs_tipo ? 'Nova observação' : 'Observação'}</button>
  const enviar = async () => {
    setEstado('enviando')
    const ok = await registrarObsNF({ chaveNF: item.chave_nf, bu, fornecedor: item.fornecedor, documento: item.documento, valor: item.valor, tipo, texto })
    setEstado(ok ? 'enviado' : 'erro')
  }
  const precisaTexto = tipo === 'Outro'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minWidth: 170 }}>
      <select value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Tipo de observação" style={{ fontSize: 12, padding: 5, borderRadius: 6, border: `0.5px solid ${COR.borda}`, fontFamily: 'inherit' }}>
        <option value="Já paga">Já foi paga (sem conciliação)</option>
        <option value="Cancelada">Nota cancelada</option>
        <option value="Outro">Outro</option>
      </select>
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} maxLength={500} aria-label="Observação"
        placeholder={tipo === 'Já paga' ? 'Como foi paga? (data, cartão, junto com outra nota…)' : tipo === 'Cancelada' ? 'Motivo, nota que substituiu…' : 'Descreva'}
        style={{ fontSize: 12, padding: 6, borderRadius: 6, border: `0.5px solid ${COR.borda}`, fontFamily: 'inherit', resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button disabled={estado === 'enviando' || (precisaTexto && !texto.trim())} onClick={enviar}
          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: precisaTexto && !texto.trim() ? '#C9CCBF' : '#4F6B14', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          {estado === 'enviando' ? 'Enviando…' : estado === 'erro' ? 'Tentar de novo' : 'Enviar'}
        </button>
        <button onClick={() => setEstado('')} style={{ ...botaoSecundario, padding: '5px 10px' }}>Cancelar</button>
      </div>
    </div>
  )
}

// v27.10 — recebimentos da área no mês (contas a receber)
function ListaReceitas({ bu, mes, semRevisao = false }) {
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(100)
  const c = useCarga(() => loadReceitasLista({ bu, mes }), [bu, mes])
  const b = busca.trim().toUpperCase()
  const linhas = (c.dados || []).filter(l => !b || [l.cliente, l.historico, l.descricao].some(v => String(v || '').toUpperCase().includes(b)))
  const total = linhas.reduce((t, l) => t + l.valor, 0)
  const exportar = () => exportarExcel(`${bu} - receitas ${mesNomeCurto(mes).replace('/', '-')}`, [
    { titulo: 'Cliente', valor: l => l.cliente, largura: 40 },
    { titulo: 'Tipo de receita', valor: l => l.descricao, largura: 30 },
    { titulo: 'Histórico', valor: l => l.historico, largura: 36 },
    { titulo: 'Casa', valor: l => l.loja, largura: 14 },
    { titulo: 'Valor recebido', valor: l => l.valor, tipo: 'num', largura: 14 },
    { titulo: 'Data do recebimento', valor: l => l.dt_baixa, tipo: 'data', largura: 18 },
  ], linhas, 'Receitas')
  const grid = semRevisao ? 'minmax(220px, 2fr) minmax(160px, 1.4fr) 100px 120px 100px' : 'minmax(220px, 2fr) minmax(140px, 1.2fr) 90px 120px 96px 190px'
  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} placeholder="Buscar cliente ou histórico" />
        <BotaoExportar onClick={exportar} desabilitado={!linhas.length} />
      </div>
      {c.carregando ? <Carregando texto="Buscando receitas…" />
        : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} />
        : !linhas.length ? <Vazio>Nenhuma receita extra da área nesse mês.</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: semRevisao ? 720 : 900 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Cliente</div><div>Histórico</div><div>Casa</div><div style={{ textAlign: 'right' }}>Valor</div><div>Recebido em</div>{!semRevisao && <div />}
              </div>
              {linhas.slice(0, limite).map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '9px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.cliente}>{l.cliente || '—'}</div>
                    <div style={{ fontSize: 11, color: COR.suave }}>{l.descricao}{l.corrigida ? ' · área corrigida' : ''}</div>
                  </div>
                  <div style={{ fontSize: 12, color: COR.suave, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.historico}>{l.historico}</div>
                  <div>{l.loja}</div>
                  <div style={{ ...num, textAlign: 'right' }}>{fmt(l.valor)}</div>
                  <div style={num}>{fmtData(l.dt_baixa)}</div>
                  {!semRevisao && <div><NaoEMinha item={l} tipo="receita" bu={bu} mes={mes} /></div>}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 4px 0', fontSize: 13 }}>
                <span style={{ color: COR.suave }}>{linhas.length.toLocaleString('pt-BR')} recebimentos · {fmt(total)}</span>
                {linhas.length > limite && <button onClick={() => setLimite(x => x + 200)} style={botaoSecundario}>Mostrar mais {Math.min(200, linhas.length - limite)}</button>}
              </div>
            </div>
          </div>
        )}
    </>
  )
}
