import React from 'react'
import { loadReportGestor } from '../../data/loader.js'
import { fmtData } from '../../utils.js'
import { COR, useCarga, Carregando, Erro } from '../ui/nf.jsx'
import { ResumoBUs } from '../ui/ResumoBU.jsx'
import NotasEmAberto from '../ui/NotasEmAberto.jsx'
import MetaFaturamento from '../ui/MetaFaturamento.jsx'

// v27.22 — o Report do mês pros gestores: os mesmos números do CEO, por área,
// sem detalhe (sem fornecedor, nota ou lançamento de outra área).
export default function ReportGestor() {
  const c = useCarga(() => loadReportGestor(), [])
  if (c.carregando && !c.dados) return <div style={{ padding: 20 }}><Carregando texto="Montando o report do mês…" /></div>
  if (c.erro) return <div style={{ padding: 20 }}><Erro texto={c.erro} onTentar={c.tentarDeNovo} /></div>
  const d = c.dados
  const mapaCor = Object.fromEntries((d.bus || []).map(b => [b.bu, b.cor]))
  const corBU = bu => mapaCor[bu] || '#8A8A80'
  const bus = (d.bus || []).filter(b => b.grupo !== 'Fora dos totais').sort((a, b) => (a.ordem || 99) - (b.ordem || 99)).map(b => b.bu)
  return (
    <div style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1180, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
      <div style={{ fontSize: 12, color: COR.suave }}>Report do mês do grupo, só com os totais por área. {d.baixas_ate ? `Pagamentos arquivados até ${fmtData(d.baixas_ate)}.` : ''}</div>
      <MetaFaturamento mesAtual={d.mes_atual} />
      <ResumoBUs bus={bus} mesAtual={d.mes_atual} pago={d.pago} aPagarMes={d.a_pagar_mes} receita={d.receita} corBU={corBU}
        lancamentos={d.lancamentos} entrou={d.entrou} semNfComp={d.sem_nf_comp} />
      <NotasEmAberto aPagarMes={d.a_pagar_mes} mesAtual={d.mes_atual} bus={bus} corBU={corBU} />
    </div>
  )
}
