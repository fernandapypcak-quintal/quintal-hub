import React, { useState } from 'react'
import { fmtK, mesNome, mesISOLabel } from '../../utils.js'
import { COR, num } from './nf.jsx'

// v27.17 — Notas em aberto por área × mês da previsão de pagamento.
// Sempre a partir de hoje (não depende do mês filtrado na página).
// Mês atual inclui as atrasadas que entraram nos últimos 40 dias (mesma regra do "a pagar").
// aPagarMes: [{ mes, bu, valor, qtd }]   renderDetalhe(bu, mes, ehAtual) → lista das notas

const prox = m => { const [a, mm] = m.split('-').map(Number); return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}` }
const Cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '')

export default function NotasEmAberto({ aPagarMes, mesAtual, bus, corBU, renderDetalhe, titulo }) {
  const [sel, setSel] = useState(null)   // { bu, mes }
  if (!mesAtual) return null
  const m1 = prox(mesAtual), m2 = prox(m1)
  const cols = [
    { id: mesAtual, label: `${Cap(mesNome(mesAtual))}`, sub: 'inclui atrasadas', clicavel: true },
    { id: m1, label: Cap(mesNome(m1)), clicavel: true },
    { id: m2, label: Cap(mesNome(m2)), clicavel: true },
    { id: 'depois', label: 'Depois', sub: `a partir de ${mesISOLabel(prox(m2)).toLowerCase()}`, clicavel: false },
  ]
  const valor = (bu, c) => (aPagarMes || []).filter(x => x.bu === bu && (c === 'depois' ? x.mes > m2 : x.mes === c)).reduce((t, x) => t + x.valor, 0)
  const qtd = (bu, c) => (aPagarMes || []).filter(x => x.bu === bu && (c === 'depois' ? x.mes > m2 : x.mes === c)).reduce((t, x) => t + (x.qtd || 0), 0)
  const linhas = bus.map(bu => {
    const v = cols.map(c => valor(bu, c.id))
    return { bu, v, q: cols.map(c => qtd(bu, c.id)), total: v.reduce((a, b) => a + b, 0) }
  }).filter(l => l.total > 0).sort((a, b) => (a.bu === 'Revisar') - (b.bu === 'Revisar') || b.total - a.total)
  const totCol = cols.map((_, i) => linhas.reduce((t, l) => t + l.v[i], 0))
  const totGeral = totCol.reduce((a, b) => a + b, 0)
  const variasAreas = bus.length > 1
  const grid = `minmax(150px, 1.3fr) repeat(${cols.length}, 120px) 120px`

  return (
    <section aria-labelledby="nea-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, breakInside: 'avoid' }}>
      <div>
        <h2 id="nea-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{titulo || 'Notas em aberto por mês de pagamento'}</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>
          Notas já emitidas e ainda não pagas, pelo mês em que devem ser pagas (vencimento do TOTVS ou prazo médio do fornecedor). Sempre a partir de hoje, não muda com o filtro de mês. Clique num valor pra ver as notas.
        </div>
      </div>
      {!linhas.length ? (
        <div style={{ fontSize: 13, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: 16, textAlign: 'center' }}>Nenhuma nota em aberto.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 150 + cols.length * 130 + 130 }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}`, alignItems: 'end' }}>
              <div>{variasAreas ? 'Área' : ''}</div>
              {cols.map(c => (
                <div key={c.id} style={{ textAlign: 'right', ...(c.id === mesAtual ? { background: '#F4F8EC', borderRadius: 6, padding: '2px 6px' } : {}) }}>
                  {c.id === mesAtual && <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: '#fff', background: '#4F6B14', borderRadius: 4, padding: '1px 6px', marginBottom: 2 }}>MÊS ATUAL</div>}
                  <div style={{ color: COR.texto, fontWeight: 600 }}>{c.label}</div>
                  {c.sub && <div style={{ fontSize: 11 }}>{c.sub}</div>}
                </div>
              ))}
              <div style={{ textAlign: 'right', color: COR.texto, fontWeight: 600 }}>Total</div>
            </div>
            {linhas.map(l => (
              <div key={l.bu} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '6px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13, background: l.bu === 'Revisar' ? COR.alertaFundo : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                  {corBU && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: l.bu === 'Revisar' ? '#C2561A' : corBU(l.bu), flexShrink: 0 }} />}
                  {l.bu === 'Revisar' ? 'Sem área definida' : l.bu}
                </div>
                {cols.map((c, i) => {
                  const ativo = sel && sel.bu === l.bu && sel.mes === c.id
                  const pode = c.clicavel && l.v[i] > 0 && renderDetalhe && l.bu !== 'Revisar'
                  return pode ? (
                    <button key={c.id} onClick={() => setSel(ativo ? null : { bu: l.bu, mes: c.id })} aria-pressed={ativo}
                      title={`${l.q[i]} nota(s)`}
                      style={{ ...num, textAlign: 'right', fontSize: 13, border: ativo ? '1px solid #97A624' : '1px solid transparent', background: ativo ? COR.verdeClaro : 'transparent', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: COR.texto, textDecoration: 'underline', textDecorationColor: '#D9D9D2', textUnderlineOffset: 3 }}>
                      {fmtK(l.v[i])}
                    </button>
                  ) : (
                    <div key={c.id} style={{ ...num, textAlign: 'right', padding: '4px 6px', color: l.v[i] ? COR.texto : COR.fraco }} title={l.v[i] ? `${l.q[i]} nota(s)` : undefined}>{l.v[i] ? fmtK(l.v[i]) : '—'}</div>
                  )
                })}
                <div style={{ ...num, textAlign: 'right', fontWeight: 600, padding: '4px 6px' }}>{fmtK(l.total)}</div>
              </div>
            ))}
            {variasAreas && (
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 4px 2px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
                <div>Total</div>
                {totCol.map((v, i) => <div key={i} style={{ ...num, textAlign: 'right', padding: '0 6px' }}>{fmtK(v)}</div>)}
                <div style={{ ...num, textAlign: 'right', padding: '0 6px' }}>{fmtK(totGeral)}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {sel && renderDetalhe && (
        <div className="no-print" style={{ borderTop: `0.5px solid ${COR.borda}`, paddingTop: 12 }}>
          {renderDetalhe(sel.bu, sel.mes, sel.mes === mesAtual)}
        </div>
      )}
    </section>
  )
}
