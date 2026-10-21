import React from 'react'
import { fmtK, fmtData, mesNome } from '../../utils.js'
import { COR, num } from './nf.jsx'

// v27.8 — Prévia do mês em andamento: já pago + notas a pagar até o fim do
// mês = previsto. Fica SEMPRE no topo, separada do mês fechado, pra não
// misturar mês incompleto com comparação de mês fechado.
// linhas: [{ bu, pago, aPagar, anterior }]  (uma linha = só a área do gestor)

export default function PreviaMes({ linhas, mesAtual, mesAnterior, baixasAte, corBU, titulo }) {
  const tot = linhas.reduce((t, l) => ({ pago: t.pago + l.pago, aPagar: t.aPagar + l.aPagar, anterior: t.anterior + l.anterior }), { pago: 0, aPagar: 0, anterior: 0 })
  const previsto = tot.pago + tot.aPagar
  const escala = Math.max(previsto, tot.anterior, 1)
  const nomeMes = mesNome(mesAtual)
  const Nome = nomeMes ? nomeMes[0].toUpperCase() + nomeMes.slice(1) : ''
  const variasAreas = linhas.length > 1
  const grid = 'minmax(140px, 1.3fr) 110px 110px 120px 110px'

  const numero = (rotulo, valor, sub, destaque) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 12, color: destaque ? COR.texto : COR.suave, fontWeight: destaque ? 600 : 400 }}>{rotulo}</span>
      <span style={{ ...num, fontSize: destaque ? 28 : 22, fontWeight: destaque ? 600 : 400 }}>{fmtK(valor)}</span>
      {sub && <span style={{ fontSize: 11, color: COR.suave }}>{sub}</span>}
    </div>
  )
  const op = s => <span aria-hidden="true" style={{ fontSize: 22, color: COR.fraco, alignSelf: 'center' }}>{s}</span>

  return (
    <section aria-labelledby="previa-tit" className="no-print" style={{ background: '#fff', border: '1.5px solid #97A624', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#4F6B14', letterSpacing: 0.3 }}>MÊS EM ANDAMENTO</div>
          <h2 id="previa-tit" style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600 }}>{titulo || `Prévia de ${nomeMes}`}</h2>
        </div>
        <div style={{ fontSize: 12, color: COR.suave }}>{baixasAte ? `pagamentos arquivados até ${fmtData(baixasAte)}` : ''}</div>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {numero(`Já pago em ${nomeMes}`, tot.pago, 'relatório de contas pagas')}
        {op('+')}
        {numero('Notas a pagar até o fim do mês', tot.aPagar, 'notas já emitidas e em aberto')}
        {op('=')}
        {numero(`${Nome} previsto`, previsto, null, true)}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
          <span style={{ fontSize: 12, color: COR.suave }}>{mesNome(mesAnterior)} fechou em</span>
          <span style={{ ...num, fontSize: 22, color: COR.suave }}>{fmtK(tot.anterior)}</span>
        </div>
      </div>

      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: '#EEEDE6' }}>
          <div style={{ width: `${tot.pago / escala * 100}%`, background: '#4F6B14' }} />
          <div style={{ width: `${tot.aPagar / escala * 100}%`, background: '#C9D68A' }} />
        </div>
        <div style={{ position: 'relative', height: 14 }}>
          <div style={{ position: 'absolute', left: `calc(${Math.min(100, tot.anterior / escala * 100)}% - 1px)`, top: -20, width: 2, height: 26, background: COR.texto }} />
          <span style={{ position: 'absolute', left: `min(calc(${tot.anterior / escala * 100}% + 6px), calc(100% - 140px))`, top: 0, fontSize: 11, color: COR.suave, whiteSpace: 'nowrap' }}>{mesNome(mesAnterior)} inteiro</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COR.suave, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#4F6B14', marginRight: 5 }} />Já pago</span>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#C9D68A', marginRight: 5 }} />Notas a pagar</span>
          <span><span style={{ display: 'inline-block', width: 2, height: 10, background: COR.texto, marginRight: 5, verticalAlign: 'middle' }} />{mesNome(mesAnterior)} inteiro, pra referência</span>
        </div>
      </div>

      {variasAreas && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 600 }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
              <div>Área</div><div style={{ textAlign: 'right' }}>Já pago</div><div style={{ textAlign: 'right' }}>A pagar</div>
              <div style={{ textAlign: 'right', color: COR.texto, fontWeight: 600 }}>Previsto</div><div style={{ textAlign: 'right' }}>{mesNome(mesAnterior)} (fechado)</div>
            </div>
            {linhas.filter(l => l.pago || l.aPagar || l.anterior).sort((a, b) => (b.pago + b.aPagar) - (a.pago + a.aPagar)).map(l => (
              <div key={l.bu} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '8px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {corBU && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: corBU(l.bu), flexShrink: 0 }} />}
                  {l.bu === 'Revisar' ? 'Sem área definida' : l.bu}
                </div>
                <div style={{ ...num, textAlign: 'right' }}>{l.pago ? fmtK(l.pago) : '—'}</div>
                <div style={{ ...num, textAlign: 'right' }}>{l.aPagar ? fmtK(l.aPagar) : '—'}</div>
                <div style={{ ...num, textAlign: 'right', fontWeight: 600 }}>{fmtK(l.pago + l.aPagar)}</div>
                <div style={{ ...num, textAlign: 'right', color: COR.suave }}>{l.anterior ? fmtK(l.anterior) : '—'}</div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '10px 4px 2px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
              <div>Total</div>
              <div style={{ ...num, textAlign: 'right' }}>{fmtK(tot.pago)}</div><div style={{ ...num, textAlign: 'right' }}>{fmtK(tot.aPagar)}</div>
              <div style={{ ...num, textAlign: 'right' }}>{fmtK(previsto)}</div><div style={{ ...num, textAlign: 'right', color: COR.suave }}>{fmtK(tot.anterior)}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: '10px 12px', lineHeight: 1.55 }}>
        <b style={{ color: COR.texto }}>Como ler:</b> o previsto é o que já foi pago + as notas já emitidas que vencem até o fim do mês (data do TOTVS ou prazo médio do fornecedor). O que <b>não tem nota</b> (folha, aluguel, impostos, cartão) só aparece quando é pago, e notas que ainda não chegaram também não. Por isso, no meio do mês, o previsto costuma ficar abaixo do mês anterior. Não é queda de custo.
      </div>
    </section>
  )
}
