import React, { useMemo } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { fmtK, mesISOLabel } from '../../utils.js'
import { COR, num } from './nf.jsx'

// v27 — faixa no topo da Visão geral com o resumo das notas (grupo todo)
export default function ResumoNF({ irPara }) {
  const { nfResumo, grupoBU, mesNF } = useFinanceiro()
  const r = useMemo(() => {
    if (!nfResumo) return null
    const op = x => grupoBU(x.bu) !== 'Fora dos totais'
    const s = (arr, f, k = 'valor') => arr.filter(f).reduce((t, x) => t + (x[k] || 0), 0)
    return {
      entrou: s(nfResumo.entrou, x => op(x) && x.mes === mesNF),
      pago: s(nfResumo.pago, x => op(x) && x.mes === mesNF),
      aberto: s(nfResumo.aberto, op),
      vencido: s(nfResumo.aberto, op, 'vencido'),
    }
  }, [nfResumo, mesNF])
  if (!r) return null

  const item = (rotulo, valor, destino, alerta) => (
    <button onClick={() => irPara && irPara(destino)} style={{ flex: '1 1 160px', textAlign: 'left', border: 'none', background: 'transparent', padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 12, color: alerta ? COR.alerta : COR.suave }}>{rotulo}</div>
      <div style={{ ...num, fontSize: 18, fontWeight: 500, color: alerta ? COR.alerta : COR.texto }}>{fmtK(valor)}</div>
    </button>
  )
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', padding: '12px 16px', borderRadius: 12, border: `0.5px solid ${COR.borda}`, background: '#fff' }}>
      <div style={{ flex: '1 1 180px', fontSize: 13, color: COR.texto, fontWeight: 600 }}>
        Notas e pagamentos do grupo
        <div style={{ fontSize: 12, color: COR.suave, fontWeight: 400 }}>{mesISOLabel(mesNF)}, todas as BUs</div>
      </div>
      {item('Entrou em nota', r.entrou, 'report')}
      {item('Pago', r.pago, 'report')}
      {item('A pagar', r.aberto, 'apagar')}
      {item('Previsão vencida', r.vencido, 'conciliacao', true)}
    </div>
  )
}
