import React, { useMemo, useState } from 'react'
import { AREAS_CUSTOS } from '@/lib/bus'
import { loadGestor, loadNFLista, loadPagamentosBU, reportarDivergenciaBU } from '../../data/loader.js'
import { fmt, fmtK, fmtData, mesAnteriorISO, mesISOLabel, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Busca, Carregando, Erro, Vazio, useCarga, botaoSecundario } from '../ui/nf.jsx'

// v27.2 — "Minha área": o que a área pagou, as notas que entraram, fixo e
// variável, de onde veio a diferença, e as listas de notas e contas pagas
// com o botão "Não é da minha área".
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
  const mesPadrao = g ? ((g.baixas_ate && meses.includes(g.baixas_ate.substring(0, 7))) ? g.baixas_ate.substring(0, 7) : meses[0]) : ''
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
    const notas = soma(g.entrou, x => x.mes === mes), notasA = soma(g.entrou, x => x.mes === ant)
    const qtd = soma(g.entrou, x => x.mes === mes, 'qtd'), qtdA = soma(g.entrou, x => x.mes === ant, 'qtd')
    const tipo = (m, t) => soma(g.pago_tipo, x => x.mes === m && x.tipo === t)
    const fixo = tipo(mes, 'Fixo'), fixoA = tipo(ant, 'Fixo'), vari = tipo(mes, 'Variável'), variA = tipo(ant, 'Variável')
    const outros = pago - fixo - vari

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

    return { pago, pagoA, notas, notasA, qtd, qtdA, fixo, fixoA, vari, variA, outros, hist, maxH, mudancas }
  }, [g, mes, ant, meses])

  if (carga.carregando) return <div style={{ padding: 20 }}>{barraFiltros}<Carregando texto={`Carregando ${bu}…`} /></div>
  if (carga.erro) return <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>{barraFiltros}<Erro texto={carga.erro} onTentar={carga.tentarDeNovo} /></div>
  if (!conteudo) return <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>{barraFiltros}<Vazio>Ainda não tem dados de {bu}.</Vazio></div>

  const c = conteudo
  const vPago = varPct(c.pago, c.pagoA), vNotas = varPct(c.notas, c.notasA)
  const frasePago = vPago === null ? '' : Math.abs(vPago) < 1 ? `, praticamente igual a ${mesNome(ant)}` : `, ${pctTxt(vPago)} ${vPago > 0 ? 'a mais' : 'a menos'} que em ${mesNome(ant)}`
  const fraseNotas = vNotas === null ? '' : ` As notas que entraram ${vNotas >= 0 ? 'subiram' : 'caíram'} ${pctTxt(vNotas)}.`
  const card = { background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }

  return (
    <div style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1180, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
      {barraFiltros}

      <section aria-labelledby="g-resumo" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 id="g-resumo" style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.3, maxWidth: 780 }}>
          Em {mesNome(mes)}, {bu} pagou <span style={num}>{fmtK(c.pago)}</span>{frasePago}.{fraseNotas}
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Pago no mês</div>
            <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.45 }}>O que saiu do caixa no mês, pela data do pagamento. É o relatório de contas pagas.</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ ...num, fontSize: 28 }}>{fmtK(c.pago)}</span><ChipVar p={vPago} mesAnt={ant} />
            </div>
            <div style={{ fontSize: 12, color: COR.suave }}>{mesNomeCurto(ant)}: {fmtK(c.pagoA)}{c.pagoA ? ` · diferença de ${c.pago - c.pagoA >= 0 ? '+' : ''}${fmtK(c.pago - c.pagoA)}` : ''}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Notas que entraram</div>
            <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.45 }}>O que a área comprou ou contratou no mês, pago ou não.</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ ...num, fontSize: 28 }}>{fmtK(c.notas)}</span><ChipVar p={vNotas} mesAnt={ant} />
            </div>
            <div style={{ fontSize: 12, color: COR.suave }}>{mesNomeCurto(ant)}: {fmtK(c.notasA)} ({c.qtdA.toLocaleString('pt-BR')} notas) · {mesNomeCurto(mes)}: {c.qtd.toLocaleString('pt-BR')} notas</div>
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
            {c.outros > 1 && <span>Investimentos e outros no mês: {fmtK(c.outros)}</span>}
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

      <ListasArea bu={bu} mes={mes} />
    </div>
  )
}

// ── Notas do mês / Contas pagas ───────────────────────────────
const SITUACAO_NOTA = s => s === 'Paga' ? ['Paga', '#4F6B14', '#EEF3DD'] : (s === 'Parcial' || s === 'Parcial vencida') ? ['Paga em parte', '#7A5A00', '#FBF1D2'] : ['Ainda não paga', '#2B4C7E', '#E6EDF7']
const chip = (txt, cor, fundo) => <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 99, fontSize: 12, fontWeight: 500, color: cor, background: fundo, whiteSpace: 'nowrap' }}>{txt}</span>

function ListasArea({ bu, mes }) {
  const [aba, setAba] = useState('notas')
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(100)
  const notas = useCarga(() => (aba === 'notas' ? loadNFLista({ mes, bu }) : Promise.resolve(null)), [aba, mes, bu])
  const contas = useCarga(() => (aba === 'contas' ? loadPagamentosBU({ mes, bu }) : Promise.resolve(null)), [aba, mes, bu])
  const atual = aba === 'notas' ? notas : contas
  const b = busca.trim().toUpperCase()
  const linhas = (atual.dados || []).filter(l => !b || String(l.fornecedor).toUpperCase().includes(b) || String(l.documento || '').includes(b) || String(l.descricao || '').toUpperCase().includes(b))
  const total = linhas.reduce((t, l) => t + l.valor, 0)

  const tab = id => ({
    padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minHeight: 34,
    background: aba === id ? '#fff' : 'transparent', color: aba === id ? COR.texto : COR.suave, fontWeight: aba === id ? 600 : 400,
  })
  const grid = 'minmax(200px, 2fr) 110px 120px 150px 190px'

  return (
    <section aria-labelledby="g-lista" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <h2 id="g-lista" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Notas e contas da área</h2>
          <div style={{ fontSize: 12, color: COR.suave, marginTop: 2 }}>Se alguma não for da sua área, clique em "Não é da minha área". O financeiro revisa e corrige.</div>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 4, background: '#F4F4EF', padding: 3, borderRadius: 9 }}>
          <button role="tab" aria-selected={aba === 'notas'} onClick={() => { setAba('notas'); setLimite(100) }} style={tab('notas')}>Notas do mês</button>
          <button role="tab" aria-selected={aba === 'contas'} onClick={() => { setAba('contas'); setLimite(100) }} style={tab('contas')}>Contas pagas</button>
        </div>
      </div>
      <div style={{ fontSize: 13, background: COR.fundo, borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
        {aba === 'notas'
          ? `Todas as notas fiscais que entraram para a área em ${mesNome(mes)}, já pagas ou não. É aqui que aparece o que foi comprado mesmo que ainda não tenha sido pago.`
          : `Tudo que foi pago em ${mesNome(mes)} e está na sua área. Aluguel, cartão, folha e sistemas não têm nota, e isso é normal.`}
      </div>
      <div><Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} placeholder="Buscar fornecedor, número ou descrição" /></div>

      {atual.carregando ? <Carregando texto={aba === 'notas' ? 'Buscando notas…' : 'Buscando contas pagas…'} />
        : atual.erro ? <Erro texto={atual.erro} onTentar={atual.tentarDeNovo} />
        : !linhas.length ? <Vazio>{b ? 'Nada encontrado com essa busca.' : aba === 'notas' ? 'Nenhuma nota da área nesse mês.' : 'Nenhum pagamento da área nesse mês.'}</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 720, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Fornecedor</div><div>Casa</div><div style={{ textAlign: 'right' }}>Valor</div><div>{aba === 'notas' ? 'Situação' : 'Tem nota?'}</div><div />
              </div>
              {linhas.slice(0, limite).map((l, i) => {
                const sit = aba === 'notas' ? SITUACAO_NOTA(l.status) : (l.com_nf ? ['Com nota', '#4F6B14', '#EEF3DD'] : ['Sem nota', '#5a5c5f', '#F0F0EC'])
                const sub = aba === 'notas'
                  ? `NF ${l.documento} · entrou ${fmtData(l.dt_dig)}`
                  : [l.descricao, l.tipo, `pago ${fmtData(l.dt_baixa)}`].filter(Boolean).join(' · ')
                return (
                  <div key={(l.chave_nf || l.fornecedor) + i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div>
                      <div style={{ fontSize: 11, color: COR.suave, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
                    </div>
                    <div>{aba === 'notas' ? l.unidade : l.loja}</div>
                    <div style={{ ...num, textAlign: 'right' }}>{fmt(l.valor)}</div>
                    <div>{chip(...sit)}</div>
                    <div><NaoEMinha item={l} tipo={aba} bu={bu} mes={mes} /></div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 4px 0', fontSize: 13 }}>
                <span style={{ color: COR.suave }}>{linhas.length.toLocaleString('pt-BR')} {aba === 'notas' ? 'notas' : 'pagamentos'} · {fmt(total)}</span>
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
    const ok = await reportarDivergenciaBU(tipo === 'notas'
      ? { origem: 'nota', fornecedor: item.fornecedor, codFor: item.cod_for, descricao: `NF ${item.documento}`, buAtual: bu, buSugerido: area, mes: mesISOLabel(mes), loja: item.unidade, valor: item.valor }
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
