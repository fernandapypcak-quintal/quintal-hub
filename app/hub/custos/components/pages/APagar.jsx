import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { loadNFLista } from '../../data/loader.js'
import { fmt, fmtK, fmtDiaMes, fmtData } from '../../utils.js'
import { COR, num, Painel, Kpi, GradeKpis, NomeBU, Abas, Busca, Tabela, Carregando, Erro, ChipStatus, SemDadosNF, useCarga } from '../ui/nf.jsx'

// v27 — A pagar: notas em aberto e quando devem sair do caixa.
// Previsão = vencimento (quando o MTR090 trouxer) ou entrada + prazo do fornecedor.

const hojeISO = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)
const somarDias = (s, n) => new Date(Date.parse(s + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const ORIGEM_PREV = { 'Vencimento': 'vencimento', 'Prazo acordado': 'prazo combinado', 'Prazo histórico': 'prazo real', 'Prazo padrão': 'prazo padrão (20d)' }

export default function APagar({ irPara }) {
  const { nfResumo, busConfig, corBU, grupoBU, buFiltro } = useFinanceiro()
  const [filtro, setFiltro] = useState('todas')
  const [busca, setBusca] = useState('')
  const lista = useCarga(() => loadNFLista({ status: 'aberto', bu: buFiltro }), [buFiltro])

  const hoje = hojeISO()
  const em7 = somarDias(hoje, 7)
  const em14 = somarDias(hoje, 14)

  const resumo = useMemo(() => {
    if (!nfResumo) return null
    const okBU = bu => buFiltro === 'Todas' ? grupoBU(bu) !== 'Fora dos totais' : bu === buFiltro
    const aberto = nfResumo.aberto.filter(a => okBU(a.bu))
    const agenda = nfResumo.agenda.filter(a => okBU(a.bu))
    const semanas = [...new Set(agenda.map(a => a.semana))].sort((a, b) => a === 'vencida' ? -1 : b === 'vencida' ? 1 : a.localeCompare(b)).slice(0, 11)
    const bus = (busConfig.length ? busConfig.map(b => b.bu) : [...new Set(agenda.map(a => a.bu))]).filter(bu => agenda.some(a => a.bu === bu))
    const serie = semanas.map(s => {
      const o = { semana: s === 'vencida' ? 'Vencida' : fmtDiaMes(s) }
      bus.forEach(bu => { o[bu] = Math.round(agenda.filter(a => a.semana === s && a.bu === bu).reduce((t, a) => t + a.valor, 0)) })
      return o
    })
    return {
      total: aberto.reduce((s, a) => s + a.valor, 0),
      qtd: aberto.reduce((s, a) => s + a.qtd, 0),
      vencido: aberto.reduce((s, a) => s + a.vencido, 0),
      qtdVencido: aberto.reduce((s, a) => s + a.qtd_vencido, 0),
      prox14: agenda.filter(a => a.semana !== 'vencida' && a.semana < em14).reduce((s, a) => s + a.valor, 0),
      serie, bus,
    }
  }, [nfResumo, busConfig, buFiltro, em14])

  if (!nfResumo) return <SemDadosNF />

  const notas = (lista.dados || []).map(n => ({ ...n, aberto: Math.max(0, n.valor - n.valor_pago) }))
  const vencida = n => n.status === 'Vencida' || n.status === 'Parcial vencida'
  const grupos = {
    todas: () => true,
    vencidas: vencida,
    semana: n => !vencida(n) && n.prev_pagto <= em7,
    depois: n => !vencida(n) && n.prev_pagto > em7,
  }
  const b = busca.trim().toUpperCase()
  const filtradas = notas
    .filter(grupos[filtro])
    .filter(n => !b || n.fornecedor.toUpperCase().includes(b) || String(n.documento).includes(b))
    .sort((x, y) => (x.prev_pagto || '').localeCompare(y.prev_pagto || '') || y.aberto - x.aberto)
  const totalFiltrado = filtradas.reduce((s, n) => s + n.aberto, 0)
  const conta = k => notas.filter(grupos[k]).length

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, width: '100%', boxSizing: 'border-box' }}>
      <GradeKpis>
        <Kpi rotulo="Em aberto" valor={fmtK(resumo.total)} detalhe={`${resumo.qtd.toLocaleString('pt-BR')} notas${buFiltro !== 'Todas' ? ` de ${buFiltro}` : ''}`} />
        <Kpi rotulo="Sai nas próximas 2 semanas" valor={fmtK(resumo.prox14)} detalhe={`até ${fmtData(em14)}`} />
        <Kpi alerta rotulo="Previsão já passou" valor={fmtK(resumo.vencido)} detalhe={`${resumo.qtdVencido.toLocaleString('pt-BR')} notas sem pagamento arquivado`} />
        <Kpi rotulo="Sem pagamento localizado" valor={fmtK(nfResumo.sem_baixa)}
          detalhe={`${nfResumo.qtd_sem_baixa.toLocaleString('pt-BR')} notas antigas, fora deste total · ver conciliação`} onClick={() => irPara && irPara('conciliacao')} />
      </GradeKpis>

      <Painel titulo="Agenda de saída por semana" extra="semana começando na segunda">
        {resumo.serie.length ? (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resumo.serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: COR.suave }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtK(v).replace('R$ ', '')} tick={{ fontSize: 11, fill: COR.suave }} axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={(v, nome) => [fmtK(v), nome]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                {resumo.bus.map(bu => <Bar key={bu} dataKey={bu} stackId="a" fill={corBU(bu)} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <Carregando texto="Nenhuma nota em aberto." />}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 12, color: COR.suave }}>
          {resumo.bus.map(bu => <NomeBU key={bu} bu={bu} cor={corBU(bu)} />)}
        </div>
      </Painel>

      <Painel titulo="Notas em aberto" extra={filtradas.length ? `${filtradas.length.toLocaleString('pt-BR')} notas · ${fmt(totalFiltrado)}` : ''}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Abas ativa={filtro} onChange={setFiltro} abas={[
            { id: 'todas', label: 'Todas', qtd: notas.length },
            { id: 'vencidas', label: 'Previsão passou', qtd: conta('vencidas') },
            { id: 'semana', label: 'Próximos 7 dias', qtd: conta('semana') },
            { id: 'depois', label: 'Depois', qtd: conta('depois') },
          ]} />
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar fornecedor ou número" />
        </div>
        {lista.carregando ? <Carregando texto="Buscando notas em aberto…" />
          : lista.erro ? <Erro texto={lista.erro} onTentar={lista.tentarDeNovo} />
          : <>
              <Tabela linhas={filtradas.slice(0, 300)} chave={l => l.chave_nf} minWidth={860} vazio="Nenhuma nota nesse filtro." colunas={[
                { id: 'prev', label: 'Previsão', render: l => <div><div style={{ ...num, color: vencida(l) ? COR.alerta : COR.texto, fontWeight: vencida(l) ? 600 : 400 }}>{fmtData(l.prev_pagto)}</div><div style={{ fontSize: 11, color: COR.suave }}>{ORIGEM_PREV[l.origem_prev] || l.origem_prev}</div></div> },
                { id: 'fornecedor', label: 'Fornecedor', render: l => <div><div style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div><div style={{ fontSize: 11, color: COR.suave }}>NF {l.documento} · {l.unidade}</div></div> },
                { id: 'bu', label: 'BU', render: l => <NomeBU bu={l.bu} cor={corBU(l.bu)} /> },
                { id: 'dt_dig', label: 'Entrada', mono: true, render: l => fmtData(l.dt_dig) },
                { id: 'aberto', label: 'Em aberto', direita: true, mono: true, render: l => fmt(l.aberto) },
                { id: 'status', label: 'Situação', render: l => <ChipStatus status={l.status} /> },
              ]} />
              {(filtradas.length > 300 || notas.length >= 3000) && (
                <div style={{ fontSize: 11, color: COR.suave, marginTop: 8, lineHeight: 1.5 }}>
                  {filtradas.length > 300 ? 'Mostrando as 300 primeiras por data de previsão. ' : ''}
                  {notas.length >= 3000 ? 'A lista traz as 3.000 notas em aberto de maior valor; os totais lá em cima incluem todas. ' : ''}
                  Use a busca ou o filtro de BU pra achar as outras.
                </div>
              )}
            </>}
      </Painel>
    </div>
  )
}
