import React, { useEffect, useState } from 'react'
import { loadLancamentos, loadPagamentosBU, registrarLancamento, excluirLancamento } from '../../data/loader.js'
import { fmt, fmtK, mesNome, mesAnteriorISO } from '../../utils.js'
import { COR, num, useCarga, botaoSecundario, Carregando, Erro, Vazio, exportarExcel, BotaoExportar } from './nf.jsx'

// v27.19 — BU da área: o que ela gastou × o que ela gerou.
// Gasto: custo nos relatórios (contas pagas) + pessoal da área (informado pelo gestor).
// Gerado: receitas extras (contas a receber) + receita gerada e economia (informadas)
//         + redução de custo vs mês anterior (calculada pelos próprios dados).
// A folha informada pelas áreas entra no custo da própria BU e no DRE.
// A BU Pessoal já recebe a folha consolidada do financeiro, então não deve lançá-la novamente.

const TIPOS_BASE = ['Pessoal da área', 'Receita gerada', 'Economia']
const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
const ehVisaoPessoas = g => {
  const cat = norm(g.categoria), desc = norm(g.descricao)
  return /FOLHA|SALARIO|ENCARGO|BENEFICIO|RESCISAO|COMISSAO|GORJETA|FERIAS|ADIANTAMENTO|FGTS|INSS|PENSAO/.test(cat + ' ' + desc)
}
const ehGrupoPessoal = g => ehVisaoPessoas(g) ? 'Pessoas' : 'RH'
const soma = (arr, f, k = 'valor') => (arr || []).filter(f).reduce((t, x) => t + (x[k] || 0), 0)

export function calcularBU({ bu, mes, pago, receita, lancamentos }) {
  const ant = mesAnteriorISO(mes)
  const custo = soma(pago, x => x.bu === bu && x.mes === mes)
  const custoAnt = soma(pago, x => x.bu === bu && x.mes === ant)
  const ls = (lancamentos || []).filter(l => l.bu === bu && l.mes === mes)
  const pessoal = bu === 'Pessoal' ? 0 : soma(ls, l => l.tipo === 'Pessoal da área')
  const qtd = bu === 'Pessoal' ? 0 : soma(ls, l => l.tipo === 'Pessoal da área', 'qtd')
  const recGerada = soma(ls, l => l.tipo === 'Receita gerada')
  const economia = soma(ls, l => l.tipo === 'Economia')
  const extras = soma(receita, x => x.bu === bu && x.mes === mes)
  const reducao = custoAnt && custo < custoAnt ? custoAnt - custo : 0
  return { bu, mes, ant, custo, custoAnt, pessoal, qtd, recGerada, economia, extras, reducao,
    gasto: custo + pessoal, gerado: extras + recGerada + economia + reducao, lancs: ls }
}

// ── Minha área: blocos + lançamentos editáveis ───────────────
export default function BUApresentacao({ bu, mes, pago, receita, editavel = true }) {
  const c = useCarga(() => loadLancamentos(bu), [bu])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [mostrarGastos, setMostrarGastos] = useState(false)
  const [gastos, setGastos] = useState([])
  const [gastosCarregadosPara, setGastosCarregadosPara] = useState('')
  const [carregandoGastos, setCarregandoGastos] = useState(false)
  const [erroGastos, setErroGastos] = useState('')
  const [visaoPessoal, setVisaoPessoal] = useState('Todos')
  const [categoriasAbertas, setCategoriasAbertas] = useState({})
  const [fornecedoresAbertos, setFornecedoresAbertos] = useState({})
  const r = calcularBU({ bu, mes, pago, receita, lancamentos: c.dados || [] })
  const nomeMes = mesNome(mes)
  const gastosVisiveis = bu === 'Pessoal' && visaoPessoal !== 'Todos' ? gastos.filter(g => ehGrupoPessoal(g) === visaoPessoal) : gastos
  const tiposDisponiveis = bu === 'Pessoal' ? TIPOS_BASE.filter(t => t !== 'Pessoal da área') : TIPOS_BASE
  const gruposCategoria = Object.values((gastosVisiveis || []).reduce((acc, g) => {
    const categoria = String(g.categoria || 'Sem categoria').trim() || 'Sem categoria'
    const fornecedor = String(g.fornecedor || 'Fornecedor não identificado').trim() || 'Fornecedor não identificado'
    if (!acc[categoria]) acc[categoria] = { nome: categoria, total: 0, itens: [], fornecedores: {} }
    acc[categoria].total += Number(g.valor) || 0
    acc[categoria].itens.push(g)
    if (!acc[categoria].fornecedores[fornecedor]) acc[categoria].fornecedores[fornecedor] = { nome: fornecedor, total: 0, itens: [] }
    acc[categoria].fornecedores[fornecedor].total += Number(g.valor) || 0
    acc[categoria].fornecedores[fornecedor].itens.push(g)
    return acc
  }, {})).sort((a, b) => b.total - a.total)

  useEffect(() => {
    setMostrarGastos(false)
    setGastos([])
    setGastosCarregadosPara('')
    setErroGastos('')
    setVisaoPessoal('Todos')
    setCategoriasAbertas({})
    setFornecedoresAbertos({})
  }, [bu, mes])

  const alternarGastos = async () => {
    if (mostrarGastos) { setMostrarGastos(false); return }
    setMostrarGastos(true)
    const chaveAtual = `${bu}|${mes}`
    if (gastosCarregadosPara === chaveAtual || carregandoGastos) return
    setGastos([])
    setCarregandoGastos(true)
    setErroGastos('')
    try {
      const linhas = await loadPagamentosBU({ bu, mes })
      // O total de custo da BU considera apenas Fixo + Variável.
      setGastos(Array.isArray(linhas) ? linhas.filter(g => g.tipo === 'Fixo' || g.tipo === 'Variável') : [])
      setGastosCarregadosPara(chaveAtual)
    } catch (e) {
      setErroGastos(e.message || 'Não foi possível carregar os gastos.')
    } finally { setCarregandoGastos(false) }
  }

  const linhaValor = (rot, v, sub, cor) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: '0.5px solid #F0F0EC' }}>
      <div><div style={{ fontSize: 13 }}>{rot}</div>{sub && <div style={{ fontSize: 11, color: COR.suave }}>{sub}</div>}</div>
      <div style={{ ...num, fontSize: 14, color: v ? (cor || COR.texto) : COR.fraco }}>{v ? fmtK(v) : '—'}</div>
    </div>
  )

  const salvar = async () => {
    setMsg('')
    const valor = Number(String(form.valor || '').replace(/\./g, '').replace(',', '.'))
    if (!(valor > 0)) { setMsg('Informe um valor.'); return }
    if (form.tipo !== 'Pessoal da área' && !String(form.indicador || '').trim()) { setMsg('Diga o que foi (ex.: rebate Ambev, troca de fornecedor de gás).'); return }
    setForm(f => ({ ...f, enviando: true }))
    const res = await registrarLancamento({ bu, mes, tipo: form.tipo, indicador: form.indicador, valor, qtd: form.qtd, obs: form.obs })
    if (res.ok) { setForm(null); c.tentarDeNovo() } else { setMsg(res.erro); setForm(f => ({ ...f, enviando: false })) }
  }
  const excluir = async l => {
    if (!window.confirm(`Excluir "${l.indicador || l.tipo}" (${fmt(l.valor)})?`)) return
    if (await excluirLancamento({ id: l.id, bu })) c.tentarDeNovo()
  }
  const campo = { fontSize: 13, padding: '7px 9px', borderRadius: 7, border: `0.5px solid ${COR.borda}`, fontFamily: 'inherit', background: '#fff' }

  return (
    <section aria-labelledby="bu-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, breakInside: 'avoid' }}>
      <div>
        <h2 id="bu-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>BU {bu} · {nomeMes}</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>O que a área gastou e gerou no mês. Os custos dos relatórios entram automaticamente; quando a folha da área não estiver mapeada no financeiro, informe-a aqui para somar ao custo e ao DRE. Na BU Pessoal, a folha já vem consolidada do financeiro.</div>
        {bu === 'Pessoal' && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12, padding: '10px 12px', border: `1px solid ${COR.borda}`, borderRadius: 9, background: '#FCFCFA' }}>
            <strong style={{ fontSize: 12, marginRight: 4 }}>Visão da BU Pessoal:</strong>
            {['Todos', 'Pessoas', 'RH'].map(v => <button key={v} type="button" onClick={() => { setVisaoPessoal(v); if (!mostrarGastos) { setMostrarGastos(true); if (gastosCarregadosPara !== `${bu}|${mes}`) alternarGastos() } }} aria-pressed={visaoPessoal === v} style={{ ...botaoSecundario, padding: '6px 12px', fontSize: 12, background: visaoPessoal === v ? '#2B4C7E' : '#fff', color: visaoPessoal === v ? '#fff' : COR.texto, borderColor: visaoPessoal === v ? '#2B4C7E' : COR.borda }}>{v}</button>)}
            <span style={{ fontSize: 11, color: COR.suave }}>Pessoas: folha, benefícios e encargos · RH: treinamento, desenvolvimento e estrutura da área.</span>
          </div>
        )}
      </div>

      {c.carregando && !c.dados ? <Carregando texto="Carregando lançamentos…" /> : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} /> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1.5px solid ${COR.texto}`, paddingBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Gastou</span><span style={{ ...num, fontSize: 18, fontWeight: 600 }}>{fmtK(r.gasto)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: '0.5px solid #F0F0EC' }}>
              <div><div style={{ fontSize: 13 }}>Custo nos relatórios</div><div style={{ fontSize: 11, color: COR.suave }}>contas pagas no mês (fixo + variável) · clique para ver os gastos</div></div>
              <button type="button" onClick={alternarGastos} aria-expanded={mostrarGastos} title="Ver gastos detalhados" style={{ ...num, fontSize: 14, border: 0, background: 'transparent', padding: '2px 0', cursor: 'pointer', color: r.custo ? COR.texto : COR.fraco, textDecoration: 'underline', textUnderlineOffset: 3 }}>{r.custo ? fmtK(r.custo) : '—'}</button>
            </div>
            {mostrarGastos && (
              <div style={{ marginTop: 8, padding: 12, border: `0.5px solid ${COR.borda}`, borderRadius: 8, background: '#FCFCFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 12 }}>Gastos por categoria · {nomeMes}</strong>
                  <span style={{ ...num, fontSize: 12 }}>{fmtK(gastosVisiveis.reduce((s, g) => s + (Number(g.valor) || 0), 0))}</span>
                </div>
                {carregandoGastos ? <div style={{ fontSize: 12, color: COR.suave }}>Carregando gastos…</div> : erroGastos ? <div style={{ fontSize: 12, color: COR.alerta }}>{erroGastos}</div> : !gruposCategoria.length ? <Vazio>Nenhum pagamento detalhado encontrado para esta visão e mês.</Vazio> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {gruposCategoria.map(grupo => {
                      const catKey = `${bu}|${mes}|${grupo.nome}`
                      const aberto = !!categoriasAbertas[catKey]
                      const fornecedores = Object.values(grupo.fornecedores).sort((a, b) => b.total - a.total)
                      return (
                        <div key={catKey} style={{ border: `1px solid ${COR.borda}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                          <button type="button" onClick={() => setCategoriasAbertas(v => ({ ...v, [catKey]: !v[catKey] }))} aria-expanded={aberto} style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center', textAlign: 'left', padding: '10px 11px', border: 0, background: aberto ? '#F5F7EC' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: COR.texto }}>{grupo.nome}<span style={{ display: 'block', fontSize: 10, color: COR.suave, fontWeight: 400 }}>{grupo.itens.length} lançamento(s) · {fornecedores.length} fornecedor(es)</span></span>
                            <span style={{ ...num, fontSize: 12, fontWeight: 600 }}>{fmtK(grupo.total)}</span><span aria-hidden="true" style={{ color: COR.suave }}>{aberto ? '−' : '+'}</span>
                          </button>
                          {aberto && <div style={{ padding: '5px 9px 9px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {fornecedores.map(f => {
                              const fornKey = `${catKey}|${f.nome}`
                              const fornAberto = !!fornecedoresAbertos[fornKey]
                              return <div key={fornKey} style={{ border: `1px solid #F0F0EC`, borderRadius: 6, overflow: 'hidden' }}>
                                <button type="button" onClick={() => setFornecedoresAbertos(v => ({ ...v, [fornKey]: !v[fornKey] }))} aria-expanded={fornAberto} style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center', textAlign: 'left', padding: '8px 9px', border: 0, background: '#FCFCFA', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  <span style={{ fontSize: 11, fontWeight: 500 }}>{f.nome}<span style={{ display: 'block', fontSize: 10, color: COR.suave, fontWeight: 400 }}>{f.itens.length} nota(s)/pagamento(s)</span></span>
                                  <span style={{ ...num, fontSize: 11 }}>{fmtK(f.total)}</span><span aria-hidden="true" style={{ color: COR.suave }}>{fornAberto ? '−' : '+'}</span>
                                </button>
                                {fornAberto && <div style={{ padding: '0 9px 7px', overflowX: 'auto' }}>
                                  <div style={{ minWidth: 430 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(140px, 1.3fr) 85px', gap: 8, padding: '5px 0', borderBottom: `1px solid ${COR.borda}`, fontSize: 10, color: COR.suave }}><div>Descrição / unidade / NF</div><div>Data do pagamento</div><div style={{ textAlign: 'right' }}>Valor</div></div>
                                    {f.itens.sort((a, b) => String(b.dt_baixa || '').localeCompare(String(a.dt_baixa || ''))).map((g, i) => <div key={`${g.dt_baixa || ''}-${g.nf_documento || ''}-${g.descricao || ''}-${i}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(140px, 1.3fr) 85px', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #F0F0EC', fontSize: 11, alignItems: 'start' }}>
                                      <div>{g.descricao || '—'}<div style={{ fontSize: 10, color: COR.suave }}>{[g.loja, g.nf_documento ? `NF ${g.nf_documento}` : ''].filter(Boolean).join(' · ') || '—'}</div></div>
                                      <div>{g.dt_baixa || '—'}<div style={{ fontSize: 10, color: COR.suave }}>{g.tipo || ''}</div></div>
                                      <div style={{ ...num, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(g.valor)}</div>
                                    </div>)}
                                  </div>
                                </div>}
                              </div>
                            })}
                          </div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {bu !== 'Pessoal' && linhaValor('Folha da área (informada)', r.pessoal, r.qtd ? `${r.qtd} pessoa(s) · incluída no custo e no DRE` : 'incluída no custo total da BU e no DRE')}
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1.5px solid #4F6B14', paddingBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Gerou</span><span style={{ ...num, fontSize: 18, fontWeight: 600, color: '#4F6B14' }}>{fmtK(r.gerado)}</span>
            </div>
            {linhaValor('Receitas extras', r.extras, 'rebate, verba, parcerias (contas a receber)', '#4F6B14')}
            {linhaValor('Receita gerada (informada)', r.recGerada, null, '#4F6B14')}
            {linhaValor('Economia (informada)', r.economia, null, '#4F6B14')}
            {linhaValor(`Redução de custo vs ${mesNome(r.ant)}`, r.reducao, r.custoAnt ? (r.reducao ? 'calculada pelos relatórios' : `o custo não caiu (${mesNome(r.ant)}: ${fmtK(r.custoAnt)})`) : '', '#4F6B14')}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Lançamentos da área em {nomeMes}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {r.lancs.length > 0 && <BotaoExportar onClick={() => exportarExcel(`${bu} - lançamentos ${mes}`, [
              { titulo: 'Tipo', valor: l => l.tipo, largura: 18 }, { titulo: 'O que foi', valor: l => l.indicador, largura: 36 },
              { titulo: 'Valor', valor: l => l.valor, tipo: 'num', largura: 14 }, { titulo: 'Pessoas', valor: l => l.qtd || '', largura: 9 },
              { titulo: 'KPI / observação', valor: l => l.obs, largura: 40 }, { titulo: 'Lançado por', valor: l => `${l.por} · ${l.em}`, largura: 30 },
            ], r.lancs, 'Lançamentos')} />}
            {editavel && !form && <button onClick={() => { setMsg(''); setForm({ tipo: 'Receita gerada', indicador: '', valor: '', qtd: '', obs: '' }) }}
              style={{ ...botaoSecundario, background: '#4F6B14', color: '#fff', border: 'none', fontWeight: 600 }}>+ Lançar</button>}
          </div>
        </div>

        {form && (
          <div style={{ background: COR.fundo, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} aria-label="Tipo" style={campo}>
                {tiposDisponiveis.map(t => <option key={t} value={t}>{t === 'Pessoal da área' ? 'Folha da área (informada)' : t}</option>)}
              </select>
              <input value={form.indicador} onChange={e => setForm(f => ({ ...f, indicador: e.target.value }))} aria-label="O que foi" maxLength={120}
                placeholder={form.tipo === 'Pessoal da área' ? 'Ex.: custo total da folha do time de compras' : form.tipo === 'Economia' ? 'Ex.: renegociação do gás, política de pagamentos' : 'Ex.: rebate Ambev, venda pra adegas'}
                style={{ ...campo, flex: '1 1 240px' }} />
              <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} aria-label="Valor" inputMode="decimal" placeholder="Valor (R$)" style={{ ...campo, width: 130 }} />
              {form.tipo === 'Pessoal da área' && <input value={form.qtd} onChange={e => setForm(f => ({ ...f, qtd: e.target.value }))} aria-label="Pessoas" inputMode="numeric" placeholder="Nº pessoas" style={{ ...campo, width: 110 }} />}
            </div>
            <input value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} aria-label="KPI ou observação" maxLength={300}
              placeholder="KPI ou observação (ex.: meta 1 contrato com rebate · atingido)" style={campo} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={salvar} disabled={form.enviando} style={{ ...botaoSecundario, background: '#4F6B14', color: '#fff', border: 'none', fontWeight: 600 }}>{form.enviando ? 'Salvando…' : 'Salvar'}</button>
              <button onClick={() => setForm(null)} style={botaoSecundario}>Cancelar</button>
              {msg && <span style={{ fontSize: 12, color: COR.alerta }}>{msg}</span>}
            </div>
          </div>
        )}

        {!r.lancs.length ? <Vazio>Nada lançado em {nomeMes}.{editavel ? ' Use "+ Lançar" pra informar o pessoal da área, receita gerada ou economia.' : ''}</Vazio> : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 620 }}>
              {r.lancs.map(l => (
                <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '130px minmax(160px, 1.4fr) 110px minmax(140px, 1.2fr) 70px', gap: 10, alignItems: 'center', padding: '8px 2px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  <span style={{ fontSize: 12, color: l.tipo === 'Pessoal da área' ? COR.texto : '#4F6B14', fontWeight: 600 }}>{l.tipo === 'Pessoal da área' ? 'Folha da área' : l.tipo}</span>
                  <span>{l.indicador}{l.qtd ? ` · ${l.qtd} pessoa(s)` : ''}</span>
                  <span style={{ ...num, textAlign: 'right' }}>{fmt(l.valor)}</span>
                  <span style={{ fontSize: 12, color: COR.suave }} title={`${l.por} · ${l.em}`}>{l.obs}</span>
                  <span>{editavel && <button onClick={() => excluir(l)} style={{ ...botaoSecundario, padding: '4px 8px', fontSize: 12 }}>Excluir</button>}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Report: todas as áreas (só leitura) ──────────────────────
export function BUsDoMes({ mes, pago, receita, bus, corBU }) {
  const c = useCarga(() => loadLancamentos(''), [])
  if (c.carregando && !c.dados) return null
  const linhas = bus.map(bu => calcularBU({ bu, mes, pago, receita, lancamentos: c.dados || [] })).filter(r => r.gasto || r.gerado)
  if (!linhas.length) return null
  const grid = 'minmax(140px, 1.2fr) 110px 110px 110px 110px 110px 110px 110px'
  const temLanc = (c.dados || []).some(l => l.mes === mes)
  return (
    <section aria-labelledby="bus-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, breakInside: 'avoid' }}>
      <div>
        <h2 id="bus-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>BUs: o que cada área gastou e gerou</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>Gastou = custo nos relatórios + folha informada pela área quando não estiver no financeiro. A folha informada também entra no DRE. Gerou = receitas extras + receita gerada e economia + redução de custo vs mês anterior. {temLanc ? '' : 'Nenhuma área lançou nada nesse mês ainda.'}</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 1000 }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}`, alignItems: 'end' }}>
            <div>Área</div><div style={{ textAlign: 'right' }}>Custo</div><div style={{ textAlign: 'right' }}>Folha informada</div><div style={{ textAlign: 'right', color: COR.texto, fontWeight: 600 }}>Gastou</div>
            <div style={{ textAlign: 'right' }}>Receitas extras</div><div style={{ textAlign: 'right' }}>Receita gerada + economia</div><div style={{ textAlign: 'right' }}>Redução de custo</div><div style={{ textAlign: 'right', color: '#4F6B14', fontWeight: 600 }}>Gerou</div>
          </div>
          {linhas.sort((a, b) => b.gasto - a.gasto).map(r => (
            <div key={r.bu} style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, alignItems: 'center', padding: '8px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                {corBU && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: corBU(r.bu) }} />}{r.bu === 'Revisar' ? 'Sem área definida' : r.bu}
              </div>
              {[r.custo, r.pessoal, r.gasto, r.extras, r.recGerada + r.economia, r.reducao, r.gerado].map((v, i) => (
                <div key={i} style={{ ...num, textAlign: 'right', fontWeight: i === 2 || i === 6 ? 600 : 400, color: !v ? COR.fraco : i >= 3 ? '#4F6B14' : COR.texto }}>{v ? fmtK(v) : '—'}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
