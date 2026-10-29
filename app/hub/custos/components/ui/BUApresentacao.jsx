import React, { useState } from 'react'
import { loadLancamentos, registrarLancamento, excluirLancamento } from '../../data/loader.js'
import { fmt, fmtK, mesNome, mesAnteriorISO } from '../../utils.js'
import { COR, num, useCarga, botaoSecundario, Carregando, Erro, Vazio, exportarExcel, BotaoExportar } from './nf.jsx'

// v27.19 — BU da área: o que ela gastou × o que ela gerou.
// Gasto: custo nos relatórios (contas pagas) + pessoal da área (informado pelo gestor).
// Gerado: receitas extras (contas a receber) + receita gerada e economia (informadas)
//         + redução de custo vs mês anterior (calculada pelos próprios dados).
// O pessoal informado NÃO soma no custo do grupo: a folha já está toda em Pessoal.

const TIPOS = ['Pessoal da área', 'Receita gerada', 'Economia']
const soma = (arr, f, k = 'valor') => (arr || []).filter(f).reduce((t, x) => t + (x[k] || 0), 0)

export function calcularBU({ bu, mes, pago, receita, lancamentos }) {
  const ant = mesAnteriorISO(mes)
  const custo = soma(pago, x => x.bu === bu && x.mes === mes)
  const custoAnt = soma(pago, x => x.bu === bu && x.mes === ant)
  const ls = (lancamentos || []).filter(l => l.bu === bu && l.mes === mes)
  const pessoal = soma(ls, l => l.tipo === 'Pessoal da área')
  const qtd = soma(ls, l => l.tipo === 'Pessoal da área', 'qtd')
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
  const r = calcularBU({ bu, mes, pago, receita, lancamentos: c.dados || [] })
  const nomeMes = mesNome(mes)

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
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>O que a área gastou e o que ela gerou no mês. Os valores dos relatórios entram sozinhos; pessoal da área, receita gerada e economia são informados pela área aqui embaixo.</div>
      </div>

      {c.carregando && !c.dados ? <Carregando texto="Carregando lançamentos…" /> : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} /> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1.5px solid ${COR.texto}`, paddingBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Gastou</span><span style={{ ...num, fontSize: 18, fontWeight: 600 }}>{fmtK(r.gasto)}</span>
            </div>
            {linhaValor('Custo nos relatórios', r.custo, 'contas pagas no mês (fixo + variável)')}
            {linhaValor('Pessoal da área (informado)', r.pessoal, r.qtd ? `${r.qtd} pessoa(s) · não soma no custo do grupo` : 'folha do time da área · não soma no custo do grupo')}
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
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={form.indicador} onChange={e => setForm(f => ({ ...f, indicador: e.target.value }))} aria-label="O que foi" maxLength={120}
                placeholder={form.tipo === 'Pessoal da área' ? 'Ex.: folha do time de compras' : form.tipo === 'Economia' ? 'Ex.: renegociação do gás, política de pagamentos' : 'Ex.: rebate Ambev, venda pra adegas'}
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
                  <span style={{ fontSize: 12, color: l.tipo === 'Pessoal da área' ? COR.texto : '#4F6B14', fontWeight: 600 }}>{l.tipo}</span>
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
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>Gastou = custo nos relatórios + pessoal da área (informado). Gerou = receitas extras + receita gerada e economia (informadas) + redução de custo vs mês anterior. {temLanc ? '' : 'Nenhuma área lançou nada nesse mês ainda.'}</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 1000 }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}`, alignItems: 'end' }}>
            <div>Área</div><div style={{ textAlign: 'right' }}>Custo</div><div style={{ textAlign: 'right' }}>Pessoal informado</div><div style={{ textAlign: 'right', color: COR.texto, fontWeight: 600 }}>Gastou</div>
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
