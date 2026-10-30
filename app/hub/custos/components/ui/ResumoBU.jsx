import React, { useState } from 'react'
import { loadLancamentos, registrarLancamento, excluirLancamento } from '../../data/loader.js'
import { fmt, fmtK, mesNome, mesAnteriorISO } from '../../utils.js'
import { COR, num, useCarga, botaoSecundario, Carregando, Erro, Vazio, exportarExcel, BotaoExportar } from './nf.jsx'
import { calcularProjecao } from './Projecao.jsx'

// v27.21 — A BU numa linha do tempo, que é o que o gestor apresenta pro CEO:
//   GASTOS: mês fechado (pago) · mês atual (previsto = já pago + a pagar + fixas) · próximos (já comprometido)
//   RECEITAS E ECONOMIAS: receitas extras (contas a receber + bonificação em NF) + o que a área
//   lança (receita gerada, economia) + redução de custo vs mês anterior (calculada)
// Não depende do filtro de mês da página.

const prox = m => { const [a, mm] = m.split('-').map(Number); return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}` }
const soma = (arr, f, k = 'valor') => (arr || []).filter(f).reduce((t, x) => t + (x[k] || 0), 0)
const Cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '')
const TIPOS = ['Receita gerada', 'Economia', 'Pessoal da área']

export function mesesDaLinha(mesAtual) {
  const ant = mesAnteriorISO(mesAtual), p1 = prox(mesAtual), p2 = prox(p1)
  return [
    { mes: ant, tipo: 'fechado', titulo: Cap(mesNome(ant)), sub: 'fechado' },
    { mes: mesAtual, tipo: 'atual', titulo: Cap(mesNome(mesAtual)), sub: 'em andamento' },
    { mes: p1, tipo: 'futuro', titulo: Cap(mesNome(p1)), sub: 'previsão' },
    { mes: p2, tipo: 'futuro', titulo: Cap(mesNome(p2)), sub: 'previsão' },
  ]
}

// números da BU em cada mês da linha do tempo
export function calcularLinhaBU({ bu, mesAtual, pago, aPagarMes, receita, lancamentos }) {
  return mesesDaLinha(mesAtual).map(m => {
    const lanc = (lancamentos || []).filter(l => l.bu === bu && l.mes === m.mes)
    const informado = soma(lanc, l => l.tipo === 'Receita gerada' || l.tipo === 'Economia')
    const pessoal = soma(lanc, l => l.tipo === 'Pessoal da área')
    const extras = soma(receita, x => x.bu === bu && x.mes === m.mes)
    let gasto = 0, detalhe = null, reducao = 0
    if (m.tipo === 'fechado') {
      gasto = soma(pago, x => x.bu === bu && x.mes === m.mes)
      const antes = soma(pago, x => x.bu === bu && x.mes === mesAnteriorISO(m.mes))
      reducao = bu !== 'Revisar' && antes && gasto < antes ? antes - gasto : 0   // "sem área" não tem redução de custo
    } else {
      const pj = calcularProjecao({ pago, aPagarMes, mesAtual, mesAlvo: m.mes, bus: [bu] }).total
      gasto = pj.proj
      detalhe = pj
    }
    return { ...m, gasto, detalhe, extras, informado, reducao, pessoal, receitas: extras + informado + reducao, lanc }
  })
}

// ── Minha área ───────────────────────────────────────────────
export default function ResumoBU({ bu, mesAtual, pago, aPagarMes, receita }) {
  const c = useCarga(() => loadLancamentos(bu), [bu])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const linha = calcularLinhaBU({ bu, mesAtual, pago, aPagarMes, receita, lancamentos: c.dados || [] })
  const temPessoal = linha.some(m => m.pessoal)
  const lancs = linha.flatMap(m => m.lanc.map(l => ({ ...l, titulo: m.titulo })))

  const salvar = async () => {
    setMsg('')
    const valor = Number(String(form.valor || '').replace(/\./g, '').replace(',', '.'))
    if (!(valor > 0)) { setMsg('Informe um valor.'); return }
    if (form.tipo !== 'Pessoal da área' && !String(form.indicador || '').trim()) { setMsg('Diga o que foi (ex.: renegociação do gás, venda pra adegas).'); return }
    setForm(f => ({ ...f, enviando: true }))
    const res = await registrarLancamento({ bu, mes: form.mes, tipo: form.tipo, indicador: form.indicador, valor, qtd: form.qtd, obs: form.obs })
    if (res.ok) { setForm(null); c.tentarDeNovo() } else { setMsg(res.erro); setForm(f => ({ ...f, enviando: false })) }
  }
  const excluir = async l => {
    if (!window.confirm(`Excluir "${l.indicador || l.tipo}" (${fmt(l.valor)})?`)) return
    if (await excluirLancamento({ id: l.id, bu })) c.tentarDeNovo()
  }
  const campo = { fontSize: 13, padding: '7px 9px', borderRadius: 7, border: `0.5px solid ${COR.borda}`, fontFamily: 'inherit', background: '#fff' }
  const grid = 'minmax(170px, 1.2fr) repeat(4, minmax(120px, 1fr))'

  const celGasto = m => (
    <div style={{ textAlign: 'right' }}>
      <div style={{ ...num, fontSize: 18, fontWeight: 600 }}>{m.gasto ? fmtK(m.gasto) : '—'}</div>
      {m.tipo === 'atual' && m.detalhe && <div style={{ fontSize: 11, color: COR.suave, lineHeight: 1.4 }}>pago {fmtK(m.detalhe.pago)} · a pagar {fmtK(m.detalhe.notas)}{m.detalhe.fixas ? ` · fixas ${fmtK(m.detalhe.fixas)}` : ''}</div>}
      {m.tipo === 'futuro' && m.detalhe && <div style={{ fontSize: 11, color: COR.suave, lineHeight: 1.4 }}>notas {fmtK(m.detalhe.notas)}{m.detalhe.fixas ? ` · fixas ${fmtK(m.detalhe.fixas)}` : ''}</div>}
      {m.tipo === 'fechado' && <div style={{ fontSize: 11, color: COR.suave }}>contas pagas</div>}
    </div>
  )
  const celRec = m => (
    <div style={{ textAlign: 'right' }}>
      <div style={{ ...num, fontSize: 18, fontWeight: 600, color: m.receitas ? '#4F6B14' : COR.fraco }}>{m.receitas ? fmtK(m.receitas) : '—'}</div>
      <div style={{ fontSize: 11, color: COR.suave, lineHeight: 1.4 }}>
        {[m.extras ? `extras ${fmtK(m.extras)}` : '', m.informado ? `lançado ${fmtK(m.informado)}` : '', m.reducao ? `redução ${fmtK(m.reducao)}` : ''].filter(Boolean).join(' · ')}
      </div>
    </div>
  )

  return (
    <section aria-labelledby="rbu-tit" style={{ background: '#fff', border: '1.5px solid #97A624', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h2 id="rbu-tit" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>BU {bu}: gastos e receitas</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>
          O que a área gastou, o que está previsto gastar e o que ela gerou. É o resumo que vai pro CEO. Os gastos vêm dos relatórios; receitas e economias somam o que entra sozinho (receitas extras, bonificação em nota, redução de custo) com o que a área lança.
        </div>
      </div>

      {c.carregando && !c.dados ? <Carregando texto="Montando a BU…" /> : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} /> : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, padding: '6px 4px', borderBottom: `1px solid ${COR.texto}`, alignItems: 'end' }}>
              <div />
              {linha.map(m => (
                <div key={m.mes} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.titulo}</div>
                  <div style={{ fontSize: 11, color: m.tipo === 'atual' ? '#4F6B14' : COR.suave, fontWeight: m.tipo === 'atual' ? 600 : 400 }}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, padding: '12px 4px', borderBottom: '0.5px solid #F0F0EC', alignItems: 'start' }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>Gastos</div><div style={{ fontSize: 11, color: COR.suave }}>fechado = pago · atual = previsto · próximos = já comprometido</div></div>
              {linha.map(m => <React.Fragment key={m.mes}>{celGasto(m)}</React.Fragment>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, padding: '12px 4px', borderBottom: '0.5px solid #F0F0EC', alignItems: 'start' }}>
              <div><div style={{ fontSize: 14, fontWeight: 600, color: '#4F6B14' }}>Receitas e economias</div><div style={{ fontSize: 11, color: COR.suave }}>extras + o que a área lança + redução de custo</div></div>
              {linha.map(m => <React.Fragment key={m.mes}>{celRec(m)}</React.Fragment>)}
            </div>
            {temPessoal && (
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, padding: '10px 4px', alignItems: 'start' }}>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>Pessoal da área</div><div style={{ fontSize: 11, color: COR.suave }}>informado · já está no custo de Pessoal</div></div>
                {linha.map(m => <div key={m.mes} style={{ ...num, textAlign: 'right', fontSize: 14, color: m.pessoal ? COR.texto : COR.fraco }}>{m.pessoal ? fmtK(m.pessoal) : '—'}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: `0.5px solid ${COR.borda}`, paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>O que a área lançou</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {lancs.length > 0 && <BotaoExportar onClick={() => exportarExcel(`${bu} - lançamentos`, [
              { titulo: 'Mês', valor: l => l.titulo, largura: 12 }, { titulo: 'Tipo', valor: l => l.tipo, largura: 18 }, { titulo: 'O que foi', valor: l => l.indicador, largura: 36 },
              { titulo: 'Valor', valor: l => l.valor, tipo: 'num', largura: 14 }, { titulo: 'Pessoas', valor: l => l.qtd || '', largura: 9 },
              { titulo: 'KPI / observação', valor: l => l.obs, largura: 40 }, { titulo: 'Lançado por', valor: l => `${l.por} · ${l.em}`, largura: 30 },
            ], lancs, 'Lançamentos')} />}
            {!form && <button onClick={() => { setMsg(''); setForm({ mes: mesAtual, tipo: 'Receita gerada', indicador: '', valor: '', qtd: '', obs: '' }) }}
              style={{ ...botaoSecundario, background: '#4F6B14', color: '#fff', border: 'none', fontWeight: 600 }}>+ Lançar receita, economia ou pessoal</button>}
          </div>
        </div>

        {form && (
          <div style={{ background: COR.fundo, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={form.mes} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} aria-label="Mês" style={campo}>
                {mesesDaLinha(mesAtual).map(m => <option key={m.mes} value={m.mes}>{m.titulo}</option>)}
              </select>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} aria-label="Tipo" style={campo}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={form.indicador} onChange={e => setForm(f => ({ ...f, indicador: e.target.value }))} aria-label="O que foi" maxLength={120}
                placeholder={form.tipo === 'Pessoal da área' ? 'Ex.: folha do time de compras' : form.tipo === 'Economia' ? 'Ex.: renegociação do gás, política de pagamentos' : 'Ex.: venda pra adegas, novo fornecedor com rebate'}
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

        {!lancs.length ? <Vazio>Nada lançado ainda. Use o botão acima pra informar receita gerada, economia ou o custo com o time da área.</Vazio> : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 640 }}>
              {lancs.map(l => (
                <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '90px 130px minmax(160px, 1.4fr) 110px minmax(140px, 1.2fr) 70px', gap: 10, alignItems: 'center', padding: '8px 2px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  <span style={{ fontSize: 12, color: COR.suave }}>{l.titulo}</span>
                  <span style={{ fontSize: 12, color: l.tipo === 'Pessoal da área' ? COR.texto : '#4F6B14', fontWeight: 600 }}>{l.tipo}</span>
                  <span>{l.indicador}{l.qtd ? ` · ${l.qtd} pessoa(s)` : ''}</span>
                  <span style={{ ...num, textAlign: 'right' }}>{fmt(l.valor)}</span>
                  <span style={{ fontSize: 12, color: COR.suave }} title={`${l.por} · ${l.em}`}>{l.obs}</span>
                  <span><button onClick={() => excluir(l)} style={{ ...botaoSecundario, padding: '4px 8px', fontSize: 12 }}>Excluir</button></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Report: todas as áreas na mesma linha do tempo ───────────
export function ResumoBUs({ bus, mesAtual, pago, aPagarMes, receita, corBU }) {
  const c = useCarga(() => loadLancamentos(''), [])
  const meses = mesesDaLinha(mesAtual)
  const linhas = [...new Set(bus)].map(bu => ({ bu, l: calcularLinhaBU({ bu, mesAtual, pago, aPagarMes, receita, lancamentos: c.dados || [] }) }))
    .filter(x => x.l.some(m => m.gasto || m.receitas))
    .sort((a, b) => b.l[1].gasto - a.l[1].gasto)
  if (!linhas.length) return null
  const tot = (i, k) => linhas.reduce((t, x) => t + x.l[i][k], 0)
  const grid = 'minmax(140px, 1.2fr) repeat(4, 104px) 16px repeat(2, 110px)'
  const cel = (v, cor, bold) => <div style={{ ...num, textAlign: 'right', fontSize: 13, fontWeight: bold ? 600 : 400, color: v ? (cor || COR.texto) : COR.fraco }}>{v ? fmtK(v) : '—'}</div>
  return (
    <section aria-labelledby="rbus-tit" style={{ background: '#fff', border: '1.5px solid #97A624', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, breakInside: 'avoid' }}>
      <div>
        <h2 id="rbus-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>BUs: gastos e receitas</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>
          Gastos: {meses[0].titulo} é o que foi pago; {meses[1].titulo} é o previsto (já pago + a pagar + fixas); os próximos meses são o que já está comprometido em notas e fixas. Receitas e economias: receitas extras, bonificação em nota, o que cada área lançou e a redução de custo vs o mês anterior.
        </div>
      </div>
      {c.carregando && !c.dados ? <Carregando texto="Montando as BUs…" /> : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, fontSize: 12, color: COR.suave, padding: '6px 4px', alignItems: 'end' }}>
              <div />
              <div style={{ gridColumn: 'span 4', textAlign: 'center', color: COR.texto, fontWeight: 600, borderBottom: `1px solid ${COR.borda}`, paddingBottom: 4 }}>Gastos</div>
              <div />
              <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#4F6B14', fontWeight: 600, borderBottom: '1px solid #C9D68A', paddingBottom: 4 }}>Receitas e economias</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, fontSize: 12, color: COR.suave, padding: '4px 4px 6px', borderBottom: `1px solid ${COR.texto}`, alignItems: 'end' }}>
              <div>Área</div>
              {meses.map(m => <div key={m.mes} style={{ textAlign: 'right' }}><div style={{ color: COR.texto, fontWeight: 600 }}>{m.titulo}</div><div style={{ fontSize: 11 }}>{m.tipo === 'fechado' ? 'pago' : m.tipo === 'atual' ? 'previsto' : 'comprometido'}</div></div>)}
              <div />
              {meses.slice(0, 2).map(m => <div key={m.mes} style={{ textAlign: 'right', color: COR.texto, fontWeight: 600 }}>{m.titulo}</div>)}
            </div>
            {linhas.map(({ bu, l }) => (
              <div key={bu} style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, alignItems: 'center', padding: '8px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13, background: bu === 'Revisar' ? COR.alertaFundo : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                  {corBU && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: bu === 'Revisar' ? '#C2561A' : corBU(bu), flexShrink: 0 }} />}{bu === 'Revisar' ? 'Sem área definida' : bu}
                </div>
                {l.map((m, i) => <React.Fragment key={m.mes}>{cel(m.gasto, null, i === 1)}</React.Fragment>)}
                <div />
                {l.slice(0, 2).map(m => <React.Fragment key={m.mes}>{cel(m.receitas, '#4F6B14')}</React.Fragment>)}
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '10px 4px 2px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
              <div>Total</div>
              {[0, 1, 2, 3].map(i => <div key={i} style={{ ...num, textAlign: 'right' }}>{fmtK(tot(i, 'gasto'))}</div>)}
              <div />
              {[0, 1].map(i => <div key={i} style={{ ...num, textAlign: 'right', color: '#4F6B14' }}>{fmtK(tot(i, 'receitas'))}</div>)}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
