// app/hub/promocoes/components/AnaliseDiaria.jsx
'use client'

import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { usePromocoesData } from '../data/usePromocoesData'
import { CATEGORIAS_BASE } from './DashboardPromocoes'

const brlK = (v) => { const n = v || 0; return Math.abs(n) >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : `R$ ${n.toFixed(1)}` }
const brl = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (v) => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—')
const num = (v) => (isFinite(v) ? Math.round(v).toLocaleString('pt-BR') : '—')

function diaLabel(dataIso) {
  const [, , d] = dataIso.split('-')
  return d
}

function corCmv(cmv) {
  if (!isFinite(cmv)) return '#9ca3af'
  if (cmv >= 0.8) return '#8C1414'
  if (cmv >= 0.35) return '#D9B504'
  return '#97A624'
}

export default function AnaliseDiaria() {
  const { dadosDiarios, loading, erro, ALL_UNIT_IDS, labelForUnit } = usePromocoesData()
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('rede')
  const [mesSelecionado, setMesSelecionado] = useState(null)

  const mesesDisponiveis = useMemo(() => {
    if (!dadosDiarios) return []
    const set = new Set()
    Object.values(dadosDiarios).forEach(porDia =>
      Object.keys(porDia).forEach(data => set.add(data.slice(0, 7)))
    )
    return Array.from(set).sort()
  }, [dadosDiarios])

  const mes = mesSelecionado || mesesDisponiveis[mesesDisponiveis.length - 1]
  const unidadesParaSomar = unidadeSelecionada === 'rede' ? ALL_UNIT_IDS : [unidadeSelecionada]

  const linhasPorDia = useMemo(() => {
    if (!dadosDiarios || !mes) return []
    const porDia = {} // data -> { faturamento, pessoas, custoTotal, temCustoDoDia }

    for (const unitId of unidadesParaSomar) {
      const diasUnidade = dadosDiarios[unitId] || {}
      for (const [data, slot] of Object.entries(diasUnidade)) {
        if (!data.startsWith(mes)) continue
        if (!porDia[data]) porDia[data] = { data, faturamento: 0, pessoas: 0, custoTotal: 0, temCustoDoDia: false }
        const totalFat = CATEGORIAS_BASE.reduce((s, c) => s + (slot.faturamento[c] || 0), 0)
        const totalPessoas = CATEGORIAS_BASE.reduce((s, c) => s + (slot.pessoas[c] || 0), 0)
        const totalCusto = CATEGORIAS_BASE.reduce((s, c) => s + (slot.custoTotal?.[c] || 0), 0)
        porDia[data].faturamento += totalFat
        porDia[data].pessoas += totalPessoas
        porDia[data].custoTotal += totalCusto
        if (slot.temCustoDoDia) porDia[data].temCustoDoDia = true
      }
    }

    return Object.values(porDia)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(l => ({
        ...l,
        dia: diaLabel(l.data),
        ticket: l.pessoas ? l.faturamento / l.pessoas : 0,
        cmv: l.temCustoDoDia && l.faturamento ? l.custoTotal / l.faturamento : null,
      }))
  }, [dadosDiarios, mes, unidadesParaSomar.join(',')])

  const totalMes = linhasPorDia.reduce((s, l) => s + l.faturamento, 0)
  const pessoasMes = linhasPorDia.reduce((s, l) => s + l.pessoas, 0)
  const melhorDia = linhasPorDia.reduce((melhor, l) => (!melhor || l.faturamento > melhor.faturamento ? l : melhor), null)

  const diasComCmv = linhasPorDia.filter(l => l.cmv != null)
  const custoTotalMes = diasComCmv.reduce((s, l) => s + l.custoTotal, 0)
  const faturamentoComCmv = diasComCmv.reduce((s, l) => s + l.faturamento, 0)
  const cmvMedioMes = faturamentoComCmv ? custoTotalMes / faturamentoComCmv : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-olive border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Carregando dados de promoções...</p>
        </div>
      </div>
    )
  }

  if (erro) return <div className="p-6 text-sm text-brand-crimson">Erro ao carregar: {erro}</div>
  if (!mesesDisponiveis.length) return <div className="p-6 text-sm text-zinc-400">Nenhum dado disponível ainda.</div>

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Análise Diária — Promoções</h1>
          <p className="text-xs text-zinc-400">Faturamento, pessoas e CMV dia a dia — {mes}</p>
        </div>
        <div className="flex gap-2">
          <select value={mes} onChange={(e) => setMesSelecionado(e.target.value)} className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white">
            {mesesDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={unidadeSelecionada} onChange={(e) => setUnidadeSelecionada(e.target.value)} className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white">
            <option value="rede">Rede (todas as unidades)</option>
            {ALL_UNIT_IDS.map(id => <option key={id} value={id}>{labelForUnit(id)}</option>)}
          </select>
        </div>
      </div>

      {diasComCmv.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 text-amber-700 text-[12.5px] rounded-lg px-3 py-2">
          O CMV diário ainda não apareceu pra esse mês — o pipeline resumível de Promoções Utilizadas dia a dia ainda está processando esse período (ou o mês está fora do intervalo já processado). Faturamento e Pessoas continuam normais (vêm de outra fonte, já completa).
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Faturamento em Promoções no mês</p>
          <p className="text-[22px] font-bold text-brand-black leading-none">{brlK(totalMes)}</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Pessoas atendidas no mês</p>
          <p className="text-[22px] font-bold text-brand-black leading-none">{num(pessoasMes)}</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">CMV médio no mês</p>
          <p className="text-[22px] font-bold leading-none" style={{ color: corCmv(cmvMedioMes) }}>
            {cmvMedioMes != null ? pct(cmvMedioMes) : '—'}
          </p>
          {diasComCmv.length > 0 && diasComCmv.length < linhasPorDia.length && (
            <p className="text-[11px] text-zinc-400 mt-1">baseado em {diasComCmv.length}/{linhasPorDia.length} dias já processados</p>
          )}
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Melhor dia</p>
          <p className="text-[22px] font-bold text-brand-black leading-none">{melhorDia ? melhorDia.data.split('-').reverse().join('/') : '—'}</p>
          {melhorDia && <p className="text-[11px] text-zinc-400 mt-1">{brl(melhorDia.faturamento)}</p>}
        </div>
      </div>

      <div className="bg-white border border-surface-border rounded-xl p-4">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-3">Faturamento (barras) e CMV (linha) por dia</p>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={linhasPorDia}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="fat" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={brlK} width={50} />
              <YAxis yAxisId="cmv" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => pct(v)} width={50} />
              <Tooltip formatter={(v, name) => (name === 'CMV' ? pct(v) : brl(v))} labelFormatter={(l) => `Dia ${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="fat" dataKey="faturamento" name="Faturamento" fill="#9A3412" radius={[3, 3, 0, 0]} />
              <Line yAxisId="cmv" dataKey="cmv" name="CMV" stroke="#8C1414" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border border-surface-border rounded-xl">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-right text-[11px] text-zinc-400 uppercase">
              <th className="py-2.5 px-3 text-left">Data</th>
              <th className="py-2.5 px-3">Faturamento</th>
              <th className="py-2.5 px-3">Pessoas</th>
              <th className="py-2.5 px-3">Ticket Médio</th>
              <th className="py-2.5 px-3">CMV</th>
            </tr>
          </thead>
          <tbody>
            {linhasPorDia.map((l, idx) => (
              <tr key={l.data} className={idx % 2 ? 'bg-zinc-50/50' : ''}>
                <td className="py-2 px-3 font-medium text-brand-black">{l.data.split('-').reverse().join('/')}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{brl(l.faturamento)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{num(l.pessoas)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{brl(l.ticket)}</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums" style={{ color: l.cmv != null ? corCmv(l.cmv) : '#d4d4d8' }}>
                  {l.cmv != null ? pct(l.cmv) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-zinc-400">
        Faturamento/Pessoas vêm do relatório de Pacotes (data exata). O CMV vem do pipeline diário de Promoções Utilizadas, que processa alguns dias por execução (trigger automático) — pode aparecer "—" em dias/meses que ainda não foram processados.
      </p>
    </div>
  )
}
