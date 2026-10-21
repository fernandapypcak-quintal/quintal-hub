import React from 'react'
import { fmtK, fmtData, mesNome, mesNomeCurto, mesAnteriorISO } from '../../utils.js'
import { COR, num } from './nf.jsx'

// v27.10 — Projeção: como o mês atual vai fechar e o que já está comprometido
// pros próximos meses.
//   mês atual  = já pago + notas a pagar até o fim do mês + fixas sem nota que ainda vão sair
//   próximos   = notas já emitidas com previsão no mês + fixas sem nota (média)
// "Fixas sem nota" = média dos últimos 3 meses fechados do que a área paga SEM
// nota (folha, aluguel, impostos, cartão), menos o que já saiu sem nota no mês.

const somar = (arr, f, k = 'valor') => (arr || []).filter(f).reduce((t, x) => t + (x[k] || 0), 0)
const proxMes = m => { const [a, mm] = m.split('-').map(Number); return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}` }

// pago: [{mes, bu, valor, valor_com_nf}]  aPagarMes: [{mes, bu, valor}]
// mesAlvo = mês atual (projeção) ou um mês futuro (já comprometido).
export function calcularProjecao({ pago, aPagarMes, mesAtual, mesAlvo, bus }) {
  const alvo = mesAlvo || mesAtual
  const futuro = alvo > mesAtual
  const ultimoFechado = mesAnteriorISO(mesAtual)
  const fechados = [ultimoFechado, mesAnteriorISO(ultimoFechado), mesAnteriorISO(mesAnteriorISO(ultimoFechado))]
  const ref = futuro ? ultimoFechado : mesAnteriorISO(alvo)   // comparação: sempre um mês fechado

  const linhas = bus.map(bu => {
    const semNota = mm => somar(pago, x => x.bu === bu && x.mes === mm) - somar(pago, x => x.bu === bu && x.mes === mm, 'valor_com_nf')
    const comDado = fechados.filter(mm => somar(pago, x => x.bu === bu && x.mes === mm) > 0)
    // "Sem área" não tem conta fixa pra estimar: entra só o que é real (pago + notas)
    const mediaSemNota = bu === 'Revisar' || !comDado.length ? 0 : comDado.reduce((t, mm) => t + semNota(mm), 0) / comDado.length
    const pagoAlvo = futuro ? 0 : somar(pago, x => x.bu === bu && x.mes === alvo)
    const fixas = futuro ? mediaSemNota : Math.max(0, mediaSemNota - semNota(alvo))
    const notas = somar(aPagarMes, x => x.bu === bu && x.mes === alvo)
    return { bu, anterior: somar(pago, x => x.bu === bu && x.mes === ref), pago: pagoAlvo, notas, fixas, proj: pagoAlvo + notas + fixas }
  }).filter(l => l.anterior || l.pago || l.notas || l.fixas)

  const tot = k => linhas.reduce((t, l) => t + l[k], 0)
  return {
    mesAtual, mesAlvo: alvo, futuro, ant: ref, linhas,
    total: { anterior: tot('anterior'), pago: tot('pago'), notas: tot('notas'), fixas: tot('fixas'), proj: tot('proj') },
  }
}

// opções do filtro de mês: 2 próximos, o atual e os fechados
export function opcoesDeMes(mesAtual, mesesComDado) {
  const prox = m => { const [a, mm] = m.split('-').map(Number); return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}` }
  const p1 = prox(mesAtual), p2 = prox(p1)
  const fechados = [...new Set(mesesComDado)].filter(m => m < mesAtual).sort().reverse()
  return [
    { mes: p2, label: `${mesNomeCurto(p2)} · previsão`, tipo: 'futuro' },
    { mes: p1, label: `${mesNomeCurto(p1)} · previsão`, tipo: 'futuro' },
    { mes: mesAtual, label: `${mesNomeCurto(mesAtual)} · em andamento`, tipo: 'atual' },
    ...fechados.map(m => ({ mes: m, label: `${mesNomeCurto(m)} · fechado`, tipo: 'fechado' })),
  ]
}

const Cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '')
const pct = (a, b) => (b ? (a / b - 1) * 100 : null)
const pctTxt = p => (p === null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1).replace('.', ',')}%`)
const corP = p => (p !== null && p > 10 ? '#9A3C06' : p !== null && p < -10 ? '#4F6B14' : COR.suave)

export default function Projecao({ proj, baixasAte, corBU, titulo, onArea, onNotas }) {
  const t = proj.total
  // mês futuro ainda está incompleto (faltam notas): não compara em %
  const p = proj.futuro ? null : pct(t.proj, t.anterior)
  const nomeAt = mesNome(proj.mesAlvo)
  const escala = Math.max(t.proj, t.anterior, 1)
  const variasAreas = proj.linhas.length > 1

  const parte = (rotulo, valor, sub, destaque, onClick) => {
    const Tag = onClick ? 'button' : 'div'
    return (
      <Tag onClick={onClick} className={onClick ? 'proj-clicavel' : undefined}
        style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left', fontFamily: 'inherit', color: COR.texto,
          border: onClick ? `1px solid #C9D68A` : 'none', background: onClick ? '#F7F9EE' : 'transparent', borderRadius: 10,
          padding: onClick ? '8px 12px' : 0, margin: onClick ? '-8px -12px' : 0, cursor: onClick ? 'pointer' : 'default' }}>
        <span style={{ fontSize: 12, color: destaque ? COR.texto : COR.suave, fontWeight: destaque ? 600 : 400 }}>{rotulo}</span>
        <span style={{ ...num, fontSize: destaque ? 30 : 22, fontWeight: destaque ? 600 : 400 }}>{fmtK(valor)}</span>
        {sub && <span style={{ fontSize: 11, color: COR.suave }}>{sub}</span>}
        {onClick && <span style={{ fontSize: 12, color: '#4F6B14', fontWeight: 600 }}>Ver as notas →</span>}
      </Tag>
    )
  }
  const op = s => <span aria-hidden="true" style={{ fontSize: 22, color: COR.fraco, alignSelf: 'center' }}>{s}</span>
  const grid = proj.futuro ? 'minmax(160px, 1.4fr) 130px 130px 130px 140px' : 'minmax(160px, 1.4fr) 120px 110px 120px 120px 130px 84px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section aria-labelledby="proj-tit" style={{ background: '#fff', border: '1.5px solid #97A624', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#4F6B14', letterSpacing: 0.3 }}>{proj.futuro ? 'PRÓXIMO MÊS' : 'MÊS EM ANDAMENTO'}</div>
            <h2 id="proj-tit" style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 600 }}>
              {titulo || (proj.futuro ? `${Cap(nomeAt)}: ${fmtK(t.proj)} já comprometidos` : `${Cap(nomeAt)} deve fechar em ${fmtK(t.proj)}`)}
              {p !== null && <span style={{ fontSize: 15, fontWeight: 600, color: corP(p), marginLeft: 10 }}>{pctTxt(p)} vs {mesNome(proj.ant)}</span>}
            </h2>
          </div>
          <div style={{ fontSize: 12, color: COR.suave }}>{baixasAte ? `pagamentos arquivados até ${fmtData(baixasAte)}` : ''}</div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {!proj.futuro && parte('Já pago', t.pago, 'contas pagas do mês')}
          {!proj.futuro && op('+')}
          {parte(proj.futuro ? 'Notas já emitidas' : 'Notas a pagar', t.notas, proj.futuro ? `com vencimento em ${nomeAt}` : 'já emitidas, vencem até o fim do mês', false, onNotas)}
          {op('+')}
          {parte(proj.futuro ? 'Fixas sem nota' : 'Fixas sem nota a sair', t.fixas, 'folha, aluguel, impostos (estimado)')}
          {op('=')}
          {parte(proj.futuro ? 'Já comprometido' : 'Projeção do mês', t.proj, null, true)}
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 12, color: COR.suave }}>{mesNome(proj.ant)} fechou em</span>
            <span style={{ ...num, fontSize: 22, color: COR.suave }}>{fmtK(t.anterior)}</span>
          </div>
        </div>

        <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: '#EEEDE6' }}>
              <div style={{ width: `${t.pago / escala * 100}%`, background: '#4F6B14', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
              <div style={{ width: `${t.notas / escala * 100}%`, background: '#97A624', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
              <div style={{ width: `${t.fixas / escala * 100}%`, background: 'repeating-linear-gradient(45deg, #C9D68A 0 6px, #DCE5AE 6px 12px)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
            </div>
            <div style={{ position: 'absolute', left: `calc(${Math.min(100, t.anterior / escala * 100)}% - 1px)`, top: -4, width: 2, height: 22, background: COR.texto }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COR.suave, flexWrap: 'wrap' }}>
            {!proj.futuro && <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#4F6B14', marginRight: 5 }} />Já pago</span>}
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#97A624', marginRight: 5 }} />{proj.futuro ? 'Notas já emitidas' : 'Notas a pagar'}</span>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#C9D68A', marginRight: 5 }} />Fixas sem nota (estimado)</span>
            <span><span style={{ display: 'inline-block', width: 2, height: 10, background: COR.texto, marginRight: 5, verticalAlign: 'middle' }} />{mesNome(proj.ant)} fechado</span>
          </div>
        </div>

      </section>

      {variasAreas && (
        <section aria-labelledby="proj-areas" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h2 id="proj-areas" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Por área</h2>
            <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>{proj.futuro ? `O que já está comprometido em ${nomeAt} por área. ${Cap(mesNome(proj.ant))} aparece só como referência: o mês ainda vai receber notas.` : `Projeção de ${nomeAt} por área. Em destaque, áreas mais de 10% acima ou abaixo de ${mesNome(proj.ant)}.`} {onArea ? 'Clique numa área pra ver as notas e os pagamentos.' : ''}</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 820 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}`, alignItems: 'end' }}>
                <div>Área</div>
                <div style={{ textAlign: 'right' }}>{Cap(mesNome(proj.ant))} (fechado)</div>
                {!proj.futuro && <div style={{ textAlign: 'right' }}>Já pago</div>}
                <div style={{ textAlign: 'right' }}>{proj.futuro ? 'Notas já emitidas' : 'Notas a pagar'}</div>
                <div style={{ textAlign: 'right' }}>Fixas sem nota</div>
                <div style={{ textAlign: 'right', color: COR.texto, fontWeight: 600 }}>{proj.futuro ? 'Já comprometido' : 'Projeção'}</div>
                {!proj.futuro && <div style={{ textAlign: 'right' }}>vs {mesNome(proj.ant).substring(0, 3)}</div>}
              </div>
              {[...proj.linhas].sort((a, b) => b.proj - a.proj).map(l => {
                const pl = pct(l.proj, l.anterior)
                const Nome = onArea && l.bu !== 'Revisar' ? 'button' : 'div'
                return (
                  <div key={l.bu} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '9px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13, background: l.bu === 'Revisar' ? COR.alertaFundo : 'transparent', breakInside: 'avoid' }}>
                    <Nome onClick={Nome === 'button' ? () => onArea(l.bu) : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 13, color: COR.texto, textAlign: 'left', cursor: Nome === 'button' ? 'pointer' : 'default', textDecoration: Nome === 'button' ? 'underline' : 'none', textDecorationColor: '#D9D9D2', textUnderlineOffset: 3 }}>
                      {corBU && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: corBU(l.bu), flexShrink: 0 }} />}
                      {l.bu === 'Revisar' ? 'Sem área definida' : l.bu}
                    </Nome>
                    <div style={{ ...num, textAlign: 'right', color: COR.suave }}>{l.anterior ? fmtK(l.anterior) : '—'}</div>
                    {!proj.futuro && <div style={{ ...num, textAlign: 'right' }}>{l.pago ? fmtK(l.pago) : '—'}</div>}
                    <div style={{ ...num, textAlign: 'right' }}>{l.notas ? fmtK(l.notas) : '—'}</div>
                    <div style={{ ...num, textAlign: 'right', fontStyle: 'italic', color: COR.suave }}>{l.fixas ? fmtK(l.fixas) : '—'}</div>
                    <div style={{ ...num, textAlign: 'right', fontWeight: 600 }}>{fmtK(l.proj)}</div>
                    {!proj.futuro && <div style={{ ...num, textAlign: 'right', fontSize: 12, color: corP(pl), fontWeight: pl !== null && Math.abs(pl) > 10 ? 600 : 400 }}>{pctTxt(pl)}</div>}
                  </div>
                )
              })}
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 4px 2px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
                <div>Total</div>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(t.anterior)}</div>
                {!proj.futuro && <div style={{ ...num, textAlign: 'right' }}>{fmtK(t.pago)}</div>}
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(t.notas)}</div>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(t.fixas)}</div>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(t.proj)}</div>
                {!proj.futuro && <div style={{ ...num, textAlign: 'right', fontSize: 12, color: corP(p) }}>{pctTxt(p)}</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      <div style={{ fontSize: 12, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: '10px 12px', lineHeight: 1.55 }}>
        <b style={{ color: COR.texto }}>Como é calculado:</b> {proj.futuro
          ? <>notas já emitidas com vencimento no mês (data do TOTVS ou prazo médio do fornecedor) + o que a área costuma pagar <b>sem nota</b> (folha, aluguel, impostos, cartão), pela média dos últimos 3 meses. Compras que ainda não viraram nota não entram, então esse valor sobe conforme as notas chegam.</>
          : <>já pago (contas pagas) + notas já emitidas e em aberto que vencem até o fim do mês (data do TOTVS ou prazo médio do fornecedor) + o que a área costuma pagar <b>sem nota</b> (folha, aluguel, impostos, cartão), pela média dos últimos 3 meses, descontando o que já saiu sem nota no mês.</>}
      </div>
    </div>
  )
}
