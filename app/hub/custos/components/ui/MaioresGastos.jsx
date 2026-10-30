import React, { useMemo, useState } from 'react'
import { loadDRE } from '../../data/loader.js'
import { fmtK, mesNome } from '../../utils.js'
import { COR, num, useCarga, Carregando, Erro, Vazio } from './nf.jsx'

// v27.22 — Maiores gastos da área no mês, em barras, pra apresentar.
// Mês fechado = pago; mês atual = pago + notas a pagar. Por fornecedor ou por tipo de gasto.
// Usa os mesmos dados do DRE (custo fixo + variável).

const Cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '')
const TOP = 10

export default function MaioresGastos({ bu }) {
  const c = useCarga(() => loadDRE({ bu }), [bu])
  const [qual, setQual] = useState('fechado')   // fechado | atual
  const [por, setPor] = useState('fornecedor')  // fornecedor | categoria

  const d = useMemo(() => {
    const dados = c.dados
    if (!dados || dados.meses.length !== 4) return null
    const [, m1, m2, mAtual] = dados.meses
    const mes = qual === 'fechado' ? m2 : mAtual
    const ant = qual === 'fechado' ? m1 : m2
    const chave = r => (por === 'fornecedor' ? r.fornecedor : r.categoria)
    const agg = {}
    const add = (k, campo, v, cat) => {
      if (!agg[k]) agg[k] = { nome: k, v: 0, ant: 0, cats: {} }
      agg[k][campo] += v
      if (cat && campo === 'v') agg[k].cats[cat] = (agg[k].cats[cat] || 0) + v
    }
    dados.pago.forEach(r => {
      if (r.mes === mes) add(chave(r), 'v', r.valor, r.categoria)
      if (r.mes === ant) add(chave(r), 'ant', r.valor)
    })
    if (qual === 'atual') dados.a_pagar.forEach(r => add(chave(r), 'v', r.valor, r.categoria))
    const todos = Object.values(agg).filter(x => x.v > 0).sort((a, b) => b.v - a.v)
    const total = todos.reduce((t, x) => t + x.v, 0)
    const top = todos.slice(0, TOP)
    const resto = todos.slice(TOP)
    return { mes, ant, total, top, resto: resto.reduce((t, x) => t + x.v, 0), nResto: resto.length, max: top[0] ? top[0].v : 1 }
  }, [c.dados, qual, por])

  const botao = (ativo, txt, onClick) => (
    <button onClick={onClick} aria-pressed={ativo}
      style={{ padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', minHeight: 30,
        background: ativo ? '#fff' : 'transparent', color: ativo ? COR.texto : COR.suave, fontWeight: ativo ? 600 : 400 }}>{txt}</button>
  )
  const pct = (a, b) => (b ? `${a >= b ? '+' : '−'}${Math.abs((a / b - 1) * 100).toFixed(1).replace('.', ',')}%` : 'novo')

  return (
    <section aria-labelledby="mg-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h2 id="mg-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Maiores gastos {d ? `de ${mesNome(d.mes)}` : ''}</h2>
          <div style={{ fontSize: 12, color: COR.suave, marginTop: 3 }}>
            {qual === 'fechado' ? 'Mês fechado: o que foi pago.' : 'Mês em andamento: o que já foi pago + as notas a pagar no mês.'} Os {TOP} maiores, com o peso no total e a variação vs o mês anterior.
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, background: '#F0F0EA', padding: 3, borderRadius: 9 }}>
            {botao(qual === 'fechado', 'Mês fechado', () => setQual('fechado'))}
            {botao(qual === 'atual', 'Mês atual', () => setQual('atual'))}
          </div>
          <div style={{ display: 'flex', gap: 3, background: '#F0F0EA', padding: 3, borderRadius: 9 }}>
            {botao(por === 'fornecedor', 'Por fornecedor', () => setPor('fornecedor'))}
            {botao(por === 'categoria', 'Por tipo de gasto', () => setPor('categoria'))}
          </div>
        </div>
      </div>

      {c.carregando && !c.dados ? <Carregando texto="Buscando os gastos…" />
        : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} />
        : !d || !d.top.length ? <Vazio>Sem gastos nesse mês.</Vazio>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: COR.suave }}>Total da área em {mesNome(d.mes)}:</span>
              <span style={{ ...num, fontSize: 20, fontWeight: 600 }}>{fmtK(d.total)}</span>
              <span style={{ fontSize: 12, color: COR.suave }}>os {d.top.length} maiores somam {Math.round(d.top.reduce((t, x) => t + x.v, 0) / d.total * 100)}%</span>
            </div>
            {d.top.map((x, i) => {
              const cat = por === 'fornecedor' ? Object.entries(x.cats).sort((a, b) => b[1] - a[1]).map(([k]) => k)[0] : ''
              return (
                <div key={x.nome} style={{ display: 'grid', gridTemplateColumns: '24px minmax(160px, 260px) minmax(120px, 1fr) 96px 52px 70px', gap: 10, alignItems: 'center' }}>
                  <span style={{ ...num, fontSize: 12, color: COR.suave, textAlign: 'right' }}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.nome}>{Cap(String(x.nome).toLowerCase())}</div>
                    {cat && <div style={{ fontSize: 11, color: COR.suave }}>{cat}</div>}
                  </div>
                  <div style={{ height: 14, background: '#EEEDE6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(x.v / d.max * 100).toFixed(1)}%`, background: i === 0 ? '#3F5510' : '#6B7F2A', borderRadius: 4, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
                  </div>
                  <span style={{ ...num, fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{fmtK(x.v)}</span>
                  <span style={{ ...num, fontSize: 11, textAlign: 'right', color: COR.suave }}>{Math.round(x.v / d.total * 100)}%</span>
                  <span style={{ ...num, fontSize: 11, textAlign: 'right', color: !x.ant ? COR.suave : x.v > x.ant * 1.1 ? '#9A3C06' : x.v < x.ant * 0.9 ? '#4F6B14' : COR.suave }}>{pct(x.v, x.ant)}</span>
                </div>
              )
            })}
            {d.resto > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(160px, 260px) minmax(120px, 1fr) 96px 52px 70px', gap: 10, alignItems: 'center', color: COR.suave, fontSize: 12, borderTop: '0.5px solid #F0F0EC', paddingTop: 8 }}>
                <span /><span>Outros {d.nResto} {por === 'fornecedor' ? 'fornecedores' : 'tipos'}</span><span />
                <span style={{ ...num, textAlign: 'right' }}>{fmtK(d.resto)}</span>
                <span style={{ ...num, textAlign: 'right' }}>{Math.round(d.resto / d.total * 100)}%</span><span />
              </div>
            )}
            <div style={{ fontSize: 11, color: COR.suave }}>Variação vs {mesNome(d.ant)}{qual === 'atual' ? ' (o mês atual ainda está em andamento)' : ''}.</div>
          </div>
        )}
    </section>
  )
}
