import React, { useMemo, useState } from 'react'
import { AREAS_CUSTOS } from '@/lib/bus'
import { loadGestor, loadNFLista, loadPagamentosBU, reportarDivergenciaBU } from '../../data/loader.js'
import { fmt, fmtK, fmtData, mesAnteriorISO, mesISOLabel, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Busca, Carregando, Erro, Vazio, useCarga, botaoSecundario, exportarExcel, BotaoExportar } from '../ui/nf.jsx'
import DRECustos from '../ui/DRECustos.jsx'

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
  const carga = useCarga(() => loadGestor(bu), [bu])
  const g = carga.dados

  const meses = useMemo(() => (g ? g.meses.map(m => m.mes).filter(Boolean).sort().reverse() : []), [g])
  // abre no último mês FECHADO (o atual ainda está em andamento)
  const fechados = g ? meses.filter(m => !g.mes_atual || m < g.mes_atual) : []
  const mesPadrao = fechados[0] || meses[0] || ''
  const mes = mesEscolhido && meses.includes(mesEscolhido) ? mesEscolhido : mesPadrao
  const ant = mesAnteriorISO(mes)

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
          <select value={mes} onChange={e => setMesEscolhido(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
            {meses.map(m => <option key={m} value={m}>{mesNomeCurto(m)}</option>)}
          </select>
        </label>
      )}
    </div>
  )

  const conteudo = useMemo(() => {
    if (!g || !mes) return null
    const pago = soma(g.pago, x => x.mes === mes), pagoA = soma(g.pago, x => x.mes === ant)
    const comNota = soma(g.pago, x => x.mes === mes, 'valor_com_nf')
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

    return { pago, pagoA, comNota, abertoValor, abertoQtd, aPagarMes, aPagarQtd, ehAtual, fixo, fixoA, vari, variA, invest, hist, maxH, mudancas }
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
      {barraFiltros}

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
            <div style={{ fontSize: 13, fontWeight: 600 }}>Pago + a pagar em {mesNome(mes)}</div>
            <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.45 }}>O que já foi pago no mês somado às notas em aberto com previsão de pagamento no mês.</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ ...num, fontSize: 28 }}>{fmtK(c.pago + c.aPagarMes)}</span>
            </div>
            <div style={{ fontSize: 12, color: COR.suave, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span><b style={{ color: COR.texto, fontWeight: 600 }}>{fmtK(c.pago)}</b> pago</span>
              {c.ehAtual
                ? <span><b style={{ color: COR.texto, fontWeight: 600 }}>{fmtK(c.aPagarMes)}</b> a pagar ({c.aPagarQtd.toLocaleString('pt-BR')} notas)</span>
                : <span>mês fechado: o que ficou em aberto passa pro mês atual</span>}
            </div>
            <div style={{ fontSize: 12, color: COR.suave }}>Notas não pagas dos últimos 40 dias: {fmtK(c.abertoValor)} ({c.abertoQtd.toLocaleString('pt-BR')} notas). Lista lá embaixo.</div>
          </div>
        </div>
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
                <div style={{ marginTop: 4 }}><ChipVar p={varPct(v, a)} mesAnt={ant} /></div>
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

      <DRECustos key={bu} bu={bu} />

      <ListasArea bu={bu} mes={mes} />
    </div>
  )
}

// ── Pagamentos do mês / Notas ainda não pagas ────────────────
const chip = (txt, cor, fundo) => <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 99, fontSize: 12, fontWeight: 500, color: cor, background: fundo, whiteSpace: 'nowrap' }}>{txt}</span>
const diasDesde = d => (d && d.length >= 10 ? Math.max(0, Math.round((Date.now() - Date.parse(d.substring(0, 10) + 'T12:00:00Z')) / 864e5)) : null)
const elipse = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export function ListasArea({ bu, mes, semRevisao = false }) {
  const [aba, setAba] = useState('pagos')
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(100)
  const pagos = useCarga(() => (aba === 'pagos' ? loadPagamentosBU({ mes, bu }) : Promise.resolve(null)), [aba, mes, bu])
  const abertas = useCarga(() => (aba === 'abertas' ? loadNFLista({ status: 'aberto', bu, dias: 40 }) : Promise.resolve(null)), [aba, bu])
  const atual = aba === 'pagos' ? pagos : abertas
  const b = busca.trim().toUpperCase()
  const base = (atual.dados || []).map(l => aba === 'abertas' ? { ...l, emAberto: Math.max(0, l.valor - (l.valor_pago || 0)) } : l)
  const linhas = base
    .filter(l => !b || [l.fornecedor, l.documento, l.nf_documento, l.descricao, l.categoria, l.item_principal].some(v => String(v || '').toUpperCase().includes(b)))
    .sort((x, y) => aba === 'abertas' ? String(x.dt_dig).localeCompare(String(y.dt_dig)) : y.valor - x.valor)
  const total = linhas.reduce((t, l) => t + (aba === 'abertas' ? l.emAberto : l.valor), 0)
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
    : exportarExcel(`${bu} - notas não pagas (últimos 40 dias)`, [
        { titulo: 'Fornecedor', valor: l => l.fornecedor, largura: 40 },
        { titulo: 'Nota fiscal', valor: l => l.documento, largura: 14 },
        { titulo: 'Item principal', valor: l => l.item_principal, largura: 32 },
        { titulo: 'Casa', valor: l => l.unidade, largura: 14 },
        { titulo: 'Valor da nota', valor: l => l.valor, tipo: 'num', largura: 14 },
        { titulo: 'Já pago', valor: l => l.valor_pago, tipo: 'num', largura: 12 },
        { titulo: 'Em aberto', valor: l => l.emAberto, tipo: 'num', largura: 12 },
        { titulo: 'Entrada da nota', valor: l => l.dt_dig, tipo: 'data', largura: 16 },
        { titulo: 'Previsão de pagamento', valor: l => l.prev_pagto, tipo: 'data', largura: 20 },
        { titulo: 'Dias desde a entrada', valor: l => diasDesde(l.dt_dig), tipo: 'num', formato: '0', largura: 18 },
      ], linhas, 'Notas não pagas')

  const tab = id => ({
    padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minHeight: 34,
    background: aba === id ? '#fff' : 'transparent', color: aba === id ? COR.texto : COR.suave, fontWeight: aba === id ? 600 : 400,
  })
  const grid = aba === 'pagos' ? 'minmax(220px, 2fr) 100px 120px 96px minmax(150px, 1fr) 180px' : 'minmax(220px, 2fr) 100px 120px 96px 90px 180px'

  return (
    <section aria-labelledby="g-lista" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <h2 id="g-lista" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Detalhe da área</h2>
          {!semRevisao && <div style={{ fontSize: 12, color: COR.suave, marginTop: 2 }}>Se algo não for da sua área, clique em "Não é da minha área". O financeiro revisa e corrige.</div>}
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 4, background: '#F4F4EF', padding: 3, borderRadius: 9, flexWrap: 'wrap' }}>
          <button role="tab" aria-selected={aba === 'pagos'} onClick={() => { setAba('pagos'); setLimite(100) }} style={tab('pagos')}>Pagamentos de {mesNome(mes)}</button>
          <button role="tab" aria-selected={aba === 'abertas'} onClick={() => { setAba('abertas'); setLimite(100) }} style={tab('abertas')}>Notas não pagas (últimos 40 dias)</button>
        </div>
      </div>
      <div style={{ fontSize: 13, background: COR.fundo, borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
        {aba === 'pagos'
          ? `Tudo que a área pagou em ${mesNome(mes)}, pela data do pagamento. Quando o pagamento tem nota fiscal, aparece o número e a data em que a nota entrou (muitas vezes no mês anterior). Aluguel, cartão, folha e impostos não têm nota, e isso é normal.`
          : 'Notas da área que entraram nos últimos 40 dias e ainda não foram pagas, das mais antigas para as mais novas. Elas vão aparecer nos pagamentos do mês em que forem pagas.'}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} placeholder="Buscar fornecedor, conta ou número da nota" />
        <BotaoExportar onClick={exportar} desabilitado={!linhas.length} />
      </div>

      {atual.carregando ? <Carregando texto={aba === 'pagos' ? 'Buscando pagamentos…' : 'Buscando notas…'} />
        : atual.erro ? <Erro texto={atual.erro} onTentar={atual.tentarDeNovo} />
        : !linhas.length ? <Vazio>{b ? 'Nada encontrado com essa busca.' : aba === 'pagos' ? 'Nenhum pagamento da área nesse mês.' : 'Nenhuma nota da área esperando pagamento.'}</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 820, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                {aba === 'pagos'
                  ? <><div>Fornecedor e conta</div><div>Casa</div><div style={{ textAlign: 'right' }}>Valor</div><div>Pago em</div><div>Nota fiscal</div><div /></>
                  : <><div>Fornecedor e nota</div><div>Casa</div><div style={{ textAlign: 'right' }}>Em aberto</div><div>Entrou em</div><div style={{ textAlign: 'right' }}>Há</div><div /></>}
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
                      </div>
                      <div>{l.unidade}</div>
                      <div style={{ ...num, textAlign: 'right' }}>{fmt(l.emAberto)}</div>
                      <div style={num}>{fmtData(l.dt_dig)}</div>
                      <div style={{ ...num, textAlign: 'right', color: diasDesde(l.dt_dig) > 45 ? '#9A3C06' : COR.suave }}>{diasDesde(l.dt_dig)}d</div>
                    </>
                  )}
                  <div>{!semRevisao && <NaoEMinha item={l} tipo={aba === 'pagos' ? 'pagamento' : 'nota'} bu={bu} mes={mes} />}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 4px 0', fontSize: 13 }}>
                <span style={{ color: COR.suave }}>{linhas.length.toLocaleString('pt-BR')} {aba === 'pagos' ? 'pagamentos' : 'notas'} · {fmt(total)}{totalInvest > 0 ? ` (custo ${fmt(total - totalInvest)} + investimentos ${fmt(totalInvest)})` : ''}</span>
                {linhas.length > limite && <button onClick={() => setLimite(l => l + 200)} style={botaoSecundario}>Mostrar mais {Math.min(200, linhas.length - limite)}</button>}
              </div>
            </div>
          </div>
        )}
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
    const ok = await reportarDivergenciaBU(tipo === 'nota'
      ? { origem: 'nota', fornecedor: item.fornecedor, codFor: item.cod_for, descricao: `NF ${item.documento}`, buAtual: bu, buSugerido: area, mes: mesISOLabel(String(item.dt_dig || '').substring(0, 7)), loja: item.unidade, valor: item.valor }
      : { origem: 'pagamento', fornecedor: item.fornecedor, descricao: item.descricao, buAtual: bu, buSugerido: area, mes: item.mes, loja: item.loja, valor: item.valor })
    setEstado(ok ? 'enviado' : 'erro')
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={area} onChange={e => setArea(e.target.value)} aria-label="Área certa" style={{ fontSize: 12, padding: 5, borderRadius: 6, border: `0.5px solid ${COR.borda}`, fontFamily: 'inherit' }}>
        <option value="">Qual área?</option>
        {AREAS_CUSTOS.filter(a => a !== bu).map(a => <option key={a} value={a}>{a}</option>)}
        <option value="Não sei">Não sei</option>
      </select>
      <button disabled={!area || estado === 'enviando'} onClick={enviar}
        style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: area ? '#4F6B14' : '#C9CCBF', color: '#fff', fontSize: 12, cursor: area ? 'pointer' : 'default', fontFamily: 'inherit' }}>
        {estado === 'enviando' ? 'Enviando…' : estado === 'erro' ? 'Tentar de novo' : 'Enviar'}
      </button>
    </div>
  )
}
